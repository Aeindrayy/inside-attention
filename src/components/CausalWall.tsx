import { Model } from "./Model";
import { Token } from "./Token";
import { T } from "./fx";
import * as THREE from "three";
import { WALL_Z, futurePositions } from "@/game/layout";
import { colorOf } from "@/data/scenario";

const wallMat = new THREE.MeshStandardMaterial({ color: "#0b1122", metalness: 0.6, roughness: 0.35, transparent: true, opacity: 0.72, emissive: "#16213d", emissiveIntensity: 0.4 });

/** Dark semi-transparent wall behind the player; future tokens are masked. */
export function CausalWall({ future, startBadge }: { future: string[]; startBadge: number }) {
  const pos = futurePositions(future.length);
  return (
    <group>
      <group position={[0, 1.5, WALL_Z]}>
        <Model name="causal_wall" material={wallMat} />
        {/* glowing edge frame */}
        {[1.5, -1.5].map((y) => (
          <mesh key={y} position={[0, y, -0.05]}>
            <boxGeometry args={[5, 0.02, 0.02]} />
            <meshBasicMaterial color="#6CCBFF" toneMapped={false} />
          </mesh>
        ))}
        {[-2.5, 2.5].map((x) => (
          <mesh key={x} position={[x, 0, -0.05]}>
            <boxGeometry args={[0.02, 3, 0.02]} />
            <meshBasicMaterial color="#6CCBFF" toneMapped={false} />
          </mesh>
        ))}
        <T position={[0, 1.15, -0.06]} rotation-y={Math.PI} fontSize={0.2} color="#6CCBFF">
          CAUSAL MASK
        </T>
        <T position={[0, -1.1, -0.06]} rotation-y={Math.PI} fontSize={0.1} color="#8fa3b8">
          future tokens: 0% attention
        </T>
      </group>
      {future.map((w, i) => (
        <Token key={i} word={w} badge={startBadge + i} target={pos[i]} color={new THREE.Color(colorOf(w)).multiplyScalar(0.4).getStyle()} opacity={0.2} />
      ))}
    </group>
  );
}
