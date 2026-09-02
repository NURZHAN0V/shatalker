-- +goose Up
INSERT INTO quests (id, name, description, type, target, required, reward_exp, reward_item_id)
VALUES (
    'fetch_oskolok_1',
    'Осколок у сфер',
    'Принеси тусклый осколок с аномалии.',
    'fetch',
    'oskolok',
    1,
    80,
    'medkit_small'
);

-- +goose Down
DELETE FROM player_quests WHERE quest_id = 'fetch_oskolok_1';
DELETE FROM quests WHERE id = 'fetch_oskolok_1';
