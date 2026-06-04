"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                   Engine                                    */
/* -------------------------------------------------------------------------- */

type Vec = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";

const DELTA: Record<Dir, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

interface SnakeState {
  snake: Vec[];
  dir: Dir;
  food: Vec;
  score: number;
  gameOver: boolean;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSnakeEngine({ cols, rows, seed }: { cols: number; rows: number; seed: number }) {
  const rand = mulberry32(seed);
  let queued: Dir | null = null;

  const spawnFood = (snake: Vec[]): Vec => {
    let food: Vec;
    do {
      food = { x: Math.floor(rand() * cols), y: Math.floor(rand() * rows) };
    } while (snake.some((s) => s.x === food.x && s.y === food.y));
    return food;
  };

  const init = (): SnakeState => {
    const startX = Math.floor(cols / 2);
    const startY = Math.floor(rows / 2);
    const snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];
    return { snake, dir: "right", food: spawnFood(snake), score: 0, gameOver: false };
  };

  let state = init();

  return {
    get state() {
      return state;
    },
    input(dir: Dir) {
      // Reject reversing into yourself; queue so a single tick turns once.
      if (dir !== OPPOSITE[state.dir]) queued = dir;
    },
    step() {
      if (state.gameOver) return;
      const dir = queued ?? state.dir;
      queued = null;
      const d = DELTA[dir];
      const head = state.snake[0]!;
      const next: Vec = { x: head.x + d.x, y: head.y + d.y };

      const hitWall = next.x < 0 || next.y < 0 || next.x >= cols || next.y >= rows;
      const hitSelf = state.snake.some((s, i) => i < state.snake.length - 1 && s.x === next.x && s.y === next.y);
      if (hitWall || hitSelf) {
        state = { ...state, dir, gameOver: true };
        return;
      }

      const ate = next.x === state.food.x && next.y === state.food.y;
      const snake = [next, ...state.snake];
      if (!ate) snake.pop();
      state = {
        snake,
        dir,
        food: ate ? spawnFood(snake) : state.food,
        score: state.score + (ate ? 1 : 0),
        gameOver: false,
      };
    },
    reset() {
      queued = null;
      state = init();
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                              Shared primitives                             */
/* -------------------------------------------------------------------------- */

const THEME_TOKENS = [
  "background",
  "foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "accent",
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
/*                                  Component                                  */
/* -------------------------------------------------------------------------- */

export interface SnakeProps {
  className?: string;
  width?: number;
  height?: number;
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
  onGameOver?: (result: { score: number; won: boolean }) => void;
  onStart?: () => void;
}

const COLS = 20;
const ROWS = 20;

export function Snake({
  className,
  width,
  paused = false,
  autoFocus = true,
  captureGlobalKeys = true,
  persistHighScore = true,
  onScoreChange,
  onGameOver,
  onStart,
}: SnakeProps) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const playfieldRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  // Live logical (CSS px) size of the playfield, kept in a ref for the rAF loop.
  const sizeRef = React.useRef({ w: 0, h: 0 });
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
        : "gamekitui:snake:hi";

  // Mutable refs the rAF loop reads without re-subscribing.
  const engineRef = React.useRef<ReturnType<typeof createSnakeEngine> | null>(null);
  const statusRef = React.useRef(status);
  const pausedRef = React.useRef(paused);
  const offscreenRef = React.useRef(offscreen);
  const themeRef = React.useRef(theme);
  const reduceRef = React.useRef(reduce);
  statusRef.current = status;
  pausedRef.current = paused;
  offscreenRef.current = offscreen;
  themeRef.current = theme;
  reduceRef.current = reduce;

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
    const engine = createSnakeEngine({ cols: COLS, rows: ROWS, seed: (Math.random() * 2 ** 31) | 0 });
    engineRef.current = engine;
    setScore(0);
    setStatus("playing");
    onStart?.();
    onScoreChange?.(0);
    // Focus the wrapper so keyboard controls work after the Start button unmounts.
    wrapperRef.current?.focus();
  }, [onScoreChange, onStart]);

  // Responsive canvas sizing: match the playfield's rendered CSS size × DPR.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const field = playfieldRef.current;
    if (!canvas || !field) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = field.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(field);
    return () => ro.disconnect();
  }, []);

  // Drawing + main loop.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const t = themeRef.current;
      const engine = engineRef.current;
      const { w: width, h: height } = sizeRef.current;
      if (width === 0 || height === 0) return;
      const cell = Math.min(width / COLS, height / ROWS);
      const offX = (width - cell * COLS) / 2;
      const offY = (height - cell * ROWS) / 2;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = t.background || "#fff";
      ctx.fillRect(0, 0, width, height);

      // grid
      ctx.strokeStyle = t.border || "rgba(0,0,0,.1)";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(offX + i * cell, offY);
        ctx.lineTo(offX + i * cell, offY + ROWS * cell);
        ctx.stroke();
      }
      for (let j = 0; j <= ROWS; j++) {
        ctx.beginPath();
        ctx.moveTo(offX, offY + j * cell);
        ctx.lineTo(offX + COLS * cell, offY + j * cell);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (!engine) return;
      const s = engine.state;
      const pad = Math.max(1, cell * 0.12);
      const r = Math.max(1, cell * 0.18);
      const rect = (gx: number, gy: number, fill: string) => {
        const x = offX + gx * cell + pad;
        const y = offY + gy * cell + pad;
        const w = cell - pad * 2;
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.roundRect(x, y, w, w, r);
        ctx.fill();
      };

      // food (destructive — a contrasting accent, distinct from the primary snake)
      rect(s.food.x, s.food.y, t.destructive || "#f00");

      // snake body (primary), head a brighter shade
      for (let i = s.snake.length - 1; i >= 0; i--) {
        const seg = s.snake[i]!;
        rect(seg.x, seg.y, i === 0 ? t.foreground || t.primary : t.primary || "#000");
      }
    };

    let raf = 0;
    let last = 0;
    let acc = 0;
    const interval = reduceRef.current ? 200 : 110;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (last === 0) last = now;
      const dt = now - last;
      last = now;

      const active = statusRef.current === "playing" && !pausedRef.current && !offscreenRef.current;
      if (active) {
        acc += dt;
        while (acc >= interval) {
          acc -= interval;
          const engine = engineRef.current;
          if (!engine) break;
          engine.step();
          if (engine.state.gameOver) {
            const finalScore = engine.state.score;
            setStatus("gameover");
            submitHigh(finalScore);
            onGameOver?.({ score: finalScore, won: false });
            break;
          } else {
            const sc = engine.state.score;
            setScore((prev) => {
              if (prev !== sc) onScoreChange?.(sc);
              return sc;
            });
          }
        }
      } else {
        acc = 0;
      }
      draw();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [onGameOver, onScoreChange, submitHigh]);

  // Keyboard.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // In global mode, ignore keys aimed at form fields / editable content.
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
      const engine = engineRef.current;
      const map: Record<string, Dir> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
        W: "up",
        S: "down",
        A: "left",
        D: "right",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        if (statusRef.current === "idle") start();
        engine?.input(dir);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (statusRef.current !== "playing") start();
      }
    };
    // Single-game pages can opt into window-level capture so keys work without
    // focusing the game; otherwise listen on the wrapper (focus-scoped).
    const target: Window | HTMLElement | null = captureGlobalKeys
      ? window
      : wrapperRef.current;
    target?.addEventListener("keydown", onKey as EventListener);
    return () => {
      target?.removeEventListener("keydown", onKey as EventListener);
    };
  }, [start, captureGlobalKeys]);

  // Touch swipe.
  React.useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let sx = 0;
    let sy = 0;
    const onStartTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      sx = t.clientX;
      sy = t.clientY;
      if (statusRef.current !== "playing") start();
    };
    const onMove = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      engineRef.current?.input(dir);
      sx = t.clientX;
      sy = t.clientY;
      e.preventDefault();
    };
    el.addEventListener("touchstart", onStartTouch, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onStartTouch);
      el.removeEventListener("touchmove", onMove);
    };
  }, [start]);

  React.useEffect(() => {
    if (autoFocus) wrapperRef.current?.focus();
  }, [autoFocus]);

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      role="application"
      aria-label="Snake game"
      style={width ? { maxWidth: width } : undefined}
      className={cn(
        "relative flex w-full select-none flex-col gap-2 outline-none",
        // Focus ring only matters when keys are focus-scoped; global capture hides it.
        !captureGlobalKeys &&
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span
          className="inline-flex items-center rounded-md border bg-secondary px-2 py-0.5 font-medium text-secondary-foreground tabular-nums"
          aria-live="polite"
        >
          Score {score}
        </span>
        <span className="text-muted-foreground tabular-nums">Best {high}</span>
      </div>

      <div
        ref={playfieldRef}
        className="relative aspect-square w-full overflow-hidden rounded-lg border bg-background"
      >
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none" />

        {status !== "playing" && (
          <div className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              {status === "gameover" ? (
                <>
                  <p className="font-semibold text-lg">Game over</p>
                  <p className="text-muted-foreground text-sm">
                    You scored {score}
                    {score >= high && score > 0 ? " — new best!" : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-lg">Snake</p>
                  <p className="text-muted-foreground text-sm">Arrow keys, WASD, or swipe to move.</p>
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
                {status === "gameover" ? "Play again" : "Start"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Snake;
