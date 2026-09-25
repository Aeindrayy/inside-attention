import { Token } from "./Token";
import { T } from "./fx";
import * as THREE from "three";
import { WALL_Z, futurePositions } from "@/game/layout";
import { colorOf } from "@/data/scenario";

const GREEN = "#55E69B";

function Lock({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation-y={Math.PI}>
      <mesh position={[0, 0.045, 0]}>
        <torusGeometry args={[0.075, 0.018, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#b8ffdb" emissive={GREEN} emissiveIntensity={1.1} metalness={0.65} roughness={0.25} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.035, 0]}>
        <boxGeometry args={[0.2, 0.15, 0.035]} />
        <meshStandardMaterial color="#123c2a" emissive={GREEN} emissiveIntensity={0.5} metalness={0.55} roughness={0.3} />
      </mesh>
      <T position={[0, -0.035, -0.021]} fontSize={0.055} color="#ffffff">0%</T>
      <T position={[0, -0.17, -0.021]} fontSize={0.045} color="#b8ffdb">FUTURE</T>
    </group>
  );
}

/** A locked future-word timeline: the model cannot peek beyond NOW. */
export function CausalWall({ future, startBadge }: { future: string[]; startBadge: number }) {
  const pos = futurePositions(future.length);
  return (
    <group>
      <group position={[0, 2.36, WALL_Z]} rotation-y={Math.PI}>
        <T fontSize={0.16} color="#ffffff">THE STORY STOPS AT “SAT”</T>
        <T position={[0, -0.21, 0]} fontSize={0.085} color="#b8ffdb">future words do not exist yet</T>
      </group>

      <group position={[0, 0.72, WALL_Z]} rotation-y={Math.PI}>
        <mesh position={[0, 0.1, 0.02]}>
          <boxGeometry args={[3.15, 0.48, 0.045]} />
          <meshStandardMaterial color="#152238" emissive="#21314c" emissiveIntensity={0.3} transparent opacity={0.82} />
        </mesh>
        <mesh position={[-1.1, 0.1, 0]}>
          <circleGeometry args={[0.07, 20]} />
          <meshBasicMaterial color="#6CCBFF" toneMapped={false} />
        </mesh>
        <T position={[-1.1, 0.1, -0.03]} fontSize={0.055} color="#8ed8ff">PAST</T>
        <mesh position={[-0.2, 0.1, 0]}>
          <ringGeometry args={[0.065, 0.1, 24]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        <T position={[-0.2, 0.1, -0.03]} fontSize={0.055} color="#ffffff">NOW</T>
        <mesh position={[0.48, 0.1, 0]}>
          <boxGeometry args={[0.055, 0.5, 0.04]} />
          <meshBasicMaterial color={GREEN} toneMapped={false} />
        </mesh>
        <T position={[1.05, 0.1, -0.03]} fontSize={0.055} color="#b8ffdb">FUTURE = 0%</T>
      </group>

      {future.map((word, i) => {
        const target = pos[i];
        return (
          <group key={`${word}-${i}`}>
            <Token word={word} badge={startBadge + i} target={target} color={new THREE.Color(colorOf(word)).multiplyScalar(0.65).getStyle()} opacity={0.42} scale={1.3} />
            <Lock position={[target.x, target.y + 0.58, target.z - 0.05]} />
          </group>
        );
      })}
    </group>
  );
}