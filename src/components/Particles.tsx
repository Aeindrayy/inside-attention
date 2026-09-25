import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getGlowTexture } from "./fx";

/** Slowly drifting particles: one Points draw call, drift in the vertex shader. */
export function Particles({ count = 500 }) {
  const ref = useRef<THREE.ShaderMaterial>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 3 + Math.random() * 14;
      const a = Math.random() * Math.PI * 2;
      p.set([Math.cos(a) * r, -1 + Math.random() * 9, Math.sin(a) * r], i * 3);
      s[i] = Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("seed", new THREE.BufferAttribute(s, 1));
    return g;
  }, [count]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uMap: { value: getGlowTexture() } },
        vertexShader: `attribute float seed; uniform float uTime; varying float vA;
          void main(){ vec3 p=position; p.y += mod(uTime*0.08*(0.5+seed) + seed*9., 9.) - 4.5 + 3.5; p.x += sin(uTime*0.2+seed*20.)*0.3;
          vec4 mv=modelViewMatrix*vec4(p,1.); gl_PointSize = (18.+seed*30.) / -mv.z; vA = 0.35+seed*0.5; gl_Position=projectionMatrix*mv; }`,
        fragmentShader: `uniform sampler2D uMap; varying float vA; void main(){ vec4 t=texture2D(uMap, gl_PointCoord); gl_FragColor=vec4(vec3(0.42,0.8,1.)*t.a*vA, t.a*vA); }`,
      }),
    [],
  );
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime;
  });
  return <points geometry={geo} material={mat} ref={ref as never} frustumCulled={false} />;
}
