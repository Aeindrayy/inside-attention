import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Model } from "./Model";
import { Glow } from "./fx";
import { input } from "@/input";
import { runtime, getState } from "@/game/useGameState";

interface Props {
  position: THREE.Vector3;
  index: number;
  word: string;
  keyMatch: number;
  /** which light's weights drive this mirror */
  light: 0 | 1;
  color?: string;
  valueColor?: string;
  size?: number;
}

const frameMat = new THREE.MeshStandardMaterial({ color: "#c9d2e0", metalness: 0.95, roughness: 0.25 });

/**
 * Attention mirror = a key. The code-made disc in its empty center glows with
 * the attention weight. Higher keyMatch → mirror turns more toward the player.
 */
export function Mirror({ position, index, word, keyMatch, light, color = "#FF5FA2", valueColor, size = 0.38 }: Props) {
  const g = useRef<THREE.Group>(null);
  const disc = useRef<THREE.MeshStandardMaterial>(null);
  const glow = useRef<THREE.Sprite>(null);
  const valueRef = useRef<THREE.Group>(null);
  const vMat = useMemo(
    () =>
      valueColor
        ? new THREE.MeshStandardMaterial({ color: valueColor, emissive: valueColor, emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.15 })
        : undefined,
    [valueColor],
  );
  const side = index % 2 === 0 ? 1 : -1;

  useFrame((state) => {
    const o = g.current;
    if (!o) return;
    o.position.set(position.x, position.y + Math.sin(state.clock.elapsedTime * 1.1 + index) * 0.02, position.z);
    o.lookAt(input.head.x, o.position.y, input.head.z);
    o.rotateY(side * (1 - keyMatch) * 0.9);
    let w = runtime.weights[light]?.[index] ?? 0;
    if (getState().flare === word) w = Math.max(w, 1.2 + Math.sin(state.clock.elapsedTime * 10) * 0.2);
    if (disc.current) {
      disc.current.emissiveIntensity = 0.15 + w * 5;
      disc.current.opacity = 0.35 + Math.min(0.6, w);
    }
    if (glow.current) {
      const s = size * (0.4 + w * 2.2);
      glow.current.scale.set(s, s, 1);
      (glow.current.material as THREE.SpriteMaterial).opacity = Math.min(1, w * 1.4);
    }
    if (valueRef.current) {
      const absorbed = getState().absorbs.some((a) => a.from === word);
      valueRef.current.rotation.y += 0.02;
      valueRef.current.visible = !absorbed;
    }
  });

  return (
    <group ref={g}>
      <Model name="attention_mirror" material={frameMat} size={size} />
      <mesh position={[0, 0, 0.005]}>
        <circleGeometry args={[size * 0.26, 32]} />
        <meshStandardMaterial ref={disc} color="#0a1020" emissive={color} emissiveIntensity={0.2} transparent toneMapped={false} />
      </mesh>
      <Glow ref={glow} color={color} position={[0, 0, 0.03]} />
      {vMat && (
        <group ref={valueRef} position={[0, 0, 0.06]}>
          <Model name="value_crystal" material={vMat} size={size * 0.42} />
        </group>
      )}
    </group>
  );
}
