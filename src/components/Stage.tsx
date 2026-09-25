import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, Edges } from "@react-three/drei";
import * as THREE from "three";
import { Token } from "./Token";
import { Mirror } from "./Mirror";
import { Flashlight } from "./Flashlight";
import { AttentionMeter } from "./AttentionMeter";
import { PlayerRepresentation } from "./PlayerRepresentation";
import { CausalWall } from "./CausalWall";
import { PredictionPortals } from "./PredictionPortals";
import { PipelineReveal } from "./PipelineReveal";
import { AbsorbFx, HeadsBurst } from "./Effects";
import { Model } from "./Model";
import { Glow, T } from "./fx";
import { SENTENCES, STAGE1_SENTENCE, STAGE1_TOKENS, STEPS, colorOf, COLORS } from "@/data/scenario";
import {
  useGame,
  runtime,
  tickStep,
  succeed,
  absorb,
  choosePortal,
  currentStep,
  getState,
  restart,
  setState,
  stepElapsed,
} from "@/game/useGameState";
import { aim, transformerAffinity, transformerAttention } from "@/game/attention";
import { input, onPinch } from "@/input";
import { setHums } from "@/audio/sfx";
import {
  arcPositions,
  MIRROR_OFFSET_Y,
  SLAB_POS,
  SLAB_SIZE,
  SPHERE_POS,
  portalLayout,
  repTarget,
} from "@/game/layout";

const HOLD_SECONDS = 1.5;
const END_BUTTONS = [
  { label: "Play again", pos: new THREE.Vector3(-0.5, 1.2, -2.2) },
  { label: "Exit VR", pos: new THREE.Vector3(0.5, 1.2, -2.2) },
];

