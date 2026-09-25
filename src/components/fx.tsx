import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { ComponentProps } from "react";
import { FONT_BOLD } from "@/assets";

let glowTex: THREE.Texture | null = null;
/** Radial gradient texture for additive glow sprites. */
export function getGlowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,0.45)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

/** Glow sprite (additive, no depth write). */
export function Glow({ color = "#6CCBFF", scale = 0.5, opacity = 1, ...rest }: { color?: string; scale?: number; opacity?: number } & Omit<ComponentProps<"sprite">, "scale">) {
  return (
    <sprite scale={[scale, scale, 1]} {...rest}>
      <spriteMaterial map={getGlowTexture()} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

/** 3D text with the project font and readable defaults. */
export function T(props: ComponentProps<typeof Text>) {
  return <Text font={FONT_BOLD} anchorX="center" anchorY="middle" color="#ffffff" {...props} />;
}
