import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { PLAYER_HEIGHT, PLAYER_RADIUS } from "../data/player";

export type RemoteActor = {
  name: string;
  mesh: Mesh;
  destX: number;
  destZ: number;
};

let remoteSeq = 1;

export function createRemoteStalker(scene: Scene, name: string, x: number, z: number): RemoteActor {
  const id = `remote_${remoteSeq++}`;
  const mesh = MeshBuilder.CreateCapsule(
    id,
    { height: PLAYER_HEIGHT, radius: PLAYER_RADIUS, tessellation: 8 },
    scene,
  );
  mesh.position = new Vector3(x, PLAYER_HEIGHT / 2, z);
  mesh.isPickable = false;

  const mat = new StandardMaterial(`${id}_mat`, scene);
  mat.diffuseColor = new Color3(0.4, 0.48, 0.28);
  mat.specularColor = new Color3(0.05, 0.05, 0.04);
  mesh.material = mat;

  const label = MeshBuilder.CreatePlane(`${id}_name`, { width: 1.8, height: 0.32 }, scene);
  label.parent = mesh;
  label.position.y = PLAYER_HEIGHT / 2 + 0.4;
  label.billboardMode = Mesh.BILLBOARDMODE_ALL;
  label.isPickable = false;
  const labelTexture = new DynamicTexture(`${id}_name_tex`, { width: 256, height: 64 }, scene, false);
  labelTexture.hasAlpha = true;
  const ctx = labelTexture.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = "rgba(12, 14, 10, 0.55)";
  ctx.fillRect(12, 8, 232, 48);
  ctx.font = "bold 26px sans-serif";
  ctx.fillStyle = "#e6d9a8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 128, 32);
  labelTexture.update();
  const labelMat = new StandardMaterial(`${id}_name_mat`, scene);
  labelMat.diffuseTexture = labelTexture;
  labelMat.emissiveColor = new Color3(0.7, 0.7, 0.65);
  labelMat.opacityTexture = labelTexture;
  labelMat.backFaceCulling = false;
  labelMat.disableLighting = true;
  label.material = labelMat;

  return { name, mesh, destX: x, destZ: z };
}

export function disposeRemote(actor: RemoteActor): void {
  actor.mesh.dispose(false, true);
}
