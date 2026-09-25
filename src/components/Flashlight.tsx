import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Model } from "./Model";
import { Glow } from "./fx";
import { input } from "@/input";
import { WALL_Z } from "@/game/layout";

const BEAM_LENGTH = 3;
const BEAM_RADIUS = Math.tan(THREE.MathUtils.degToRad(12)) * BEAM_LENGTH;

const bodyMat = new THREE.MeshStandardMaterial({ color: "#aab4c4", metalness: 0.95, roughness: 0.28 });

/**
 * The flashlight = the query. Lens glow and beam are code-made meshes:
 * a small emissive disc at the lens and an open additive cone (~3 m).
 */
export function Flashlight({ light, color, wall }: { light: 0 | 1; color: string; wall?: boolean }) {
  const g = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => {
    const c = new THREE.ConeGeometry(BEAM_RADIUS, BEAM_LENGTH, 32, 1, true);
    c.translate(0, -BEAM_LENGTH / 2, 0); // apex at origin
    c.rotateX(Math.PI / 2); // extend toward -z
    return c;
  }, []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const fwd = useMemo(() => new THREE.Vector3(0, 0, -1), []);

  useFrame(() => {
    const l = input.lights[light];
    const o = g.current;
    if (!o) return;
    o.position.copy(l.origin);
    q.setFromUnitVectors(fwd, l.dir);
    o.quaternion.copy(q);
    // Causal mask: the beam is cut off where it hits the wall plane.
    let len = BEAM_LENGTH;
    if (wall && l.dir.z > 0.01) {
      const t = (WALL_Z - l.origin.z) / l.dir.z;
      if (t > 0) len = Math.min(len, t);
    }
    if (beam.current) beam.current.scale.set(1, 1, len / BEAM_LENGTH);
  });

  return (
    <group ref={g}>
      <group position={[0, 0, 0.09]}>
        <Model name="flashlight" material={bodyMat} />
      </group>
      <mesh position={[0, 0, -0.001]}>
        <circleGeometry args={[0.026, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <Glow color={color} scale={0.14} position={[0, 0, -0.01]} />
      <mesh ref={beam} geometry={geo}>
        <meshBasicMaterial color={color} transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}
