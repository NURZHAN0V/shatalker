export const hryakTemplate = {
  id: "hryak",
  name: "Хряк",
  level: 2,
  hp: 40,
  maxHp: 40,
  attack: 5,
  attackRadius: 2,
  attackCooldown: 1.5,
  expReward: 20,
};

export const HRYAK_HEIGHT = 1.2;
export const HRYAK_RADIUS = 0.4;
export const MAX_HRYAKS = 5;

export const HRYAK_SPAWNS: ReadonlyArray<{ x: number; z: number }> = [
  { x: 8, z: 6 },
  { x: 12, z: 2 },
  { x: 6, z: 12 },
  { x: 14, z: 10 },
  { x: 4, z: 8 },
];

