package apihttp

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"shatalker/internal/config"
	"shatalker/internal/repo"
	"shatalker/internal/service"
	"shatalker/internal/ws"
)

type Server struct {
	svc *service.Service
	hub *ws.Hub
}

func NewRouter(cfg config.Config, gdb *gorm.DB) *gin.Engine {
	if cfg.Env != "dev" {
		gin.SetMode(gin.ReleaseMode)
	}
	svc := service.New(repo.New(gdb), cfg.JWTSecret)
	s := &Server{svc: svc, hub: ws.NewHub(svc, cfg.CORSOrigin)}
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.CORSOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	v1 := r.Group("/api/v1")
	v1.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
	v1.POST("/auth/register", s.register)
	v1.POST("/auth/login", s.login)
	v1.GET("/ws", s.ws)

	auth := v1.Group("/")
	auth.Use(s.requireAuth)
	auth.GET("/me", s.me)
	auth.GET("/save", s.getSave)
	auth.PUT("/save", s.putSave)
	auth.GET("/quests", s.listQuests)
	auth.POST("/quests/:id/accept", s.acceptQuest)
	auth.POST("/quests/:id/complete", s.completeQuest)
	auth.GET("/inventory", s.getInventory)
	auth.POST("/inventory/use", s.useItem)
	auth.GET("/chat", s.getChat)
	auth.POST("/chat", s.postChat)
	return r
}

func (s *Server) ws(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	uid, err := s.svc.ParseToken(token)
	if err != nil {
		fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	s.hub.Accept(c.Writer, c.Request, uid)
}

func (s *Server) requireAuth(c *gin.Context) {
	header := c.GetHeader("Authorization")
	raw, ok := strings.CutPrefix(header, "Bearer ")
	if !ok || raw == "" {
		fail(c, http.StatusUnauthorized, "unauthorized")
		c.Abort()
		return
	}
	uid, err := s.svc.ParseToken(raw)
	if err != nil {
		fail(c, http.StatusUnauthorized, "unauthorized")
		c.Abort()
		return
	}
	c.Set("uid", uid)
	c.Next()
}

func uidOf(c *gin.Context) int64 {
	v, _ := c.Get("uid")
	uid, _ := v.(int64)
	return uid
}

type credsBody struct {
	Name     string `json:"name"`
	Password string `json:"password"`
}

func (s *Server) register(c *gin.Context) {
	var body credsBody
	if err := c.ShouldBindJSON(&body); err != nil {
		fail(c, http.StatusBadRequest, "bad request")
		return
	}
	res, err := s.svc.Register(body.Name, body.Password)
	writeAuth(c, res, err)
}

func (s *Server) login(c *gin.Context) {
	var body credsBody
	if err := c.ShouldBindJSON(&body); err != nil {
		fail(c, http.StatusBadRequest, "bad request")
		return
	}
	res, err := s.svc.Login(body.Name, body.Password)
	writeAuth(c, res, err)
}

func writeAuth(c *gin.Context, res *service.AuthResult, err error) {
	if err != nil {
		mapErr(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

func (s *Server) me(c *gin.Context) {
	snap, err := s.svc.SnapshotByUser(uidOf(c))
	if err != nil {
		mapErr(c, err)
		return
	}
	c.JSON(http.StatusOK, snap)
}

func (s *Server) getSave(c *gin.Context) {
	s.me(c)
}

func (s *Server) putSave(c *gin.Context) {
	var body service.Snapshot
	if err := c.ShouldBindJSON(&body); err != nil {
		fail(c, http.StatusBadRequest, "bad request")
		return
	}
	snap, err := s.svc.PutSave(uidOf(c), body)
	if err != nil {
		mapErr(c, err)
		return
	}
	c.JSON(http.StatusOK, snap)
}

func (s *Server) listQuests(c *gin.Context) {
	list, err := s.svc.ListQuests(uidOf(c))
	if err != nil {
		mapErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"quests": list})
}

func (s *Server) acceptQuest(c *gin.Context) {
	snap, err := s.svc.AcceptQuest(uidOf(c), c.Param("id"))
	if err != nil {
		mapErr(c, err)
		return
	}
	c.JSON(http.StatusOK, snap)
}

func (s *Server) completeQuest(c *gin.Context) {
	snap, err := s.svc.CompleteQuest(uidOf(c), c.Param("id"))
	if err != nil {
		mapErr(c, err)
		return
	}
	c.JSON(http.StatusOK, snap)
}

func (s *Server) getInventory(c *gin.Context) {
	inv, err := s.svc.Inventory(uidOf(c))
	if err != nil {
		mapErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"inventory": inv})
}

type useBody struct {
	ItemID string `json:"itemId"`
}

func (s *Server) useItem(c *gin.Context) {
	var body useBody
	if err := c.ShouldBindJSON(&body); err != nil {
		fail(c, http.StatusBadRequest, "bad request")
		return
	}
	snap, err := s.svc.UseItem(uidOf(c), body.ItemID)
	if err != nil {
		mapErr(c, err)
		return
	}
	c.JSON(http.StatusOK, snap)
}

type chatBody struct {
	Channel string `json:"channel"`
	Text    string `json:"text"`
}

func (s *Server) getChat(c *gin.Context) {
	limit, _ := strconv.Atoi(c.Query("limit"))
	lines, err := s.svc.ListChat(c.Query("channel"), limit)
	if err != nil {
		mapErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"messages": lines})
}

func (s *Server) postChat(c *gin.Context) {
	var body chatBody
	if err := c.ShouldBindJSON(&body); err != nil {
		fail(c, http.StatusBadRequest, "bad request")
		return
	}
	if err := s.svc.PostChat(uidOf(c), body.Channel, body.Text); err != nil {
		mapErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func fail(c *gin.Context, code int, msg string) {
	c.JSON(code, gin.H{"error": msg})
}

func mapErr(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrBadInput):
		fail(c, http.StatusBadRequest, "bad request")
	case errors.Is(err, service.ErrUnauthorized):
		fail(c, http.StatusUnauthorized, "unauthorized")
	case errors.Is(err, service.ErrConflict):
		fail(c, http.StatusConflict, "name taken")
	case errors.Is(err, service.ErrForbiddenItem):
		fail(c, http.StatusBadRequest, "item cannot be used")
	case errors.Is(err, service.ErrNoItem):
		fail(c, http.StatusBadRequest, "no item")
	case errors.Is(err, service.ErrFullHP):
		fail(c, http.StatusBadRequest, "hp full")
	case errors.Is(err, service.ErrQuestState):
		fail(c, http.StatusBadRequest, "quest not ready")
	case errors.Is(err, repo.ErrNotFound):
		fail(c, http.StatusNotFound, "not found")
	default:
		fail(c, http.StatusInternalServerError, "internal")
	}
}
