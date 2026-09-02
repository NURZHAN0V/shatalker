/** Rim posts, debris, weak anomaly spheres. Primitives only — no invented glb paths. */

export type RimPost = {
  id: string;
  x: number;
  z: number;
  h: number;
  diameter: number;
};

export type RimDebris = {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
};

export type AnomalyDef = {
  id: string;
  x: number;
  z: number;
  r: number;
};

/** Low posts so a Space jump clears them. Corners + mid-edges, not a ring. */
export const RIM_POSTS: readonly RimPost[] = [
  { id: "rim_nw", x: -37.8, z: 37.8, h: 1.2, diameter: 0.28 },
  { id: "rim_ne", x: 37.8, z: 37.8, h: 1.15, diameter: 0.28 },
  { id: "rim_sw", x: -37.8, z: -37.8, h: 1.25, diameter: 0.28 },
  { id: "rim_se", x: 37.8, z: -37.8, h: 1.2, diameter: 0.28 },
  { id: "rim_n", x: 0, z: 37.8, h: 1.3, diameter: 0.28 },
  { id: "rim_s", x: 0, z: -37.8, h: 1.15, diameter: 0.28 },
  { id: "rim_w", x: -37.8, z: 0, h: 1.2, diameter: 0.28 },
  { id: "rim_e", x: 37.8, z: 0, h: 1.18, diameter: 0.28 },
  { id: "rim_w2", x: -37.8, z: 18, h: 1.22, diameter: 0.28 },
  { id: "rim_w3", x: -37.8, z: -18, h: 1.1, diameter: 0.28 },
  { id: "rim_e2", x: 37.8, z: -18, h: 1.28, diameter: 0.28 },
  { id: "rim_s2", x: -18, z: -37.8, h: 1.16, diameter: 0.28 },
];

export const RIM_DEBRIS: readonly RimDebris[] = [
  { id: "rim_junk_w", x: -36.2, z: 12, w: 0.9, d: 0.7, h: 0.5 },
  { id: "rim_junk_s", x: 12, z: -36.4, w: 1.1, d: 0.8, h: 0.45 },
  { id: "rim_junk_sw", x: -28, z: -36.2, w: 0.8, d: 0.8, h: 0.55 },
  { id: "rim_junk_e", x: 36.4, z: -12, w: 1.0, d: 0.6, h: 0.4 },
];

export const ANOMALIES: readonly AnomalyDef[] = [
  { id: "anomaly_w", x: -22, z: 8, r: 0.62 },
  { id: "anomaly_s", x: 8, z: -24, r: 0.7 },
  { id: "anomaly_n", x: -14, z: 24, r: 0.55 },
];

export const ANOMALY_EMISSIVE = { r: 0.42, g: 0.48, b: 0.22 } as const;
