import { Component, Suspense, useMemo, type ReactNode } from "react";
import { useGLTF, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { MODELS, type ModelKey } from "@/assets";

interface Props {
  name: ModelKey;
  /** Optional material applied to every mesh (used for tinting). */
  material?: THREE.Material;
  size?: number;
}

/** Simple primitive stand-ins so the game never breaks if a model fails. */
export function Fallback({ name, material, size }: Props) {
  const s = size ?? MODELS[name].size;
  const mat = material ?? new THREE.MeshStandardMaterial({ color: "#8a94a6", metalness: 0.8, roughness: 0.3 });
  switch (name) {
    case "flashlight":
      return (
        <mesh material={mat} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.022, 0.028, s, 16]} />
        </mesh>
      );
    case "token_crystal":
      return <RoundedBox args={[s * 0.72, s, s * 0.1]} radius={0.02} material={mat} />;
    case "attention_mirror":
      return (
        <mesh material={mat}>
          <torusGeometry args={[s * 0.36, s * 0.05, 8, 32]} />
        </mesh>
      );
    case "value_crystal":
      return (
        <mesh material={mat}>
          <coneGeometry args={[s * 0.25, s, 6]} />
        </mesh>
      );
    case "spark":
    case "embedding_sphere":
      return (
        <mesh material={mat}>
          <sphereGeometry args={[s / 2, 24, 16]} />
        </mesh>
      );
    case "causal_wall":
      return (
        <mesh material={mat}>
          <boxGeometry args={[s, s * 0.6, 0.08]} />
        </mesh>
      );
    case "prediction_portal":
      return (
        <group>
          <mesh material={mat} position={[-s * 0.4, 0, 0]}>
            <boxGeometry args={[s * 0.1, s, s * 0.1]} />
          </mesh>
          <mesh material={mat} position={[s * 0.4, 0, 0]}>
            <boxGeometry args={[s * 0.1, s, s * 0.1]} />
          </mesh>
          <mesh material={mat} position={[0, s * 0.45, 0]}>
            <boxGeometry args={[s * 0.9, s * 0.1, s * 0.1]} />
          </mesh>
        </group>
      );
    case "floating_platform":
      return (
        <mesh material={mat}>
          <cylinderGeometry args={[s / 2, s / 2.3, s * 0.2, 48]} />
        </mesh>
      );
    case "magical_ring":
      return (
        <mesh material={mat}>
          <torusGeometry args={[s * 0.45, s * 0.03, 8, 48]} />
        </mesh>
      );
    case "magical_floor":
      return (
        <mesh material={mat} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[s, s]} />
        </mesh>
      );
  }
}

function Loaded({ name, material, size }: Props) {
  const def = MODELS[name];
  const { scene } = useGLTF(def.url!);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const dim = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const k = (size ?? def.size) / Math.max(dim.x, dim.y, dim.z);
    c.position.copy(center).multiplyScalar(-k);
    c.scale.setScalar(k);
    const wrap = new THREE.Group();
    wrap.add(c);
    wrap.rotation.set(...def.rotation);
    wrap.position.set(...def.position);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = false;
        m.receiveShadow = false;
        if (material) m.material = material;
      }
    });
    return wrap;
  }, [scene, material, size, def]);
  return <primitive object={obj} />;
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.warn("Model failed to load, using fallback", e);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Load a model from the registry, with a primitive fallback. */
export function Model(props: Props) {
  const def = MODELS[props.name];
  const fb = <Fallback {...props} />;
  if (!def.url) return fb;
  return (
    <Boundary fallback={fb}>
      <Suspense fallback={null}>
        <Loaded {...props} />
      </Suspense>
    </Boundary>
  );
}
