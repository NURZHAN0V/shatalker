/** Perimeter fog and sky. Keep in sync with createWorld — no invented texture paths. */

export const FOG = { r: 0.46, g: 0.5, b: 0.44 } as const;
export const FOG_DENSITY = 0.018;

/** Mild olive tint on the sky bake (not a vertex gradient). */
export const SKY_ZENITH = { r: 0.92, g: 0.94, b: 0.86 } as const;
export const SKY_DIAMETER = 200;
export const SKY_SEGMENTS = 32;
export const SKY_TEX = "/assets/tex/sky_overcast_1k.jpg";

export const GROUND_SUBDIVISIONS = 8;
export const GROUND_DIRT_A = { r: 0.38, g: 0.34, b: 0.26 } as const;
export const GROUND_DIRT_B = { r: 0.26, g: 0.24, b: 0.18 } as const;

/** Simple 0–100 radiation (phase 19). Tick with minimap Hz, not every frame. */
export const RAD_MAX = 100;
export const RAD_EDGE = 32;
export const RAD_CAMP = 12;
export const RAD_UP = 2;
export const RAD_DOWN = 3;
export const RAD_HP_TICK = 1;
export const RAD_HP_DAMAGE = 4;

export const ANOMALY_DAMAGE = 3;
