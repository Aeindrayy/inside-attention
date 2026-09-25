import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment as DreiEnv, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { Model } from "./Model";
import { Particles } from "./Particles";
import { Glow } from "./fx";

/** Glowing grid floor as a cheap shader (the floor model is too heavy to tile). */
function GridFloor() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uColor: { value: new THREE.Color("#6CCBFF") } },
        vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
        fragmentShader: `uniform vec3 uColor; varying vec3 vW;
          float line(float x, float w){ float d=abs(fract(x-0.5)-0.5)/fwidth(x); return 1.-min(d/w,1.); }
          void main(){
            float g = max(line(vW.x,1.), line(vW.z,1.)) * 0.5 + max(line(vW.x*0.2,1.2), line(vW.z*0.2,1.2)) * 0.6;
            float fade = exp(-length(vW.xz)*0.09);
            gl_FragColor = vec4(uColor * g, g * fade * 0.8);
          }`,
      }),
    [],
  );
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -1.2, 0]} material={mat}>
      <planeGeometry args={[80, 80]} />
    </mesh>
  );
}

const ringMat = new THREE.MeshStandardMaterial({ color: "#9aa6ba", emissive: "#3AA0FF", emissiveIntensity: 0.6, metalness: 0.95, roughness: 0.3 });
const platformMat = undefined;

function DistantRings() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const rings = [
    { p: [-11, 4, -16], s: 6 },
    { p: [13, 6, -12], s: 8 },
    { p: [2, 9, -24], s: 12 },
    { p: [-14, 3, 10], s: 7 },
  ] as const;
  useFrame((_, dt) => {
    refs.current.forEach((r, i) => {
      if (r) {
        r.rotation.y += dt * 0.05 * (i % 2 ? 1 : -1);
        r.rotation.x += dt * 0.02;
      }
    });
  });
  return (
    <>
      {rings.map((r, i) => (
        <group key={i} position={r.p as unknown as [number, number, number]} ref={(g) => { refs.current[i] = g; }}>
          <Model name="magical_ring" material={ringMat} size={r.s} />
        </group>
      ))}
    </>
  );
}

/** Dark space chamber: fog, grid floor, particles, rings, platform. */
export function SpaceEnvironment() {
  return (
    <>
      <color attach="background" args={["#05070F"]} />
      <fogExp2 attach="fog" args={["#05070F", 0.045]} />
      <ambientLight intensity={0.45} color="#9fb4d8" />
      <directionalLight position={[3, 6, 2]} intensity={1.3} color="#dfe8ff" />
      <DreiEnv resolution={128} frames={1}>
        <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={1.2} color="#6CCBFF" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
        <Lightformer intensity={0.8} color="#FF9A3A" position={[5, 1, 2]} rotation-y={-Math.PI / 2} scale={[20, 0.6, 1]} />
      </DreiEnv>
      <GridFloor />
      <Particles />
      <DistantRings />
      <Platform />
    </>
  );
}

export function Platform() {
  return (
    <group position={[0, -0.47, 0]}>
      <Model name="floating_platform" material={platformMat} />
      <Glow scale={3.5} color="#3AA0FF" opacity={0.25} position={[0, -0.5, 0]} />
    </group>
  );
}
