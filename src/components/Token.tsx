import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Model } from "./Model";
import { T } from "./fx";
import { input } from "@/input";

export interface TokenProps {
  word: string;
  badge?: number;
  target: THREE.Vector3;
  from?: THREE.Vector3;
  color: string;
  opacity?: number;
  visible?: boolean;
  scale?: number;
  bob?: boolean;
}

/** A word as a glowing token crystal, always facing the player. */
export function Token({ word, badge, target, from, color, opacity = 1, visible = true, scale = 1, bob = true }: TokenProps) {
  const g = useRef<THREE.Group>(null);
  const seed = useMemo(() => Math.random() * 10, []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.35,
        metalness: 0.55,
        roughness: 0.22,
        transparent: opacity < 1,
        opacity,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const tc = useMemo(() => new THREE.Color(), []);
  const started = useRef(false);

  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    const o = g.current;
    if (!o) return;
    if (!started.current) {
      o.position.copy(from ?? target);
      started.current = true;
    }
    const k = 1 - Math.exp(-4 * dt);
    const t = state.clock.elapsedTime;
    const goal = target.clone();
    if (bob) goal.y += Math.sin(t * 1.3 + seed) * 0.03;
    o.position.lerp(goal, k);
    o.lookAt(input.head.x, o.position.y, input.head.z);
    tc.set(color);
    mat.color.lerp(tc, k);
    mat.emissive.lerp(tc, k);
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, opacity, k);
    mat.transparent = mat.opacity < 0.99;
    const s = THREE.MathUtils.lerp(o.scale.x, visible ? scale : 0.0001, 1 - Math.exp(-8 * dt));
    o.scale.setScalar(s);
    o.visible = s > 0.01;
  });

  return (
    <group ref={g}>
      <Model name="token_crystal" material={mat} />
      <T position={[0, 0, 0.045]} fontSize={0.1} outlineWidth={0.006} outlineColor="#05070F" maxWidth={0.6} fillOpacity={opacity}>
        {word}
      </T>
      {badge !== undefined && (
        <group position={[0, 0.3, 0]}>
          <mesh>
            <circleGeometry args={[0.045, 24]} />
            <meshBasicMaterial color="#0d1424" transparent opacity={0.85 * opacity} />
          </mesh>
          <mesh position={[0, 0, -0.001]}>
            <ringGeometry args={[0.045, 0.052, 24]} />
            <meshBasicMaterial color="#6CCBFF" transparent opacity={opacity} toneMapped={false} />
          </mesh>
          <T position={[0, 0, 0.002]} fontSize={0.055} color="#6CCBFF" fillOpacity={opacity}>
            {String(badge)}
          </T>
        </group>
      )}
    </group>
  );
}
