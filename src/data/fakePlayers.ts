export type FakeCallsign = {
  id: string;
  name: string;
  color: { r: number; g: number; b: number };
  x: number;
  z: number;
};

export const FAKE_STALKERS: readonly FakeCallsign[] = [
  { id: "rzhavy", name: "Ржавый", color: { r: 0.48, g: 0.32, b: 0.2 }, x: -18, z: 10 },
  { id: "okurok", name: "Окурок", color: { r: 0.28, g: 0.3, b: 0.24 }, x: -16, z: 18 },
  { id: "plut", name: "Плут", color: { r: 0.4, g: 0.36, b: 0.2 }, x: -22, z: -12 },
  { id: "gazik", name: "Газик", color: { r: 0.3, g: 0.4, b: 0.26 }, x: 18, z: -16 },
  { id: "kochegar", name: "Кочегар", color: { r: 0.46, g: 0.24, b: 0.18 }, x: 22, z: -8 },
  { id: "lom", name: "Лом", color: { r: 0.3, g: 0.32, b: 0.38 }, x: -20, z: 22 },
];

export const BOT_SPEED = 3.2;
export const BOT_ATTACK_RANGE = 2.2;
export const BOT_ATTACK_COOLDOWN = 1.8;
export const BOT_THINK_DT = 0.2;
export const BOT_HUNT_CHANCE = 0.12;
export const PATROL_SPAN = 28;
