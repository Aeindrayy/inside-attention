import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useXRControllerLocomotion } from "@react-three/xr";
import type { Group } from "three";
import { useGame } from "@/game/useGameState";

const MAX_TRAVEL = 5.5;

/** Comfort locomotion: left stick moves, right stick snap-turns. */
export function XRLocomotion({ originRef }: { originRef: RefObject<Group | null> }) {
  const paused = useGame((s) => s.paused);
  useXRControllerLocomotion(
    originRef,
    paused ? false : { speed: 1.4 },
    paused ? false : { type: "snap", degrees: 30, deadZone: 0.55 },
    "left",
  );

  useFrame(() => {
    const origin = originRef.current;
    if (!origin) return;
    const radius = Math.hypot(origin.position.x, origin.position.z);
    if (radius > MAX_TRAVEL) {
      const scale = MAX_TRAVEL / radius;
      origin.position.x *= scale;
      origin.position.z *= scale;
    }
    origin.position.y = 0;
  });

  return null;
}