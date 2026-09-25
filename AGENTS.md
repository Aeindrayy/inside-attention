<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Attention charts use the local deterministic transformer layer in `src/game/attention.ts`; keep inference synchronous and lightweight to preserve Quest frame rate and offline play.
- XR locomotion moves an `XROrigin`; transform raw controller poses through that origin so room-scale tracking and flashlights stay aligned.
- Desktop arrow keys reserve up/down for forward/back movement and left/right for turning, matching spatial navigation expectations.
- Keep ambient AI decoration peripheral and draw-call-light so lesson objects stay unobstructed and Quest performance remains stable.
