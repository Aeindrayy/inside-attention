/**
 * Stage + step state machine. A tiny external store (no extra deps) so both
 * React components and per-frame code can read it.
 */
import { useEffect, useSyncExternalStore } from "react";
import * as THREE from "three";
import {
  STEPS,
  SENTENCES,
  colorOf,
  HINT_AFTER,
  AUTO_ADVANCE_AFTER,
  WRONG_GUESS_LINE,
  COLORS,
  STEP_EXTRA_SECONDS,
  type Step,
} from "@/data/scenario";
import { mixRepresentation, transformerAttention } from "./attention";
import { chime, doorOpen, setMuted, setVoice, speak, whoosh, isMuted, isVoiceOn, crack, pauseAudio, resumeAudio, stopVoice } from "@/audio/sfx";

export interface GameState {
  phase: "start" | "playing";
  stepIndex: number;
  /** seconds (performance.now based) when the current step started */
  stepStart: number;
  fading: boolean;
  paused: boolean;
  pausedAt: number | null;
  repColor: string;
  repRiver: string | null;
  repMoney: string | null;
  portalChoice: string | null;
  flare: string | null;
  lineOverride: string[] | null;
  muted: boolean;
  voice: boolean;
  activeLight: 0 | 1;
  xr: boolean;
  /** Increments on every absorb to trigger fly animations. */
  absorbs: { id: number; from: string; color: string; head?: 0 | 1 }[];
}

const now = () => performance.now() / 1000;