/** Everything that changes per stage, plus the per-frame attention director. */
export function Stage() {
  const stepIndex = useGame((s) => s.stepIndex);
  const phase = useGame((s) => s.phase);
  const paused = useGame((s) => s.paused);
  const repColor = useGame((s) => s.repColor);
  const repRiver = useGame((s) => s.repRiver);
  const repMoney = useGame((s) => s.repMoney);
  const portalChoice = useGame((s) => s.portalChoice);
  const { gl } = useThree();
  const step = STEPS[stepIndex];
  const sentence = step.sentence ? SENTENCES[step.sentence] : null;
  const scene = step.scene;
  const stage1 = scene === "slab" || scene === "tokens1" || scene === "become";
  const portalsScene = scene === "portals" || scene === "portalResult";
  const attentionScene = ["attention", "wall", "values", "heads", "corridor"].includes(scene);
  const showWall = scene === "wall";
  const heads = scene === "heads";

  /* ----- token positions ----- */
  const words = sentence?.context ?? [];
  const positions = useMemo(() => {
    if (portalsScene) return arcPositions(7, 2.45);
    if (heads) return arcPositions(words.length, 1.42, 3.45);
    return arcPositions(stage1 ? 6 : Math.max(1, words.length));
  }, [heads, portalsScene, stage1, words.length]);
  const posByWord = useMemo(() => {
    const m: Record<string, THREE.Vector3> = {};
    words.forEach((w, i) => (m[w] = positions[i].clone().setY(positions[i].y + MIRROR_OFFSET_Y)));
    return m;
  }, [words, positions]);
  const future = showWall ? sentence?.future ?? [] : [];

  /* ----- stage 1 animated targets ----- */
  const s1Targets = useMemo(() => STAGE1_TOKENS.map(() => new THREE.Vector3()), []);
  const s1From = useMemo(() => STAGE1_TOKENS.map((_, i) => new THREE.Vector3(SLAB_POS.x - 0.95 + i * 0.38, SLAB_POS.y, SLAB_POS.z)), []);
  const s1Colors = useRef(STAGE1_TOKENS.map(() => "#dfe8f5"));

  /* ----- lights config ----- */
  const lightColor = (l: 0 | 1) => (heads ? (l === 1 ? COLORS.headBlue : COLORS.headOrange) : COLORS.queryBeam);
  const activeLights: (0 | 1)[] = step.lights === 2 ? [0, 1] : step.lights === 1 ? [0] : [];

  /* ----- per-frame director ----- */
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const aimPoint = (i: number) => tmp.copy(positions[i]).setY(positions[i].y + 0.2);

  useFrame((_, raw) => {
    if (phase !== "playing" || paused) return;
    const dt = Math.min(raw, 0.05);
    tickStep();
    const e = stepElapsed();

    // Stage 1 choreography: slab → arc, tokens fly past the embedding sphere.
    if (stage1) {
      const arc = arcPositions(6);
      STAGE1_TOKENS.forEach((w, i) => {
        const tgt = s1Targets[i];
        tgt.copy(arc[i]);
        if (scene === "tokens1") {
          const w0 = 1.0 + i * 0.55;
          if (e > w0 && e < w0 + 0.5) tgt.copy(SPHERE_POS).add(new THREE.Vector3(0.35, 0.1 * (i - 2.5), 0.2));
          if (e > w0 + 0.3) s1Colors.current[i] = colorOf(w);
        } else if (scene === "become") {
          s1Colors.current[i] = colorOf(w);
          if (i === 5) repTarget(tgt);
        } else s1Colors.current[i] = "#dfe8f5";
      });
    }

    // Attention: aim → score → softmax per light.
    if (attentionScene && sentence) {
      const all: number[] = [];
      for (const l of activeLights) {
        const L = input.lights[l];
        const n = words.length + future.length;
        const focus: number[] = [];
        const masked: boolean[] = [];
        for (let i = 0; i < n; i++) {
          if (i < words.length) {
            focus.push(aim(L.origin, L.dir, aimPoint(i)));
            masked.push(false);
          } else {
            focus.push(0);
            masked.push(true); // behind the causal wall
          }
        }
        runtime.weights[l] = transformerAttention([...words, ...future], sentence.player, focus, l, masked);
        all.push(...runtime.weights[l].slice(0, words.length));
      }
      setHums(all);
      checkTriggers(dt);
    } else {
      setHums(new Array(12).fill(0));
      runtime.weights = [[], []];
      checkTriggers(dt);
    }
  });

  function aimAt(l: 0 | 1, i: number) {
    const L = input.lights[l];
    return aim(L.origin, L.dir, aimPoint(i));
  }

  function checkTriggers(dt: number) {
    const st = currentStep();
    const t = st.trigger;
    if (runtime.succeeded || getState().fading) return;
    if (t.type === "hold") {
      const i = words.indexOf(t.target);
      if (i >= 0 && aimAt(0, i) > 0.8) runtime.holdTime[0] += dt;
      else runtime.holdTime[0] = 0;
      if (runtime.holdTime[0] >= HOLD_SECONDS) succeed();
    } else if (t.type === "weightHold") {
      const i = words.indexOf(t.target);
      if (i >= 0 && (runtime.weights[0][i] ?? 0) > t.weight) runtime.holdTime[0] += dt;
      else runtime.holdTime[0] = 0;
      if (runtime.holdTime[0] >= HOLD_SECONDS) succeed();
    } else if (t.type === "lookWall") {
      if (input.headDir.z > 0.75) runtime.wallLook += dt;
      else runtime.wallLook = 0;
      if (runtime.wallLook >= HOLD_SECONDS) succeed();
    } else if (t.type === "bothHeads") {
      const pairs: [0 | 1, string][] = [
        [1, t.blue],
        [0, t.orange],
      ];
      pairs.forEach(([l, w]) => {
        const i = words.indexOf(w);
        if (runtime.headDone[l]) return;
        if (i >= 0 && aimAt(l, i) > 0.8) runtime.holdTime[l] += dt;
        else runtime.holdTime[l] = 0;
        if (runtime.holdTime[l] >= HOLD_SECONDS) {
          runtime.headDone[l] = true;
          setState({ flare: w });
        }
      });
      if (runtime.headDone[0] && runtime.headDone[1]) succeed();
    } else if (t.type === "slab") {
      // Hand touch: a tracked hand/controller enters the slab.
      for (const L of input.lights) {
        if (input.mode !== "xr") break;
        const d = L.origin.clone().sub(SLAB_POS);
        if (Math.abs(d.x) < SLAB_SIZE.w / 2 + 0.05 && Math.abs(d.y) < SLAB_SIZE.h / 2 + 0.08 && Math.abs(d.z) < 0.12) succeed();
      }
    } else if (t.type === "portal") {
      // Walking within 1 m of a door selects it.
      for (const p of portalLayout()) {
        if (Math.hypot(input.head.x - p.pos.x, input.head.z - p.pos.z) < 1) choosePortal(p.word);
      }
    }
  }

  /* ----- pinch handling ----- */
  useEffect(() => {
    return onPinch((l) => {
      if (getState().phase !== "playing" || getState().fading || getState().paused) return;
      const st = currentStep();
      const t = st.trigger;
      const L = input.lights[l];
      if (t.type === "slab") {
        // aim at nearest point on the slab
        const local = L.origin.clone();
        const hit = SLAB_POS.clone();
        const toSlab = SLAB_POS.clone().sub(local);
        const dist = toSlab.length();
        const p = local.clone().addScaledVector(L.dir, dist);
        hit.x = THREE.MathUtils.clamp(p.x, SLAB_POS.x - SLAB_SIZE.w / 2, SLAB_POS.x + SLAB_SIZE.w / 2);
        if (aim(L.origin, L.dir, hit) > 0.3) succeed();
      } else if (st.scene === "values" && sentence?.values) {
        let best = -1;
        let bestAim = 0.45;
        words.forEach((_, i) => {
          const a = Math.max(aimAt(l, i), aim(L.origin, L.dir, posByWord[words[i]]));
          if (a > bestAim) {
            bestAim = a;
            best = i;
          }
        });
        if (best < 0 || runtime.succeeded) return;
        absorb(runtime.weights[l], words[best]);
        if (t.type === "absorb" && words[best] === t.target) succeed();
      } else if (t.type === "portal") {
        let best: string | null = null;
        let bestAim = 0.35;
        for (const p of portalLayout()) {
          const a = aim(L.origin, L.dir, p.pos.clone().setY(p.h / 2));
          if (a > bestAim) {
            bestAim = a;
            best = p.word;
          }
        }
        if (best) choosePortal(best);
      } else if (t.type === "end") {
        END_BUTTONS.forEach((b, i) => {
          if (aim(L.origin, L.dir, b.pos) > 0.5) {
            if (i === 0) restart();
            else {
              const s = gl.xr.getSession();
              if (s) void s.end();
              else setState({ phase: "start" });
            }
          }
        });
      }
    });
  }, [sentence, words, posByWord, gl, positions]);

  /* ----- render ----- */
  const repWord = sentence?.player ?? "bank";
  const repVisible =
    scene === "become" || ["attention", "wall", "values", "heads", "headsBurst", "corridor"].includes(scene);
  const keyBase = step.sentence ?? "s1";
  const corridor = scene === "corridor" || portalsScene;

  return (
    <group>
      {scene === "slab" && <Slab />}

      {stage1 && <EmbeddingSphere visible={scene !== "slab"} />}
      {stage1 &&
        scene !== "slab" &&
        STAGE1_TOKENS.map((w, i) => (
          <Stage1Token key={`s1-${i}`} i={i} word={w} target={s1Targets[i]} from={s1From[i]} colors={s1Colors} hide={scene === "become" && i === 5} />
        ))}

      {!stage1 && sentence && !["compare", "pipeline", "end"].includes(scene) &&
        words.map((w, i) => (
          <Token key={`${keyBase}-${i}`} word={w} badge={i + 1} target={positions[i]} color={colorOf(w)} opacity={scene === "compare" ? 0.35 : 1} scale={heads ? 0.72 : 1} />
        ))}

      {portalsScene && (
        <>
          <Token key="is-ghost" word="is" badge={words.length + 1} target={positions[words.length]} color={colorOf("is")} />
          {portalChoice && scene === "portalResult" && (
            <Token key="paris" word="Paris" badge={words.length + 2} target={positions[words.length + 1]} from={new THREE.Vector3(portalLayout()[0].pos.x, 1.2, -5.5)} color="#6CCBFF" />
          )}
          {scene === "portalResult" && <EmptySlot position={positions[words.length + 2]} />}
        </>
      )}

      {/* Mirrors (keys) */}
      {attentionScene &&
        sentence &&
        words.map((w, i) => {
          const p = posByWord[w] ?? positions[i];
          if (heads)
            return (
              <group key={`m-${keyBase}-${i}`}>
                <Mirror position={p.clone().add(new THREE.Vector3(-0.14, 0, 0))} index={i} word={w} keyMatch={transformerAffinity(w, sentence.player, 1)} light={1} color={colorOf(w)} size={0.2} />
                <Mirror position={p.clone().add(new THREE.Vector3(0.14, 0, 0))} index={i + 20} word={w} keyMatch={transformerAffinity(w, sentence.player, 0)} light={0} color={colorOf(w)} size={0.2} />
              </group>
            );
          return (
            <Mirror
              key={`m-${keyBase}-${i}`}
              position={positions[i].clone().setY(positions[i].y + MIRROR_OFFSET_Y)}
              index={i}
              word={w}
              keyMatch={transformerAffinity(w, sentence.player, 0)}
              light={0}
              color={colorOf(w)}
              valueColor={scene === "values" ? sentence.values?.[i] : undefined}
            />
          );
        })}

      {showWall && sentence?.future && <CausalWall future={sentence.future} startBadge={words.length + 2} />}

      {/* Flashlights + meters */}
      {activeLights.map((l) => (
        <group key={`fl-${l}-${heads}`}>
          <Flashlight light={l} color={lightColor(l)} wall={showWall} />
          {attentionScene && (step.meter || heads) && (
            <AttentionMeter
              key={`${keyBase}-${showWall}`}
              light={l}
              words={[...words, ...future]}
              masked={[...words.map(() => false), ...future.map(() => true)]}
              color={lightColor(l)}
              highlight={step.id === "3.2"}
            />
          )}
        </group>
      ))}

      <PlayerRepresentation key={`rep-${keyBase}`} word={repWord} color={repColor} visible={repVisible && scene !== "compare"} />
      {scene === "compare" && (
        <>
          <PlayerRepresentation word="bank" color={repRiver ?? "#5a8fc0"} label="bank (river)" offset={[-0.28, 0.4, 0.5]} />
          <PlayerRepresentation word="bank" color={repMoney ?? "#c0a860"} label="bank (money)" offset={[0.28, 0.4, 0.5]} />
        </>
      )}

      <AbsorbFx positions={posByWord} />

      {step.id === "2.3" && <Diagram />}
      {scene === "headsBurst" && <HeadsBurst targets={positions.slice(0, words.length)} />}
      {corridor && <Corridor />}
      {portalsScene && <PredictionPortals rising />}
      {(sentence?.source === "gpt2" || sentence?.source === "transformer") && (
        <T position={[0, 2.25, -2.4]} fontSize={0.07} color="#FF8ABB">
          Live transformer attention
        </T>
      )}
      {(scene === "pipeline" || scene === "end") && <PipelineReveal />}
      {scene === "end" && <EndPanel />}
    </group>
  );
}

