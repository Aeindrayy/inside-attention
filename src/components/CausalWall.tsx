import { Token } from "./Token";
import { T } from "./fx";
import * as THREE from "three";
import { WALL_Z, futurePositions } from "@/game/layout";
import { colorOf } from "@/data/scenario";

const PINK = "#FF5FA2";

function Lock({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation-y={Math.PI}>
      <mesh position={[0, 0.045, 0]}>
        <torusGeometry args={[0.075, 0.018, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#ffb2cf" emissive={PINK} emissiveIntensity={1.1} metalness={0.65} roughness={0.25} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.035, 0]}>
        <boxGeometry args={[0.2, 0.15, 0.035]} />
        <meshStandardMaterial color="#4a1830" emissive={PINK} emissiveIntensity={0.5} metalness={0.55} roughness={0.3} />
      </mesh>
      <T position={[0, -0.035, -0.021]} fontSize={0.055} color="#ffffff">0%</T>
      <T position={[0, -0.17, -0.021]} fontSize={0.045} color="#ffb2cf">FUTURE</T>
    </group>
  );
}

/** A locked future-word timeline: the model cannot peek beyond NOW. */
export function CausalWall({ future, startBadge }: { future: string[]; startBadge: number }) {
  const pos = futurePositions(future.length);
  return (
    <group>
      <group position={[0, 2.28, WALL_Z]} rotation-y={Math.PI}>
        <T fontSize={0.19} color="#ffffff">NO PEEKING AHEAD</T>
        <T position={[0, -0.25, 0]} fontSize={0.09} color="#ffb2cf">future words are not written yet</T>
      </group>

      <group position={[0, 0.62, WALL_Z]} rotation-y={Math.PI}>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[4.5, 0.025, 0.025]} />
          <meshBasicMaterial color="#344158" />
        </mesh>
        <mesh position={[-1.65, 0, 0]}>
          <circleGeometry args={[0.07, 20]} />
          <meshBasicMaterial color="#6CCBFF" toneMapped={false} />
        </mesh>
        <T position={[-1.65, -0.2, 0]} fontSize={0.075} color="#8ed8ff">PAST AVAILABLE</T>
        <mesh position={[-0.65, 0, 0]}>
          <ringGeometry args={[0.065, 0.1, 24]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        <T position={[-0.65, -0.2, 0]} fontSize={0.075} color="#ffffff">NOW: “sat”</T>
        <mesh position={[0.3, 0, 0]}>
          <boxGeometry args={[0.025, 0.42, 0.025]} />
          <meshBasicMaterial color={PINK} toneMapped={false} />
        </mesh>
        <T position={[1.25, -0.2, 0]} fontSize={0.075} color="#ffb2cf">FUTURE LOCKED</T>
      </group>

      {future.map((word, i) => {
        const target = pos[i];
        return (
          <group key={`${word}-${i}`}>
            <Token word={word} badge={startBadge + i} target={target} color={new THREE.Color(colorOf(word)).multiplyScalar(0.35).getStyle()} opacity={0.16} />
            <Lock position={[target.x, target.y + 0.48, target.z - 0.04]} />
          </group>
        );
      })}
    </group>
  );
}