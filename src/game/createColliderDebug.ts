import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { Aabb2 } from "../data/colliders";

export function createColliderDebug(scene: Scene, boxes: readonly Aabb2[]): TransformNode {
  const root = new TransformNode("colliderDebug", scene);
  const mat = new StandardMaterial("colliderDebugMat", scene);
  mat.diffuseColor = new Color3(0.42, 0.5, 0.22);
  mat.emissiveColor = new Color3(0.18, 0.22, 0.08);
  mat.specularColor = Color3.Black();
  mat.alpha = 0.28;
  mat.transparencyMode = 2;
  mat.backFaceCulling = false;
  mat.disableLighting = true;

  for (const box of boxes) {
    const h = box.h;
    const mesh = MeshBuilder.CreateBox(
      `col_${box.id}`,
      { width: box.hx * 2, height: h, depth: box.hz * 2 },
      scene,
    );
    mesh.parent = root;
    mesh.position.x = box.x;
    mesh.position.y = h / 2;
    mesh.position.z = box.z;
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.freezeWorldMatrix();
  }

  root.setEnabled(false);
  return root;
}

export function disposeColliderDebug(root: TransformNode | null): void {
  root?.dispose(false, true);
}