function Stage1Token({ i, word, target, from, colors, hide }: { i: number; word: string; target: THREE.Vector3; from: THREE.Vector3; colors: { current: string[] }; hide: boolean }) {
  // Re-render color from the ref a few times per second.
  const [, force] = useStateTick();
  void force;
  return <Token word={word} badge={i + 1} target={target} from={from} color={colors.current[i]} visible={!hide || stepElapsed() < 1.3} />;
}

function useStateTick() {
  const [n, set] = useState(0);
  useFrame((s) => {
    const k = Math.floor(s.clock.elapsedTime * 6);
    if (k !== n) set(k);
  });
  return [n, set] as const;
}

function Slab() {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (g.current) g.current.position.y = SLAB_POS.y + Math.sin(s.clock.elapsedTime * 1.2) * 0.02;
  });
  return (
    <group ref={g} position={SLAB_POS}>
      <RoundedBox args={[SLAB_SIZE.w, SLAB_SIZE.h, SLAB_SIZE.d]} radius={0.02}>
        <meshStandardMaterial color="#50358a" metalness={0.2} roughness={0.16} transparent opacity={0.92} emissive="#9A8CFF" emissiveIntensity={0.65} />
        <Edges color="#FFD166" threshold={10} />
      </RoundedBox>
      <Glow scale={2.6} color="#FFD166" opacity={0.22} />
      <T position={[0, 0, SLAB_SIZE.d / 2 + 0.005]} fontSize={0.17} color="#ffffff" outlineWidth={0.008} outlineColor="#24143f">
        {STAGE1_SENTENCE}
      </T>
    </group>
  );
}

