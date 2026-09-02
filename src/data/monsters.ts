export const hryakTemplate = {
  id: "hryak" as const,
  name: "Хряк",
  level: 2,
  hp: 40,
  maxHp: 40,
  attack: 5,
  attackRadius: 2,
  attackCooldown: 1.5,
  expReward: 20,
};

export const ryskarTemplate = {
  id: "ryskar" as const,
  name: "Рыскарь",
  level: 3,
  hp: 55,
  maxHp: 55,
  attack: 7,
  attackRadius: 2.2,
  attackCooldown: 1.7,
  expReward: 28,
};

export type MonsterKind = typeof hryakTemplate.id | typeof ryskarTemplate.id;

export const HRYAK_HEIGHT = 1.2;
export const HRYAK_RADIUS = 0.4;
export const RYSKAR_HEIGHT = 1.5;
export const RYSKAR_WIDTH = 0.7;
export const RYSKAR_RADIUS = 0.4;

/** Combined cap ~5 (phase 17). */
export const MAX_HRYAKS = 3;
export const MAX_RYSKARS = 2;

export const HRYAK_SPAWNS: ReadonlyArray<{ x: number; z: number }> = [
  { x: 8, z: 6 },
  { x: 12, z: 2 },
  { x: 6, z: 12 },
];

export const RYSKAR_SPAWNS: ReadonlyArray<{ x: number; z: number }> = [
  { x: -18, z: 14 },
  { x: -22, z: -8 },
];
