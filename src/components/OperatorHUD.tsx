import { STEPS } from "@/data/scenario";
import { useGame, setState, next, prev, restart } from "@/game/useGameState";

/** Desktop-only operator overlay (stage name + step, demo keys, bloom toggle). */
export function OperatorHUD() {
  const i = useGame((s) => s.stepIndex);
  const muted = useGame((s) => s.muted);
  const voice = useGame((s) => s.voice);
  const bloom = useGame((s) => s.bloom);
  const active = useGame((s) => s.activeLight);
  const step = STEPS[i];
  return (
    <div className="pointer-events-none absolute inset-0 z-10 p-4">
      <div className="pointer-events-auto inline-block rounded-lg border border-border bg-card/70 px-4 py-3 backdrop-blur">
        <p className="font-display text-xs uppercase tracking-widest text-accent-glow">{step.stage}</p>
        <p className="font-display text-lg font-semibold text-foreground">
          Step {step.id} · {step.title}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <HudBtn onClick={prev}>B ◀</HudBtn>
          <HudBtn onClick={next}>N ▶</HudBtn>
          <HudBtn onClick={restart}>R restart</HudBtn>
          <HudBtn onClick={() => setState({ bloom: !bloom })} on={bloom}>Bloom</HudBtn>
        </div>
        <p className="mt-2 font-display text-xs text-muted-foreground">
          M {muted ? "muted" : "sound on"} · T voice {voice ? "on" : "off"}
          {step.lights === 2 && ` · Tab: mouse controls ${active === 1 ? "BLUE (left)" : "ORANGE (right)"}`}
        </p>
      </div>
    </div>
  );
}

function HudBtn({ children, onClick, on }: { children: React.ReactNode; onClick: () => void; on?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 font-display text-xs font-semibold uppercase tracking-wide transition ${on ? "border-accent-glow bg-accent-glow/25 text-foreground" : "border-border bg-secondary text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}
