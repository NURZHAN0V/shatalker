import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { HRYAK_HEIGHT, HRYAK_RADIUS, hryakTemplate } from "../data/monsters";

export type MonsterActor = {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  attackRadius: number;
  attackCooldown: number;
  attackCooldownLeft: number;
  expReward: number;
  mesh: Mesh;
  hpFill: Mesh;
  labelTexture: DynamicTexture;
  bodyMat: StandardMaterial;
};

let spawnSeq = 1;

export function createHryak(scene: Scene, x: number, z: number): MonsterActor {
  const id = `${hryakTemplate.id}_${spawnSeq++}`;
  const mesh = MeshBuilder.CreateCapsule(
    id,
    { height: HRYAK_HEIGHT, radius: HRYAK_RADIUS, tessellation: 8 },
    scene,
  );
  mesh.position = new Vector3(x, HRYAK_HEIGHT / 2, z);

  const mat = new StandardMaterial(`${id}_mat`, scene);
  mat.diffuseColor = new Color3(0.58, 0.22, 0.14);
  mat.specularColor = new Color3(0.06, 0.03, 0.02);
  mesh.material = mat;

  const barBg = MeshBuilder.CreatePlane(`${id}_hpbg`, { width: 1.1, height: 0.12 }, scene);
  barBg.parent = mesh;
  barBg.position.y = HRYAK_HEIGHT / 2 + 0.45;
  barBg.billboardMode = Mesh.BILLBOARDMODE_ALL;
  const bgMat = new StandardMaterial(`${id}_hpbg_mat`, scene);
  bgMat.diffuseColor = new Color3(0.08, 0.07, 0.05);
  bgMat.specularColor = Color3.Black();
  bgMat.disableLighting = true;
  barBg.material = bgMat;

  const hpFill = MeshBuilder.CreatePlane(`${id}_hpfill`, { width: 1, height: 0.08 }, scene);
  hpFill.parent = barBg;
  hpFill.position.z = -0.01;
  const fillMat = new StandardMaterial(`${id}_hpfill_mat`, scene);
  fillMat.diffuseColor = new Color3(0.72, 0.18, 0.14);
  fillMat.specularColor = Color3.Black();
  fillMat.disableLighting = true;
  hpFill.material = fillMat;

  const label = MeshBuilder.CreatePlane(`${id}_name`, { width: 1.4, height: 0.32 }, scene);
  label.parent = mesh;
  label.position.y = HRYAK_HEIGHT / 2 + 0.72;
  label.billboardMode = Mesh.BILLBOARDMODE_ALL;
  const labelTexture = new DynamicTexture(
    `${id}_name_tex`,
    { width: 256, height: 64 },
    scene,
    false,
  );
  labelTexture.hasAlpha = true;
  const ctx = labelTexture.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = "rgba(12, 14, 10, 0.55)";
  ctx.fillRect(16, 8, 224, 48);
  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = "#e6d9a8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(hryakTemplate.name, 128, 32);
  labelTexture.update();
  const labelMat = new StandardMaterial(`${id}_name_mat`, scene);
  labelMat.diffuseTexture = labelTexture;
  labelMat.emissiveColor = new Color3(0.7, 0.7, 0.65);
  labelMat.opacityTexture = labelTexture;
  labelMat.backFaceCulling = false;
  labelMat.disableLighting = true;
  label.material = labelMat;

  const actor: MonsterActor = {
    id,
    name: hryakTemplate.name,
    level: hryakTemplate.level,
    hp: hryakTemplate.hp,
    maxHp: hryakTemplate.maxHp,
    attack: hryakTemplate.attack,
    attackRadius: hryakTemplate.attackRadius,
    attackCooldown: hryakTemplate.attackCooldown,
    attackCooldownLeft: 0,
    expReward: hryakTemplate.expReward,
    mesh,
    hpFill,
    labelTexture,
    bodyMat: mat,
  };
  setMonsterHpBar(actor);
  return actor;
}

export function setMonsterHpBar(actor: MonsterActor): void {
  const t = Math.max(actor.hp / actor.maxHp, 0.001);
  actor.hpFill.scaling.x = t;
  actor.hpFill.position.x = (t - 1) * 0.5;
}

export function setMonsterSelected(actor: MonsterActor, selected: boolean): void {
  actor.bodyMat.emissiveColor = selected
    ? new Color3(0.35, 0.12, 0.06)
    : Color3.Black();
}

export function disposeMonster(actor: MonsterActor): void {
  actor.labelTexture.dispose();
  actor.mesh.dispose(false, true);
}
