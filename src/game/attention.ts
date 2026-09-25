/**
 * Pure attention math used by every stage. No three.js scene state here —
 * only vectors in, numbers out, so it is easy to explain and verify.
 */
import * as THREE from "three";

/** Width of the "flashlight cone" used for aiming, in degrees. */
export const AIM_WIDTH_DEG = 12;
/** Softmax temperature. Lower = sharper attention. */
export const TEMPERATURE = 0.15;

/**
 * aim_i = exp(-(angle_i / 12°)^2)
 * angle_i = angle between the flashlight forward direction and the
 * direction from the flashlight to the token.  1 = dead center, ~0 = off.
 */
export function aim(origin: THREE.Vector3, dir: THREE.Vector3, target: THREE.Vector3): number {
  const to = _v.copy(target).sub(origin).normalize();
  const cos = THREE.MathUtils.clamp(to.dot(dir), -1, 1);
  const angleDeg = THREE.MathUtils.radToDeg(Math.acos(cos));
  return Math.exp(-Math.pow(angleDeg / AIM_WIDTH_DEG, 2));
}
const _v = new THREE.Vector3();

/**
 * score_i = keyMatch_i * (0.3 + 0.7 * aim_i)
 * The key match is what the token offers; aiming boosts it.
 */
export function score(keyMatch: number, aimValue: number): number {
  return keyMatch * (0.3 + 0.7 * aimValue);
}

/**
 * weights = softmax(score_i / T) over visible tokens.
 * Masked tokens (behind the causal wall) get exactly 0.
 * Result always sums to 1 (100%).
 */
export function softmax(scores: number[], masked?: boolean[], temperature = TEMPERATURE): number[] {
  let max = -Infinity;
  scores.forEach((s, i) => {
    if (!masked?.[i]) max = Math.max(max, s / temperature);
  });
  const exps = scores.map((s, i) => (masked?.[i] ? 0 : Math.exp(s / temperature - max)));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

/**
 * Round weights to integer percentages that add up to exactly 100
 * (largest remainder method) for the attention meter.
 */
export function toPercents(weights: number[]): number[] {
  const raw = weights.map((w) => w * 100);
  const floors = raw.map(Math.floor);
  let rest = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (rest <= 0) break;
    if (weights[i] > 0) {
      floors[i]++;
      rest--;
    }
  }
  return floors;
}

/**
 * newColor = normalize(0.4 * original + 0.6 * Σ weight_i * value_i)
 * Weights already sum to 1, so the mix stays in range; we clamp to [0,1].
 */
export function mixRepresentation(original: THREE.Color, weights: number[], values: THREE.Color[]): THREE.Color {
  const out = original.clone().multiplyScalar(0.4);
  const v = new THREE.Color(0, 0, 0);
  weights.forEach((w, i) => v.add(values[i].clone().multiplyScalar(w)));
  out.add(v.multiplyScalar(0.6));
  out.r = Math.min(1, out.r);
  out.g = Math.min(1, out.g);
  out.b = Math.min(1, out.b);
  return out;
}
