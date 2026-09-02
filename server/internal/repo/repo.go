package repo

import (
	"errors"
	"time"

	"gorm.io/gorm"
	"shatalker/internal/models"
)

var ErrNotFound = errors.New("not found")

type Repo struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Repo {
	return &Repo{db: db}
}

func (r *Repo) DB() *gorm.DB {
	return r.db
}

func (r *Repo) CreateUser(tx *gorm.DB, u *models.User) error {
	return tx.Create(u).Error
}

func (r *Repo) GetUserByName(name string) (*models.User, error) {
	var u models.User
	err := r.db.Where("name = ?", name).First(&u).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &u, err
}

func (r *Repo) GetUserByID(id int64) (*models.User, error) {
	var u models.User
	err := r.db.First(&u, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &u, err
}

func (r *Repo) CreatePlayer(tx *gorm.DB, p *models.Player) error {
	return tx.Create(p).Error
}

func (r *Repo) GetPlayerByUserID(userID int64) (*models.Player, error) {
	var p models.Player
	err := r.db.Where("user_id = ?", userID).First(&p).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &p, err
}

func (r *Repo) SavePlayer(tx *gorm.DB, p *models.Player) error {
	p.UpdatedAt = time.Now()
	return tx.Save(p).Error
}

func (r *Repo) ReplaceInventory(tx *gorm.DB, playerID int64, items []models.InventoryItem) error {
	if err := tx.Where("player_id = ?", playerID).Delete(&models.InventoryItem{}).Error; err != nil {
		return err
	}
	if len(items) == 0 {
		return nil
	}
	return tx.Create(&items).Error
}

func (r *Repo) ListInventory(playerID int64) ([]models.InventoryItem, error) {
	var rows []models.InventoryItem
	err := r.db.Where("player_id = ?", playerID).Find(&rows).Error
	return rows, err
}

func (r *Repo) GetQuest(id string) (*models.Quest, error) {
	var q models.Quest
	err := r.db.First(&q, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &q, err
}

func (r *Repo) ListQuests() ([]models.Quest, error) {
	var rows []models.Quest
	err := r.db.Order("id").Find(&rows).Error
	return rows, err
}

func (r *Repo) GetPlayerQuest(playerID int64, questID string) (*models.PlayerQuest, error) {
	var pq models.PlayerQuest
	err := r.db.Where("player_id = ? AND quest_id = ?", playerID, questID).First(&pq).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &pq, err
}

func (r *Repo) UpsertPlayerQuest(tx *gorm.DB, pq *models.PlayerQuest) error {
	if pq.ID == 0 {
		return tx.Create(pq).Error
	}
	return tx.Save(pq).Error
}

func (r *Repo) ListPlayerQuests(playerID int64) ([]models.PlayerQuest, error) {
	var rows []models.PlayerQuest
	err := r.db.Where("player_id = ?", playerID).Find(&rows).Error
	return rows, err
}

func (r *Repo) InsertChat(m *models.ChatMessage) error {
	return r.db.Create(m).Error
}

type ChatRow struct {
	ID        int64
	Channel   string
	Text      string
	CreatedAt time.Time
	FromName  *string
}

func (r *Repo) ListChat(channel string, limit int) ([]ChatRow, error) {
	if limit <= 0 || limit > 50 {
		limit = 50
	}
	var rows []ChatRow
	err := r.db.Raw(`
		SELECT m.id, m.channel, m.text, m.created_at, p.name AS from_name
		FROM chat_messages m
		LEFT JOIN players p ON p.id = m.player_id
		WHERE m.channel = ?
		ORDER BY m.id DESC
		LIMIT ?
	`, channel, limit).Scan(&rows).Error
	return rows, err
}
