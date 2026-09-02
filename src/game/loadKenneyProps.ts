import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_texture_transform";
import {
  KENNEY_INDUSTRIAL_ROOT,
  KENNEY_SCALE,
  kenneyProps,
  type KenneyProp,
} from "../data/props";

export type DecorKind = "packs" | "primitives";

const MIN_PACKS = 2;

export async function applyKenneyDecor(
  scene: Scene,
  primitiveDecor: TransformNode,
): Promise<DecorKind> {
  const loaded = await Promise.all(kenneyProps.map((prop) => importProp(scene, prop)));
  const count = loaded.filter(Boolean).length;
  if (scene.isDisposed) {
    return "primitives";
  }
  if (count < MIN_PACKS) {
    return "primitives";
  }
  primitiveDecor.dispose(false, true);
  return "packs";
}

async function importProp(scene: Scene, prop: KenneyProp): Promise<boolean> {
  if (scene.isDisposed) {
    return false;
  }
  try {
    const result = await ImportMeshAsync(`${KENNEY_INDUSTRIAL_ROOT}${prop.file}`, scene);
    if (scene.isDisposed) {
      return false;
    }
    for (const light of result.lights) {
      light.dispose();
    }
    const root =
      result.transformNodes.find((n) => n.parent === null) ??
      result.meshes.find((n) => n.parent === null) ??
      result.meshes[0];
    if (!root) {
      return false;
    }
    root.name = prop.id;
    root.position.set(prop.x, 0, prop.z);
    root.rotation.y = prop.rotY ?? 0;
    root.scaling.x *= KENNEY_SCALE;
    root.scaling.y *= KENNEY_SCALE;
    root.scaling.z *= KENNEY_SCALE;
    for (const mesh of result.meshes) {
      mesh.isPickable = false;
      mesh.computeWorldMatrix(true);
      mesh.freezeWorldMatrix();
    }
    return true;
  } catch {
    return false;
  }
}
