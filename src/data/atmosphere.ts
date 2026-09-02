/** Perimeter fog and sky. Keep in sync with createWorld — no invented texture paths. */

export const FOG = { r: 0.46, g: 0.5, b: 0.44 } as const;
export const FOG_DENSITY = 0.018;

/** Green-gray zenith; rim of the dome uses FOG so it meets the horizon. */
export const SKY_ZENITH = { r: 0.56, g: 0.6, b: 0.52 } as const;
export const SKY_DIAMETER = 200;
export const SKY_SEGMENTS = 24;
export const SKY_TEX = "/assets/tex/sky_overcast_512.jpg";

export const GROUND_SUBDIVISIONS = 8;
export const GROUND_DIRT_A = { r: 0.38, g: 0.34, b: 0.26 } as const;
export const GROUND_DIRT_B = { r: 0.26, g: 0.24, b: 0.18 } as const;
