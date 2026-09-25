import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Model } from "./Model";
import { Glow, T } from "./fx";
import { portalLayout } from "@/game/layout";
import { getState } from "@/game/useGameState";

const portalMat = new THREE.MeshStandardMaterial({ color: "#b8c2d4", metalness: 0.95, roughness: 0.25 });

/** Arch-shaped surface placed inside the empty portal frame. */
function archGeometry(w: number, h: number) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0);
  s.lineTo(-r, h - r);
  s.absarc(0, h - r, r, Math.PI, 0, true);
  s.lineTo(r, 0);
  s.lineTo(-r, 0);
  return new THREE.ShapeGeometry(s, 24);
}

/** Four doors, each scaled by its predicted probability. */
export function PredictionPortals({ rising }: { rising: boolean }) {
  const layout = useMemo(() => portalLayout(), []);
  return (
    <group>
      {layout.map((p, i) => (
        <Portal key={p.word} p={p} i={i} rising={rising} />
      ))}
    </group>
  );
}

function Portal({ p, i, rising }: { p: ReturnType<typeof portalLayout>[number]; i: number; rising: boolean }) {
  const g = useRef<THREE.Group>(null);
  const surf = useRef<THREE.MeshStandardMaterial>(null);
  const glow = useRef<THREE.Sprite>(null);
  const geo = useMemo(() => archGeometry(p.w * 0.56, p.h * 0.74), [p]);
  const pct = p.p >= 0.01 ? `${Math.round(p.p * 100)}%` : `${(p.p * 100).toFixed(1)}%`;
  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    const o = g.current;
    if (!o) return;
    const targetY = rising ? 0 : -p.h - 0.5;
    o.position.y = THREE.MathUtils.lerp(o.position.y, targetY, 1 - Math.exp(-(1.5 + i * 0.3) * dt));
    const chosen = getState().portalChoice;
    const open = chosen === "PARIS" ? p.word === "PARIS" : chosen === p.word;
    const lit = open || (chosen && chosen !== "PARIS" && p.word === "PARIS" && state.clock.elapsedTime % 1 < 0.5);
    if (surf.current) surf.current.emissiveIntensity = THREE.MathUtils.lerp(surf.current.emissiveIntensity, lit ? 4 : 0.35 + p.p, 0.08);
    if (glow.current) {
      const s = lit ? p.h * 2 : p.h * 0.6;
      glow.current.scale.lerp(new THREE.Vector3(s, s, 1), 0.08);
    }
  });
  return (
    <group ref={g} position={[p.pos.x, -p.h - 0.5, p.pos.z]}>
      <group position={[0, p.h / 2, 0]}>
        <Model name="prediction_portal" material={portalMat} size={p.h} />
      </group>
      <mesh geometry={geo} position={[0, p.h * 0.08, 0.01]}>
        <meshStandardMaterial ref={surf} color="#08101f" emissive="#6CCBFF" emissiveIntensity={0.4} transparent opacity={0.9} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <Glow ref={glow} color="#6CCBFF" position={[0, p.h * 0.45, 0.05]} opacity={0.5} />
      <T position={[0, p.h + 0.45, 0]} fontSize={Math.max(0.22, p.h * 0.14)}>
        {p.word}
      </T>
      <T position={[0, p.h + 0.16, 0]} fontSize={Math.max(0.16, p.h * 0.09)} color="#6CCBFF">
        {pct}
      </T>
    </group>
  );
}
