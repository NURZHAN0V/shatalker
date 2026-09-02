/** Existing Kenney City Kit (Industrial) files under public/assets. Do not invent paths. */
export const KENNEY_INDUSTRIAL_ROOT = "/assets/kenney/industrial/";

/** City-kit meshes are ~1 unit tall; one shared scale so a shed reads next to a 1.8 m capsule. */
export const KENNEY_SCALE = 8;

export const DEPOT_LOOKAT = { x: 18.5, z: 13.5 };

export type KenneyProp = {
  id: string;
  file: string;
  x: number;
  z: number;
  rotY?: number;
};

export const kenneyProps: ReadonlyArray<KenneyProp> = [
  { id: "depot_building_h", file: "building-h.glb", x: 22.2, z: 20.4, rotY: 0.35 },
  { id: "depot_building_k", file: "building-k.glb", x: 16.4, z: 22.6, rotY: -0.4 },
  { id: "depot_container_a", file: "shipping-container-a.glb", x: 20.6, z: 15.2 },
  { id: "depot_container_b", file: "shipping-container-b.glb", x: 24.4, z: 17.1, rotY: 1.05 },
  { id: "depot_tank", file: "detail-tank.glb", x: 18.1, z: 17.6, rotY: 0.7 },
  { id: "depot_chimney", file: "chimney-small.glb", x: 25.6, z: 21.4 },
  { id: "camp_chimney", file: "chimney-basic.glb", x: -9.6, z: -6.3 },
  { id: "camp_stack", file: "chimney-small.glb", x: -4.1, z: -8.2 },
];
