"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                              Shared primitives                              */
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
/*                               Game constants                               */
/* -------------------------------------------------------------------------- */

// Logical playfield dimensions. All physics/drawing happen in this fixed
// coordinate space; the canvas is scaled to its rendered size at draw time.
const LOGW = 300;
const LOGH = 400;

const BIRD_X_FRAC = 0.25; // bird fixed x as fraction of width
const BIRD_RADIUS = 14; // bird half-size (drawn as rounded square)
const GRAVITY = 1800; // px/s² (normal)
const GRAVITY_REDUCED = 600; // px/s² (reduced motion)
const FLAP_VY = -480; // px/s (normal)
const FLAP_VY_REDUCED = -280; // px/s (reduced motion)
const PIPE_WIDTH = 52;
const PIPE_GAP = 130; // vertical gap between top/bottom pipes
const PIPE_SPEED = 180; // px/s (normal)
const PIPE_SPEED_REDUCED = 90; // px/s (reduced motion)
const PIPE_SPACING = 230; // horizontal distance between pipes
const GROUND_H = 24; // height of ground strip

/* -------------------------------------------------------------------------- */
/*                                Game types                                   */
/* -------------------------------------------------------------------------- */

interface Pipe {
  x: number;
  gapY: number; // center y of gap
  scored: boolean;
}

interface FlappyLiveState {
  birdY: number;
  birdVY: number;
  pipes: Pipe[];
  score: number;
  blipAlpha: number; // accent flash when scoring
}

/* -------------------------------------------------------------------------- */
/*                                  Component                                  */
/* -------------------------------------------------------------------------- */

export interface FlappyProps {
  className?: string;
  width?: number;
  height?: number;
  paused?: boolean;
  autoFocus?: boolean;
  persistHighScore?: boolean | string;
  onScoreChange?: (score: number) => void;
  onGameOver?: (r: { score: number; won: boolean }) => void;
  onStart?: () => void;
}

