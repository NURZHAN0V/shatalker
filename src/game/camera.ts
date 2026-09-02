import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { ArcRotateCameraPointersInput } from "@babylonjs/core/Cameras/Inputs/arcRotateCameraPointersInput";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

export function createFollowCamera(
  scene: Scene,
  canvas: HTMLCanvasElement,
  target: AbstractMesh,
): ArcRotateCamera {
  const camera = new ArcRotateCamera(
    "cam",
    -Math.PI / 2,
    1.15,
    11,
    target.position.clone(),
    scene,
  );
  camera.lowerRadiusLimit = 4;
  camera.upperRadiusLimit = 22;
  camera.lowerBetaLimit = 0.25;
  camera.upperBetaLimit = Math.PI / 2 - 0.12;
  camera.minZ = 0.2;
  camera.maxZ = 500;
  camera.panningSensibility = 0;
  camera.wheelDeltaPercentage = 0.01;
  camera.attachControl(canvas, true);
  camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");

  // Babylon 9 maps RMB (button 2) to pan by default. Pan is off
  // (panningSensibility = 0), so remap RMB to rotate or the camera does nothing.
  camera.movement.input.setInteraction("pointer", { button: 2 }, "rotate");

  const pointers = camera.inputs.attached.pointers;
  if (pointers instanceof ArcRotateCameraPointersInput) {
    pointers.buttons = [2];
  } else if (pointers && "buttons" in pointers) {
    (pointers as { buttons: number[] }).buttons = [2];
  }

  return camera;
}

export function cameraFlatBasis(camera: ArcRotateCamera): {
  forward: Vector3;
  right: Vector3;
} {
  const forward = camera.target.subtract(camera.position);
  forward.y = 0;
  if (forward.lengthSquared() < 0.0001) {
    forward.set(0, 0, 1);
  } else {
    forward.normalize();
  }
  const right = Vector3.Cross(Vector3.Up(), forward);
  if (right.lengthSquared() < 0.0001) {
    right.set(1, 0, 0);
  } else {
    right.normalize();
  }
  return { forward, right };
}
