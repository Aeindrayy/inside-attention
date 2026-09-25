/**
 * Central model registry. Every GLB is loaded through here with a per-model
 * target size (largest dimension in meters after auto-fitting), rotation and
 * position offset — tune sizes in one place.
 *
 * `url: null` means the file isn't in /public/models yet: the primitive
 * fallback is used. Drop the GLB in and set the url to enable it.
 */
export type ModelKey =
  | "flashlight"
  | "token_crystal"
  | "attention_mirror"
  | "value_crystal"
  | "spark"
  | "causal_wall"
  | "prediction_portal"
  | "embedding_sphere"
  | "floating_platform"
  | "magical_ring"
  | "magical_floor";

export interface ModelDef {
  url: string | null;
  /** largest dimension after fitting, meters */
  size: number;
  rotation: [number, number, number];
  position: [number, number, number];
}

export const MODELS: Record<ModelKey, ModelDef> = {
  flashlight: { url: null, size: 0.22, rotation: [0, 0, 0], position: [0, 0, 0] },
  token_crystal: { url: "/models/token_crystal.glb", size: 0.42, rotation: [0, 0, 0], position: [0, 0, 0] },
  attention_mirror: { url: "/models/attention_mirror.glb", size: 0.38, rotation: [0, 0, 0], position: [0, 0, 0] },
  value_crystal: { url: "/models/value_crystal.glb", size: 0.16, rotation: [0, 0, 0], position: [0, 0, 0] },
  spark: { url: "/models/spark.glb", size: 0.22, rotation: [0, 0, 0], position: [0, 0, 0] },
  causal_wall: { url: null, size: 5, rotation: [0, 0, 0], position: [0, 0, 0] },
  prediction_portal: { url: "/models/prediction_portal.glb", size: 2.4, rotation: [0, 0, 0], position: [0, 0, 0] },
  embedding_sphere: { url: "/models/embedding_sphere.glb", size: 0.7, rotation: [0, 0, 0], position: [0, 0, 0] },
  floating_platform: { url: "/models/floating_platform.glb", size: 2.6, rotation: [0, 0, 0], position: [0, 0, 0] },
  magical_ring: { url: "/models/magical_ring.glb", size: 3, rotation: [0, 0, 0], position: [0, 0, 0] },
  magical_floor: { url: "/models/magical_floor.glb", size: 4, rotation: [0, 0, 0], position: [0, 0, 0] },
};

export const MODEL_URLS = Object.values(MODELS)
  .map((m) => m.url)
  .filter((u): u is string => !!u);

export const FONT_BOLD = "/fonts/Rajdhani-Bold.ttf";
export const FONT_MEDIUM = "/fonts/Rajdhani-Medium.ttf";
