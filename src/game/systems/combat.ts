import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Engine } from "@babylonjs/core/Engines/engine";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { ATTACK_RANGE } from "../../data/player";
import type { MonsterActor } from "../createMonsters";
import { setMonsterHpBar } from "../createMonsters";

export function rollDamage(attack: number): number {
  const roll = Math.floor(Math.random() * 5) - 2;
  return Math.max(1, attack + roll);
}

export function inAttackRange(player: Mesh, monster: MonsterActor): boolean {
  const dx = player.position.x - monster.mesh.position.x;
  const dz = player.position.z - monster.mesh.position.z;
  return Math.hypot(dx, dz) <= ATTACK_RANGE;
}

export function inMonsterMeleeRange(player: Mesh, monster: MonsterActor): boolean {
  const dx = player.position.x - monster.mesh.position.x;
  const dz = player.position.z - monster.mesh.position.z;
  return Math.hypot(dx, dz) <= monster.attackRadius;
}

export function applyHit(monster: MonsterActor, damage: number): void {
  monster.hp = Math.max(0, monster.hp - damage);
  setMonsterHpBar(monster);
}

export function projectToScreen(
  scene: Scene,
  engine: Engine,
  world: Vector3,
): { left: number; top: number } | null {
  const canvas = engine.getRenderingCanvas();
  if (!canvas) return null;
  const identity = Matrix.Identity();
  const projected = Vector3.Project(
    world,
    identity,
    scene.getTransformMatrix(),
    scene.activeCamera!.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
  );
  const rect = canvas.getBoundingClientRect();
  return {
    left: (projected.x / engine.getRenderWidth()) * rect.width,
    top: (projected.y / engine.getRenderHeight()) * rect.height,
  };
}
