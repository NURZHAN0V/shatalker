import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Aabb2 } from "../../data/colliders";
import { GRAVITY, GROUND_Y, JUMP_SPEED, PLAYER_HEIGHT } from "../../data/player";
import { cameraFlatBasis } from "../camera";
import type { InputState } from "../input";
import { tryMove } from "./collision";

export type JumpState = { vy: number };

export function tickMovement(
  dt: number,
  player: Mesh,
  camera: ArcRotateCamera,
  input: InputState,
  destination: Vector3 | null,
  marker: Mesh,
  speed: number,
  radius: number,
  boxes: readonly Aabb2[],
  jump: JumpState,
): Vector3 | null {
  const { forward, right } = cameraFlatBasis(camera);
  let vx = 0;
  let vz = 0;

  if (input.keys.has("KeyW")) {
    vx += forward.x;
    vz += forward.z;
  }
  if (input.keys.has("KeyS")) {
    vx -= forward.x;
    vz -= forward.z;
  }
  if (input.keys.has("KeyD")) {
    vx += right.x;
    vz += right.z;
  }
  if (input.keys.has("KeyA")) {
    vx -= right.x;
    vz -= right.z;
  }

  let dest = destination;
  if (input.moving) {
    dest = null;
  }

  let dx = 0;
  let dz = 0;
  if (vx !== 0 || vz !== 0) {
    const len = Math.hypot(vx, vz);
    vx /= len;
    vz /= len;
    dx = vx * speed * dt;
    dz = vz * speed * dt;
    player.rotation.y = Math.atan2(vx, vz);
  } else if (dest) {
    const tx = dest.x - player.position.x;
    const tz = dest.z - player.position.z;
    const dist = Math.hypot(tx, tz);
    if (dist < 0.12) {
      dest = null;
    } else {
      const step = Math.min(speed * dt, dist);
      dx = (tx / dist) * step;
      dz = (tz / dist) * step;
      player.rotation.y = Math.atan2(tx, tz);
    }
  }

  const grounded = player.position.y <= GROUND_Y + 0.02;
  if (input.keys.has("Space") && grounded) {
    jump.vy = JUMP_SPEED;
  }
  jump.vy -= GRAVITY * dt;
  player.position.y += jump.vy * dt;
  if (player.position.y <= GROUND_Y) {
    player.position.y = GROUND_Y;
    jump.vy = 0;
  }

  const feetY = player.position.y - PLAYER_HEIGHT / 2;
  const next = tryMove(player.position.x, player.position.z, dx, dz, radius, boxes, feetY);
  player.position.x = next.x;
  player.position.z = next.z;

  if (dest) {
    const left = Math.hypot(dest.x - player.position.x, dest.z - player.position.z);
    if (left < 0.12) dest = null;
  }

  if (dest) {
    marker.position.x = dest.x;
    marker.position.z = dest.z;
    marker.setEnabled(true);
  } else {
    marker.setEnabled(false);
  }

  return dest;
}
