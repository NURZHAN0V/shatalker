package models

import "time"

type User struct {
	ID           int64     `gorm:"column:id;primaryKey"`
	Name         string    `gorm:"column:name"`
	PasswordHash string    `gorm:"column:password_hash"`
	CreatedAt    time.Time `gorm:"column:created_at"`
}

func (User) TableName() string { return "users" }

type Player struct {
	ID        int64     `gorm:"column:id;primaryKey"`
	UserID    int64     `gorm:"column:user_id"`
	Name      string    `gorm:"column:name"`
	Level     int       `gorm:"column:level"`
	HP        float64   `gorm:"column:hp"`
	MaxHP     float64   `gorm:"column:max_hp"`
	MP        float64   `gorm:"column:mp"`
	MaxMP     float64   `gorm:"column:max_mp"`
	Exp       float64   `gorm:"column:exp"`
	ExpToNext float64   `gorm:"column:exp_to_next"`
	Attack    float64   `gorm:"column:attack"`
	MoveSpeed float64   `gorm:"column:move_speed"`
	PosX      float64   `gorm:"column:pos_x"`
	PosY      float64   `gorm:"column:pos_y"`
	PosZ      float64   `gorm:"column:pos_z"`
	UpdatedAt time.Time `gorm:"column:updated_at"`
}

func (Player) TableName() string { return "players" }

type InventoryItem struct {
	ID       int64  `gorm:"column:id;primaryKey"`
	PlayerID int64  `gorm:"column:player_id"`
	ItemID   string `gorm:"column:item_id"`
	Quantity int    `gorm:"column:quantity"`
}

func (InventoryItem) TableName() string { return "inventory_items" }

type Quest struct {
	ID           string `gorm:"column:id;primaryKey"`
	Name         string `gorm:"column:name"`
	Description  string `gorm:"column:description"`
	Type         string `gorm:"column:type"`
	Target       string `gorm:"column:target"`
	Required     int    `gorm:"column:required"`
	RewardExp    int    `gorm:"column:reward_exp"`
	RewardItemID string `gorm:"column:reward_item_id"`
}

func (Quest) TableName() string { return "quests" }

type PlayerQuest struct {
	ID       int64  `gorm:"column:id;primaryKey"`
	PlayerID int64  `gorm:"column:player_id"`
	QuestID  string `gorm:"column:quest_id"`
	Status   string `gorm:"column:status"`
	Progress int    `gorm:"column:progress"`
}

func (PlayerQuest) TableName() string { return "player_quests" }

type ChatMessage struct {
	ID        int64     `gorm:"column:id;primaryKey"`
	PlayerID  *int64    `gorm:"column:player_id"`
	Channel   string    `gorm:"column:channel"`
	Text      string    `gorm:"column:text"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (ChatMessage) TableName() string { return "chat_messages" }
