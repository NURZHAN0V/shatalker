package ws

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/coder/websocket"
	"shatalker/internal/service"
)

const (
	posMinGap  = 500 * time.Millisecond
	worldBound = 42.0
	writeWait  = 2 * time.Second
)

type inbound struct {
	Type    string  `json:"type"`
	Channel string  `json:"channel"`
	Text    string  `json:"text"`
	X       float64 `json:"x"`
	Z       float64 `json:"z"`
}

type chatOut struct {
	Type    string `json:"type"`
	From    string `json:"from"`
	Channel string `json:"channel"`
	Text    string `json:"text"`
}

type presenceOut struct {
	Type   string   `json:"type"`
	Name   string   `json:"name"`
	Online bool     `json:"online"`
	X      *float64 `json:"x,omitempty"`
	Z      *float64 `json:"z,omitempty"`
}

type posOut struct {
	Type string  `json:"type"`
	From string  `json:"from"`
	X    float64 `json:"x"`
	Z    float64 `json:"z"`
}

type client struct {
	conn *websocket.Conn
	wmu  sync.Mutex
}

type occupant struct {
	userID  int64
	name    string
	x       float64
	z       float64
	lastPos time.Time
	conns   map[*client]struct{}
}

type Hub struct {
	svc            *service.Service
	corsOrigin     string
	originPatterns []string
	mu             sync.Mutex
	byConn         map[*client]*occupant
	byUser         map[int64]*occupant
}

func NewHub(svc *service.Service, corsOrigin string) *Hub {
	return &Hub{
		svc:            svc,
		corsOrigin:     corsOrigin,
		originPatterns: originPatterns(corsOrigin),
		byConn:         make(map[*client]*occupant),
		byUser:         make(map[int64]*occupant),
	}
}

func (h *Hub) Accept(w http.ResponseWriter, r *http.Request, userID int64) {
	if !originAllowed(r.Header.Get("Origin"), h.corsOrigin) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	name, x, z, err := h.svc.PlayerPose(userID)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: h.originPatterns,
	})
	if err != nil {
		return
	}
	conn.SetReadLimit(4096)
	cl := &client{conn: conn}
	h.join(cl, userID, name, x, z)
	defer func() {
		h.leave(cl)
		_ = conn.CloseNow()
	}()

	ctx := r.Context()
	for {
		typ, data, err := conn.Read(ctx)
		if err != nil {
			return
		}
		if typ != websocket.MessageText {
			continue
		}
		h.handle(cl, data)
	}
}

func (h *Hub) join(cl *client, userID int64, name string, x, z float64) {
	h.mu.Lock()
	occ, exists := h.byUser[userID]
	first := !exists
	if !exists {
		occ = &occupant{
			userID: userID,
			name:   name,
			x:      x,
			z:      z,
			conns:  make(map[*client]struct{}),
		}
		h.byUser[userID] = occ
	}
	occ.conns[cl] = struct{}{}
	h.byConn[cl] = occ
	roster := make([]presenceOut, 0, len(h.byUser))
	for _, o := range h.byUser {
		roster = append(roster, onlinePresence(o.name, o.x, o.z))
	}
	h.mu.Unlock()

	for i := range roster {
		h.writeJSON(cl, roster[i])
	}
	if first {
		h.broadcastExceptUser(userID, onlinePresence(name, x, z))
	}
}

func (h *Hub) leave(cl *client) {
	h.mu.Lock()
	occ, ok := h.byConn[cl]
	if !ok {
		h.mu.Unlock()
		return
	}
	delete(h.byConn, cl)
	delete(occ.conns, cl)
	last := len(occ.conns) == 0
	name := occ.name
	if last {
		delete(h.byUser, occ.userID)
	}
	h.mu.Unlock()
	if last {
		h.broadcast(presenceOut{Type: "presence", Name: name, Online: false})
	}
}

func (h *Hub) handle(cl *client, data []byte) {
	var msg inbound
	if json.Unmarshal(data, &msg) != nil {
		return
	}
	switch msg.Type {
	case "chat":
		h.handleChat(cl, msg)
	case "pos":
		h.handlePos(cl, msg)
	}
}

