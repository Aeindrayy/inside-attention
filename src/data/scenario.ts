/**
 * All content for "Inside Attention" lives here: sentences, colors, keyMatch
 * values, value colors, head data, predictions and every narration line.
 * Edit this file to change the experience without touching game code.
 */

export type Source = "illustrative" | "transformer" | "gpt2";

export const COLORS = {
  background: "#05070F",
  accent: "#6CCBFF",
  headBlue: "#3AA0FF",
  headOrange: "#FF9A3A",
  river: "#3AA0FF",
  money: "#FFC23A",
  mirrorGreen: "#55E69B",
};

/** Starting (embedding) colors of tokens. */
export const START_COLORS: Record<string, string> = {
  I: "#9A8CFF",
  sat: "#FF9A3A",
  on: "#8FA3B8",
  the: "#7A8494",
  The: "#7A8494",
  river: "#3AA0FF",
  bank: "#9AA0A8",
  tired: "#B08CFF",
  old: "#8FB8A3",
  cat: "#FF7AA8",
  finally: "#8FA3B8",
  deposited: "#C8A070",
  money: "#E8C060",
  at: "#8FA3B8",
  animal: "#7AD0A0",
  "didn't": "#8FA3B8",
  cross: "#A0B0C8",
  street: "#9AA0A8",
  because: "#8FA3B8",
  it: "#A8A0D8",
  was: "#8FA3B8",
  capital: "#C0A8FF",
  of: "#8FA3B8",
  France: "#5AA8FF",
  is: "#9AA0A8",
  warm: "#FF8A6A",
  mat: "#A89A80",
};

export const colorOf = (w: string) => START_COLORS[w] ?? "#9AA0A8";

export interface Sentence {
  id: string;
  source: Source;
  /** Tokens before the player's token (the ones you can attend to). */
  context: string[];
  /** The player's own token. */
  player: string;
  /** keyMatch per context token (0-1), same order as `context`. */
  keyMatch?: number[];
  /** Second head keyMatch (stage 5). */
  keyMatch2?: number[];
  /** Value color per context token (stage 4). */
  values?: string[];
  /** Future tokens hidden behind the causal wall (stage 3). */
  future?: string[];
}

const s2Key = [0.1, 0.2, 0.1, 0.05, 0.95];

export const SENTENCES: Record<string, Sentence> = {
  river: {
    id: "river",
    source: "transformer",
    context: ["I", "sat", "on", "the", "river"],
    player: "bank",
    keyMatch: s2Key,
  },
  cat: {
    id: "cat",
    source: "transformer",
    context: ["The", "tired", "old", "cat", "finally"],
    player: "sat",
    keyMatch: [0.05, 0.35, 0.2, 0.95, 0.25],
    future: ["on", "the", "warm", "mat"],
  },
  riverValues: {
    id: "riverValues",
    source: "transformer",
    context: ["I", "sat", "on", "the", "river"],
    player: "bank",
    keyMatch: s2Key,
    values: ["#9A8CFF", "#FF9A3A", "#8FA3B8", "#7A8494", COLORS.river],
  },
  money: {
    id: "money",
    source: "transformer",
    context: ["I", "deposited", "money", "at", "the"],
    player: "bank",
    keyMatch: [0.1, 0.4, 0.95, 0.1, 0.05],
    values: ["#9A8CFF", "#E0B060", COLORS.money, "#8FA3B8", "#7A8494"],
  },
  animal: {
    id: "animal",
    source: "transformer",
    context: ["The", "animal", "didn't", "cross", "the", "street", "because", "it", "was"],
    player: "tired",
    keyMatch: [0.05, 0.95, 0.1, 0.1, 0.05, 0.3, 0.1, 0.5, 0.2],
    keyMatch2: [0.05, 0.1, 0.1, 0.05, 0.05, 0.05, 0.2, 0.4, 0.95],
  },
  france: {
    id: "france",
    source: "transformer",
    context: ["The", "capital", "of", "France"],
    player: "is",
    keyMatch: [0.05, 0.7, 0.1, 0.95],
  },
};

