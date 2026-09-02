-- +goose Up
CREATE TABLE users (
    id bigserial PRIMARY KEY,
    name text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE players (
    id bigserial PRIMARY KEY,
    user_id bigint NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    name text NOT NULL,
    level int NOT NULL DEFAULT 1,
    hp double precision NOT NULL DEFAULT 100,
    max_hp double precision NOT NULL DEFAULT 100,
    mp double precision NOT NULL DEFAULT 50,
    max_mp double precision NOT NULL DEFAULT 50,
    exp double precision NOT NULL DEFAULT 0,
    exp_to_next double precision NOT NULL DEFAULT 100,
    attack double precision NOT NULL DEFAULT 10,
    move_speed double precision NOT NULL DEFAULT 5,
    pos_x double precision NOT NULL DEFAULT 0,
    pos_y double precision NOT NULL DEFAULT 0,
    pos_z double precision NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inventory_items (
    id bigserial PRIMARY KEY,
    player_id bigint NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    item_id text NOT NULL,
    quantity int NOT NULL DEFAULT 0,
    UNIQUE (player_id, item_id)
);

CREATE TABLE quests (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    type text NOT NULL,
    target text NOT NULL,
    required int NOT NULL,
    reward_exp int NOT NULL DEFAULT 0,
    reward_item_id text NOT NULL DEFAULT ''
);

CREATE TABLE player_quests (
    id bigserial PRIMARY KEY,
    player_id bigint NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    quest_id text NOT NULL REFERENCES quests (id),
    status text NOT NULL DEFAULT 'available',
    progress int NOT NULL DEFAULT 0,
    UNIQUE (player_id, quest_id)
);

CREATE TABLE chat_messages (
    id bigserial PRIMARY KEY,
    player_id bigint REFERENCES players (id) ON DELETE SET NULL,
    channel text NOT NULL,
    text text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_channel_id_idx ON chat_messages (channel, id DESC);

INSERT INTO quests (id, name, description, type, target, required, reward_exp, reward_item_id)
VALUES (
    'kill_hryaks_3',
    'Хряки у депо',
    'Убей 3 хряков у ржавого депо.',
    'kill',
    'hryak',
    3,
    120,
    'medkit_small'
);

-- +goose Down
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS player_quests;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS quests;
DROP TABLE IF EXISTS users;
