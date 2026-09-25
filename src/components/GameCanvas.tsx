import { Suspense, useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { XR, XROrigin } from "@react-three/xr";
import type { Group } from "three";
import { xrStore } from "@/xr";
import { useGLTF } from "@react-three/drei";
import { SpaceEnvironment } from "./Environment";
import { Stage } from "./Stage";
import { Spark } from "./Spark";
import { Fader } from "./Fader";
import { StartScreen } from "./StartScreen";
import { OperatorHUD } from "./OperatorHUD";
import { DesktopControls } from "@/input/DesktopControls";
import { XRInput } from "@/input/XRInput";
import { XRLocomotion } from "@/input/XRLocomotion";
import { useGame, useOperatorKeys, setState } from "@/game/useGameState";
import { MODEL_URLS } from "@/assets";


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

export function GameCanvas() {
  const phase = useGame((s) => s.phase);
  const originRef = useRef<Group>(null);
  useOperatorKeys();
  useEffect(() => {
    MODEL_URLS.forEach((u) => useGLTF.preload(u));
  }, []);
  return (
    <div className="fixed inset-0 bg-background">
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 1.6, 0], fov: 72, near: 0.05, far: 120 }} gl={{ antialias: true }}>
        <XR store={xrStore}>
          <XROrigin ref={originRef} />
          <XRSessionFlag />
          <DesktopControls />
          <XRLocomotion originRef={originRef} />
          <XRInput originRef={originRef} />
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
      </Canvas>
      {phase === "start" ? <StartScreen /> : <OperatorHUD />}
    </div>
  );
}
