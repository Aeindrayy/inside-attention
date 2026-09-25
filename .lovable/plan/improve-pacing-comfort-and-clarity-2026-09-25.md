# Improve pacing, comfort, and clarity

## What will change

- Add a **Pause / Resume** control to the top bar, plus Escape/P keyboard support. Pausing will freeze the lesson clock, interactions, narration, and ambient sound without losing progress.
- Remove bloom completely, including its top-bar control and rendering code.
- Add 10 seconds to automatic step dwell times and the safety auto-advance window so learners have longer to observe each idea.
- Replace the continuous low hum with quiet, occasional glass-like notes and soft airy texture, with silence between phrases.
- Replace the browser’s robotic speech with pre-generated, bundled humanlike Spark narration. Audio remains local during play and the existing voice toggle still works.
- Change every mirror light to a clear emerald green. The two Stage 5 flashlights stay blue and orange so the two heads remain distinguishable.
- Rebuild Step 3.4 as a compact waist-height “no peeking” gate instead of a dominant wall. Future tokens will be larger, brighter, and visibly locked at 0%, with a short sentence timeline showing past → now → future.
- Improve movement: desktop gets camera-relative W/S movement, A/D strafing, Q/E or arrow-key turning, right-drag looking, and scroll movement. Quest controllers get left-stick smooth movement and right-stick comfort snap-turn, while physical room-scale movement and tracked hands/controllers remain intact.

## Technical details

- Preserve the player token and flashlight as head/hand-relative objects so they naturally move with the learner.
- Clamp locomotion to the safe chamber area and pause movement while the lesson is paused.
- Keep all narration and ambient assets bundled so the app does not need a live service while being played.
- Validate the top bar, pause/resume timing, Stage 3.4 visibility, mirror color, desktop movement, and available XR movement code paths.
