"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                              Theme helpers                                  */
/* -------------------------------------------------------------------------- */

const THEME_TOKENS = [
  "background",
  "foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "accent",
  "accent-foreground",
  "muted",
  "muted-foreground",
  "border",
  "ring",
  "destructive",
] as const;
type ThemeTokens = Record<(typeof THEME_TOKENS)[number], string>;

function readTheme(el: HTMLElement | null): ThemeTokens {
  const target = el ?? (typeof document !== "undefined" ? document.documentElement : null);
  const cs = target ? getComputedStyle(target) : null;
  const out = {} as ThemeTokens;
  for (const t of THEME_TOKENS) out[t] = cs ? cs.getPropertyValue(`--${t}`).trim() : "";
  return out;
}

function useGameTheme(ref: React.RefObject<HTMLElement | null>): ThemeTokens {
  const [theme, setTheme] = React.useState<ThemeTokens>(() => readTheme(null));
  React.useEffect(() => {
    const read = () => setTheme(readTheme(ref.current));
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    return () => mo.disconnect();
  }, [ref]);
  return theme;
}

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

/* -------------------------------------------------------------------------- */
/*                              Game constants                                 */
/* -------------------------------------------------------------------------- */

// Logical (design) coordinate space. All drawing & physics happen in this
// space; the canvas is scaled to its rendered CSS size via setTransform.
const LOGW = 360;
const LOGH = 480;

const GRAVITY = 900; // px/s²
const ARCADE_TIME = 60; // seconds — arcade mode is a score attack against the clock
const BOMB_PENALTY = 10; // points lost for slicing a bomb (never ends the game)
const COMBO_WINDOW = 0.45; // seconds — slices within this window stack a combo
const TRAIL_LIFE = 0.14; // seconds a blade point lingers
const MIN_SLICE_LEN = 5; // logical px — shorter pointer moves don't slice (taps)

