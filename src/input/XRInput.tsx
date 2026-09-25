import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { input, emitPinch } from "./index";

/**
 * Hand tracking + controllers. Both expose a targetRaySpace (for hands it
 * points along the index finger / pinch ray) and fire `select` on pinch or
 * trigger, so one code path covers both.
 */
export function XRInput() {
  const { gl, camera } = useThree();

  useEffect(() => {
    const onStart = () => {
      const session = gl.xr.getSession();
      if (!session) return;
      input.mode = "xr";
      const onSelect = (e: XRInputSourceEvent) => {
        emitPinch(e.inputSource.handedness === "left" ? 1 : 0);
      };
      session.addEventListener("selectstart", onSelect);
      session.addEventListener("end", () => {
        input.mode = "desktop";
        session.removeEventListener("selectstart", onSelect);
      });
    };
    gl.xr.addEventListener("sessionstart", onStart);
    return () => gl.xr.removeEventListener("sessionstart", onStart);
  }, [gl]);

  const q = new THREE.Quaternion();
  useFrame((_, __, frame?: XRFrame) => {
    if (!frame || input.mode !== "xr") return;
    const ref = gl.xr.getReferenceSpace();
    if (!ref) return;
    for (const src of frame.session.inputSources) {
      const pose = frame.getPose(src.targetRaySpace, ref);
      if (!pose) continue;
      const idx = src.handedness === "left" ? 1 : 0;
      const l = input.lights[idx];
      const p = pose.transform.position;
      const o = pose.transform.orientation;
      l.origin.set(p.x, p.y, p.z);
      q.set(o.x, o.y, o.z, o.w);
      l.dir.set(0, 0, -1).applyQuaternion(q);
      l.tracked = true;
    }
    const xrCam = gl.xr.getCamera();
    xrCam.getWorldPosition(input.head);
    xrCam.getWorldDirection(input.headDir);
    void camera;
  });
  return null;
}
