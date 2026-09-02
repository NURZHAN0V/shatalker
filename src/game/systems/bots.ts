import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Aabb2 } from "../../data/colliders";
import { PATROL_SPAN } from "../../data/fakePlayers";
import { walkablePoint, tryMove } from "./collision";

export function randomPatrolPoint(radius: number, boxes: readonly Aabb2[]): { x: number; z: number } {
  return walkablePoint(
    (Math.random() * 2 - 1) * PATROL_SPAN,
    (Math.random() * 2 - 1) * PATROL_SPAN,
    radius,
    boxes,
  );
}

export function moveToward(
  mesh: Mesh,
  tx: number,
  tz: number,
  speed: number,
  dt: number,
  radius: number,
  boxes: readonly Aabb2[],
): boolean {
  const dx = tx - mesh.position.x;
  const dz = tz - mesh.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.2) return true;
  const step = Math.min(speed * dt, dist);
  const next = tryMove(mesh.position.x, mesh.position.z, (dx / dist) * step, (dz / dist) * step, radius, boxes);
  mesh.position.x = next.x;
  mesh.position.z = next.z;
  mesh.rotation.y = Math.atan2(dx, dz);
  return false;
}
