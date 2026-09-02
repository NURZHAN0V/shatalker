package service

import (
	"errors"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"shatalker/internal/models"
	"shatalker/internal/repo"
)

const (
	defaultHP        = 100
	defaultMaxHP     = 100
	defaultMP        = 50
	defaultMaxMP     = 50
	defaultExpToNext = 100
	defaultAttack    = 10
	defaultMoveSpeed = 5
	medkitID         = "medkit_small"
	medkitHeal       = 30
	meatID           = "hryak_meat"
	killQuestID      = "kill_hryaks_3"
)

var (
	ErrBadInput      = errors.New("bad input")
	ErrUnauthorized  = errors.New("unauthorized")
	ErrConflict      = errors.New("conflict")
	ErrForbiddenItem = errors.New("item cannot be used")
	ErrNoItem        = errors.New("no item")
	ErrFullHP        = errors.New("hp full")
	ErrQuestState    = errors.New("quest not ready")
)

type Snapshot struct {
	Name      string         `json:"name"`
	Level     int            `json:"level"`
	HP        float64        `json:"hp"`
	MaxHP     float64        `json:"maxHp"`
	MP        float64        `json:"mp"`
	MaxMP     float64        `json:"maxMp"`
	Exp       float64        `json:"exp"`
	ExpToNext float64        `json:"expToNext"`
	Attack    float64        `json:"attack"`
	MoveSpeed float64        `json:"moveSpeed"`
	Position  Position       `json:"position"`
	Quest     QuestState     `json:"quest"`
	Inventory map[string]int `json:"inventory"`
}

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

type QuestState struct {
	ID       string `json:"id"`
	Status   string `json:"status"`
	Progress int    `json:"progress"`
}

type QuestInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
	Target      string `json:"target"`
	Required    int    `json:"required"`
	RewardExp   int    `json:"rewardExp"`
	RewardItem  string `json:"rewardItemId"`
	Status      string `json:"status"`
	Progress    int    `json:"progress"`
}

type ChatLine struct {
	ID      int64  `json:"id"`
	Channel string `json:"channel"`
	From    string `json:"from"`
	Text    string `json:"text"`
}

type AuthResult struct {
	Token  string   `json:"token"`
	Player Snapshot `json:"player"`
}

type Service struct {
	repo      *repo.Repo
	jwtSecret []byte
}

func New(r *repo.Repo, jwtSecret string) *Service {
	return &Service{repo: r, jwtSecret: []byte(jwtSecret)}
}

func (s *Service) Register(name, password string) (*AuthResult, error) {
	name = strings.TrimSpace(name)
	if err := validateCreds(name, password); err != nil {
		return nil, err
	}
	if _, err := s.repo.GetUserByName(name); err == nil {
		return nil, ErrConflict
	} else if !errors.Is(err, repo.ErrNotFound) {
		return nil, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		return nil, err
	}
	var out *AuthResult
	err = s.repo.DB().Transaction(func(tx *gorm.DB) error {
		u := &models.User{Name: name, PasswordHash: string(hash), CreatedAt: time.Now()}
		if err := s.repo.CreateUser(tx, u); err != nil {
			return err
		}
		p := defaultPlayer(u.ID, name)
		if err := s.repo.CreatePlayer(tx, p); err != nil {
			return err
		}
		items := []models.InventoryItem{
			{PlayerID: p.ID, ItemID: medkitID, Quantity: 0},
			{PlayerID: p.ID, ItemID: meatID, Quantity: 0},
		}
		if err := s.repo.ReplaceInventory(tx, p.ID, items); err != nil {
			return err
		}
		pq := &models.PlayerQuest{PlayerID: p.ID, QuestID: killQuestID, Status: "available", Progress: 0}
		if err := s.repo.UpsertPlayerQuest(tx, pq); err != nil {
			return err
		}
		tok, err := s.signToken(u.ID)
		if err != nil {
			return err
		}
		snap := snapshotFrom(p, items, *pq)
		out = &AuthResult{Token: tok, Player: snap}
		return nil
	})
	return out, err
}

func (s *Service) Login(name, password string) (*AuthResult, error) {
	name = strings.TrimSpace(name)
	if err := validateCreds(name, password); err != nil {
		return nil, err
	}
	u, err := s.repo.GetUserByName(name)
	if errors.Is(err, repo.ErrNotFound) {
		return nil, ErrUnauthorized
	}
	if err != nil {
		return nil, err
	}
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)) != nil {
		return nil, ErrUnauthorized
	}
	snap, err := s.SnapshotByUser(u.ID)
	if err != nil {
		return nil, err
	}
	tok, err := s.signToken(u.ID)
	if err != nil {
		return nil, err
	}
	return &AuthResult{Token: tok, Player: *snap}, nil
}

