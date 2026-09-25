import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Model } from "./Model";
import { Glow, T } from "./fx";
import { repTarget } from "@/game/layout";
import { useGame } from "@/game/useGameState";

/** A value crystal detaching from a mirror and flying to the player, with a trail. */
function Flyer({ from, color, delay = 0 }: { from: THREE.Vector3; color: string; delay?: number }) {
  const g = useRef<THREE.Group>(null);
  const trail = useRef<(THREE.Sprite | null)[]>([]);
  const t0 = useRef<number | null>(null);
  const hist = useRef<THREE.Vector3[]>([]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5 }), [color]);
  useFrame((s) => {
    if (t0.current === null) t0.current = s.clock.elapsedTime + delay;
    const t = (s.clock.elapsedTime - t0.current) / 0.9;
    const o = g.current;
    if (!o) return;
    o.visible = t >= 0 && t < 1.4;
    const k = THREE.MathUtils.clamp(t, 0, 1);
    const e = k * k * (3 - 2 * k);
    const to = repTarget();
    const p = from.clone().lerp(to, e);
    p.y += Math.sin(k * Math.PI) * 0.35;
    o.position.copy(p);
    o.rotation.y += 0.2;
    o.scale.setScalar(k < 1 ? 1 : Math.max(0.001, 1 - (t - 1) * 3));
    hist.current.unshift(p.clone());
    hist.current.length = Math.min(hist.current.length, 24);
    trail.current.forEach((sp, i) => {
      const h = hist.current[i * 3];
      if (sp && h) {
        sp.position.copy(h).sub(p);
        (sp.material as THREE.SpriteMaterial).opacity = (1 - i / 8) * 0.8 * (k < 1 ? 1 : 0);
      }
    });
  });
  return (
    <group ref={g} visible={false}>
      <Model name="value_crystal" material={mat} size={0.14} />
      <Glow color={color} scale={0.3} />
      {Array.from({ length: 8 }).map((_, i) => (
        <Glow key={i} ref={(r) => { trail.current[i] = r; }} color={color} scale={0.12 - i * 0.01} opacity={0} />
      ))}
    </group>
  );
}

/** Renders fly animations for every absorb event since mount. */
export function AbsorbFx({ positions }: { positions: Record<string, THREE.Vector3> }) {
  const absorbs = useGame((s) => s.absorbs);
  const since = useRef(Date.now() - 500);
  return (
    <>
      {absorbs
        .filter((a) => a.id >= since.current && positions[a.from])
        .map((a) => (
          <Flyer key={a.id} from={positions[a.from]} color={a.color} delay={a.head === 1 ? 0.2 : 0} />
        ))}
    </>
  );
}

/** Stage 5 burst: 12 thin colored beams from the player to tokens. */
export function HeadsBurst({ targets }: { targets: THREE.Vector3[] }) {
  const group = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  const beams = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const color = new THREE.Color().setHSL(i / 12, 0.8, 0.6);
      const to = targets[(i * 5) % targets.length].clone().add(new THREE.Vector3((i % 3) * 0.05, ((i * 7) % 5) * 0.04 - 0.1, 0));
      return { color, to };
    });
  }, [targets]);
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  useFrame((s) => {
    if (t0.current === null) t0.current = s.clock.elapsedTime;
    const e = s.clock.elapsedTime - t0.current;
    const from = repTarget();
    group.current?.children.forEach((c, i) => {
      if (i >= beams.length) return;
      const b = beams[i];
      const dir = b.to.clone().sub(from);
      const len = dir.length();
      const grow = THREE.MathUtils.clamp((e - i * 0.05) / 0.4, 0, 1);
      c.position.copy(from).addScaledVector(dir, 0.5 * grow);
      c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      c.scale.set(1, Math.max(0.001, len * grow), 1);
      const m = mats.current[i];
      if (m) m.opacity = e < 3 ? 0.9 : Math.max(0, 0.9 - (e - 3));
    });
  });
  return (
    <group>
      <group ref={group}>
        {beams.map((b, i) => (
          <mesh key={i}>
            <cylinderGeometry args={[0.006, 0.006, 1, 6]} />
            <meshBasicMaterial ref={(r) => { mats.current[i] = r; }} color={b.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <T position={[0, 2.45, -2.4]} fontSize={0.16} color="#6CCBFF">
        GPT-2 small: 12 heads per layer
      </T>
    </group>
  );
}
