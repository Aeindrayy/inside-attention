import { STEPS } from "@/data/scenario";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame, next, prev, restart, togglePause } from "@/game/useGameState";

/** Desktop operator overlay with lesson controls. */
export function OperatorHUD() {
  const i = useGame((s) => s.stepIndex);
  const muted = useGame((s) => s.muted);
  const voice = useGame((s) => s.voice);
  const paused = useGame((s) => s.paused);
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
          <HudBtn onClick={prev} label="Previous step"><SkipBack /> B</HudBtn>
          <HudBtn onClick={togglePause} label={paused ? "Resume lesson" : "Pause lesson"} on={paused}>
            {paused ? <Play /> : <Pause />} {paused ? "Resume" : "Pause"}
          </HudBtn>
          <HudBtn onClick={next} label="Next step"><SkipForward /> N</HudBtn>
          <HudBtn onClick={restart} label="Restart lesson"><RotateCcw /> R</HudBtn>
        </div>
        <p className="mt-2 font-display text-xs text-muted-foreground">
          P / Esc {paused ? "resume" : "pause"} · M {muted ? "muted" : "sound on"} · T voice {voice ? "on" : "off"}
          {step.lights === 2 && ` · Tab: mouse controls ${active === 1 ? "BLUE (left)" : "ORANGE (right)"}`}
        </p>
      </div>
    </div>
  );
}

function HudBtn({ children, onClick, on, label }: { children: React.ReactNode; onClick: () => void; on?: boolean; label: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`border font-display text-xs font-semibold uppercase ${on ? "border-accent-glow bg-accent-glow/25 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </Button>
  );
}
