import { createFileRoute } from "@tanstack/react-router";
import { GameCanvas } from "../components/GameCanvas";

export const Route = createFileRoute("/")({
  ssr: false, // the 3D canvas and WebXR must never render on the server
  head: () => ({
    meta: [
      { title: "Inside Attention — a WebXR Transformer lesson" },
      { name: "description", content: "Become a token and experience how Transformer attention works: query, key, softmax, causal masking, values, heads and prediction." },
      { property: "og:title", content: "Inside Attention — a WebXR Transformer lesson" },
      { property: "og:description", content: "Become a token. Discover how AI reads. A VR learning game for Meta Quest and desktop." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GameCanvas,
});