let state: GameState = {
  phase: "start",
  stepIndex: 0,
  stepStart: 0,
  fading: false,
  paused: false,
  pausedAt: null,
  repColor: colorOf("bank"),
  repRiver: null,
  repMoney: null,
  portalChoice: null,
  flare: null,
  lineOverride: null,
  muted: false,
  voice: true,
  activeLight: 0,
  xr: false,
  absorbs: [],
};
const listeners = new Set<() => void>();
export const getState = () => state;
export function setState(p: Partial<GameState>) {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export function useGame<T>(sel: (s: GameState) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
}
export const currentStep = (): Step => STEPS[state.stepIndex];

/** Mutable per-frame data shared between the director and visuals. */
export const runtime = {
  weights: [[], []] as number[][],
  holdTime: [0, 0],
  headDone: [false, false],
  wallLook: 0,
  succeeded: false,
  pipelineLit: 0,
};

/* ---------- Narration timing ---------- */
export const lineDuration = (l: string) => Math.max(3, l.split(" ").length * 0.42 + 0.8);
export function linesFor(step: Step) {
  return state.lineOverride ?? step.lines;
}
export function narrationAt(step: Step, elapsed: number): { text: string; isHint: boolean; done: boolean } {
  const lines = linesFor(step);
  let t = elapsed;
  for (const l of lines) {
    if (t < lineDuration(l)) return { text: l, isHint: false, done: false };
    t -= lineDuration(l);
  }
  if (step.hint && (lines.length === 0 || elapsed > HINT_AFTER)) return { text: step.hint, isHint: true, done: true };
  return { text: lines[lines.length - 1] ?? "", isHint: false, done: true };
}
const spokenFor = { key: "" };

/* ---------- Transitions ---------- */
function needsFade(a: Step, b: Step) {
  return a.sentence !== b.sentence || a.stage !== b.stage;
}

export function goto(index: number) {
  index = THREE.MathUtils.clamp(index, 0, STEPS.length - 1);
  const from = currentStep();
  const to = STEPS[index];
  const apply = () => enterStep(index);
  if (state.phase === "playing" && needsFade(from, to) && index !== state.stepIndex) {
    setState({ fading: true });
    scheduleGameDelay(400, () => {
      apply();
      setState({ fading: false });
    });
  } else apply();
}

function enterStep(index: number) {
  const prev = currentStep();
  const step = STEPS[index];
  const patch: Partial<GameState> = {
    stepIndex: index,
    stepStart: now(),
    lineOverride: null,
    flare: null,
  };
  if (step.sentence && (prev.sentence !== step.sentence || index === 0)) {
    patch.repColor = colorOf(SENTENCES[step.sentence].player);
  }
  if (step.id === "1.1") patch.repColor = colorOf("bank");
  if (step.scene === "portals") patch.portalChoice = null;
  if (step.id === "3.1" || step.id === "1.1") patch.absorbs = [];
  runtime.holdTime = [0, 0];
  runtime.headDone = [false, false];
  runtime.wallLook = 0;
  runtime.succeeded = false;
  runtime.pipelineLit = 0;
  setState(patch);
  stopVoice();
  spokenFor.key = "";
}

export const next = () => goto(state.stepIndex + 1);
export const prev = () => goto(state.stepIndex - 1);
export function restart() {
  setState({ repRiver: null, repMoney: null, portalChoice: null, absorbs: [] });
  goto(0);
  enterStep(0);
}
export function startGame() {
  setState({ phase: "playing", paused: false, pausedAt: null });
  // Operator shortcut: ?step=4.1 jumps straight to a step.
  const id = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("step") : null;
  const i = id ? STEPS.findIndex((s) => s.id === id) : -1;
  enterStep(Math.max(0, i));
}

export function togglePause() {
  if (state.phase !== "playing") return;
  if (!state.paused) {
    setState({ paused: true, pausedAt: now() });
    void pauseAudio();
    return;
  }
  const pausedDuration = state.pausedAt === null ? 0 : now() - state.pausedAt;
  setState({ paused: false, pausedAt: null, stepStart: state.stepStart + pausedDuration });
  void resumeAudio();
}

function scheduleGameDelay(delayMs: number, action: () => void) {
  let remaining = delayMs;
  let last = performance.now();
  const timer = window.setInterval(() => {
    const current = performance.now();
    if (!state.paused) remaining -= current - last;
    last = current;
    if (remaining > 0) return;
    window.clearInterval(timer);
    action();
  }, 50);
}

/* ---------- Success actions ---------- */
function weightsForTarget(step: Step, target: string, head: 0 | 1 = 0) {
  const s = SENTENCES[step.sentence!];
  return transformerAttention(s.context, s.player, s.context.map((word) => word === target ? 1 : 0), head);
}

/** Absorb values from the current weights into the player representation. */
export function absorb(weights: number[], from: string) {
  const step = currentStep();
  const s = SENTENCES[step.sentence!];
  if (!s.values) return;
  const orig = new THREE.Color(colorOf(s.player));
  const vals = s.values.map((v) => new THREE.Color(v));
  const mixed = "#" + mixRepresentation(orig, weights, vals).getHexString();
  const idx = s.context.indexOf(from);
  whoosh();
  const patch: Partial<GameState> = {
    repColor: mixed,
    absorbs: [...state.absorbs, { id: Date.now(), from, color: s.values[idx] ?? "#fff" }],
  };
  if (step.sentence === "riverValues") patch.repRiver = mixed;
  if (step.sentence === "money") patch.repMoney = mixed;
  setState(patch);
}

export function succeed(forced = false) {
  if (runtime.succeeded) return;
  runtime.succeeded = true;
  const step = currentStep();
  const t = step.trigger;
  switch (t.type) {
    case "slab":
      crack();
      break;
    case "hold":
      setState({ flare: t.target });
      chime();
      if (step.id === "6.1") {
        whoosh();
        setState({ repColor: "#" + new THREE.Color(colorOf("is")).lerp(new THREE.Color("#5AA8FF"), 0.5).getHexString() });
      }
      break;
    case "weightHold":
      setState({ flare: t.target });
      chime();
      break;
    case "absorb":
      if (forced) absorb(weightsForTarget(step, t.target), t.target);
      chime();
      break;
    case "bothHeads": {
      const s = SENTENCES[step.sentence!];
      const mixed = new THREE.Color(colorOf(s.player))
        .multiplyScalar(0.4)
        .add(new THREE.Color(COLORS.headBlue).multiplyScalar(0.3))
        .add(new THREE.Color(COLORS.headOrange).multiplyScalar(0.3));
      whoosh();
      chime();
      setState({
        repColor: "#" + mixed.getHexString(),
        absorbs: [
          ...state.absorbs,
          { id: Date.now(), from: t.blue, color: COLORS.headBlue, head: 0 },
          { id: Date.now() + 1, from: t.orange, color: COLORS.headOrange, head: 1 },
        ],
      });
      break;
    }
    case "portal":
      if (forced && !state.portalChoice) setState({ portalChoice: "PARIS" });
      break;
    case "lookWall":
      chime();
      break;
  }
  const delay = t.type === "slab" ? 300 : t.type === "absorb" ? 1600 : t.type === "bothHeads" ? 1800 : 700;
  scheduleGameDelay(delay, () => {
    if (currentStep() === step) next();
  });
}

export function choosePortal(word: string) {
  if (state.portalChoice) return;
  setState({ portalChoice: word });
  doorOpen();
  chime();
  scheduleGameDelay(900, () => {
    goto(state.stepIndex + 1);
    if (word !== "PARIS") setState({ lineOverride: [WRONG_GUESS_LINE, "And the process repeats for the next token."] });
  });
}

/** Called every frame by the director. */
export function tickStep() {
  if (state.phase !== "playing" || state.fading || state.paused) return;
  const step = currentStep();
  const elapsed = now() - state.stepStart;
  const nar = narrationAt(step, elapsed);
  const key = step.id + nar.text;
  if (nar.text && spokenFor.key !== key) {
    spokenFor.key = key;
    speak(nar.text);
  }
  const t = step.trigger;
  if (t.type === "end") return;
  const lines = linesFor(step);
  const linesTotal = lines.reduce((a, l) => a + lineDuration(l), 0);
  if (t.type === "auto") {
    if (elapsed >= Math.max(linesTotal + 0.6, t.minSeconds ?? STEP_EXTRA_SECONDS) && !runtime.succeeded) {
      runtime.succeeded = true;
      next();
    }
    return;
  }
  if (elapsed > (step.autoAfter ?? AUTO_ADVANCE_AFTER) && !runtime.succeeded) succeed(true);
}

export const stepElapsed = () => now() - state.stepStart;

/* ---------- Operator keys ---------- */
export function useOperatorKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state.phase !== "playing") return;
      const k = e.key.toLowerCase();
      if (k === "n") next();
      else if (k === "b") prev();
      else if (k === "r") restart();
      else if (k === "p" || e.key === "Escape") togglePause();
      else if (k === "m") {
        setMuted(!isMuted());
        setState({ muted: isMuted() });
      } else if (k === "t") {
        setVoice(!isVoiceOn());
        setState({ voice: isVoiceOn() });
      } else if (e.key === "Tab") {
        e.preventDefault();
        setState({ activeLight: state.activeLight === 0 ? 1 : 0 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