// A small leaf — shared by several fruit. Drawn in the fruit's local (already
// translated/rotated) space.
function drawLeaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = "#4caf50";
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Fixed, vibrant fruit types — guaranteed to read on any background (theme
// tokens like --accent can collapse into it). Each has a skin (`rind`), a
// flesh color for the cut faces & juice, and a `draw` for its signature
// detail. The blade trail, combo text and bombs stay theme-driven (see below).
interface FruitDef {
  rind: string;
  flesh: string;
  draw: (ctx: CanvasRenderingContext2D, r: number) => void;
}

const FRUITS: FruitDef[] = [
  {
    // Watermelon — green rind with dark stripes, pink flesh.
    rind: "#2e9e4f",
    flesh: "#fb5d6a",
    draw: (ctx, r) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = "#1b6b34";
      ctx.lineWidth = r * 0.13;
      ctx.lineCap = "round";
      for (const dx of [-0.5, 0, 0.5]) {
        ctx.beginPath();
        ctx.moveTo(dx * r, -r);
        ctx.lineTo(dx * r * 1.35, r);
        ctx.stroke();
      }
      ctx.restore();
    },
  },
  {
    // Orange — pebbled skin, little leaf on top.
    rind: "#f59331",
    flesh: "#ffb866",
    draw: (ctx, r) => {
      drawLeaf(ctx, r * 0.15, -r * 0.92, r * 0.42, -0.6);
    },
  },
  {
    // Apple — brown stem + leaf.
    rind: "#e23b3b",
    flesh: "#fbe9d0",
    draw: (ctx, r) => {
      ctx.strokeStyle = "#7c4a1e";
      ctx.lineWidth = r * 0.11;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.72);
      ctx.lineTo(r * 0.06, -r * 1.12);
      ctx.stroke();
      drawLeaf(ctx, r * 0.42, -r * 0.95, r * 0.4, -0.4);
    },
  },
  {
    // Lemon — pale flesh, tiny nub.
    rind: "#f4cf26",
    flesh: "#fcf3a8",
    draw: (ctx, r) => {
      ctx.fillStyle = "#d9b41f";
      ctx.beginPath();
      ctx.arc(r * 0.82, -r * 0.55, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    // Lime — green skin, small leaf.
    rind: "#7cc043",
    flesh: "#d6efb0",
    draw: (ctx, r) => {
      drawLeaf(ctx, r * 0.1, -r * 0.92, r * 0.36, -0.7);
    },
  },
  {
    // Grape / plum — purple, little stem dot.
    rind: "#9b51e0",
    flesh: "#d9b8f2",
    draw: (ctx, r) => {
      ctx.fillStyle = "#4e342e";
      ctx.beginPath();
      ctx.arc(0, -r * 0.92, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    // Blueberry — deep blue, crown notch.
    rind: "#3d6fe0",
    flesh: "#9cc0ff",
    draw: (ctx, r) => {
      ctx.fillStyle = "#1f3f8a";
      ctx.beginPath();
      ctx.arc(0, -r * 0.45, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
    },
  },
];

/* -------------------------------------------------------------------------- */
/*                              Game state types                               */
/* -------------------------------------------------------------------------- */

type Kind = "fruit" | "bomb";

interface Fruit {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string; // bomb body color (fruit use their FruitDef.rind)
  def: number; // index into FRUITS, or -1 for a bomb
  rot: number;
  vrot: number;
  kind: Kind;
  sliced: boolean;
}

interface Half {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rind: string;
  flesh: string;
  rot: number;
  vrot: number;
  cut: number; // slice angle — orients the flat edge
  side: 1 | -1;
  life: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  life: number;
  maxLife: number;
}

interface FloatText {
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  size: number;
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

interface NinjaState {
  fruits: Fruit[];
  halves: Half[];
  particles: Particle[];
  texts: FloatText[];
  trail: TrailPoint[];
  score: number;
  timeLeft: number;
  combo: number;
  comboTimer: number;
  spawnTimer: number;
  elapsed: number;
  flash: number; // red bomb-hit flash, in seconds remaining
  nextId: number;
}

function initState(): NinjaState {
  return {
    fruits: [],
    halves: [],
    particles: [],
    texts: [],
    trail: [],
    score: 0,
    timeLeft: ARCADE_TIME,
    combo: 0,
    comboTimer: 0,
    spawnTimer: 0.8,
    elapsed: 0,
    flash: 0,
    nextId: 1,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Geometry helper                                */
/* -------------------------------------------------------------------------- */

/** Shortest distance from point (px,py) to segment (ax,ay)-(bx,by). */
function segPointDist(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  px: number,
  py: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/* -------------------------------------------------------------------------- */
/*                              Props                                          */
/* -------------------------------------------------------------------------- */

export interface FruitNinjaProps {
  className?: string;
  width?: number;
  paused?: boolean;
  autoFocus?: boolean;
  /**
   * When true (the default), the game listens for keys on `window` so it works
   * without being focused first — ideal for single-game pages (404s, loading /
   * empty states). Set false when multiple games share a page, or the game sits
   * in scrollable content, so it only responds while focused. Ignores keys aimed
   * at form fields.
   */
  captureGlobalKeys?: boolean;
  persistHighScore?: boolean | string;
  onScoreChange?: (score: number) => void;
  onGameOver?: (r: { score: number; won: boolean }) => void;
  onStart?: () => void;
}

/* -------------------------------------------------------------------------- */
/*                              Component                                      */
/* -------------------------------------------------------------------------- */

export function FruitNinja({
  className,
  width,
  paused = false,
  autoFocus = true,
  captureGlobalKeys = true,
  persistHighScore = true,
  onScoreChange,
  onGameOver,
  onStart,
}: FruitNinjaProps) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const playfieldRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const theme = useGameTheme(wrapperRef);
  const reduce = usePrefersReducedMotion();

  const [status, setStatus] = React.useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState(ARCADE_TIME);
  const [high, setHigh] = React.useState(0);
  const [offscreen, setOffscreen] = React.useState(false);

  const storageKey =
    typeof persistHighScore === "string"
      ? persistHighScore
      : persistHighScore === false
        ? null
        : "gamekitui:fruit-ninja:hi";

  // Mutable refs for the rAF loop — never cause re-renders.
  const stateRef = React.useRef<NinjaState | null>(null);
  const statusRef = React.useRef(status);
  const pausedRef = React.useRef(paused);
  const offscreenRef = React.useRef(offscreen);
  const themeRef = React.useRef(theme);
  const reduceRef = React.useRef(reduce);
  const shownSecRef = React.useRef(ARCADE_TIME); // last whole-second pushed to React
  const onScoreChangeRef = React.useRef(onScoreChange);
  const onGameOverRef = React.useRef(onGameOver);
  const submitHighRef = React.useRef<(s: number) => void>(() => undefined);

  statusRef.current = status;
  pausedRef.current = paused;
  offscreenRef.current = offscreen;
  themeRef.current = theme;
  reduceRef.current = reduce;
  onScoreChangeRef.current = onScoreChange;
  onGameOverRef.current = onGameOver;

  // Load high score.
  React.useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setHigh(Number(raw) || 0);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const submitHigh = React.useCallback(
    (s: number) => {
      setHigh((prev) => {
        if (s <= prev) return prev;
        if (storageKey) {
          try {
            window.localStorage.setItem(storageKey, String(s));
          } catch {
            /* ignore */
          }
        }
        return s;
      });
    },
    [storageKey],
  );
  submitHighRef.current = submitHigh;

  // Pause when scrolled offscreen or tab hidden.
  React.useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e) setOffscreen(!e.isIntersecting);
    });
    io.observe(el);
    const onVis = () => setOffscreen(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const start = React.useCallback(() => {
    stateRef.current = initState();
    shownSecRef.current = ARCADE_TIME;
    setScore(0);
    setTimeLeft(ARCADE_TIME);
    setStatus("playing");
    onStart?.();
    onScoreChangeRef.current?.(0);
    // Focus the wrapper so keyboard controls work after the Start button unmounts.
    wrapperRef.current?.focus();
  }, [onStart]);

  // Responsive canvas sizing: match the playfield's rendered CSS size × DPR,
  // then scale the drawing context so all rendering happens in LOGW×LOGH space.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const field = playfieldRef.current;
    if (!canvas || !field) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = field.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const scale = w / LOGW;
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(field);
    return () => ro.disconnect();
  }, []);

  // Ref bridge so the pointer effect can call into the loop's slice logic.
  const sliceAlongRef = React.useRef<
    (ax: number, ay: number, bx: number, by: number) => void
  >(() => undefined);

  // Main rAF loop + drawing + physics.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    // ------------------------------------------------------------------
    // Spawning
    // ------------------------------------------------------------------

    const spawnFruit = (gs: NinjaState, kind: Kind) => {
      const r = rand(22, 30);
      const x = rand(60, LOGW - 60);
      // Launch upward hard enough to arc near the top of the field.
      const apex = LOGH * rand(0.62, 0.92) * (reduceRef.current ? 0.82 : 1);
      const vy = -Math.sqrt(2 * GRAVITY * apex);
      const vx = ((LOGW / 2 - x) / LOGH) * 240 + rand(-120, 120);
      const def = kind === "bomb" ? -1 : Math.floor(Math.random() * FRUITS.length);
      const color =
        kind === "bomb" ? themeRef.current.foreground || "#1e1e1e" : FRUITS[def]!.rind;
      gs.fruits.push({
        id: gs.nextId++,
        x,
        y: LOGH + r,
        vx,
        vy,
        r,
        color,
        def,
        rot: rand(0, Math.PI * 2),
        vrot: rand(-3, 3),
        kind,
        sliced: false,
      });
    };

    const maybeSpawnWave = (gs: NinjaState, dt: number) => {
      gs.spawnTimer -= dt;
      if (gs.spawnTimer > 0) return;
      const diff = Math.min(gs.elapsed / 45, 1); // ramps difficulty over ~45s
      gs.spawnTimer = (1.05 - 0.55 * diff) * (reduceRef.current ? 1.35 : 1) + rand(0, 0.3);
      let wave = 1;
      if (Math.random() < 0.3 + 0.4 * diff) wave++;
      if (Math.random() < 0.12 + 0.3 * diff) wave++;
      for (let i = 0; i < wave; i++) {
        // Bombs only after a short grace period, then grow in frequency.
        const bombChance = gs.elapsed > 6 ? Math.min(0.08 + 0.14 * diff, 0.24) : 0;
        spawnFruit(gs, Math.random() < bombChance ? "bomb" : "fruit");
      }
    };

    // ------------------------------------------------------------------
    // Slicing FX
    // ------------------------------------------------------------------

    const spawnJuice = (gs: NinjaState, f: Fruit, color: string, count: number) => {
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2);
        const sp = rand(40, 240);
        gs.particles.push({
          x: f.x,
          y: f.y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 60,
          r: rand(2, 5),
          color,
          life: 0,
          maxLife: rand(0.4, 0.85),
        });
      }
    };

    const sliceFruit = (
      gs: NinjaState,
      f: Fruit,
      ax: number,
      ay: number,
      bx: number,
      by: number,
    ) => {
      f.sliced = true;

      if (f.kind === "bomb") {
        // Arcade mode: a bomb costs points + breaks the combo, but never ends
        // the run. Red flash + shrapnel for feedback.
        gs.score = Math.max(0, gs.score - BOMB_PENALTY);
        gs.combo = 0;
        gs.comboTimer = 0;
        gs.flash = 0.3;
        setScore(gs.score);
        onScoreChangeRef.current?.(gs.score);
        spawnJuice(gs, f, themeRef.current.destructive || "#ef4444", reduceRef.current ? 8 : 22);
        gs.texts.push({
          x: f.x,
          y: f.y - f.r,
          vy: -55,
          life: 0,
          maxLife: 0.9,
          text: `-${BOMB_PENALTY}`,
          color: themeRef.current.destructive || "#ef4444",
          size: 22,
        });
        return;
      }

      // Combo: slices that land inside the rolling window stack up.
      if (gs.comboTimer > 0) gs.combo += 1;
      else gs.combo = 1;
      gs.comboTimer = COMBO_WINDOW;

      const gain = gs.combo >= 2 ? 2 : 1; // combo slices are worth a bonus point
      gs.score += gain;
      setScore(gs.score);
      onScoreChangeRef.current?.(gs.score);

      if (gs.combo >= 2) {
        gs.texts.push({
          x: f.x,
          y: f.y - f.r,
          vy: -55,
          life: 0,
          maxLife: 0.9,
          text: `Combo x${gs.combo}`,
          color: themeRef.current.primary || "#3b82f6",
          size: Math.min(16 + gs.combo * 2, 30),
        });
      }

      // Two halves fly apart along the blade's perpendicular.
      const fd = FRUITS[f.def]!;
      const cut = Math.atan2(by - ay, bx - ax);
      const px = Math.cos(cut + Math.PI / 2);
      const py = Math.sin(cut + Math.PI / 2);
      const kick = rand(60, 130);
      for (const side of [1, -1] as const) {
        gs.halves.push({
          x: f.x,
          y: f.y,
          vx: f.vx * 0.4 + px * kick * side,
          vy: f.vy * 0.4 + py * kick * side - 40,
          r: f.r,
          rind: fd.rind,
          flesh: fd.flesh,
          rot: f.rot,
          vrot: f.vrot + side * rand(1, 4),
          cut,
          side,
          life: 0,
        });
      }
      spawnJuice(gs, f, fd.flesh, reduceRef.current ? 5 : 12);
    };

    // Slice every unsliced fruit the blade segment passes through.
    const sliceAlong = (ax: number, ay: number, bx: number, by: number) => {
      const gs = stateRef.current;
      if (!gs || statusRef.current !== "playing") return;
      if (Math.hypot(bx - ax, by - ay) < MIN_SLICE_LEN) return;
      for (const f of gs.fruits) {
        if (f.sliced) continue;
        if (segPointDist(ax, ay, bx, by, f.x, f.y) <= f.r) {
          sliceFruit(gs, f, ax, ay, bx, by);
        }
      }
    };
    sliceAlongRef.current = sliceAlong;

    // ------------------------------------------------------------------
    // Physics step
    // ------------------------------------------------------------------

    const step = (dt: number) => {
      const gs = stateRef.current;
      if (!gs) return;

      gs.elapsed += dt;
      if (gs.comboTimer > 0) gs.comboTimer = Math.max(0, gs.comboTimer - dt);
      if (gs.flash > 0) gs.flash = Math.max(0, gs.flash - dt);

      // Countdown — the only way the game ends.
      gs.timeLeft = Math.max(0, gs.timeLeft - dt);
      const sec = Math.ceil(gs.timeLeft);
      if (sec !== shownSecRef.current) {
        shownSecRef.current = sec;
        setTimeLeft(sec);
      }
      if (gs.timeLeft <= 0) {
        const finalScore = gs.score;
        submitHighRef.current(finalScore);
        onGameOverRef.current?.({ score: finalScore, won: finalScore > 0 });
        setStatus("gameover");
        return;
      }

      maybeSpawnWave(gs, dt);

      // Age & cull the blade trail.
      for (const p of gs.trail) p.age += dt;
      gs.trail = gs.trail.filter((p) => p.age < TRAIL_LIFE);

      // Fruits — arc under gravity; missed fruit just falls away (no penalty).
      for (const f of gs.fruits) {
        f.vy += GRAVITY * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.rot += f.vrot * dt;
      }
      // Drop sliced fruit (halves take over) and any that fell off the bottom.
      gs.fruits = gs.fruits.filter((f) => !f.sliced && !(f.y - f.r > LOGH && f.vy > 0));

      // Halves.
      for (const h of gs.halves) {
        h.vy += GRAVITY * dt;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        h.rot += h.vrot * dt;
        h.life += dt;
      }
      gs.halves = gs.halves.filter((h) => h.y - h.r <= LOGH + 40);

      // Particles.
      for (const p of gs.particles) {
        p.vy += GRAVITY * 0.6 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += dt;
      }
      gs.particles = gs.particles.filter((p) => p.life < p.maxLife);

      // Floating texts.
      for (const t of gs.texts) {
        t.y += t.vy * dt;
        t.life += dt;
      }
      gs.texts = gs.texts.filter((t) => t.life < t.maxLife);
    };

    // ------------------------------------------------------------------
    // Drawing
    // ------------------------------------------------------------------

    const drawFruit = (f: Fruit) => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);

      // Body.
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(0, 0, f.r, 0, Math.PI * 2);
      ctx.fill();

      // Per-fruit signature detail (stripes, leaf, stem…).
      if (f.kind === "fruit") FRUITS[f.def]!.draw(ctx, f.r);

      if (f.kind === "bomb") {
        // Danger ring + fuse make bombs read clearly on any theme.
        const danger = themeRef.current.destructive || "#ef4444";
        ctx.lineWidth = 3;
        ctx.strokeStyle = danger;
        ctx.beginPath();
        ctx.arc(0, 0, f.r - 1.5, 0, Math.PI * 2);
        ctx.stroke();
        // Fuse.
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(f.r * 0.5, -f.r * 0.5);
        ctx.lineTo(f.r * 0.9, -f.r * 1.05);
        ctx.stroke();
        // Spark.
        ctx.fillStyle = danger;
        ctx.beginPath();
        ctx.arc(f.r * 0.95, -f.r * 1.1, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shine.
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-f.r * 0.32, -f.r * 0.32, f.r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.restore();
    };

    const drawHalf = (h: Half) => {
      const alpha = Math.max(0, 1 - h.life / 1.4);
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.rot);
      ctx.globalAlpha = alpha;
      // Exposed flesh fills the half disc; flat edge aligned with the cut.
      ctx.fillStyle = h.flesh;
      ctx.beginPath();
      ctx.arc(0, 0, h.r, h.cut, h.cut + Math.PI);
      ctx.closePath();
      ctx.fill();
      // Skin around the curved edge.
      ctx.strokeStyle = h.rind;
      ctx.lineWidth = h.r * 0.2;
      ctx.beginPath();
      ctx.arc(0, 0, h.r - h.r * 0.1, h.cut, h.cut + Math.PI);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    const drawTrail = (gs: NinjaState) => {
      if (gs.trail.length < 2) return;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 1; i < gs.trail.length; i++) {
        const p0 = gs.trail[i - 1]!;
        const p1 = gs.trail[i]!;
        const a = 1 - p1.age / TRAIL_LIFE;
        if (a <= 0) continue;
        // Colored glow under a white core.
        ctx.strokeStyle = themeRef.current.primary || "#3b82f6";
        ctx.globalAlpha = a * 0.35;
        ctx.lineWidth = 12 * a + 2;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();

        ctx.strokeStyle = "#ffffff";
        ctx.globalAlpha = a * 0.85;
        ctx.lineWidth = 5 * a + 1;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      const t = themeRef.current;
      const gs = stateRef.current;

      ctx.clearRect(0, 0, LOGW, LOGH);
      ctx.fillStyle = t.background || "#fff";
      ctx.fillRect(0, 0, LOGW, LOGH);

      if (!gs) return;

      // Particles behind, then fruit/halves, then text, then trail on top.
      for (const p of gs.particles) {
        const a = Math.max(0, 1 - p.life / p.maxLife);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const h of gs.halves) drawHalf(h);
      for (const f of gs.fruits) {
        if (f.sliced) continue; // halves replace it the same frame
        drawFruit(f);
      }

      for (const tx of gs.texts) {
        const a = Math.max(0, 1 - tx.life / tx.maxLife);
        ctx.globalAlpha = a;
        ctx.fillStyle = tx.color;
        ctx.font = `bold ${tx.size}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tx.text, tx.x, tx.y);
      }
      ctx.globalAlpha = 1;

      drawTrail(gs);

      // Bomb-hit flash.
      if (gs.flash > 0) {
        ctx.globalAlpha = (gs.flash / 0.3) * 0.35;
        ctx.fillStyle = t.destructive || "#ef4444";
        ctx.fillRect(0, 0, LOGW, LOGH);
        ctx.globalAlpha = 1;
      }
    };

    let raf = 0;
    let last = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (last === 0) last = now;
      const rawDt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const active =
        statusRef.current === "playing" && !pausedRef.current && !offscreenRef.current;

      if (active) step(rawDt);
      draw();
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Pointer / touch — drag the blade across fruit to slice.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const toLogical = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * LOGW,
        y: ((clientY - rect.top) / rect.height) * LOGH,
      };
    };

    let down = false;
    let lastX = 0;
    let lastY = 0;

    const pushTrail = (x: number, y: number) => {
      const gs = stateRef.current;
      if (!gs) return;
      gs.trail.push({ x, y, age: 0 });
      if (gs.trail.length > 24) gs.trail.shift();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (statusRef.current !== "playing") return;
      down = true;
      canvas.setPointerCapture?.(e.pointerId);
      const p = toLogical(e.clientX, e.clientY);
      lastX = p.x;
      lastY = p.y;
      pushTrail(p.x, p.y);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!down || statusRef.current !== "playing") return;
      const p = toLogical(e.clientX, e.clientY);
      pushTrail(p.x, p.y);
      sliceAlongRef.current(lastX, lastY, p.x, p.y);
      lastX = p.x;
      lastY = p.y;
    };

    const onPointerUp = (e: PointerEvent) => {
      down = false;
      canvas.releasePointerCapture?.(e.pointerId);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  // Keyboard — start / restart only (gameplay is pointer-driven).
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
      if (e.key === " " || e.key === "Enter") {
        if (statusRef.current === "idle" || statusRef.current === "gameover") {
          e.preventDefault();
          start();
        }
      }
    };
    const target: Window | HTMLElement | null = captureGlobalKeys
      ? window
      : wrapperRef.current;
    target?.addEventListener("keydown", onKeyDown as EventListener);
    return () => target?.removeEventListener("keydown", onKeyDown as EventListener);
  }, [start, captureGlobalKeys]);

  // Auto-focus.
  React.useEffect(() => {
    if (autoFocus) wrapperRef.current?.focus();
  }, [autoFocus]);

  const isOver = status === "gameover";

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      role="application"
      aria-label="Fruit Ninja game"
      style={width ? { maxWidth: width } : undefined}
      className={cn(
        "relative flex w-full select-none flex-col gap-2 outline-none",
        !captureGlobalKeys &&
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {/* Score bar */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="inline-flex items-center rounded-md border bg-secondary px-2 py-0.5 font-medium text-secondary-foreground tabular-nums">
          Score {score}
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 font-medium tabular-nums",
            timeLeft <= 10 && status === "playing"
              ? "bg-destructive text-white"
              : "bg-muted text-muted-foreground",
          )}
        >
          {timeLeft}s
        </span>
        <span className="text-muted-foreground tabular-nums">Best {high}</span>
      </div>

      {/* aria-live region */}
      <div aria-live="polite" className="sr-only">
        {status === "playing"
          ? `Score ${score}, ${timeLeft} seconds left`
          : status === "gameover"
            ? `Time's up. Final score ${score}`
            : "Fruit Ninja arcade. Press Start to play."}
      </div>

      {/* Canvas container */}
      <div
        ref={playfieldRef}
        className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border bg-background"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full touch-none cursor-crosshair"
        />

        {/* Overlays */}
        {status !== "playing" && (
          <div className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              {isOver ? (
                <>
                  <p className="text-lg font-semibold">Time&apos;s up!</p>
                  <p className="text-sm text-muted-foreground">
                    You scored {score}
                    {score >= high && score > 0 ? " — new best!" : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold">Fruit Ninja</p>
                  <p className="text-sm text-muted-foreground">
                    Swipe to slice the fruit. Dodge the bombs. 60-second arcade run.
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={start}
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm",
                  "transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {isOver ? "Play again" : "Start"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FruitNinja;
