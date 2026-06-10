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

// Logical (design) coordinate space. All drawing happens in this space; the
// canvas is scaled to its rendered CSS size via setTransform.
const LOGW = 360;
const LOGH = 480;

const BASE_SIZE = 110; // footprint of the first block, in logical units
const LAYER_H = 17; // visual height of each layer
const SLIDE_RANGE = 110; // how far the active block slides from center
const PERFECT_TOL = 6; // |offset| ≤ this counts as a perfect drop
const MIN_OVERLAP = 2; // anything thinner is a miss
const GROW_STEP = 9; // perfect streaks regrow the block by this much
const GROW_AFTER = 3; // ...once the streak reaches this length
const GRAVITY = 1300;

// Isometric projection factors (2:1-ish axonometric).
const KX = 0.866;
const KY = 0.5;

/* -------------------------------------------------------------------------- */
/*                              Color helpers                                  */
/* -------------------------------------------------------------------------- */

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/* -------------------------------------------------------------------------- */
/*                              Game state types                               */
/* -------------------------------------------------------------------------- */

interface Layer {
  x: number; // center along the x axis
  z: number; // center along the z axis
  w: number; // size along x
  d: number; // size along z
}

interface Debris {
  x: number;
  z: number;
  w: number;
  d: number;
  yTop: number; // top height when it broke off
  fall: number; // distance fallen so far
  vy: number;
  life: number;
  ci: number; // palette index of the layer it sheared off
}

interface Ring {
  x: number;
  z: number;
  w: number;
  d: number;
  y: number;
  life: number;
}

interface FloatText {
  sx: number; // screen-space — rises with the tower view
  sy: number;
  life: number;
  maxLife: number;
  text: string;
}

interface StackState {
  layers: Layer[];
  axis: 0 | 1; // 0 = sliding along x, 1 = along z
  pos: number; // active block center on the slide axis
  dir: 1 | -1;
  speed: number;
  combo: number;
  debris: Debris[];
  rings: Ring[];
  texts: FloatText[];
  cam: number; // screen-space y offset (lerped)
  ended: boolean; // miss happened; fx still animate until the overlay shows
}

