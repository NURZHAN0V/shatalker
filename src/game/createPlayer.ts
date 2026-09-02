import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PLAYER_HEIGHT, PLAYER_RADIUS } from "../data/player";

export function createPlayer(scene: Scene, x = 0, z = 0): Mesh {
  const mesh = MeshBuilder.CreateCapsule(
    "player",
    { height: PLAYER_HEIGHT, radius: PLAYER_RADIUS, tessellation: 8 },
    scene,
  );
  mesh.position = new Vector3(x, PLAYER_HEIGHT / 2, z);

  const mat = new StandardMaterial("playerMat", scene);
  mat.diffuseColor = new Color3(0.4, 0.48, 0.28);
  mat.specularColor = new Color3(0.05, 0.05, 0.04);
  mesh.material = mat;

  return mesh;
}
