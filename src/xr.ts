import { createXRStore } from "@react-three/xr";

/** WebXR session store (framebuffer scale ~1.0 for Quest performance). */
export const xrStore = createXRStore({
  frameBufferScaleFactor: 1,
  emulate: false,
  hand: { rayPointer: false, grabPointer: false, touchPointer: false, teleportPointer: false },
  controller: { rayPointer: false, grabPointer: false, teleportPointer: false },
});