export const STAGE1_SENTENCE = "I sat on the river bank.";
export const STAGE1_TOKENS = ["I", "sat", "on", "the", "river", "bank"];

export const PREDICTIONS = [
  { word: "PARIS", p: 0.78 },
  { word: "LONDON", p: 0.08 },
  { word: "BERLIN", p: 0.04 },
  { word: "BANANA", p: 0.001 },
];

export const PIPELINE = [
  "Q (flashlight)",
  "K (mirrors)",
  "Softmax (shared light)",
  "V (colors)",
  "Updated representation",
  "Prediction",
];

export const FORMULA = "Attention(Q, K, V) = softmax( Q·Kᵀ / √dₖ ) · V";

export type Trigger =
  | { type: "auto"; minSeconds?: number }
  | { type: "slab" }
  | { type: "hold"; target: string }
  | { type: "weightHold"; target: string; weight: number }
  | { type: "lookWall" }
  | { type: "absorb"; target: string }
  | { type: "bothHeads"; blue: string; orange: string }
  | { type: "portal" }
  | { type: "end" };

export type Scene =
  | "slab"
  | "tokens1"
  | "become"
  | "attention"
  | "wall"
  | "values"
  | "compare"
  | "heads"
  | "headsBurst"
  | "corridor"
  | "portals"
  | "portalResult"
  | "pipeline"
  | "end";

export interface Step {
  id: string;
  stage: string;
  title: string;
  scene: Scene;
  sentence?: keyof typeof SENTENCES;
  lines: string[];
  hint?: string;
  trigger: Trigger;
  /** Number of flashlights: 0, 1 or 2. */
  lights: 0 | 1 | 2;
  meter?: boolean;
}