func (s *Service) PlayerPose(userID int64) (name string, x, z float64, err error) {
	p, err := s.repo.GetPlayerByUserID(userID)
	if err != nil {
		return "", 0, 0, err
	}
	return p.Name, p.PosX, p.PosZ, nil
}

func (s *Service) SnapshotByUser(userID int64) (*Snapshot, error) {
	p, err := s.repo.GetPlayerByUserID(userID)
	if err != nil {
		return nil, err
	}
	inv, err := s.repo.ListInventory(p.ID)
	if err != nil {
		return nil, err
	}
	pq, err := s.repo.GetPlayerQuest(p.ID, killQuestID)
	if errors.Is(err, repo.ErrNotFound) {
		pq = &models.PlayerQuest{PlayerID: p.ID, QuestID: killQuestID, Status: "available", Progress: 0}
	} else if err != nil {
		return nil, err
	}
	snap := snapshotFrom(p, inv, *pq)
	return &snap, nil
}

func (s *Service) PutSave(userID int64, in Snapshot) (*Snapshot, error) {
	p, err := s.repo.GetPlayerByUserID(userID)
	if err != nil {
		return nil, err
	}
	applySave(p, in)
	inv := inventoryRows(p.ID, in.Inventory)
	questID := in.Quest.ID
	if questID == "" {
		questID = killQuestID
	}
	status := in.Quest.Status
	if status != "available" && status != "active" && status != "completed" {
		status = "available"
	}
	progress := in.Quest.Progress
	if progress < 0 {
		progress = 0
	}
	err = s.repo.DB().Transaction(func(tx *gorm.DB) error {
		if err := s.repo.SavePlayer(tx, p); err != nil {
			return err
		}
		if err := s.repo.ReplaceInventory(tx, p.ID, inv); err != nil {
			return err
		}
		pq, qerr := s.repo.GetPlayerQuest(p.ID, questID)
		if errors.Is(qerr, repo.ErrNotFound) {
			pq = &models.PlayerQuest{PlayerID: p.ID, QuestID: questID}
		} else if qerr != nil {
			return qerr
		}
		pq.Status = status
		pq.Progress = progress
		return s.repo.UpsertPlayerQuest(tx, pq)
	})
	if err != nil {
		return nil, err
	}
	return s.SnapshotByUser(userID)
}

func (s *Service) ListQuests(userID int64) ([]QuestInfo, error) {
	p, err := s.repo.GetPlayerByUserID(userID)
	if err != nil {
		return nil, err
	}
	catalog, err := s.repo.ListQuests()
	if err != nil {
		return nil, err
	}
	pqs, err := s.repo.ListPlayerQuests(p.ID)
	if err != nil {
		return nil, err
	}
	byID := map[string]models.PlayerQuest{}
	for _, pq := range pqs {
		byID[pq.QuestID] = pq
	}
	out := make([]QuestInfo, 0, len(catalog))
	for _, q := range catalog {
		info := QuestInfo{
			ID:          q.ID,
			Name:        q.Name,
			Description: q.Description,
			Type:        q.Type,
			Target:      q.Target,
			Required:    q.Required,
			RewardExp:   q.RewardExp,
			RewardItem:  q.RewardItemID,
			Status:      "available",
			Progress:    0,
		}
		if pq, ok := byID[q.ID]; ok {
			info.Status = pq.Status
			info.Progress = pq.Progress
		}
		out = append(out, info)
	}
	return out, nil
}

func (s *Service) AcceptQuest(userID int64, questID string) (*Snapshot, error) {
	if _, err := s.repo.GetQuest(questID); err != nil {
		return nil, err
	}
	p, err := s.repo.GetPlayerByUserID(userID)
	if err != nil {
		return nil, err
	}
	pq, err := s.repo.GetPlayerQuest(p.ID, questID)
	if errors.Is(err, repo.ErrNotFound) {
		pq = &models.PlayerQuest{PlayerID: p.ID, QuestID: questID}
	} else if err != nil {
		return nil, err
	}
	if pq.Status != "active" {
		pq.Status = "active"
		pq.Progress = 0
		if err := s.repo.UpsertPlayerQuest(s.repo.DB(), pq); err != nil {
			return nil, err
		}
	}
	return s.SnapshotByUser(userID)
}

