import { WORLD_HALF, type Aabb2 } from "../../data/colliders";

export function clampToWorld(x: number, z: number, radius: number): { x: number; z: number } {
  const lim = WORLD_HALF - radius;
  return {
    x: Math.max(-lim, Math.min(lim, x)),
    z: Math.max(-lim, Math.min(lim, z)),
  };
}

function separateCircleAabb(x: number, z: number, radius: number, box: Aabb2): { x: number; z: number } {
  const minX = box.x - box.hx;
  const maxX = box.x + box.hx;
  const minZ = box.z - box.hz;
  const maxZ = box.z + box.hz;
  const qx = Math.max(minX, Math.min(maxX, x));
  const qz = Math.max(minZ, Math.min(maxZ, z));
  const dx = x - qx;
  const dz = z - qz;
  const d2 = dx * dx + dz * dz;

  if (d2 > 1e-8) {
    const d = Math.sqrt(d2);
    if (d >= radius) return { x, z };
    const s = (radius - d) / d;
    return { x: x + dx * s, z: z + dz * s };
  }

  const toMinX = x - minX;
  const toMaxX = maxX - x;
  const toMinZ = z - minZ;
  const toMaxZ = maxZ - z;
  const minPen = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
  if (minPen === toMinX) return { x: minX - radius, z };
  if (minPen === toMaxX) return { x: maxX + radius, z };
  if (minPen === toMinZ) return { x, z: minZ - radius };
  return { x, z: maxZ + radius };
}

function resolveOverlaps(
  x: number,
  z: number,
  radius: number,
  boxes: readonly Aabb2[],
  feetY: number,
): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (let pass = 0; pass < 2; pass++) {
    for (const box of boxes) {
      if (feetY >= box.h - 0.04) continue;
      const next = separateCircleAabb(px, pz, radius, box);
      px = next.x;
      pz = next.z;
    }
  }
  return clampToWorld(px, pz, radius);
}

export function tryMove(
  x: number,
  z: number,
  dx: number,
  dz: number,
  radius: number,
  boxes: readonly Aabb2[],
  feetY = 0,
): { x: number; z: number } {
  const afterX = resolveOverlaps(x + dx, z, radius, boxes, feetY);
  return resolveOverlaps(afterX.x, afterX.z + dz, radius, boxes, feetY);
}

export function walkablePoint(
  x: number,
  z: number,
  radius: number,
  boxes: readonly Aabb2[],
): { x: number; z: number } {
  const clamped = clampToWorld(x, z, radius);
  return resolveOverlaps(clamped.x, clamped.z, radius, boxes, 0);
}
