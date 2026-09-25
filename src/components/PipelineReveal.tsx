import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Model } from "./Model";
import { Glow, T } from "./fx";
import { PIPELINE, FORMULA } from "@/data/scenario";
import { chime } from "@/audio/sfx";

const SPACING = 0.66;
const MATH_FONT = "/fonts/NotoSans-Bold.ttf";

/** Final reveal: connected rings light up one by one, then the formula. */
export function PipelineReveal() {
  const mats = useMemo(
    () => PIPELINE.map(() => new THREE.MeshStandardMaterial({ color: "#8a94a6", emissive: "#6CCBFF", emissiveIntensity: 0, metalness: 0.9, roughness: 0.3 })),
    [],
  );
  const start = useRef<number | null>(null);
  const lit = useRef(0);
  const formula = useRef<THREE.Group>(null);
  const glows = useRef<(THREE.Sprite | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (start.current === null) start.current = t;
    const e = t - start.current;
    const n = Math.min(PIPELINE.length, Math.floor(e / 0.8));
    if (n > lit.current) {
      lit.current = n;
      chime();
    }
    mats.forEach((m, i) => {
      m.emissiveIntensity = THREE.MathUtils.lerp(m.emissiveIntensity, i < lit.current ? 2.2 : 0.05, 0.1);
      const gl = glows.current[i];
      if (gl) (gl.material as THREE.SpriteMaterial).opacity = i < lit.current ? 0.8 : 0;
    });
    if (formula.current) formula.current.visible = e > PIPELINE.length * 0.8;
  });
  const x0 = -((PIPELINE.length - 1) / 2) * SPACING;
  return (
    <group position={[0, 0, -2.3]}>
      {PIPELINE.map((label, i) => (
        <group key={label} position={[x0 + i * SPACING, 1.75, 0]}>
          <Model name="magical_ring" material={mats[i]} size={0.42} />
          <Glow ref={(r) => { glows.current[i] = r; }} scale={0.6} opacity={0} />
          <T position={[0, -0.34, 0]} fontSize={0.055} maxWidth={0.58} textAlign="center">
            {label}
          </T>
          {i < PIPELINE.length - 1 && (
            <mesh position={[SPACING / 2, 0, 0]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.008, 0.008, SPACING - 0.42, 8]} />
              <meshBasicMaterial color="#6CCBFF" toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
      <group ref={formula} visible={false}>
        {/* Split so the √ comes from a font that has it; Noto has ᵀ and ₖ. */}
        <group position={[-0.25, 0.85, 0]}>
          <T font={MATH_FONT} position={[0.47, 0, 0]} anchorX="right" fontSize={0.11} outlineWidth={0.003} outlineColor="#3AA0FF">
            {FORMULA.split("√")[0]}
          </T>
          <T position={[0.53, 0.005, 0]} fontSize={0.15} outlineWidth={0.003} outlineColor="#3AA0FF">
            √
          </T>
          <T font={MATH_FONT} position={[0.59, 0, 0]} anchorX="left" fontSize={0.11} outlineWidth={0.003} outlineColor="#3AA0FF">
            {FORMULA.split("√")[1]}
          </T>
        </group>
      </group>
    </group>
  );
}