func (s *Service) CompleteQuest(userID int64, questID string) (*Snapshot, error) {
	q, err := s.repo.GetQuest(questID)
	if err != nil {
		return nil, err
	}
	p, err := s.repo.GetPlayerByUserID(userID)
	if err != nil {
		return nil, err
	}
	pq, err := s.repo.GetPlayerQuest(p.ID, questID)
	if err != nil {
		return nil, ErrQuestState
	}
	if pq.Status != "active" || pq.Progress < q.Required {
		return nil, ErrQuestState
	}
	grantExp(p, float64(q.RewardExp))
	inv, err := s.repo.ListInventory(p.ID)
	if err != nil {
		return nil, err
	}
	if q.RewardItemID != "" {
		inv = addItem(p.ID, inv, q.RewardItemID, 1)
	}
	pq.Status = "completed"
	err = s.repo.DB().Transaction(func(tx *gorm.DB) error {
		if err := s.repo.SavePlayer(tx, p); err != nil {
			return err
		}
		if err := s.repo.ReplaceInventory(tx, p.ID, inv); err != nil {
			return err
		}
		return s.repo.UpsertPlayerQuest(tx, pq)
	})
	if err != nil {
		return nil, err
	}
	return s.SnapshotByUser(userID)
}

func (s *Service) Inventory(userID int64) (map[string]int, error) {
	snap, err := s.SnapshotByUser(userID)
	if err != nil {
		return nil, err
	}
	return snap.Inventory, nil
}

func (s *Service) UseItem(userID int64, itemID string) (*Snapshot, error) {
	if itemID != medkitID {
		return nil, ErrForbiddenItem
	}
	p, err := s.repo.GetPlayerByUserID(userID)
	if err != nil {
		return nil, err
	}
	inv, err := s.repo.ListInventory(p.ID)
	if err != nil {
		return nil, err
	}
	qty := qtyOf(inv, itemID)
	if qty <= 0 {
		return nil, ErrNoItem
	}
	if p.HP >= p.MaxHP {
		return nil, ErrFullHP
	}
	p.HP += medkitHeal
	if p.HP > p.MaxHP {
		p.HP = p.MaxHP
	}
	inv = addItem(p.ID, inv, itemID, -1)
	err = s.repo.DB().Transaction(func(tx *gorm.DB) error {
		if err := s.repo.SavePlayer(tx, p); err != nil {
			return err
		}
		return s.repo.ReplaceInventory(tx, p.ID, inv)
	})
	if err != nil {
		return nil, err
	}
	return s.SnapshotByUser(userID)
}

func (s *Service) PostChat(userID int64, channel, text string) error {
	_, _, err := s.PostChatLine(userID, channel, text)
	return err
}

func (s *Service) PostChatLine(userID int64, channel, text string) (from string, stored string, err error) {
	channel = strings.TrimSpace(channel)
	text = strings.TrimSpace(text)
	if text == "" || channel != "perimeter" {
		return "", "", ErrBadInput
	}
	if len(text) > 120 {
		text = text[:120]
	}
	p, err := s.repo.GetPlayerByUserID(userID)
	if err != nil {
		return "", "", err
	}
	pid := p.ID
	if err := s.repo.InsertChat(&models.ChatMessage{
		PlayerID:  &pid,
		Channel:   channel,
		Text:      text,
		CreatedAt: time.Now(),
	}); err != nil {
		return "", "", err
	}
	return p.Name, text, nil
}

func (s *Service) ListChat(channel string, limit int) ([]ChatLine, error) {
	if channel == "" {
		channel = "perimeter"
	}
	rows, err := s.repo.ListChat(channel, limit)
	if err != nil {
		return nil, err
	}
	out := make([]ChatLine, 0, len(rows))
	for _, row := range rows {
		from := ""
		if row.FromName != nil {
			from = *row.FromName
		}
		out = append(out, ChatLine{
			ID:      row.ID,
			Channel: row.Channel,
			From:    from,
			Text:    row.Text,
		})
	}
	return out, nil
}

