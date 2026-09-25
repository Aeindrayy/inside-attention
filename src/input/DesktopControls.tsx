import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { input, emitPinch } from "./index";
import { getState, currentStep } from "@/game/useGameState";
import { audio, startAmbience } from "@/audio/sfx";

/**
 * Desktop: mouse aims the flashlight from the camera, left click = pinch,
 * right-drag or Q/E (+ left/right arrows) looks around; W/S, up/down arrows, and scroll move.
 */
export function DesktopControls() {
  const { camera, gl } = useThree();
  const st = useRef({ yaw: 0, pitch: 0, pos: new THREE.Vector3(0, 1.6, 0), mouse: new THREE.Vector2(0, -0.1), drag: false, keys: new Set<string>() });

  useEffect(() => {
    const el = gl.domElement;
    const s = st.current;
    const onDown = (e: PointerEvent) => {
      audio();
      startAmbience();
      if (e.button === 2) s.drag = true;
      if (e.button === 0) {
        const step = currentStep();
        const idx = step.lights === 2 ? getState().activeLight : 0;
        emitPinch(idx as 0 | 1);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.button === 2) s.drag = false;
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      s.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      if (s.drag) {
        s.yaw -= e.movementX * 0.004;
        s.pitch = THREE.MathUtils.clamp(s.pitch - e.movementY * 0.004, -1.2, 1.2);
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (getState().paused) return;
      const f = new THREE.Vector3(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
      s.pos.addScaledVector(f, -Math.sign(e.deltaY) * 0.3);
      clampPos(s.pos);
    };
    const onCtx = (e: Event) => e.preventDefault();
    const kd = (e: KeyboardEvent) => s.keys.add(e.key.toLowerCase());
    const ku = (e: KeyboardEvent) => s.keys.delete(e.key.toLowerCase());
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("contextmenu", onCtx);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", onCtx);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [gl]);

  const ray = useRef(new THREE.Raycaster());
  useFrame((_, raw) => {
    if (input.mode !== "desktop") return;
    const dt = Math.min(raw, 0.05);
    const s = st.current;
    const k = s.keys;
    const paused = getState().paused;
    if (!paused && (k.has("q") || k.has("arrowleft"))) s.yaw += dt * 1.4;
    if (!paused && (k.has("e") || k.has("arrowright"))) s.yaw -= dt * 1.4;
    const f = new THREE.Vector3(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
    const r = new THREE.Vector3(Math.cos(s.yaw), 0, -Math.sin(s.yaw));
    if (!paused && (k.has("w") || k.has("arrowup"))) s.pos.addScaledVector(f, dt * 1.5);
    if (!paused && (k.has("s") || k.has("arrowdown"))) s.pos.addScaledVector(f, -dt * 1.5);
    if (!paused && k.has("a")) s.pos.addScaledVector(r, -dt * 1.5);
    if (!paused && k.has("d")) s.pos.addScaledVector(r, dt * 1.5);
    clampPos(s.pos);

    camera.position.copy(s.pos);
    camera.rotation.set(s.pitch, s.yaw, 0, "YXZ");
    camera.updateMatrixWorld();

    // Flashlight: origin near the "hand", pointing where the mouse points.
    ray.current.setFromCamera(s.mouse, camera);
    const target = ray.current.ray.at(3, new THREE.Vector3());
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const step = currentStep();
    const active = step.lights === 2 ? getState().activeLight : 0;
    input.lights.forEach((l, i) => {
      const side = i === 0 ? 1 : -1;
      l.origin.copy(camera.position).addScaledVector(right, 0.2 * side).addScaledVector(up, -0.2).addScaledVector(fwd, 0.35);
      if (i === active) l.dir.copy(target).sub(l.origin).normalize();
    });
    input.head.copy(camera.position);
    input.headDir.copy(fwd);
  });
  return null;
}

function clampPos(p: THREE.Vector3) {
  const max = 6;
  const r = Math.hypot(p.x, p.z);
  if (r > max) p.multiplyScalar(max / r);
  p.y = 1.6;
}