const sphereMat = new THREE.MeshStandardMaterial({ color: "#9ec8ff", emissive: "#3AA0FF", emissiveIntensity: 0.7, metalness: 0.6, roughness: 0.2 });
function EmbeddingSphere({ visible }: { visible: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((s, dt) => {
    if (!g.current) return;
    g.current.rotation.y += dt * 0.4;
    const k = THREE.MathUtils.lerp(g.current.scale.x, visible ? 1 : 0.001, 0.06);
    g.current.scale.setScalar(k);
    g.current.visible = k > 0.01;
    g.current.position.y = SPHERE_POS.y + Math.sin(s.clock.elapsedTime) * 0.04;
  });
  return (
    <group ref={g} position={SPHERE_POS} scale={0.001}>
      <Model name="embedding_sphere" material={sphereMat} />
      <Glow scale={1.4} color="#3AA0FF" opacity={0.5} />
      <T position={[0, -0.5, 0]} fontSize={0.07} color="#6CCBFF">
        Embedding
      </T>
    </group>
  );
}

function EmptySlot({ position }: { position: THREE.Vector3 }) {
  const m = useRef<THREE.MeshBasicMaterial>(null);
  const t0 = useRef<number | null>(null);
  useFrame((s) => {
    if (t0.current === null) t0.current = s.clock.elapsedTime;
    const e = s.clock.elapsedTime - t0.current;
    if (m.current) m.current.opacity = e < 1.5 ? 0 : Math.max(0, 0.8 - (e - 2.5) * 0.4) * (0.6 + 0.4 * Math.sin(e * 6));
  });
  return (
    <mesh position={position}>
      <boxGeometry args={[0.3, 0.42, 0.04]} />
      <meshBasicMaterial ref={m} color="#6CCBFF" wireframe transparent opacity={0} toneMapped={false} />
    </mesh>
  );
}

function Diagram() {
  return (
    <group position={[0, 2.35, -2.3]}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[2.2, 0.26]} />
        <meshBasicMaterial color="#070b16" transparent opacity={0.8} />
      </mesh>
      <T fontSize={0.1} color="#ffffff">
        QUERY (flashlight) → KEY (mirror) → strong match
      </T>
    </group>
  );
}

