import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { NPC_DIAMETER, NPC_HEIGHT, traderKefir } from "../data/npcs";

export type NpcActor = {
  id: string;
  name: string;
  mesh: Mesh;
  labelTexture: DynamicTexture;
};

export function createKefir(scene: Scene): NpcActor {
  const id = traderKefir.id;
  const mesh = MeshBuilder.CreateCylinder(
    id,
    { height: NPC_HEIGHT, diameter: NPC_DIAMETER, tessellation: 10 },
    scene,
  );
  mesh.position = new Vector3(traderKefir.x, NPC_HEIGHT / 2, traderKefir.z);

  const mat = new StandardMaterial(`${id}_mat`, scene);
  mat.diffuseColor = new Color3(0.72, 0.62, 0.28);
  mat.specularColor = new Color3(0.06, 0.05, 0.03);
  mesh.material = mat;

  const label = MeshBuilder.CreatePlane(`${id}_name`, { width: 2.2, height: 0.36 }, scene);
  label.parent = mesh;
  label.position.y = NPC_HEIGHT / 2 + 0.35;
  label.billboardMode = Mesh.BILLBOARDMODE_ALL;
  const labelTexture = new DynamicTexture(
    `${id}_name_tex`,
    { width: 512, height: 64 },
    scene,
    false,
  );
  labelTexture.hasAlpha = true;
  const ctx = labelTexture.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, 512, 64);
  ctx.fillStyle = "rgba(12, 14, 10, 0.55)";
  ctx.fillRect(24, 8, 464, 48);
  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = "#e6d9a8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(traderKefir.name, 256, 32);
  labelTexture.update();
  const labelMat = new StandardMaterial(`${id}_name_mat`, scene);
  labelMat.diffuseTexture = labelTexture;
  labelMat.emissiveColor = new Color3(0.7, 0.7, 0.65);
  labelMat.opacityTexture = labelTexture;
  labelMat.backFaceCulling = false;
  labelMat.disableLighting = true;
  label.material = labelMat;

  return { id, name: traderKefir.name, mesh, labelTexture };
}
