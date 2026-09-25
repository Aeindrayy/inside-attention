/** Shared world-space layout helpers (meters). Player stands at the origin. */
import * as THREE from "three";
import { input } from "@/input";
import { PREDICTIONS } from "@/data/scenario";

export const ARC_RADIUS = 2.5;
export const TOKEN_Y = 1.5;
export const MIRROR_OFFSET_Y = 0.42;
export const WALL_Z = 2.2;
export const FUTURE_Z = 3.05;
export const SPHERE_POS = new THREE.Vector3(-2.1, 1.5, -1.3);
export const SLAB_POS = new THREE.Vector3(0, 1.5, -2.3);
export const SLAB_SIZE = { w: 2.3, h: 0.36, d: 0.06 };

/** Tokens float in an arc ~2.5 m in front of the player at eye height. */
export function arcPositions(n: number, y = TOKEN_Y, radius = ARC_RADIUS): THREE.Vector3[] {
  const step = Math.min(0.26, 2.3 / Math.max(1, n - 1));
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i - (n - 1) / 2) * step;
    out.push(new THREE.Vector3(Math.sin(a) * radius, y, -Math.cos(a) * radius));
  }
  return out;
}

/** Future tokens behind the causal wall (mirror of an arc, behind the player). */
export function futurePositions(n: number): THREE.Vector3[] {
  return Array.from({ length: n }, (_, i) => new THREE.Vector3(((n - 1) / 2 - i) * 0.54, TOKEN_Y, FUTURE_Z));
}

/** Yaw-only forward and right vectors of the player's head. */
export function headFrame() {
  const f = new THREE.Vector3(input.headDir.x, 0, input.headDir.z);
  if (f.lengthSq() < 1e-4) f.set(0, 0, -1);
  f.normalize();
  const r = new THREE.Vector3(-f.z, 0, f.x);
  return { f, r };
}

/** The player's own token floats 0.6 m in front at chest height. */
export function repTarget(out = new THREE.Vector3()) {
  const { f } = headFrame();
  const desk = input.mode === "desktop";
  return out.copy(input.head).addScaledVector(f, desk ? 0.8 : 0.6).setY(input.head.y - (desk ? 0.42 : 0.45));
}

/** Portal layout at the end of the corridor, scaled by probability. */
export function portalLayout() {
  const heights = PREDICTIONS.map((p) => 0.6 + 1.9 * Math.sqrt(p.p / PREDICTIONS[0].p));
  const widths = heights.map((h) => h * 0.9);
  const gap = 0.3;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
  let x = -total / 2;
  return PREDICTIONS.map((p, i) => {
    const cx = x + widths[i] / 2;
    x += widths[i] + gap;
    return { ...p, h: heights[i], w: widths[i], pos: new THREE.Vector3(cx, 0, -5.5) };
  });
}
