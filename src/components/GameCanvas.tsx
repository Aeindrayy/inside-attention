import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { XR, createXRStore } from "@react-three/xr";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useGLTF } from "@react-three/drei";
import { SpaceEnvironment } from "./Environment";
import { Stage } from "./Stage";
import { Spark } from "./Spark";
import { Fader } from "./Fader";
import { StartScreen } from "./StartScreen";
import { OperatorHUD } from "./OperatorHUD";
import { DesktopControls } from "@/input/DesktopControls";
import { XRInput } from "@/input/XRInput";
import { useGame, useOperatorKeys, setState } from "@/game/useGameState";
import { MODEL_URLS } from "@/assets";

export const xrStore = createXRStore({
  frameBufferScaleFactor: 1,
  emulate: false,
  hand: { rayPointer: false, grabPointer: false, touchPointer: false, teleportPointer: false },
  controller: { rayPointer: false, grabPointer: false, teleportPointer: false },
});

function XRSessionFlag() {
  const { gl } = useThree();
  useEffect(() => {
    const on = () => setState({ xr: true });
    const off = () => setState({ xr: false });
    gl.xr.addEventListener("sessionstart", on);
    gl.xr.addEventListener("sessionend", off);
    return () => {
      gl.xr.removeEventListener("sessionstart", on);
      gl.xr.removeEventListener("sessionend", off);
    };
  }, [gl]);
  return null;
}

function DesktopBloom() {
  const bloom = useGame((s) => s.bloom);
  const xr = useGame((s) => s.xr);
  if (!bloom || xr) return null;
  return (
    <EffectComposer>
      <Bloom intensity={0.9} luminanceThreshold={0.7} mipmapBlur />
    </EffectComposer>
  );
}

export function GameCanvas() {
  const phase = useGame((s) => s.phase);
  useOperatorKeys();
  useEffect(() => {
    MODEL_URLS.forEach((u) => useGLTF.preload(u));
  }, []);
  return (
    <div className="fixed inset-0 bg-background">
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 1.6, 0], fov: 60, near: 0.05, far: 120 }} gl={{ antialias: true }}>
        <XR store={xrStore}>
          <XRSessionFlag />
          <DesktopControls />
          <XRInput />
          <SpaceEnvironment />
          <Suspense fallback={null}>
            {phase === "playing" && (
              <>
                <Stage />
                <Spark />
              </>
            )}
          </Suspense>
          <Fader />
        </XR>
        <DesktopBloom />
      </Canvas>
      {phase === "start" ? <StartScreen /> : <OperatorHUD />}
    </div>
  );
}
