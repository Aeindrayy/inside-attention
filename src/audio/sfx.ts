/** All sounds are generated with the Web Audio API — no audio files. */
import { SPARK_VOICE } from "./sparkVoice";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let ambientStarted = false;
let ambientTimer: ReturnType<typeof setTimeout> | null = null;
let currentVoice: HTMLAudioElement | null = null;

export function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
  if (m) stopVoice();
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05);
}
export const isMuted = () => muted;

function noiseBuffer(c: AudioContext, seconds: number) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function tone(freq: number, start: number, dur: number, vol = 0.15, type: OscillatorType = "sine") {
  const c = audio();
  if (!c || !master) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(master);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

/** Short noise burst with a fast decay. */
export function crack() {
  const c = audio();
  if (!c || !master) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.4);
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 1200;
  const g = c.createGain();
  g.gain.setValueAtTime(0.6, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
  src.connect(f).connect(g).connect(master);
  src.start();
}

/** Success chime: two sine tones. */
export function chime() {
  tone(880, 0, 0.6, 0.14);
  tone(1318.5, 0.12, 0.8, 0.12);
}

/** Absorb whoosh: filtered noise sweep. */
export function whoosh() {
  const c = audio();
  if (!c || !master) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 1);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 3;
  f.frequency.setValueAtTime(300, c.currentTime);
  f.frequency.exponentialRampToValueAtTime(3000, c.currentTime + 0.8);
  const g = c.createGain();
  g.gain.setValueAtTime(0.001, c.currentTime);
  g.gain.linearRampToValueAtTime(0.4, c.currentTime + 0.3);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.9);
  src.connect(f).connect(g).connect(master);
  src.start();
}

/** Door open: rising tone. */
export function doorOpen() {
  const c = audio();
  if (!c || !master) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(180, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(900, c.currentTime + 1.2);
  g.gain.setValueAtTime(0.001, c.currentTime);
  g.gain.linearRampToValueAtTime(0.18, c.currentTime + 0.2);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.4);
  o.connect(g).connect(master);
  o.start();
  o.stop(c.currentTime + 1.5);
}

/** Sparse glass-like ambient notes with restful silence between phrases. */
export function startAmbience() {
  const c = audio();
  if (!c || !master || ambientStarted) return;
  ambientStarted = true;
  const notes = [293.66, 369.99, 440, 554.37, 659.25];
  const phrase = () => {
    if (!ctx || !master || ctx.state === "suspended") {
      ambientTimer = setTimeout(phrase, 2000);
      return;
    }
    const base = Math.floor(Math.random() * (notes.length - 2));
    [notes[base], notes[base + 2]].forEach((frequency, i) => {
      const oscillator = ctx?.createOscillator();
      const gain = ctx?.createGain();
      if (!oscillator || !gain || !ctx || !master) return;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.018, ctx.currentTime + 0.35 + i * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.8 + i * 0.7);
      oscillator.connect(gain).connect(master);
      oscillator.start(ctx.currentTime + i * 0.7);
      oscillator.stop(ctx.currentTime + 4.1 + i * 0.7);
    });
    ambientTimer = setTimeout(phrase, 8500 + Math.random() * 4500);
  };
  ambientTimer = setTimeout(phrase, 1200);
}

/** Mirror hums: soft sine oscillators whose volume and pitch follow weights. */
const hums: { o: OscillatorNode; g: GainNode }[] = [];
export function setHums(weights: number[]) {
  const c = ctx;
  if (!c || !master) return;
  while (hums.length < weights.length) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    g.gain.value = 0;
    o.connect(g).connect(master);
    o.start();
    hums.push({ o, g });
  }
  hums.forEach((h, i) => {
    const w = weights[i] ?? 0;
    h.g.gain.setTargetAtTime(w * 0.035, c.currentTime, 0.08);
    h.o.frequency.setTargetAtTime(180 + i * 23 + w * 220, c.currentTime, 0.08);
  });
}

/* ---------- Speech ---------- */
let voiceOn = true;
export const isVoiceOn = () => voiceOn;
export function setVoice(v: boolean) {
  voiceOn = v;
  if (!v) stopVoice();
}
export function speak(text: string) {
  if (!voiceOn || muted || typeof Audio === "undefined") return;
  stopVoice();
  const src = SPARK_VOICE[text];
  if (!src) return;
  currentVoice = new Audio(src);
  currentVoice.volume = 0.9;
  currentVoice.addEventListener("ended", () => { currentVoice = null; }, { once: true });
  void currentVoice.play().catch(() => { currentVoice = null; });
}

export function stopVoice() {
  if (!currentVoice) return;
  currentVoice.pause();
  currentVoice.currentTime = 0;
  currentVoice = null;
}

export async function pauseAudio() {
  currentVoice?.pause();
  if (ctx?.state === "running") await ctx.suspend();
}

export async function resumeAudio() {
  if (ctx?.state === "suspended") await ctx.resume();
  if (voiceOn && !muted && currentVoice?.paused) void currentVoice.play().catch(() => undefined);
}
