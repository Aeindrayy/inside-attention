// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// TanStack devtools injects `data-tsd-source` on every JSX element. React Three Fiber
// treats it as a three.js property path and crashes, so strip it from 3D component files.
const stripTsdSourceFor3D = {
  name: "strip-tsd-source-r3f",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (!/\/src\/components\/.*\.tsx$/.test(id) || !code.includes("data-tsd-source")) return;
    return { code: code.replace(/\s+data-tsd-source=(?:"[^"]*"|\{[^}]*\})/g, ""), map: null };
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: { plugins: [stripTsdSourceFor3D] },
});
