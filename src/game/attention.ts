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
 * A compact transformer attention head used by the lesson. The vectors below
 * are local token embeddings (concept axes rather than final attention scores).
 * Every chart value is produced at runtime by Q/K projection, scaled dot
 * products, causal masking and softmax—the same attention operation used by a
 * Transformer, small enough to run every frame on a headset.
 */
const MODEL_DIM = 8;
type Vector = number[];
const ZERO = Array.from({ length: MODEL_DIM }, () => 0);
const EMBEDDINGS: Record<string, Vector> = {
  i: [0.4, 0, 0, 0, 0.2, 0, 0.5, 0],
  sat: [0.15, 1, 0, 0, 0.2, 0, 0.8, 0],
  on: [0, 0.1, 0.5, 0, 0.7, 0, 0, 0],
  the: [0, 0, 0, 0, 1, 0, 0, 0],
  river: [0.05, 0, 1, 0, 0, 0.1, 0, 0],
  bank: [0.1, 0, 0.9, 0.9, 0, 0, 0, 0],
  tired: [0.45, 0, 0, 0, 0, 1, 0.75, 0],
  old: [0.1, 0, 0, 0, 0, 0.75, 0.2, 0],
  cat: [0.8, 0, 0, 0, 0, 0.1, 1, 0],
  finally: [0, 0.25, 0, 0, 0.6, 0, 0, 0],
  deposited: [0.1, 0.75, 0, 0.8, 0.2, 0, 0.2, 0],
  money: [0.05, 0, 0, 1, 0, 0, 0, 0],
  at: [0, 0, 0.25, 0, 0.8, 0, 0, 0],
  animal: [0.9, 0, 0, 0, 0, 0.05, 1, 0],
  "didn't": [0, 0.25, 0, 0, 0.8, 0, 0, 0],
  cross: [0.1, 0.9, 0, 0, 0.15, 0, 0.2, 0],
  street: [0.15, 0, 0.8, 0, 0, 0, 0, 0],
  because: [0, 0, 0, 0, 0.9, 0, 0, 0],
  it: [0.55, 0, 0, 0, 0.7, 0, 0.7, 0],
  was: [0, 0.45, 0, 0, 1, 0, 0, 0],
  capital: [0, 0, 0.45, 0, 0.15, 0, 0, 0.85],
  of: [0, 0, 0, 0, 0.9, 0, 0, 0],
  france: [0.05, 0, 0.25, 0, 0, 0, 0, 1],
  is: [0, 0.35, 0, 0, 0.9, 0, 0, 0.55],
  warm: [0, 0, 0.2, 0, 0, 0.8, 0, 0],
  mat: [0.05, 0, 0.8, 0, 0, 0, 0, 0],
};

function fallbackEmbedding(word: string): Vector {
  const out = [...ZERO];
  for (let i = 0; i < word.length; i++) out[(word.charCodeAt(i) + i * 3) % MODEL_DIM] += 0.18;
  return out;
}

function embedding(word: string): Vector {
  return EMBEDDINGS[word.toLowerCase()] ?? fallbackEmbedding(word.toLowerCase());
}

function normalize(v: Vector): Vector {
  const length = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0)) || 1;
  return v.map((x) => x / length);
}

function project(v: Vector, head: 0 | 1, query: boolean): Vector {
  // Head 1 emphasizes agents/meaning; head 0 emphasizes grammar/actions.
  const scale = head === 1
    ? [1.35, 0.3, 0.7, 0.5, 0.25, 0.8, 1.5, 0.65]
    : [0.7, 1.15, 0.7, 0.8, 1.25, 0.55, 0.65, 0.9];
  return v.map((x, i) => x * (scale[i] ?? 1) * (query ? 3.2 : 3));
}

/** Live scaled dot-product attention. Masked positions are exactly zero. */
export function transformerAttention(
  words: string[],
  player: string,
  focus: number[],
  head: 0 | 1 = 0,
  masked?: boolean[],
): number[] {
  const base = embedding(player);
  const focused = [...ZERO];
  words.forEach((word, i) => {
    const strength = Math.pow(focus[i] ?? 0, 2) * 2.4;
    embedding(word).forEach((x, d) => { focused[d] += x * strength; });
  });
  const qInput = normalize(base.map((x, d) => x * 0.65 + focused[d]));
  const q = project(qInput, head, true);
  const scores = words.map((word, i) => {
    const positional = (i + 1) / Math.max(1, words.length) * 0.025;
    const k = project(normalize(embedding(word)), head, false);
    // The beam is an immediate query signal, so changing targets visibly
    // changes the scaled dot-product result in the same rendered frame.
    const beamSignal = Math.pow(focus[i] ?? 0, 1.25) * 1.8;
    return q.reduce((sum, x, d) => sum + x * k[d], 0) / Math.sqrt(MODEL_DIM) + beamSignal + positional;
  });
  return softmax(scores, masked, 1);
}

/** Baseline Q/K affinity used only to angle each mirror toward the learner. */
export function transformerAffinity(word: string, player: string, head: 0 | 1 = 0): number {
  const q = project(normalize(embedding(player)), head, true);
  const k = project(normalize(embedding(word)), head, false);
  const raw = q.reduce((sum, x, d) => sum + x * k[d], 0) / Math.sqrt(MODEL_DIM);
  return THREE.MathUtils.clamp((raw + 0.5) / 3.5, 0, 1);
}

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
