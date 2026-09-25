# Improve the attention lesson

## What will change

- Replace the low humming drone with a soft, airy ambient bed using gentle sine tones and slow movement.
- Change every attention mirror’s light to one consistent pink, including the two-head lesson.
- Make Spark prefer warm, natural English system voices and tune its pace, pitch, and volume; keep a safe fallback when those voices are unavailable.
- Replace hand-authored chart values with a small, deterministic transformer attention engine that computes token embeddings, projected queries/keys, scaled dot-product scores, causal masking, and softmax live in the game. Flashlight aim will act as the player-controlled query focus, while the chart remains the output of the same transformer computation.
- Replace the giant causal wall with a readable token timeline: earlier words are available, the current word is marked “NOW,” and later words sit behind visible locked gates with 0% attention. Update Spark’s narration to explain the everyday rule: when predicting the next word, the model cannot peek ahead.

## Technical details

- Keep all inference local and lightweight so Quest performance and offline gameplay remain intact; no account, database, or remote AI call is introduced.
- Keep masked tokens mathematically fixed at zero and preserve integer percentages that total exactly 100%.
- Reuse the existing 3D interaction, timing, and fallback systems rather than changing game flow.
- Validate compilation, runtime console output, the mirror scene, and step 3.4 on desktop-sized and headset-shaped viewports.
