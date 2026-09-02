import { RIM_DEBRIS, RIM_POSTS } from "./decor";

/** XZ AABBs. Hand-tuned, not mesh bounds. Must match createWorld WORLD_SIZE / 2. */
export const WORLD_HALF = 40;

export type Aabb2 = {
  id: string;
  x: number;
  z: number;
  hx: number;
  hz: number;
  /** Top of the volume from y=0. Jump clears if feet are at or above this. */
  h: number;
};

/** Kenney sheds/containers/tank. Chimneys skipped. Half-extents cover rotY. */
export const PACK_COLLIDERS: readonly Aabb2[] = [
  { id: "depot_building_h", x: 22.2, z: 20.4, hx: 6.2, hz: 5.4, h: 8 },
  { id: "depot_building_k", x: 16.4, z: 22.6, hx: 5.4, hz: 5.6, h: 7.5 },
  { id: "depot_container_a", x: 20.6, z: 15.2, hx: 4.0, hz: 1.35, h: 2.6 },
  { id: "depot_container_b", x: 24.4, z: 17.1, hx: 2.4, hz: 3.8, h: 2.6 },
  { id: "depot_tank", x: 18.1, z: 17.6, hx: 2.1, hz: 2.1, h: 3.2 },
];

/** Same 5 depot boxes as createWorld primitives. Poles/pipes skipped. */
export const PRIMITIVE_COLLIDERS: readonly Aabb2[] = [
  { id: "depot_0", x: 20, z: 18, hx: 1.6, hz: 2, h: 2.2 },
  { id: "depot_1", x: 22.4, z: 16.2, hx: 0.8, hz: 0.9, h: 1.1 },
  { id: "depot_2", x: 18.2, z: 20.5, hx: 1.1, hz: 1, h: 2.8 },
  { id: "depot_3", x: 21.2, z: 20.8, hx: 0.6, hz: 1.2, h: 0.9 },
  { id: "depot_4", x: 17.4, z: 16.8, hx: 0.7, hz: 0.7, h: 1.6 },
];

export const RIM_COLLIDERS: readonly Aabb2[] = [
  ...RIM_POSTS.map((p) => ({
    id: p.id,
    x: p.x,
    z: p.z,
    hx: p.diameter / 2 + 0.04,
    hz: p.diameter / 2 + 0.04,
    h: p.h,
  })),
  ...RIM_DEBRIS.map((d) => ({
    id: d.id,
    x: d.x,
    z: d.z,
    hx: d.w / 2,
    hz: d.d / 2,
    h: d.h,
  })),
];

export function collidersFor(kind: "packs" | "primitives"): readonly Aabb2[] {
  const depot = kind === "packs" ? PACK_COLLIDERS : PRIMITIVE_COLLIDERS;
  return [...depot, ...RIM_COLLIDERS];
}
