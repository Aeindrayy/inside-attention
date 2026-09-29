# Remix of Attention Architect

Build a complete WebXR VR learning game called "Inside Attention" that teaches how Transformer attention works. The player becomes a token inside a sentence and experiences query, key, softmax, causal masking, values, multiple heads, and next-token prediction. Target device: Meta Quest 3 browser. It must also be fully playable on a desktop browser without a headset, for development and for showing the jury on a screen.

=== TECH STACK ===
- React + TypeScript + Vite (Lovable default)
- three.js via @react-three/fiber
- @react-three/drei (use its Text component for all 3D text, useGLTF for models)
- @react-three/xr (current v6 API: createXRStore, <XR store={store}>). Check the current docs if the API differs.
- No backend, no database, no external API calls. All data lives in a local TypeScript file.
- Do not use @react-three/postprocessing inside the XR session (it breaks or is too slow on Quest). Create the glowing look with emissive materials, additive-blended sprites and transparent meshes instead. Bloom is allowed only in desktop mode, behind a toggle.

=== ASSETS ===
GLB models are in /public/models/:
flashlight.glb, token_crystal.glb, attention_mirror.glb, value_crystal.glb, spark.glb, causal_wall.glb, prediction_portal.glb, embedding_sphere.glb, floating_platform.glb, magical_ring.glb, magical_floor.glb

Rules:
- Load every model through one central asset registry (src/assets.ts) with a per-model scale, rotation offset and position offset, so sizes can be tuned in one place.
- If a model fails to load, fall back to a simple primitive (cylinder for flashlight, rounded box for token crystal, torus for mirror frame, cone for value crystal, sphere for spark and embedding sphere, box for wall, arch made of boxes for portal, cylinder for platform, torus for ring, plane for floor) so the game never breaks.
- Preload all models on the start screen and show a loading bar.
- The attention mirror and prediction portal models have EMPTY centers. The code must place its own surface inside them: a circular disc in the mirror, an arch-shaped plane in the portal. These surfaces are what change brightness and color.
- The flashlight lens glow and the beam are separate code-made meshes attached to the flashlight model: a small emissive disc at the lens, and an open semi-transparent cone for the beam (additive blending, length about 3 m, opacity about 0.25).

