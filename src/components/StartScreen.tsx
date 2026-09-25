import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";
import { startGame } from "@/game/useGameState";
import { audio, startDrone } from "@/audio/sfx";
import { xrStore } from "./GameCanvas";

export function StartScreen() {
  const { progress, active } = useProgress();
  const [vr, setVr] = useState<boolean | null>(null);
  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported: (m: string) => Promise<boolean> } }).xr;
    if (!xr) return setVr(false);
    xr.isSessionSupported("immersive-vr").then(setVr).catch(() => setVr(false));
  }, []);
  const ready = !active && progress >= 100;
  const pct = Math.round(progress);

  const begin = (enterVR: boolean) => {
    audio();
    startDrone();
    startGame();
    if (enterVR) void xrStore.enterVR();
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,var(--overlay-mid),var(--overlay-edge))] px-6">
      <div className="w-full max-w-xl text-center">
        <p className="font-display text-sm uppercase tracking-[0.5em] text-accent-glow">A WebXR lesson in Transformers</p>
        <h1 className="mt-4 font-display text-6xl font-bold tracking-tight text-foreground md:text-7xl">Inside Attention</h1>
        <p className="mt-4 text-xl text-muted-foreground">Become a token. Discover how AI reads.</p>

        <div className="mx-auto mt-10 max-w-sm">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-accent-glow transition-all duration-300" style={{ width: `${ready ? 100 : pct}%` }} />
          </div>
          <p className="mt-2 font-display text-xs uppercase tracking-widest text-muted-foreground">
            {ready ? "Chamber ready" : `Loading models… ${pct}%`}
          </p>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            disabled={!vr}
            onClick={() => begin(true)}
            className="rounded-lg border border-accent-glow/60 bg-accent-glow/15 px-8 py-3 font-display text-lg font-semibold uppercase tracking-wider text-foreground transition hover:bg-accent-glow/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Enter VR
          </button>
          <button
            onClick={() => begin(false)}
            className="rounded-lg border border-border bg-secondary px-8 py-3 font-display text-lg font-semibold uppercase tracking-wider text-foreground transition hover:bg-muted"
          >
            Play on desktop
          </button>
        </div>
        {vr === false && <p className="mt-3 text-xs text-muted-foreground">VR needs a WebXR headset browser (e.g. Meta Quest) over HTTPS.</p>}
        <p className="mt-8 text-xs text-muted-foreground">
          Desktop: mouse aims · click = pinch · right-drag / A D to look · W S or scroll to move · Tab switches light
        </p>
      </div>
    </div>
  );
}