func (h *Hub) handleChat(cl *client, msg inbound) {
	if strings.TrimSpace(msg.Channel) != "perimeter" {
		return
	}
	h.mu.Lock()
	occ := h.byConn[cl]
	h.mu.Unlock()
	if occ == nil {
		return
	}
	from, stored, err := h.svc.PostChatLine(occ.userID, "perimeter", msg.Text)
	if err != nil {
		return
	}
	h.broadcast(chatOut{
		Type:    "chat",
		From:    from,
		Channel: "perimeter",
		Text:    stored,
	})
}

func (h *Hub) handlePos(cl *client, msg inbound) {
	if !finite(msg.X) || !finite(msg.Z) {
		return
	}
	if math.Abs(msg.X) > worldBound || math.Abs(msg.Z) > worldBound {
		return
	}
	h.mu.Lock()
	occ := h.byConn[cl]
	if occ == nil {
		h.mu.Unlock()
		return
	}
	now := time.Now()
	if !occ.lastPos.IsZero() && now.Sub(occ.lastPos) < posMinGap {
		h.mu.Unlock()
		return
	}
	occ.lastPos = now
	occ.x = msg.X
	occ.z = msg.Z
	from := occ.name
	uid := occ.userID
	h.mu.Unlock()
	h.broadcastExceptUser(uid, posOut{Type: "pos", From: from, X: msg.X, Z: msg.Z})
}

func (h *Hub) broadcast(v any) {
	h.sendAll(h.conns(), v)
}

func (h *Hub) broadcastExceptUser(userID int64, v any) {
	h.sendAll(h.connsExceptUser(userID), v)
}

func (h *Hub) conns() []*client {
	h.mu.Lock()
	defer h.mu.Unlock()
	out := make([]*client, 0, len(h.byConn))
	for cl := range h.byConn {
		out = append(out, cl)
	}
	return out
}

func (h *Hub) connsExceptUser(userID int64) []*client {
	h.mu.Lock()
	defer h.mu.Unlock()
	out := make([]*client, 0, len(h.byConn))
	for cl, occ := range h.byConn {
		if occ.userID == userID {
			continue
		}
		out = append(out, cl)
	}
	return out
}

func (h *Hub) sendAll(clients []*client, v any) {
	for _, cl := range clients {
		h.writeJSON(cl, v)
	}
}

func (h *Hub) writeJSON(cl *client, v any) {
	payload, err := json.Marshal(v)
	if err != nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), writeWait)
	err = cl.write(ctx, payload)
	cancel()
	if err != nil {
		h.leave(cl)
		_ = cl.conn.CloseNow()
	}
}

func (c *client) write(ctx context.Context, payload []byte) error {
	c.wmu.Lock()
	defer c.wmu.Unlock()
	return c.conn.Write(ctx, websocket.MessageText, payload)
}

func finite(v float64) bool {
	return !math.IsNaN(v) && !math.IsInf(v, 0)
}

func onlinePresence(name string, x, z float64) presenceOut {
	px, pz := x, z
	return presenceOut{Type: "presence", Name: name, Online: true, X: &px, Z: &pz}
}

func originPatterns(corsOrigin string) []string {
	u, err := url.Parse(strings.TrimSpace(corsOrigin))
	if err != nil || u.Host == "" {
		return []string{"http://localhost:5173"}
	}
	if u.Scheme != "" {
		return []string{u.Scheme + "://" + u.Host}
	}
	return []string{u.Host}
}

func originAllowed(got, want string) bool {
	got = strings.TrimSpace(got)
	want = strings.TrimSpace(want)
	if got == "" || want == "" {
		return false
	}
	g, err1 := url.Parse(got)
	w, err2 := url.Parse(want)
	if err1 != nil || err2 != nil || g.Host == "" || w.Host == "" {
		return strings.EqualFold(strings.TrimRight(got, "/"), strings.TrimRight(want, "/"))
	}
	return strings.EqualFold(g.Scheme, w.Scheme) && strings.EqualFold(g.Host, w.Host)
}