export function Flappy({
  className,
  width,
  paused = false,
  autoFocus = true,
  persistHighScore = true,
  onScoreChange,
  onGameOver,
  onStart,
}: FlappyProps) {
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
        : "gamekitui:flappy:hi";

  // Mutable refs the rAF loop reads without re-subscribing.
  const liveRef = React.useRef<FlappyLiveState>({
    birdY: LOGH / 2,
    birdVY: 0,
    pipes: [],
    score: 0,
    blipAlpha: 0,
  });
  const statusRef = React.useRef(status);
  const pausedRef = React.useRef(paused);
  const offscreenRef = React.useRef(offscreen);
  const themeRef = React.useRef(theme);
  const reduceRef = React.useRef(reduce);
  // Callbacks stored as refs to avoid rAF loop re-creation
  const onScoreChangeRef = React.useRef(onScoreChange);
  const onGameOverRef = React.useRef(onGameOver);
  const onStartRef = React.useRef(onStart);
  const submitHighRef = React.useRef<(s: number) => void>(() => undefined);

  statusRef.current = status;
  pausedRef.current = paused;
  offscreenRef.current = offscreen;
  themeRef.current = theme;
  reduceRef.current = reduce;
  onScoreChangeRef.current = onScoreChange;
  onGameOverRef.current = onGameOver;
  onStartRef.current = onStart;

  // Load persisted high score
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

  // Keep submitHigh in a ref so the rAF closure can call it
  submitHighRef.current = submitHigh;

  // Pause when scrolled offscreen or tab hidden
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

  // Helper: initialise live state for a fresh game
  const resetLive = React.useCallback(() => {
    // Spawn first pipe just off right edge
    const firstPipeX = LOGW + PIPE_SPACING * 0.5;
    const gapY = LOGH * 0.4 + Math.random() * (LOGH * 0.25);
    liveRef.current = {
      birdY: LOGH / 2,
      birdVY: 0,
      pipes: [{ x: firstPipeX, gapY, scored: false }],
      score: 0,
      blipAlpha: 0,
    };
  }, []);

  const start = React.useCallback(() => {
    resetLive();
    setScore(0);
    setStatus("playing");
    onStartRef.current?.();
    onScoreChangeRef.current?.(0);
    // Focus the wrapper so keyboard controls work after the Start button unmounts.
    wrapperRef.current?.focus();
  }, [resetLive]);

  // Flap action — callable from keyboard/touch/click
  const flap = React.useCallback(() => {
    if (statusRef.current === "gameover") {
      start();
      return;
    }
    if (statusRef.current === "idle") {
      start();
      // velocity will be set after start; we set it directly on live state
    }
    const vy = reduceRef.current ? FLAP_VY_REDUCED : FLAP_VY;
    liveRef.current.birdVY = vy;
  }, [start]);

  // Responsive canvas sizing: match the playfield's rendered CSS size × DPR,
  // then scale the context so all drawing/physics can use the logical space.
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

  // Drawing + main rAF loop
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const birdX = LOGW * BIRD_X_FRAC;
    const playH = LOGH - GROUND_H; // playable height above ground

    const drawRoundRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      fill: string,
    ) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    };

    const draw = () => {
      const t = themeRef.current;
      const live = liveRef.current;

      // Clear + background (logical space)
      ctx.clearRect(0, 0, LOGW, LOGH);
      ctx.fillStyle = t.background || "#fff";
      ctx.fillRect(0, 0, LOGW, LOGH);

      // Draw pipes (secondary color)
      for (const pipe of live.pipes) {
        const topH = pipe.gapY - PIPE_GAP / 2;
        const botY = pipe.gapY + PIPE_GAP / 2;
        const botH = playH - botY;
        const pipeColor = t.secondary || "#888";
        const r = 4;
        // Top pipe
        if (topH > 0) drawRoundRect(pipe.x, 0, PIPE_WIDTH, topH, r, pipeColor);
        // Bottom pipe
        if (botH > 0) drawRoundRect(pipe.x, botY, PIPE_WIDTH, botH, r, pipeColor);
      }

      // Ground strip (border/muted)
      ctx.fillStyle = t.border || t.muted || "#ccc";
      ctx.fillRect(0, playH, LOGW, GROUND_H);
      // Ground line
      ctx.fillStyle = t.muted || "#aaa";
      ctx.fillRect(0, playH, LOGW, 2);

      // Score blip overlay (accent)
      if (live.blipAlpha > 0) {
        ctx.globalAlpha = live.blipAlpha * 0.18;
        ctx.fillStyle = t.accent || "#ff0";
        ctx.fillRect(0, 0, LOGW, LOGH);
        ctx.globalAlpha = 1;
      }

      // Bird (primary, rounded square)
      const birdColor = t.primary || "#000";
      drawRoundRect(
        birdX - BIRD_RADIUS,
        live.birdY - BIRD_RADIUS,
        BIRD_RADIUS * 2,
        BIRD_RADIUS * 2,
        BIRD_RADIUS * 0.45,
        birdColor,
      );

      // Eye detail (primary-foreground)
      const eyeColor = t["primary-foreground"] || "#fff";
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(birdX + BIRD_RADIUS * 0.35, live.birdY - BIRD_RADIUS * 0.25, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(birdX + BIRD_RADIUS * 0.35, live.birdY - BIRD_RADIUS * 0.25, 1.5, 0, Math.PI * 2);
      ctx.fill();
    };

    let raf = 0;
    let last = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (last === 0) last = now;
      const dt = Math.min((now - last) / 1000, 0.05); // seconds, capped at 50ms
      last = now;

      const active = statusRef.current === "playing" && !pausedRef.current && !offscreenRef.current;

      if (active) {
        const live = liveRef.current;
        const isReduce = reduceRef.current;
        const gravity = isReduce ? GRAVITY_REDUCED : GRAVITY;
        const pipeSpeed = isReduce ? PIPE_SPEED_REDUCED : PIPE_SPEED;
        const playH = LOGH - GROUND_H;

        // Physics
        live.birdVY += gravity * dt;
        live.birdY += live.birdVY * dt;

        // Move pipes & spawn new ones
        for (const pipe of live.pipes) {
          pipe.x -= pipeSpeed * dt;
        }

        // Remove pipes that scrolled off-screen
        while (live.pipes.length > 0 && (live.pipes[0]?.x ?? 0) < -PIPE_WIDTH - 10) {
          live.pipes.shift();
        }

        // Spawn new pipe when last pipe is far enough left
        const lastPipe = live.pipes[live.pipes.length - 1];
        if (!lastPipe || lastPipe.x < LOGW - PIPE_SPACING) {
          const minGapY = PIPE_GAP / 2 + 30;
          const maxGapY = playH - PIPE_GAP / 2 - 30;
          const gapY = minGapY + Math.random() * Math.max(0, maxGapY - minGapY);
          live.pipes.push({ x: LOGW + PIPE_WIDTH, gapY, scored: false });
        }

        // Score: bird passed pipe center
        for (const pipe of live.pipes) {
          if (!pipe.scored && pipe.x + PIPE_WIDTH < birdX) {
            pipe.scored = true;
            live.score += 1;
            live.blipAlpha = 1;
            const sc = live.score;
            setScore(sc);
            onScoreChangeRef.current?.(sc);
          }
        }

        // Decay blip
        if (live.blipAlpha > 0) {
          live.blipAlpha = Math.max(0, live.blipAlpha - dt * 4);
        }

        // Collision: ceiling
        const hitCeiling = live.birdY - BIRD_RADIUS < 0;
        // Collision: ground
        const hitGround = live.birdY + BIRD_RADIUS > playH;
        // Collision: pipes
        let hitPipe = false;
        for (const pipe of live.pipes) {
          const birdL = birdX - BIRD_RADIUS + 3; // slight shrink for fairness
          const birdR = birdX + BIRD_RADIUS - 3;
          const birdT = live.birdY - BIRD_RADIUS + 3;
          const birdB = live.birdY + BIRD_RADIUS - 3;
          const pipeL = pipe.x;
          const pipeR = pipe.x + PIPE_WIDTH;
          const gapTop = pipe.gapY - PIPE_GAP / 2;
          const gapBot = pipe.gapY + PIPE_GAP / 2;
          const overlapX = birdR > pipeL && birdL < pipeR;
          if (overlapX && (birdT < gapTop || birdB > gapBot)) {
            hitPipe = true;
            break;
          }
        }

        if (hitCeiling || hitGround || hitPipe) {
          const finalScore = live.score;
          setStatus("gameover");
          submitHighRef.current(finalScore);
          onGameOverRef.current?.({ score: finalScore, won: false });
        }
      } else {
        last = now; // reset last so no huge dt burst after unpause
      }

      draw();
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keyboard handling
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        flap();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (statusRef.current !== "playing") flap();
      }
    };
    const el = wrapperRef.current;
    el?.addEventListener("keydown", onKey);
    return () => el?.removeEventListener("keydown", onKey);
  }, [flap]);

  // Touch / click — tap/click anywhere on canvas flaps
  React.useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onTap = (e: TouchEvent) => {
      e.preventDefault();
      flap();
    };
    el.addEventListener("touchstart", onTap, { passive: false });
    return () => el.removeEventListener("touchstart", onTap);
  }, [flap]);

  // Canvas click
  const handleCanvasClick = React.useCallback(() => {
    flap();
  }, [flap]);

  React.useEffect(() => {
    if (autoFocus) wrapperRef.current?.focus();
  }, [autoFocus]);

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      role="application"
      aria-label="Flappy bird game"
      style={width ? { maxWidth: width } : undefined}
      className={cn(
        "relative flex w-full select-none flex-col gap-2 outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {/* Score badge row */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <span
          className="inline-flex items-center rounded-md border bg-secondary px-2 py-0.5 font-medium text-secondary-foreground tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          Score {score}
        </span>
        <span className="text-muted-foreground tabular-nums">Best {high}</span>
      </div>

      {/* Canvas wrapper */}
      <div
        ref={playfieldRef}
        className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border bg-background"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full cursor-pointer touch-none"
          onClick={handleCanvasClick}
        />

        {/* Idle / Game-over overlay */}
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
                  <p className="font-semibold text-lg">Flappy</p>
                  <p className="text-muted-foreground text-sm">
                    Space, ↑, or tap to flap.
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
                {status === "gameover" ? "Play again" : "Start"}
              </button>
            </div>
          </div>
        )}

        {/* Aria-live region (hidden visually, readable by screen readers) */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {status === "gameover"
            ? `Game over. You scored ${score}.${score >= high && score > 0 ? " New best!" : ""}`
            : status === "idle"
              ? "Flappy bird. Press Space or tap to start."
              : `Score ${score}`}
        </div>
      </div>
    </div>
  );
}

export default Flappy;
