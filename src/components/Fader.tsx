import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { input } from "@/input";
import { getState } from "@/game/useGameState";

/** 400 ms fade to black: a small inverted sphere around the head (works in XR). */
export function Fader() {
  const m = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    if (!m.current || !mat.current) return;
    m.current.position.copy(input.head);
    const target = getState().fading ? 1 : 0;
    const o = mat.current.opacity;
    mat.current.opacity = target > o ? Math.min(1, o + dt / 0.4) : Math.max(0, o - dt / 0.4);
    m.current.visible = mat.current.opacity > 0.001;
  });
  return (
    <mesh ref={m} renderOrder={9999} frustumCulled={false}>
      <sphereGeometry args={[0.3, 16, 12]} />
      <meshBasicMaterial ref={mat} color="#000" transparent opacity={0} side={THREE.BackSide} depthTest={false} depthWrite={false} />
    </mesh>
  );
}
