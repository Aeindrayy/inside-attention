import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Model } from "./Model";
import { Glow, T } from "./fx";
import { input } from "@/input";
import { repTarget, headFrame } from "@/game/layout";

/**
 * The player's own token, 0.6 m in front at chest height. Its color animates
 * smoothly (1.5 s) whenever the representation changes.
 */
export function PlayerRepresentation({ word, color, visible = true, label = "Your representation", offset }: { word: string; color: string; visible?: boolean; label?: string; offset?: [number, number, number] }) {
  const g = useRef<THREE.Group>(null);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45, metalness: 0.5, roughness: 0.2 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const anim = useRef({ from: new THREE.Color(color), to: new THREE.Color(color), t: 1, key: color });
  const glowRef = useRef<THREE.Sprite>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const first = useRef(true);

  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    const o = g.current;
    if (!o) return;
    const a = anim.current;
    if (a.key !== color) {
      a.from.copy(mat.color);
      a.to.set(color);
      a.t = 0;
      a.key = color;
    }
    a.t = Math.min(1, a.t + dt / 1.5);
    const e = a.t * a.t * (3 - 2 * a.t);
    mat.color.copy(a.from).lerp(a.to, e);
    mat.emissive.copy(mat.color);
    if (glowRef.current) (glowRef.current.material as THREE.SpriteMaterial).color.copy(mat.color);
    repTarget(tmp);
    if (offset) {
      const { f, r } = headFrame();
      tmp.addScaledVector(r, offset[0]).addScaledVector(f, offset[2]);
      tmp.y += offset[1];
    }
    tmp.y += Math.sin(state.clock.elapsedTime * 1.5) * 0.015;
    if (first.current) {
      o.position.copy(tmp);
      first.current = false;
    }
    o.position.lerp(tmp, 1 - Math.exp(-6 * dt));
    o.lookAt(input.head);
    const s = THREE.MathUtils.lerp(o.scale.x, visible ? 1 : 0.0001, 1 - Math.exp(-6 * dt));
    o.scale.setScalar(s);
    o.visible = s > 0.01;
  });

  return (
    <group ref={g}>
      <Glow ref={glowRef} scale={0.45} opacity={0.6} position={[0, 0, -0.05]} />
      <Model name="token_crystal" material={mat} size={0.24} />
      <T position={[0, 0, 0.03]} fontSize={0.06} outlineWidth={0.004} outlineColor="#05070F">
        {word}
      </T>
      <T position={[0, -0.16, 0]} fontSize={0.028} color="#6CCBFF">
        {label}
      </T>
    </group>
  );
}