export const STEPS: Step[] = [
  // STAGE 1
  { id: "1.1", stage: "Stage 1 — Become a Token", title: "Sentence", scene: "slab", lights: 0,
    lines: ["A language model first breaks text into tokens."],
    hint: "Touch or click the sentence.", trigger: { type: "slab" } },
  { id: "1.2", stage: "Stage 1 — Become a Token", title: "Embeddings", scene: "tokens1", lights: 0,
    lines: ["Each token gets a starting representation."], trigger: { type: "auto", minSeconds: 5 } },
  { id: "1.3", stage: "Stage 1 — Become a Token", title: "You are 'bank'", scene: "become", lights: 0,
    lines: ["You are now the token 'bank'.", "Your starting representation doesn't know the context yet."],
    trigger: { type: "auto" } },
  // STAGE 2
  { id: "2.1", stage: "Stage 2 — Query + Keys", title: "Flashlight & mirrors", scene: "attention", sentence: "river", lights: 1,
    lines: ["Your flashlight is your query: what are you looking for?", "Each mirror is a key: what that token offers."],
    trigger: { type: "auto" } },
  { id: "2.2", stage: "Stage 2 — Query + Keys", title: "Find the match", scene: "attention", sentence: "river", lights: 1,
    lines: [], hint: "Shine your light on the words.", trigger: { type: "hold", target: "river" } },
  { id: "2.3", stage: "Stage 2 — Query + Keys", title: "Strong match", scene: "attention", sentence: "river", lights: 1,
    lines: ["A strong match means this token is relevant."], trigger: { type: "auto", minSeconds: 4 } },
  // STAGE 3
  { id: "3.1", stage: "Stage 3 — Softmax + Causal Mask", title: "New sentence", scene: "attention", sentence: "cat", lights: 1, meter: true,
    lines: ["Now you are 'sat'. Who did the sitting?"], trigger: { type: "auto" } },
  { id: "3.2", stage: "Stage 3 — Softmax + Causal Mask", title: "Softmax", scene: "attention", sentence: "cat", lights: 1, meter: true,
    lines: ["Your attention is shared. It always adds up to 100%.", "Softmax turns match scores into attention weights."],
    hint: "Sweep your light across the words.", trigger: { type: "weightHold", target: "cat", weight: 0.5 } },
  { id: "3.3", stage: "Stage 3 — Softmax + Causal Mask", title: "Turn around", scene: "wall", sentence: "cat", lights: 1, meter: true,
    lines: ["Now turn around."], hint: "Look behind you at the locked future words.", trigger: { type: "lookWall" } },
  { id: "3.4", stage: "Stage 3 — Softmax + Causal Mask", title: "Causal mask", scene: "wall", sentence: "cat", lights: 1, meter: true,
    lines: ["When writing the word 'sat', the next words do not exist yet.", "The small gate locks every future token at zero attention. This is the causal mask."],
    trigger: { type: "auto" } },
  // STAGE 4
  { id: "4.1", stage: "Stage 4 — Values Change the Token", title: "Values", scene: "values", sentence: "riverValues", lights: 1, meter: true,
    lines: ["Now we know what matters. Let's take information from it.", "Each token's value carries the information we take from it."],
    hint: "Aim at 'river' and pinch to absorb it.", trigger: { type: "absorb", target: "river" } },
  { id: "4.2", stage: "Stage 4 — Values Change the Token", title: "River bank", scene: "values", sentence: "riverValues", lights: 1, meter: true,
    lines: ["The value changes your representation. You are a river bank."], trigger: { type: "auto" } },
  { id: "4.3", stage: "Stage 4 — Values Change the Token", title: "Money bank", scene: "values", sentence: "money", lights: 1, meter: true,
    lines: [], hint: "Absorb what matters.", trigger: { type: "absorb", target: "money" } },
  { id: "4.4", stage: "Stage 4 — Values Change the Token", title: "Compare", scene: "compare", sentence: "money", lights: 0,
    lines: ["Same token. Different context. Different representation."], trigger: { type: "auto", minSeconds: 5 } },
  // STAGE 5
  { id: "5.1", stage: "Stage 5 — Multiple Heads", title: "Two heads", scene: "heads", sentence: "animal", lights: 2, meter: true,
    lines: ["Real Transformers use multiple attention heads.", "Each head looks for something different."],
    hint: "Try both lights. Desktop: Tab switches light.", trigger: { type: "bothHeads", blue: "animal", orange: "was" } },
  { id: "5.2", stage: "Stage 5 — Multiple Heads", title: "12 heads", scene: "headsBurst", sentence: "animal", lights: 0,
    lines: ["Each head learns different patterns."], trigger: { type: "auto", minSeconds: 5 } },
  // STAGE 6
  { id: "6.1", stage: "Stage 6 — Prediction", title: "Corridor", scene: "corridor", sentence: "france", lights: 1, meter: true,
    lines: ["Now use everything you've gathered."], hint: "Hold your light on 'France'.", trigger: { type: "hold", target: "France" } },
  { id: "6.2", stage: "Stage 6 — Prediction", title: "Choose the next token", scene: "portals", sentence: "france", lights: 1,
    lines: ["The model predicts what comes next."],
    hint: "Walk to or point at the word you think comes next, then pinch.", trigger: { type: "portal" } },
  { id: "6.3", stage: "Stage 6 — Prediction", title: "Next token", scene: "portalResult", sentence: "france", lights: 0,
    lines: ["And the process repeats for the next token."], trigger: { type: "auto", minSeconds: 5 } },
  // FINAL
  { id: "F.1", stage: "Final — Reveal the Mechanism", title: "Pipeline", scene: "pipeline", lights: 0,
    lines: ["You just experienced attention.", "Look. Weigh. Take information. Predict."], trigger: { type: "auto", minSeconds: 7 } },
  { id: "F.2", stage: "Final — Reveal the Mechanism", title: "The End", scene: "end", lights: 1,
    lines: ["Thanks for being a token."], trigger: { type: "end" } },
];

export const WRONG_GUESS_LINE = "Good guess! The model thinks differently. Look at the biggest door.";
export const HINT_AFTER = 20; // seconds
export const STEP_EXTRA_SECONDS = 10;
export const AUTO_ADVANCE_AFTER = 45; // safety timeout, extended for exploration
