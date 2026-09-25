import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { T } from "./fx";
import { input } from "@/input";
import { runtime } from "@/game/useGameState";
import { toPercents } from "@/game/attention";

const ROW = 0.034;
const BAR_W = 0.15;
const barGeo = new THREE.PlaneGeometry(BAR_W, 0.014).translate(BAR_W / 2, 0, 0);

/** Floating panel attached to a flashlight: one bar per token, sums to 100%. */
export function AttentionMeter({ light, words, masked, color, highlight }: { light: 0 | 1; words: string[]; masked?: boolean[]; color: string; highlight?: boolean }) {
  const g = useRef<THREE.Group>(null);
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  const [pcts, setPcts] = useState<number[]>(() => words.map(() => 0));
  const last = useRef("");
  const h = words.length * ROW + 0.07;

  useFrame(() => {
    const l = input.lights[light];
    const o = g.current;
    if (!o) return;
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(l.dir, up).normalize().multiplyScalar(light === 0 ? 1 : -1);
    o.position.copy(l.origin).addScaledVector(up, input.mode === "xr" ? 0.1 + h * 0.3 : 0.12).addScaledVector(side, input.mode === "xr" ? 0.13 : 0.02).addScaledVector(l.dir, 0.08);
    o.lookAt(input.head);
    const w = runtime.weights[light] ?? [];
    bars.current.forEach((b, i) => {
      if (b) b.scale.x = THREE.MathUtils.lerp(b.scale.x, Math.max(0.001, w[i] ?? 0), 0.3);
    });
    const p = toPercents(words.map((_, i) => w[i] ?? 0));
    const key = p.join(",");
    if (key !== last.current) {
      last.current = key;
      setPcts(p);
    }
  });

  return (
    <group ref={g} scale={input.mode === "xr" ? 0.75 : 0.42}>
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[0.42, h]} />
        <meshBasicMaterial color="#070b16" transparent opacity={0.82} />
      </mesh>
      <mesh position={[0, 0, -0.003]}>
        <planeGeometry args={[0.428, h + 0.008]} />
        <meshBasicMaterial color={highlight ? color : "#2a3550"} toneMapped={false} />
      </mesh>
      <T position={[0, h / 2 - 0.022, 0]} fontSize={0.022} color={color}>
        Attention (softmax)
      </T>
      {words.map((word, i) => {
        const y = h / 2 - 0.055 - i * ROW;
        const m = masked?.[i];
        return (
          <group key={i} position={[0, y, 0]}>
            <T position={[-0.195, 0, 0]} anchorX="left" fontSize={0.02} color={m ? "#566077" : "#e6edf7"}>
              {word}
            </T>
            <mesh position={[0.005, 0, 0]}>
              <planeGeometry args={[BAR_W, 0.014]} />
              <meshBasicMaterial color="#1a2336" />
            </mesh>
            <mesh ref={(r) => { bars.current[i] = r; }} position={[0.005 - BAR_W / 2, 0, 0.001]} geometry={barGeo}>
              <meshBasicMaterial color={m ? "#333" : color} toneMapped={false} />
            </mesh>
            <T position={[0.195, 0, 0]} anchorX="right" fontSize={0.02} color={m ? "#566077" : "#ffffff"}>
              {m ? "masked 0%" : `${pcts[i] ?? 0}%`}
            </T>
          </group>
        );
      })}
    </group>
  );
}
