/**
 * Unified input interface. Hand tracking, controllers and desktop mouse all
 * write into `input.lights` (flashlight poses) and emit pinch events.
 *
 * lights[0] = right hand / primary light (orange head in stage 5)
 * lights[1] = left hand (blue head in stage 5)
 */
import * as THREE from "three";

export interface LightPose {
  origin: THREE.Vector3;
  dir: THREE.Vector3;
  /** true when the pose was updated recently by a device */
  tracked: boolean;
}

export const input = {
  mode: "desktop" as "desktop" | "xr",
  lights: [
    { origin: new THREE.Vector3(0.22, 1.35, -0.35), dir: new THREE.Vector3(0, 0, -1), tracked: true },
    { origin: new THREE.Vector3(-0.22, 1.35, -0.35), dir: new THREE.Vector3(-0.2, 0, -1).normalize(), tracked: true },
  ] as LightPose[],
  head: new THREE.Vector3(0, 1.6, 0),
  headDir: new THREE.Vector3(0, 0, -1),
};

type PinchListener = (light: 0 | 1) => void;
const pinchListeners = new Set<PinchListener>();
export function onPinch(l: PinchListener) {
  pinchListeners.add(l);
  return () => {
    pinchListeners.delete(l);
  };
}
export function emitPinch(light: 0 | 1) {
  pinchListeners.forEach((l) => l(light));
}
