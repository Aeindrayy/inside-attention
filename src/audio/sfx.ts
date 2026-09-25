/** All sounds are generated with the Web Audio API — no audio files. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let droneNodes: { osc: OscillatorNode[]; gain: GainNode; lfo: OscillatorNode } | null = null;

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

/** Soft ambient chord with a very slow breath-like swell. */
export function startDrone() {
  const c = audio();
  if (!c || !master || droneNodes) return;
  const gain = c.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(0.022, c.currentTime + 4);
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 760;
  f.Q.value = 0.35;
  const osc = [110, 164.81, 220].map((fr, i) => {
    const o = c.createOscillator();
    o.type = i === 1 ? "triangle" : "sine";
    o.frequency.value = fr;
    o.detune.value = i === 0 ? -4 : i === 2 ? 3 : 0;
    o.connect(f);
    o.start();
    return o;
  });
  const lfo = c.createOscillator();
  const lfoDepth = c.createGain();
  lfo.frequency.value = 0.07;
  lfoDepth.gain.value = 0.006;
  lfo.connect(lfoDepth).connect(gain.gain);
  lfo.start();
  f.connect(gain).connect(master);
  droneNodes = { osc, gain, lfo };
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
  if (!v && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}
export function speak(text: string) {
  if (!voiceOn || typeof speechSynthesis === "undefined" || muted) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices().filter((x) => x.lang.toLowerCase().startsWith("en"));
  const preferred = ["Samantha", "Ava", "Aria", "Jenny", "Google UK English Female", "Google US English"];
  const v = preferred.map((name) => voices.find((voice) => voice.name.includes(name))).find(Boolean)
    ?? voices.find((voice) => /natural|enhanced|premium/i.test(voice.name))
    ?? voices[0];
  if (v) u.voice = v;
  u.lang = "en-US";
  u.rate = 0.94;
  u.pitch = 1.03;
  u.volume = 0.88;
  speechSynthesis.speak(u);
}