func defaultPlayer(userID int64, name string) *models.Player {
	return &models.Player{
		UserID:    userID,
		Name:      name,
		Level:     1,
		HP:        defaultHP,
		MaxHP:     defaultMaxHP,
		MP:        defaultMP,
		MaxMP:     defaultMaxMP,
		Exp:       0,
		ExpToNext: defaultExpToNext,
		Attack:    defaultAttack,
		MoveSpeed: defaultMoveSpeed,
		UpdatedAt: time.Now(),
	}
}

func snapshotFrom(p *models.Player, inv []models.InventoryItem, pq models.PlayerQuest) Snapshot {
	bag := map[string]int{medkitID: 0, meatID: 0}
	for _, it := range inv {
		bag[it.ItemID] = it.Quantity
	}
	return Snapshot{
		Name:      p.Name,
		Level:     p.Level,
		HP:        p.HP,
		MaxHP:     p.MaxHP,
		MP:        p.MP,
		MaxMP:     p.MaxMP,
		Exp:       p.Exp,
		ExpToNext: p.ExpToNext,
		Attack:    p.Attack,
		MoveSpeed: p.MoveSpeed,
		Position:  Position{X: p.PosX, Y: p.PosY, Z: p.PosZ},
		Quest: QuestState{
			ID:       pq.QuestID,
			Status:   pq.Status,
			Progress: pq.Progress,
		},
		Inventory: bag,
	}
}

func applySave(p *models.Player, in Snapshot) {
	if in.Level >= 1 {
		p.Level = in.Level
	}
	p.HP = in.HP
	p.MaxHP = in.MaxHP
	p.MP = in.MP
	p.MaxMP = in.MaxMP
	p.Exp = in.Exp
	p.ExpToNext = in.ExpToNext
	p.Attack = in.Attack
	if in.MoveSpeed > 0 {
		p.MoveSpeed = in.MoveSpeed
	}
	p.PosX = in.Position.X
	p.PosY = in.Position.Y
	p.PosZ = in.Position.Z
	if p.MaxHP < 1 {
		p.MaxHP = defaultMaxHP
	}
	if p.MaxMP < 1 {
		p.MaxMP = defaultMaxMP
	}
	if p.HP < 0 {
		p.HP = 0
	}
	if p.HP > p.MaxHP {
		p.HP = p.MaxHP
	}
	if p.MP < 0 {
		p.MP = 0
	}
	if p.MP > p.MaxMP {
		p.MP = p.MaxMP
	}
}

func inventoryRows(playerID int64, bag map[string]int) []models.InventoryItem {
	if bag == nil {
		bag = map[string]int{}
	}
	ids := []string{medkitID, meatID}
	seen := map[string]bool{}
	out := make([]models.InventoryItem, 0, len(ids)+len(bag))
	for _, id := range ids {
		q := bag[id]
		if q < 0 {
			q = 0
		}
		out = append(out, models.InventoryItem{PlayerID: playerID, ItemID: id, Quantity: q})
		seen[id] = true
	}
	for id, q := range bag {
		if seen[id] {
			continue
		}
		if q < 0 {
			q = 0
		}
		out = append(out, models.InventoryItem{PlayerID: playerID, ItemID: id, Quantity: q})
	}
	return out
}

func qtyOf(inv []models.InventoryItem, id string) int {
	for _, it := range inv {
		if it.ItemID == id {
			return it.Quantity
		}
	}
	return 0
}

func addItem(playerID int64, inv []models.InventoryItem, id string, delta int) []models.InventoryItem {
	found := false
	for i := range inv {
		if inv[i].ItemID == id {
			inv[i].Quantity += delta
			if inv[i].Quantity < 0 {
				inv[i].Quantity = 0
			}
			found = true
			break
		}
	}
	if !found {
		q := delta
		if q < 0 {
			q = 0
		}
		inv = append(inv, models.InventoryItem{PlayerID: playerID, ItemID: id, Quantity: q})
	}
	return inv
}

func grantExp(p *models.Player, amount float64) {
	p.Exp += amount
	for p.Exp >= p.ExpToNext {
		p.Exp -= p.ExpToNext
		p.Level++
		p.MaxHP += 20
		p.MaxMP += 10
		p.Attack += 2
		p.ExpToNext = 100 + float64(p.Level-1)*40
		p.HP = p.MaxHP
		p.MP = p.MaxMP
	}
}

func validateCreds(name, password string) error {
	if len(name) < 2 || len(name) > 24 {
		return ErrBadInput
	}
	if len(password) < 4 || len(password) > 72 {
		return ErrBadInput
	}
	return nil
}
