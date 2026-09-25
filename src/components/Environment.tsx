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
        uniforms: { uColor: { value: new THREE.Color("#20d6bf") } },
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

const platformMat = undefined;

/** Peripheral neural graph: one lightweight line draw, leaving the lesson center empty. */
function NeuralField() {
  const material = useRef<THREE.LineBasicMaterial>(null);
  const geometry = useMemo(() => {
    const points: number[] = [];
    const rows = 6;
    const columns = 7;
    for (const side of [-1, 1]) {
      const nodes: THREE.Vector3[][] = [];
      for (let row = 0; row < rows; row++) {
        const line: THREE.Vector3[] = [];
        for (let column = 0; column < columns; column++) {
          const x = side * (3.8 + column * 0.72 + (row % 2) * 0.22);
          const y = -0.15 + row * 0.62;
          const z = -2.4 - column * 1.15 + Math.sin(row * 1.7 + column) * 0.22;
          line.push(new THREE.Vector3(x, y, z));
        }
        nodes.push(line);
      }
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const here = nodes[row][column];
          if (column + 1 < columns) points.push(...here.toArray(), ...nodes[row][column + 1].toArray());
          if (row + 1 < rows && (row + column) % 2 === 0) points.push(...here.toArray(), ...nodes[row + 1][column].toArray());
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return g;
  }, []);
  useFrame((state) => {
    if (material.current) material.current.opacity = 0.2 + Math.sin(state.clock.elapsedTime * 0.45) * 0.045;
  });
  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial ref={material} color="#20d6bf" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </lineSegments>
  );
}

/** Teal neural observatory: brighter depth, data lattice, particles, platform. */
export function SpaceEnvironment() {
  return (
    <>
      <color attach="background" args={["#07161b"]} />
      <fogExp2 attach="fog" args={["#07161b", 0.038]} />
      <ambientLight intensity={0.58} color="#b8eee7" />
      <directionalLight position={[3, 6, 2]} intensity={1.4} color="#e7fff9" />
      <DreiEnv resolution={128} frames={1}>
        <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={1.2} color="#20d6bf" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
        <Lightformer intensity={0.8} color="#F3C969" position={[5, 1, 2]} rotation-y={-Math.PI / 2} scale={[20, 0.6, 1]} />
      </DreiEnv>
      <GridFloor />
      <NeuralField />
      <Particles />
      <Platform />
    </>
  );
}

export function Platform() {
  return (
    <group position={[0, -0.47, 0]}>
      <Model name="floating_platform" material={platformMat} />
      <Glow scale={3.5} color="#20d6bf" opacity={0.28} position={[0, -0.5, 0]} />
    </group>
  );
}