const pillarMat = new THREE.MeshBasicMaterial({ color: "#6CCBFF", transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
function Corridor() {
  const pillars = Array.from({ length: 7 }, (_, i) => -1.5 - i * 1.5);
  return (
    <group>
      {pillars.map((z) =>
        [-3.2, 3.2].map((x) => (
          <mesh key={`${x}${z}`} position={[x, 1.5, z]} material={pillarMat}>
            <cylinderGeometry args={[0.04, 0.04, 4, 8]} />
          </mesh>
        )),
      )}
    </group>
  );
}

function EndPanel() {
  return (
    <group>
      <T position={[0, 2.55, -2.3]} fontSize={0.3} outlineWidth={0.006} outlineColor="#3AA0FF">
        The End
      </T>
      {END_BUTTONS.map((b) => (
        <group key={b.label} position={b.pos}>
          <RoundedBox args={[0.7, 0.2, 0.03]} radius={0.05}>
            <meshStandardMaterial color="#0d1830" emissive="#3AA0FF" emissiveIntensity={0.4} metalness={0.5} roughness={0.3} />
          </RoundedBox>
          <T position={[0, 0, 0.02]} fontSize={0.08}>
            {b.label}
          </T>
        </group>
      ))}
      <T position={[0, 0.98, -2.2]} fontSize={0.045} color="#8fa3b8">
        Aim and pinch (or click) a button
      </T>
    </group>
  );
}
