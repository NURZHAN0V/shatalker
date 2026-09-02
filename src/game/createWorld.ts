import { Color3, Color4, Vector3 } from "@babylonjs/core/Maths/math";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import {
  FOG,
  FOG_DENSITY,
  GROUND_DIRT_A,
  GROUND_DIRT_B,
  GROUND_SUBDIVISIONS,
  SKY_DIAMETER,
  SKY_SEGMENTS,
  SKY_TEX,
} from "../data/atmosphere";
import { ANOMALIES, ANOMALY_EMISSIVE, RIM_DEBRIS, RIM_POSTS } from "../data/decor";

export type World = {
  ground: Mesh;
  sky: Mesh;
  primitiveDecor: TransformNode;
  rimDecor: TransformNode;
  anomalies: TransformNode;
};

export const WORLD_SIZE = 80;

export function createWorld(scene: Scene): World {
  const fog = new Color3(FOG.r, FOG.g, FOG.b);
  scene.clearColor = new Color4(fog.r, fog.g, fog.b, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogColor = fog;
  scene.fogDensity = FOG_DENSITY;

  const hemi = new HemisphericLight("hemi", new Vector3(0.15, 1, 0.2), scene);
  hemi.intensity = 0.72;
  hemi.diffuse = new Color3(0.82, 0.84, 0.72);
  hemi.groundColor = new Color3(0.22, 0.22, 0.18);

  const sun = new DirectionalLight("sun", new Vector3(-0.35, -1, -0.2), scene);
  sun.intensity = 0.32;
  sun.diffuse = new Color3(0.9, 0.88, 0.7);

  const sky = createSkyDome(scene);
  const ground = createDirtGround(scene);
  const primitiveDecor = placeCampAndDepot(scene);
  const rimDecor = placeRim(scene);
  const anomalies = placeAnomalies(scene);

  return { ground, sky, primitiveDecor, rimDecor, anomalies };
}

function createSkyDome(scene: Scene): Mesh {
  const sky = MeshBuilder.CreateSphere(
    "skyDome",
    {
      diameter: SKY_DIAMETER,
      segments: SKY_SEGMENTS,
      sideOrientation: Mesh.BACKSIDE,
    },
    scene,
  );
  const mat = new StandardMaterial("skyMat", scene);
  mat.disableLighting = true;
  mat.fogEnabled = false;
  mat.disableDepthWrite = true;
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  mat.emissiveColor = Color3.Black();
  const tex = new Texture(SKY_TEX, scene, { noMipmap: true, invertY: false });
  tex.wrapU = Texture.CLAMP_ADDRESSMODE;
  tex.wrapV = Texture.CLAMP_ADDRESSMODE;
  mat.emissiveTexture = tex;
  sky.material = mat;
  sky.applyFog = false;
  sky.isPickable = false;
  sky.infiniteDistance = true;
  sky.ignoreCameraMaxZ = true;
  sky.alwaysSelectAsActiveMesh = true;
  return sky;
}

function createDirtGround(scene: Scene): Mesh {
  const ground = MeshBuilder.CreateGround(
    "ground",
    { width: WORLD_SIZE, height: WORLD_SIZE, subdivisions: GROUND_SUBDIVISIONS },
    scene,
  );
  paintGroundDirt(ground);
  const mat = new StandardMaterial("groundMat", scene);
  mat.diffuseColor = Color3.White();
  mat.specularColor = new Color3(0.04, 0.04, 0.03);
  ground.material = mat;
  ground.useVertexColors = true;
  ground.freezeWorldMatrix();
  return ground;
}

function paintGroundDirt(mesh: Mesh): void {
  const pos = mesh.getVerticesData(VertexBuffer.PositionKind);
  if (!pos) return;
  const half = WORLD_SIZE / 2;
  const colors = new Float32Array((pos.length / 3) * 4);
  for (let i = 0, c = 0; i < pos.length; i += 3, c += 4) {
    const x = pos[i];
    const z = pos[i + 2];
    const mix = 0.5 + 0.5 * Math.sin(x * 0.41) * Math.cos(z * 0.33);
    const edge = Math.max(Math.abs(x), Math.abs(z)) / half;
    const shade = 1 - edge * 0.18;
    colors[c] = (GROUND_DIRT_A.r + (GROUND_DIRT_B.r - GROUND_DIRT_A.r) * mix) * shade;
    colors[c + 1] = (GROUND_DIRT_A.g + (GROUND_DIRT_B.g - GROUND_DIRT_A.g) * mix) * shade;
    colors[c + 2] = (GROUND_DIRT_A.b + (GROUND_DIRT_B.b - GROUND_DIRT_A.b) * mix) * shade;
    colors[c + 3] = 1;
  }
  mesh.setVerticesData(VertexBuffer.ColorKind, colors);
}

function freezeProp(mesh: Mesh): void {
  mesh.isPickable = false;
  mesh.freezeWorldMatrix();
}

function placeCampAndDepot(scene: Scene): TransformNode {
  const root = new TransformNode("primitiveDecor", scene);

  const rust = new StandardMaterial("propRust", scene);
  rust.diffuseColor = new Color3(0.42, 0.26, 0.16);
  rust.specularColor = new Color3(0.05, 0.04, 0.03);

  const concrete = new StandardMaterial("propConcrete", scene);
  concrete.diffuseColor = new Color3(0.38, 0.38, 0.34);
  concrete.specularColor = new Color3(0.04, 0.04, 0.04);

  const pipeMat = new StandardMaterial("propPipe", scene);
  pipeMat.diffuseColor = new Color3(0.32, 0.3, 0.26);
  pipeMat.specularColor = new Color3(0.06, 0.05, 0.04);

  const depotBoxes: Array<{ x: number; z: number; w: number; h: number; d: number }> = [
    { x: 20, z: 18, w: 3.2, h: 2.2, d: 4 },
    { x: 22.4, z: 16.2, w: 1.6, h: 1.1, d: 1.8 },
    { x: 18.2, z: 20.5, w: 2.2, h: 2.8, d: 2 },
    { x: 21.2, z: 20.8, w: 1.2, h: 0.9, d: 2.4 },
    { x: 17.4, z: 16.8, w: 1.4, h: 1.6, d: 1.4 },
  ];
  depotBoxes.forEach((b, i) => {
    const box = MeshBuilder.CreateBox(`depot_${i}`, { width: b.w, height: b.h, depth: b.d }, scene);
    box.parent = root;
    box.position = new Vector3(b.x, b.h / 2, b.z);
    box.material = i % 2 === 0 ? rust : concrete;
    freezeProp(box);
  });

  const poles: Array<{ x: number; z: number; h: number }> = [
    { x: -8.6, z: -1.4, h: 3.1 },
    { x: -3.4, z: -7.2, h: 2.7 },
    { x: -9.2, z: -7.6, h: 3.4 },
    { x: -10.4, z: -3.2, h: 2.4 },
  ];
  poles.forEach((p, i) => {
    const pole = MeshBuilder.CreateCylinder(
      `pole_${i}`,
      { height: p.h, diameter: 0.22, tessellation: 8 },
      scene,
    );
    pole.parent = root;
    pole.position = new Vector3(p.x, p.h / 2, p.z);
    pole.material = rust;
    freezeProp(pole);
  });

  const pipeA = MeshBuilder.CreateCylinder(
    "pipe_a",
    { height: 6.5, diameter: 0.32, tessellation: 8 },
    scene,
  );
  pipeA.parent = root;
  pipeA.rotation.z = Math.PI / 2;
  pipeA.position = new Vector3(-11.2, 0.22, -2.2);
  pipeA.material = pipeMat;
  freezeProp(pipeA);

  const pipeB = MeshBuilder.CreateCylinder(
    "pipe_b",
    { height: 4.2, diameter: 0.24, tessellation: 8 },
    scene,
  );
  pipeB.parent = root;
  pipeB.rotation.x = Math.PI / 2;
  pipeB.position = new Vector3(-2.4, 0.18, -8.4);
  pipeB.material = pipeMat;
  freezeProp(pipeB);

  return root;
}

function placeRim(scene: Scene): TransformNode {
  const root = new TransformNode("rimDecor", scene);
  const rust = new StandardMaterial("rimRust", scene);
  rust.diffuseColor = new Color3(0.4, 0.24, 0.14);
  rust.specularColor = new Color3(0.05, 0.04, 0.03);
  const concrete = new StandardMaterial("rimJunk", scene);
  concrete.diffuseColor = new Color3(0.34, 0.33, 0.28);
  concrete.specularColor = new Color3(0.04, 0.04, 0.04);

  for (const p of RIM_POSTS) {
    const pole = MeshBuilder.CreateCylinder(
      p.id,
      { height: p.h, diameter: p.diameter, tessellation: 8 },
      scene,
    );
    pole.parent = root;
    pole.position = new Vector3(p.x, p.h / 2, p.z);
    pole.material = rust;
    freezeProp(pole);
  }
  RIM_DEBRIS.forEach((d, i) => {
    const box = MeshBuilder.CreateBox(d.id, { width: d.w, height: d.h, depth: d.d }, scene);
    box.parent = root;
    box.position = new Vector3(d.x, d.h / 2, d.z);
    box.material = i % 2 === 0 ? rust : concrete;
    freezeProp(box);
  });
  return root;
}

function placeAnomalies(scene: Scene): TransformNode {
  const root = new TransformNode("anomalies", scene);
  const mat = new StandardMaterial("anomalyMat", scene);
  mat.diffuseColor = new Color3(0.22, 0.26, 0.14);
  mat.emissiveColor = new Color3(ANOMALY_EMISSIVE.r, ANOMALY_EMISSIVE.g, ANOMALY_EMISSIVE.b);
  mat.specularColor = Color3.Black();
  mat.disableLighting = true;
  for (const a of ANOMALIES) {
    const ball = MeshBuilder.CreateSphere(a.id, { diameter: a.r * 2, segments: 8 }, scene);
    ball.parent = root;
    ball.position = new Vector3(a.x, a.r + 0.08, a.z);
    ball.material = mat;
    freezeProp(ball);
  }
  return root;
}