=== VISUAL STYLE ===
Sophisticated, futuristic, premium sci-fi. Dark space (background near-black navy #05070F), subtle exponential fog, a glowing grid floor (use magical_floor.glb tiled, or a code grid shader if the model is too heavy), slowly drifting particles (instanced points), slowly rotating magical rings in the distance. Palette: brushed silver, graphite, deep navy, light-blue accents (#6CCBFF). Head colors: blue #3AA0FF and orange #FF9A3A. Value colors: river blue #3AA0FF, money gold #FFC23A.
The player stands on floating_platform.glb at the origin for the whole experience.

=== PERFORMANCE (Quest) ===
Target 72 fps. No real-time shadows. One ambient light, one directional light, at most three point lights. Use instancing for particles. Keep draw calls low. Use frustum culling. Dispose of objects when a stage ends. Set the XR framebuffer scale to about 1.0.

=== INPUT (three modes, all must work) ===
1. Hand tracking: the flashlight follows the right hand, pointing along the index-finger direction. Pinch (thumb + index) = "grab/absorb/confirm".
2. Controllers: flashlight follows the right controller's forward direction. Trigger = pinch.
3. Desktop: mouse aims the flashlight from the camera, left click = pinch, right-drag or WASD + mouse to look around, scroll to move forward and back.
In stage 5 there are two flashlights: left hand/controller = blue head, right = orange head. On desktop, press Tab to switch which flashlight the mouse controls.

Operator keys for the jury demo (desktop keyboard, also works while a headset is connected to the same page): N = next step, B = previous step, R = restart, M = mute, T = toggle voice.

=== CORE MECHANICS (implement once, reuse in every stage) ===

Tokens: each word is a token_crystal.glb with the word rendered on its front face using drei Text (white, bold, readable, facing the player). Tokens float in an arc about 2.5 m in front of the player at eye height, gently bobbing. Each token has a small position number badge above it.

Mirrors: during attention stages, each other token gets an attention_mirror.glb floating just above it, with a code-made disc in its empty center. Each mirror has a keyMatch value (0-1) from the data file. Mirrors visually rotate to face the player more directly the higher their keyMatch.

Attention scoring (per frame):
- aim_i = how directly the flashlight points at token i = exp(-(angle_i / 12deg)^2), where angle_i is the angle between the flashlight's forward direction and the direction from the flashlight to token i.
- score_i = keyMatch_i * (0.3 + 0.7 * aim_i)
- weights = softmax(score_i / 0.15) over all visible tokens (tokens behind the causal wall are excluded)
- Mirror disc brightness (emissive intensity) = weight_i, scaled so a weight of 1 is very bright.
- Each mirror emits a hum whose volume and pitch rise with its weight (Web Audio oscillators, soft sine, low volume).

Attention meter: a small floating panel attached to the flashlight showing a horizontal bar per token, with its word and percentage. The bars always add up to 100%. Label: "Attention (softmax)".

Hold detection: if the flashlight stays aimed at a target token (aim > 0.8) for 1.5 seconds, trigger that step's success.

Absorbing values: when a mirror has a value color (stages 4-5), pinching while aiming at it makes a value_crystal.glb tinted with that color detach from the mirror and fly to the player along the beam, followed by colored particles.

Player representation: the player's own token (a token_crystal.glb with their word) floats 0.6 m in front of them at chest height, always visible. Its color is updated after absorbing:
newColor = normalize( 0.4 * originalColor + 0.6 * sum_i (weight_i * valueColor_i) )
Animate the color change smoothly over 1.5 seconds. Show a small label under it: "Your representation".

Spark (AI guide): spark.glb, glowing, gently bobbing, orbiting slowly, positioned about 1 m to the upper left of the player's view. Spark's narration appears in a floating rounded panel next to it: dark translucent background, white text, max about 12 words per line, readable in VR. Each line also optionally plays through the Web Speech API (speechSynthesis) with an English voice, toggleable. A step waits for its trigger condition; if the player hasn't completed it after 20 seconds, show a hint line, and after 35 seconds auto-advance so the demo never gets stuck.

Transitions between stages: 400 ms fade to black and back. Never move the camera or the player's position automatically (prevents motion sickness). Change the environment around the player instead.

Sound: generate all sounds with the Web Audio API (no audio files): crack sound (short noise burst with a fast decay), success chime (two sine tones), absorb whoosh (filtered noise sweep), door open (rising tone), ambient low drone.

=== SCENARIO (one continuous chamber, the environment transforms) ===

Show at the top-left of the desktop view: stage name and step, for the operator.

START SCREEN: title "Inside Attention", subtitle "Become a token. Discover how AI reads.", buttons "Enter VR" and "Play on desktop", loading bar.

STAGE 1 — Become a Token (~25 s)
1. Dark room. The sentence "I sat on the river bank." floats in front of the player as one long glass slab (a flat, wide token_crystal.glb scaled horizontally, or a thin box with frosted glass material) with the full sentence text on it.
   Spark: "A language model first breaks text into tokens."
   Hint: "Touch or click the sentence."
2. Player touches (hand collision), pinches while aiming at it, or clicks → crack sound, the slab splits into six token crystals: I | sat | on | the | river | bank, which fly into the arc with position badges 1-6.
3. An embedding_sphere.glb appears to the side. Each token briefly flies past it and gets a starting color (I #9A8CFF, sat #FF9A3A, on #8FA3B8, the #7A8494, river #3AA0FF, bank #9AA0A8 gray).
   Spark: "Each token gets a starting representation."
4. The "bank" token flies to the player's chest position and becomes the player's representation.
   Spark: "You are now the token 'bank'."
   Spark: "Your starting representation doesn't know the context yet."

STAGE 2 — Query + Keys (~35 s)
1. The flashlight fades into the right hand. Mirrors appear above the other five tokens.
   Spark: "Your flashlight is your query: what are you looking for?"
   Spark: "Each mirror is a key: what that token offers."
2. Scoring is active. Hint: "Shine your light on the words."
3. When the player holds the light on "river" (hold detection) → the river mirror flares, success chime.
   Spark: "A strong match means this token is relevant."
   Show a small floating diagram for 3 seconds: "QUERY (flashlight) → KEY (mirror) → strong match".

STAGE 3 — Softmax + Causal Mask (~30 s)
1. Fade. New sentence "The tired old cat finally sat" (tokens: The | tired | old | cat | finally | sat). Player representation becomes "sat" (orange).
   Spark: "Now you are 'sat'. Who did the sitting?"
2. Attention meter is highlighted. Hint: "Sweep your light across the words."
   Spark: "Your attention is shared. It always adds up to 100%."
   Spark: "Softmax turns match scores into attention weights."
3. When the player has aimed at "cat" with weight > 50% for 1.5 s → success chime.
4. Spark: "Now turn around."
   Behind the player: causal_wall.glb, large, dark, semi-transparent. Behind it, the words "on the warm mat" float, faded to 20% opacity and slightly blurred/darkened. The flashlight beam is cut off at the wall (shorten the cone when it intersects the wall plane) and those tokens get zero weight.
   Continue when the player looks at the wall for 1.5 s (camera forward points toward the wall).
   Spark: "GPT cannot look through this wall."
   Spark: "It can only attend to tokens that came before. This is the causal mask."

STAGE 4 — Values Change the Token (~40 s, the main WOW moment)
1. Fade. Back to "I sat on the river bank." Player is "bank" again (gray).
   Spark: "Now we know what matters. Let's take information from it."
2. Each mirror now shows a value_crystal.glb in its value color. River's is blue.
   Spark: "Each token's value carries the information we take from it."
   Hint: "Aim at 'river' and pinch to absorb it."
3. Player absorbs → blue flows in, player representation animates gray → blue-gray, success chime.
   Spark: "The value changes your representation. You are a river bank."
4. Fade. New sentence "I deposited money at the bank." Player is gray "bank" again. Money's value is gold.
   Hint: "Absorb what matters."
5. Player absorbs money → gray → gold-gray.
6. Show both representations side by side in front of the player for 4 seconds: "bank (river)" blue-gray and "bank (money)" gold-gray.
   Spark: "Same token. Different context. Different representation."

STAGE 5 — Multiple Heads (~25 s)
1. Fade. Sentence: "The animal didn't cross the street because it was tired". Player is "tired".
   Two flashlights: left hand blue (head 1), right hand orange (head 2). Each token has two small mirrors, one per head, with separate keyMatch values per head (from data). Each flashlight uses its own scoring and its own meter.
   Spark: "Real Transformers use multiple attention heads."
   Spark: "Each head looks for something different."
2. Blue head finds "animal" (who is tired), orange head finds "was" (grammar). Hint: "Try both lights."
3. When both heads have held on their best token (or after the timeout) → player absorbs both, the representation shows both colors mixing.
   Spark: "Each head learns different patterns."
4. Burst effect: 12 thin colored beams briefly shoot out from the player to different tokens, with a label "GPT-2 small: 12 heads per layer".

STAGE 6 — Prediction (~40 s)
1. Fade. The environment transforms into a futuristic corridor: two rows of magical_ring.glb arches and pillars of light leading forward. Sentence: "The capital of France is". Player is "is".
   Spark: "Now use everything you've gathered."
2. One flashlight again. Relevant words (France, capital) brighten. When the player has held on "France" → absorb automatically.
   Spark: "The model predicts what comes next."
3. Four prediction_portal.glb doors rise at the end of the corridor (about 5 m away), side by side, each scaled by its probability (minimum visible size for small ones), with the word and percentage in large text above: PARIS 78%, LONDON 8%, BERLIN 4%, BANANA 0.1%.
   Hint: "Walk to or point at the word you think comes next, then pinch."
   Selection: physically walking within 1 m of a door, or aiming the flashlight at it and pinching, or clicking on desktop.
4. If the player chooses Paris: the portal surface lights up, door-open sound, particles, the word PARIS flies into the sentence after "is". If they choose another word: Spark: "Good guess! The model thinks differently. Look at the biggest door." and Paris then opens.
   Spark: "And the process repeats for the next token."
   A new empty token slot appears after "Paris" briefly and fades.

FINAL — Reveal the Mechanism (~15 s)
1. Everything freezes and dims. A glowing pipeline appears in front of the player, built from connected magical rings, each labeled, lighting up one by one with a chime:
   Q (flashlight) → K (mirrors) → Softmax (shared light) → V (colors) → Updated representation → Prediction
2. The formula appears below in large text: Attention(Q, K, V) = softmax( Q·Kᵀ / √dₖ ) · V
3. Spark: "You just experienced attention."
   Spark: "Look. Weigh. Take information. Predict."
4. Show "The End" with buttons "Play again" and "Exit VR".

=== DATA FILE ===
Put all sentences, tokens, colors, keyMatch values, value colors, head data, predictions and narration lines in src/data/scenario.ts so they can be edited without touching game code. Each stage has a field source: "illustrative" | "gpt2". When the source is "gpt2", show a small label near the sentence: "Real data from GPT-2".

Initial values (all source: "illustrative"):
Stage 2, player "bank": keyMatch I 0.1, sat 0.2, on 0.1, the 0.05, river 0.95
Stage 3, player "sat": The 0.05, tired 0.35, old 0.2, cat 0.95, finally 0.25
Stage 4a, player "bank": same keyMatch as stage 2; values: river #3AA0FF, others their starting colors
Stage 4b, player "bank" in "I deposited money at the bank.": I 0.1, deposited 0.4, money 0.95, at 0.1, the 0.05; values: money #FFC23A, deposited #E0B060, others their starting colors
Stage 5, player "tired": head 1 (blue) keyMatch: The 0.05, animal 0.95, didn't 0.1, cross 0.1, the 0.05, street 0.3, because 0.1, it 0.5, was 0.2; head 2 (orange): The 0.05, animal 0.1, didn't 0.1, cross 0.05, the 0.05, street 0.05, because 0.2, it 0.4, was 0.95
Stage 6, player "is": The 0.05, capital 0.7, of 0.1, France 0.95; predictions: Paris 0.78, London 0.08, Berlin 0.04, banana 0.001

=== CODE STRUCTURE ===
src/assets.ts (model registry, scales, fallbacks)
src/data/scenario.ts (all content)
src/game/useGameState.ts (stage + step state machine, triggers, hints, timeouts, operator keys)
src/game/attention.ts (pure functions: aim, scores, softmax, color mixing)
src/components/: Environment, Platform, Token, TokenArc, Mirror, Flashlight, AttentionMeter, PlayerRepresentation, Spark, NarrationPanel, CausalWall, PredictionPortals, PipelineReveal, Particles, Fader, StartScreen, OperatorHUD
src/audio/sfx.ts (Web Audio sound generation)
src/input/ (hand tracking, controllers, desktop mouse: one unified interface returning flashlight pose(s) and pinch events)

Keep attention math in pure, commented functions so the logic is easy to explain and verify.

=== ACCEPTANCE CHECKLIST ===
- Runs in desktop mode with mouse from start to end, including all six stages and the final reveal.
- "Enter VR" works on Quest 3 browser over HTTPS, with hand tracking and with controllers.
- Missing models fall back to primitives without errors.
- Attention meter percentages always add up to 100%.
- Tokens behind the causal wall always have 0% attention.
- No stage can get stuck: every step auto-advances after its timeout, and N/B/R work.
- All text is readable in the headset (large, high contrast, facing the player).
- Smooth frame rate on Quest (no shadows, no postprocessing in XR).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://token-mind-quest.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/086d23fa-dc53-46e8-92ff-67126ad2cf29).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
