import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { Model } from "./Model";
import { Glow, T } from "./fx";
import { input } from "@/input";
import { headFrame } from "@/game/layout";
import { currentStep, getState, narrationAt, stepElapsed } from "@/game/useGameState";

/** Spark stays high in the right periphery so it never covers lesson objects. */
export function Spark() {
  const g = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const first = useRef(true);
  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    const o = g.current;
    if (!o) return;
    const { f, r } = headFrame();
    const t = state.clock.elapsedTime;
    const target = input.head.clone().addScaledVector(f, 1.05).addScaledVector(r, 1.35).setY(input.head.y + 0.68 + Math.sin(t * 1.6) * 0.03);
    if (first.current) {
      o.position.copy(target);
      first.current = false;
    }
    o.position.lerp(target, 1 - Math.exp(-2.5 * dt));
    o.lookAt(input.head);
    if (body.current) {
      body.current.rotation.y = t * 0.6;
      body.current.position.set(Math.cos(t * 0.7) * 0.03, 0, Math.sin(t * 0.7) * 0.03);
    }
  });
  return (
    <group ref={g}>
      <group ref={body}>
        <Model name="spark" material={sparkMat} />
      </group>
      <Glow scale={0.55} color="#6CCBFF" opacity={0.8} />
      <pointLight color="#6CCBFF" intensity={1.2} distance={2} />
      <NarrationPanel />
    </group>
  );
}
const sparkMat = new THREE.MeshStandardMaterial({ color: "#bfe8ff", emissive: "#6CCBFF", emissiveIntensity: 1.2, metalness: 0.4, roughness: 0.2 });

/** Spark's speech: dark translucent rounded panel, white text. */
export function NarrationPanel() {
  const [nar, setNar] = useState({ text: "", isHint: false });
  const last = useRef("");
  useEffect(() => {
    const sync = () => {
      if (getState().phase !== "playing" || getState().paused) return;
      const n = narrationAt(currentStep(), stepElapsed());
      const k = n.text + n.isHint;
      if (k === last.current) return;
      last.current = k;
      setNar({ text: n.text, isHint: n.isHint });
    };
    sync();
    const timer = window.setInterval(sync, 120);
    return () => window.clearInterval(timer);
  }, []);
  if (!nar.text) return null;
  return (
    <group position={[0.58, -0.04, 0]} scale={0.9}>
      <RoundedBox args={[0.92, 0.26, 0.01]} radius={0.035} smoothness={3}>
        <meshBasicMaterial color="#070b16" transparent opacity={0.8} />
      </RoundedBox>
      <mesh position={[-0.455, 0, 0.007]}>
        <planeGeometry args={[0.008, 0.18]} />
        <meshBasicMaterial color={nar.isHint ? "#FFC23A" : "#6CCBFF"} toneMapped={false} />
      </mesh>
      {nar.isHint && (
        <T position={[-0.41, 0.095, 0.008]} anchorX="left" fontSize={0.026} color="#FFC23A">
          HINT
        </T>
      )}
      <T position={[-0.41, nar.isHint ? -0.01 : 0, 0.008]} anchorX="left" fontSize={0.046} maxWidth={0.82} lineHeight={1.15}>
        {nar.text}
      </T>
    </group>
  );
}