function initState(): StackState {
  return {
    layers: [{ x: 0, z: 0, w: BASE_SIZE, d: BASE_SIZE }],
    axis: 0,
    pos: -SLIDE_RANGE,
    dir: 1,
    speed: 120,
    combo: 0,
    debris: [],
    rings: [],
    texts: [],
    cam: LOGH * 0.45 + LAYER_H,
    ended: false,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Props                                          */
/* -------------------------------------------------------------------------- */

export interface StackProps {
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

export function Stack({
  className,
  width,
  paused = false,
  autoFocus = true,
  captureGlobalKeys = true,
  persistHighScore = true,
  onScoreChange,
  onGameOver,
  onStart,
}: StackProps) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const playfieldRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const theme = useGameTheme(wrapperRef);
  const reduce = usePrefersReducedMotion();

  const [status, setStatus] = React.useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = React.useState(0);
  const [high, setHigh] = React.useState(0);
  const [offscreen, setOffscreen] = React.useState(false);

  const storageKey =
    typeof persistHighScore === "string"
      ? persistHighScore
      : persistHighScore === false
        ? null
        : "gamekitui:stack:hi";

  // Mutable refs for the rAF loop — never cause re-renders.
  const stateRef = React.useRef<StackState | null>(null);
  const statusRef = React.useRef(status);
  const pausedRef = React.useRef(paused);
  const offscreenRef = React.useRef(offscreen);
  const themeRef = React.useRef(theme);
  const reduceRef = React.useRef(reduce);
  const baseHslRef = React.useRef<Hsl>({ h: 215, s: 60, l: 50 });
  const overlayTimerRef = React.useRef(0);
  const onScoreChangeRef = React.useRef(onScoreChange);
  const onGameOverRef = React.useRef(onGameOver);
  const submitHighRef = React.useRef<(s: number) => void>(() => undefined);
  const dropRef = React.useRef<() => void>(() => undefined);

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

  // Derive the palette base from the theme's primary token by rasterizing it
  // to a pixel — works for any CSS color format (hex, oklch, hsl…). Layer
  // colors recompute from this every frame, so swapping themes recolors the
  // whole tower live.
  React.useEffect(() => {
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      const cx = c.getContext("2d");
      if (!cx) return;
      cx.fillStyle = "#3b82f6";
      cx.fillStyle = theme.primary || "#3b82f6";
      cx.fillRect(0, 0, 1, 1);
      const [r, g, b] = cx.getImageData(0, 0, 1, 1).data;
      baseHslRef.current = rgbToHsl(r!, g!, b!);
    } catch {
      /* keep previous */
    }
  }, [theme]);

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

  React.useEffect(() => () => window.clearTimeout(overlayTimerRef.current), []);

  const start = React.useCallback(() => {
    window.clearTimeout(overlayTimerRef.current);
    stateRef.current = initState();
    setScore(0);
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

  // Main rAF loop: slide → drop → slice → drawing.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /* ------------------------------ palette ------------------------------ */

    // Each layer gets a shade of the theme palette: the hue drifts slowly away
    // from --primary as the tower climbs, while lightness rolls in a wave.
    const layerColor = (i: number, adjust: number): string => {
      const { h, s } = baseHslRef.current;
      const hue = (h + i * 5 + 360) % 360;
      const sat = Math.min(72, Math.max(34, s));
      const light = Math.min(86, Math.max(14, 50 + 12 * Math.sin(i * 0.45) + adjust));
      return `hsl(${hue.toFixed(1)} ${sat.toFixed(1)}% ${light.toFixed(1)}%)`;
    };

    /* ---------------------------- projection ----------------------------- */

    const px = (x: number, z: number) => LOGW / 2 + (x - z) * KX;
    const py = (gs: StackState, x: number, z: number, y: number) => gs.cam + (x + z) * KY - y;

    /** Draw an isometric box: top face + the two camera-facing walls. */
    const drawBox = (
      gs: StackState,
      x: number,
      z: number,
      w: number,
      d: number,
      yBottom: number,
      yTop: number,
      colorIdx: number,
      alpha = 1,
    ) => {
      const hw = w / 2;
      const hd = d / 2;
      // Corners: A back, B right, C front, D left (screen-wise).
      const ax = px(x - hw, z - hd);
      const ay = py(gs, x - hw, z - hd, yTop);
      const bx = px(x + hw, z - hd);
      const by = py(gs, x + hw, z - hd, yTop);
      const cx = px(x + hw, z + hd);
      const cy = py(gs, x + hw, z + hd, yTop);
      const dx = px(x - hw, z + hd);
      const dy = py(gs, x - hw, z + hd, yTop);
      const drop = yTop - yBottom;

      ctx.globalAlpha = alpha;

      // +x wall (screen lower-right).
      ctx.fillStyle = layerColor(colorIdx, -9);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + drop);
      ctx.lineTo(bx, by + drop);
      ctx.closePath();
      ctx.fill();

      // +z wall (screen lower-left).
      ctx.fillStyle = layerColor(colorIdx, -18);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(dx, dy);
      ctx.lineTo(dx, dy + drop);
      ctx.lineTo(cx, cy + drop);
      ctx.closePath();
      ctx.fill();

      // Top face.
      ctx.fillStyle = layerColor(colorIdx, 8);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.lineTo(dx, dy);
      ctx.closePath();
      ctx.fill();
      // Crisp edge.
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.globalAlpha = 1;
    };

    /* ------------------------------- drop -------------------------------- */

    const endGame = (gs: StackState) => {
      gs.ended = true;
      const final = gs.layers.length - 1;
      submitHighRef.current(final);
      onGameOverRef.current?.({ score: final, won: final > 0 });
      // Let the missed block tumble before the overlay covers it.
      window.clearTimeout(overlayTimerRef.current);
      overlayTimerRef.current = window.setTimeout(
        () => setStatus("gameover"),
        reduceRef.current ? 150 : 750,
      );
    };

    const drop = () => {
      const gs = stateRef.current;
      if (!gs || gs.ended || statusRef.current !== "playing") return;

      const below = gs.layers[gs.layers.length - 1]!;
      const n = gs.layers.length; // index of the block being placed
      const yTop = (n + 1) * LAYER_H;
      const alongX = gs.axis === 0;
      const belowPos = alongX ? below.x : below.z;
      const size = alongX ? below.w : below.d;
      const off = gs.pos - belowPos;
      const overlap = size - Math.abs(off);

      if (overlap <= MIN_OVERLAP) {
        // Clean miss — the whole block tumbles.
        gs.debris.push({
          x: alongX ? gs.pos : below.x,
          z: alongX ? below.z : gs.pos,
          w: alongX ? size : below.w,
          d: alongX ? below.d : size,
          yTop,
          fall: 0,
          vy: 0,
          life: 0,
          ci: n,
        });
        endGame(gs);
        return;
      }

      const perfect = Math.abs(off) <= PERFECT_TOL;
      let newPos: number;
      let newSize: number;

      if (perfect) {
        gs.combo += 1;
        newPos = belowPos;
        newSize = size;
        // Streaks regrow the block toward its original footprint.
        if (gs.combo >= GROW_AFTER) newSize = Math.min(size + GROW_STEP, BASE_SIZE);
        gs.rings.push({
          x: alongX ? newPos : below.x,
          z: alongX ? below.z : newPos,
          w: alongX ? newSize : below.w,
          d: alongX ? below.d : newSize,
          y: yTop,
          life: 0,
        });
        if (gs.combo >= 2) {
          gs.texts.push({
            sx: LOGW / 2,
            sy: LOGH * 0.30,
            life: 0,
            maxLife: 0.8,
            text: `Perfect ×${gs.combo}`,
          });
        }
      } else {
        gs.combo = 0;
        newPos = (gs.pos + belowPos) / 2;
        newSize = overlap;
        // The overhang shears off and falls.
        const cutCenter = newPos + (Math.sign(off) * size) / 2;
        gs.debris.push({
          x: alongX ? cutCenter : below.x,
          z: alongX ? below.z : cutCenter,
          w: alongX ? Math.abs(off) : below.w,
          d: alongX ? below.d : Math.abs(off),
          yTop,
          fall: 0,
          vy: 0,
          life: 0,
          ci: n,
        });
      }

      gs.layers.push({
        x: alongX ? newPos : below.x,
        z: alongX ? below.z : newPos,
        w: alongX ? newSize : below.w,
        d: alongX ? below.d : newSize,
      });
      const s = gs.layers.length - 1;
      setScore(s);
      onScoreChangeRef.current?.(s);

      // Next block: other axis, faster, entering from alternating sides.
      gs.axis = gs.axis === 0 ? 1 : 0;
      gs.dir = s % 2 === 0 ? 1 : -1;
      gs.pos = gs.dir === 1 ? -SLIDE_RANGE : SLIDE_RANGE;
      const ramp = reduceRef.current ? 1.6 : 3;
      gs.speed = 120 + Math.min(s * ramp, 150);
    };
    dropRef.current = drop;

    /* ------------------------------- step -------------------------------- */

    const step = (dt: number) => {
      const gs = stateRef.current;
      if (!gs) return;

      if (!gs.ended) {
        gs.pos += gs.dir * gs.speed * dt;
        if (gs.pos > SLIDE_RANGE) {
          gs.pos = SLIDE_RANGE;
          gs.dir = -1;
        } else if (gs.pos < -SLIDE_RANGE) {
          gs.pos = -SLIDE_RANGE;
          gs.dir = 1;
        }
      }

      // FX keep animating even while the game-over overlay is pending.
      for (const f of gs.debris) {
        f.vy += GRAVITY * dt;
        f.fall += f.vy * dt;
        f.life += dt;
      }
      gs.debris = gs.debris.filter((f) => f.life < 1.4);
      for (const r of gs.rings) r.life += dt;
      gs.rings = gs.rings.filter((r) => r.life < 0.5);
      for (const t of gs.texts) t.life += dt;
      gs.texts = gs.texts.filter((t) => t.life < t.maxLife);

      // Camera keeps the tower top around 45% of the view.
      const topY = gs.layers.length * LAYER_H;
      const target = LOGH * 0.45 + topY;
      gs.cam += (target - gs.cam) * Math.min(1, (reduceRef.current ? 12 : 5) * dt);
    };

    /* ------------------------------ drawing ------------------------------ */

    const draw = () => {
      const t = themeRef.current;
      const gs = stateRef.current;

      ctx.clearRect(0, 0, LOGW, LOGH);
      ctx.fillStyle = t.background || "#fff";
      ctx.fillRect(0, 0, LOGW, LOGH);

      // A faint vertical wash of the palette keeps the scene from feeling flat.
      const wash = ctx.createLinearGradient(0, 0, 0, LOGH);
      const { h, s } = baseHslRef.current;
      wash.addColorStop(0, `hsl(${h} ${Math.min(60, s)}% 50% / 0.10)`);
      wash.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, LOGW, LOGH);

      if (!gs) return;

      // Tower — only the layers that can be on screen.
      const first = Math.max(0, gs.layers.length - 30);
      for (let i = first; i < gs.layers.length; i++) {
        const L = gs.layers[i]!;
        const yTop = (i + 1) * LAYER_H;
        const yBottom = i === 0 ? -LOGH : yTop - LAYER_H;
        drawBox(gs, L.x, L.z, L.w, L.d, yBottom, yTop, i);
      }

      // Active sliding block.
      if (!gs.ended) {
        const n = gs.layers.length;
        const below = gs.layers[n - 1]!;
        const alongX = gs.axis === 0;
        drawBox(
          gs,
          alongX ? gs.pos : below.x,
          alongX ? below.z : gs.pos,
          below.w,
          below.d,
          n * LAYER_H,
          (n + 1) * LAYER_H,
          n,
        );
      }

      // Falling debris.
      for (const f of gs.debris) {
        const alpha = Math.max(0, 1 - f.life / 1.4);
        drawBox(gs, f.x, f.z, f.w, f.d, f.yTop - LAYER_H - f.fall, f.yTop - f.fall, f.ci, alpha);
      }

      // Perfect rings — the top face outline expanding outward.
      for (const r of gs.rings) {
        const k = r.life / 0.5;
        const grow = 1 + k * 0.35;
        const hw = (r.w / 2) * grow;
        const hd = (r.d / 2) * grow;
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.strokeStyle = t.foreground || "#000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px(r.x - hw, r.z - hd), py(gs, r.x - hw, r.z - hd, r.y));
        ctx.lineTo(px(r.x + hw, r.z - hd), py(gs, r.x + hw, r.z - hd, r.y));
        ctx.lineTo(px(r.x + hw, r.z + hd), py(gs, r.x + hw, r.z + hd, r.y));
        ctx.lineTo(px(r.x - hw, r.z + hd), py(gs, r.x - hw, r.z + hd, r.y));
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Big height counter — the signature Stack look.
      if (statusRef.current === "playing" || gs.layers.length > 1) {
        ctx.fillStyle = t.foreground || "#000";
        ctx.globalAlpha = 0.85;
        ctx.font = "bold 44px ui-sans-serif, system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(String(gs.layers.length - 1), LOGW / 2, 18);
        ctx.globalAlpha = 1;
      }

      // Floating texts (screen space).
      for (const tx of gs.texts) {
        const a = Math.max(0, 1 - tx.life / tx.maxLife);
        ctx.globalAlpha = a;
        ctx.fillStyle = t.primary || "#3b82f6";
        ctx.font = "bold 18px ui-sans-serif, system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tx.text, tx.sx, tx.sy - tx.life * 30);
      }
      ctx.globalAlpha = 1;
    };

    let raf = 0;
    let last = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (last === 0) last = now;
      const rawDt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const active = statusRef.current === "playing" && !pausedRef.current && !offscreenRef.current;

      if (active) step(rawDt);
      draw();
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Pointer / touch — one tap drops the block.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onPointerDown = () => {
      if (statusRef.current === "playing") dropRef.current();
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    return () => canvas.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Keyboard — Space/Enter/Up drop the block (or start a run).
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
      if (e.repeat) return;
      const key = e.key === "w" || e.key === "W" ? "ArrowUp" : e.key;
      if (key === " " || key === "Enter" || key === "ArrowUp") {
        e.preventDefault();
        if (statusRef.current === "playing") dropRef.current();
        else start();
      }
    };
    const target: Window | HTMLElement | null = captureGlobalKeys ? window : wrapperRef.current;
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
      aria-label="Stack game"
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
          Height {score}
        </span>
        <span className="text-muted-foreground tabular-nums">Best {high}</span>
      </div>

      {/* aria-live region */}
      <div aria-live="polite" className="sr-only">
        {status === "playing"
          ? `Tower height ${score}`
          : status === "gameover"
            ? `Game over. Final height ${score}`
            : "Stack. Press Start, then tap to drop blocks."}
      </div>

      {/* Canvas container */}
      <div
        ref={playfieldRef}
        className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border bg-background"
      >
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none" />

        {/* Overlays */}
        {status !== "playing" && (
          <div className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              {isOver ? (
                <>
                  <p className="text-lg font-semibold">Tower down!</p>
                  <p className="text-sm text-muted-foreground">
                    Height {score}
                    {score >= high && score > 0 ? " — new best!" : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold">Stack</p>
                  <p className="text-sm text-muted-foreground">
                    Tap to drop the sliding block. Land flush to keep your size — perfect streaks
                    grow it back.
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
                {isOver ? "Stack again" : "Start"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Stack;
