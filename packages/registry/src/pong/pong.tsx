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
/*                              Game constants                                 */
/* -------------------------------------------------------------------------- */

// Logical drawing space — all physics/layout/drawing happen in this coordinate
// system; the canvas is scaled to fit its container while preserving aspect.
const LOGW = 360;
const LOGH = 240;

const PADDLE_W = 8;
const PADDLE_H = 50;
const PADDLE_RADIUS = 4;
const BALL_SIZE = 10;
const BALL_RADIUS = 5;
const PADDLE_MARGIN = 14;
const MAX_SCORE = 7;

// Ball speed in px/s at normal motion
const BALL_SPEED_NORMAL = 220;
const BALL_SPEED_REDUCED = 80;
const CPU_SPEED_NORMAL = 170; // px/s
const CPU_SPEED_REDUCED = 60;

/* -------------------------------------------------------------------------- */
/*                              Game state (refs)                              */
/* -------------------------------------------------------------------------- */

interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GameState {
  playerY: number;
  cpuY: number;
  ball: BallState;
  playerScore: number;
  cpuScore: number;
  pointFlash: number; // timestamp of last point, for flash
  pointWinner: "player" | "cpu" | null;
}

function initBall(towardPlayer: boolean, speed: number): BallState {
  const angle = (Math.random() * 0.6 - 0.3); // -0.3 to 0.3 radians
  const vx = towardPlayer ? -speed * Math.cos(angle) : speed * Math.cos(angle);
  const vy = speed * Math.sin(angle);
  return { x: LOGW / 2, y: LOGH / 2, vx, vy };
}

function initGameState(speed: number): GameState {
  return {
    playerY: LOGH / 2 - PADDLE_H / 2,
    cpuY: LOGH / 2 - PADDLE_H / 2,
    ball: initBall(Math.random() > 0.5, speed),
    playerScore: 0,
    cpuScore: 0,
    pointFlash: 0,
    pointWinner: null,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  Component                                  */
/* -------------------------------------------------------------------------- */

export interface PongProps {
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

export function Pong({
  className,
  width,
  paused = false,
  autoFocus = true,
  persistHighScore: _persistHighScore,
  onScoreChange,
  onGameOver,
  onStart,
}: PongProps) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const playfieldRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const theme = useGameTheme(wrapperRef as React.RefObject<HTMLElement | null>);
  const reduce = usePrefersReducedMotion();

  const [status, setStatus] = React.useState<"idle" | "playing" | "gameover">("idle");
  const [playerScore, setPlayerScore] = React.useState(0);
  const [cpuScore, setCpuScore] = React.useState(0);
  const [winner, setWinner] = React.useState<"player" | "cpu" | null>(null);
  const [offscreen, setOffscreen] = React.useState(false);

  // Mutable refs the rAF loop reads without re-subscribing
  const statusRef = React.useRef(status);
  const pausedRef = React.useRef(paused);
  const offscreenRef = React.useRef(offscreen);
  const themeRef = React.useRef(theme);
  const reduceRef = React.useRef(reduce);
  const gameStateRef = React.useRef<GameState | null>(null);
  // Track pointer drag y for player paddle
  const pointerYRef = React.useRef<number | null>(null);
  // Track pressed keys
  const keysRef = React.useRef<Set<string>>(new Set());

  statusRef.current = status;
  pausedRef.current = paused;
  offscreenRef.current = offscreen;
  themeRef.current = theme;
  reduceRef.current = reduce;

  // Announce score changes
  const [announcement, setAnnouncement] = React.useState("");

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

  const start = React.useCallback(() => {
    const speed = reduceRef.current ? BALL_SPEED_REDUCED : BALL_SPEED_NORMAL;
    gameStateRef.current = initGameState(speed);
    setPlayerScore(0);
    setCpuScore(0);
    setWinner(null);
    setStatus("playing");
    setAnnouncement("Game started");
    onStart?.();
    onScoreChange?.(0);
    // Focus the wrapper so keyboard controls work after the Start button unmounts.
    wrapperRef.current?.focus();
  }, [onScoreChange, onStart]);

  // Responsive canvas sizing: match the playfield's rendered CSS size × DPR,
  // then scale the transform so all drawing happens in LOGW×LOGH logical space.
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
      const scale = w / LOGW;
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(field);
    return () => ro.disconnect();
  }, []);

  // Drawing + main loop
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

    const draw = (gs: GameState | null) => {
      const t = themeRef.current;

      // Clear (transform already maps logical space onto the device canvas)
      ctx.clearRect(0, 0, LOGW, LOGH);

      // Background
      ctx.fillStyle = t.background || "#000";
      ctx.fillRect(0, 0, LOGW, LOGH);

      // Border
      ctx.strokeStyle = t.border || "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, LOGW - 1, LOGH - 1);

      // Dashed center line
      const now = performance.now();
      const flashActive = gs && (now - gs.pointFlash) < 400;
      const midLineColor = flashActive
        ? t.accent || "#ff0"
        : t.muted || "rgba(255,255,255,0.15)";
      ctx.strokeStyle = midLineColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(LOGW / 2, 4);
      ctx.lineTo(LOGW / 2, LOGH - 4);
      ctx.stroke();
      ctx.setLineDash([]);

      if (!gs) return;

      // Player paddle (left) — primary
      drawRoundRect(
        PADDLE_MARGIN,
        gs.playerY,
        PADDLE_W,
        PADDLE_H,
        PADDLE_RADIUS,
        t.primary || "#fff",
      );

      // CPU paddle (right) — secondary
      drawRoundRect(
        LOGW - PADDLE_MARGIN - PADDLE_W,
        gs.cpuY,
        PADDLE_W,
        PADDLE_H,
        PADDLE_RADIUS,
        t.secondary || "#888",
      );

      // Ball — primary (rounded square)
      drawRoundRect(
        gs.ball.x - BALL_SIZE / 2,
        gs.ball.y - BALL_SIZE / 2,
        BALL_SIZE,
        BALL_SIZE,
        BALL_RADIUS,
        t.primary || "#fff",
      );
    };

    let raf = 0;
    let last = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (last === 0) last = now;
      const dt = Math.min((now - last) / 1000, 0.05); // seconds, capped
      last = now;

      const active = statusRef.current === "playing" && !pausedRef.current && !offscreenRef.current;
      const gs = gameStateRef.current;

      if (active && gs) {
        const speed = reduceRef.current ? BALL_SPEED_REDUCED : BALL_SPEED_NORMAL;
        const cpuSpeed = reduceRef.current ? CPU_SPEED_REDUCED : CPU_SPEED_NORMAL;

        // Player paddle movement via keys
        const keys = keysRef.current;
        const paddleSpeed = cpuSpeed * 1.3; // player paddle speed
        if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) {
          gs.playerY = Math.max(0, gs.playerY - paddleSpeed * dt);
        }
        if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) {
          gs.playerY = Math.min(LOGH - PADDLE_H, gs.playerY + paddleSpeed * dt);
        }

        // Player paddle movement via pointer
        const ptrY = pointerYRef.current;
        if (ptrY !== null) {
          const targetY = ptrY - PADDLE_H / 2;
          const clamped = Math.max(0, Math.min(LOGH - PADDLE_H, targetY));
          // Snap to pointer position (within capped speed)
          const diff = clamped - gs.playerY;
          const maxMove = paddleSpeed * dt;
          if (Math.abs(diff) <= maxMove) {
            gs.playerY = clamped;
          } else {
            gs.playerY += Math.sign(diff) * maxMove;
          }
        }

        // CPU paddle AI — track ball with capped speed
        const cpuCenter = gs.cpuY + PADDLE_H / 2;
        const diff = gs.ball.y - cpuCenter;
        const maxMove = cpuSpeed * dt;
        if (Math.abs(diff) > 2) {
          gs.cpuY += Math.sign(diff) * Math.min(Math.abs(diff), maxMove);
          gs.cpuY = Math.max(0, Math.min(LOGH - PADDLE_H, gs.cpuY));
        }

        // Move ball
        gs.ball.x += gs.ball.vx * dt;
        gs.ball.y += gs.ball.vy * dt;

        // Wall bounce (top/bottom)
        if (gs.ball.y - BALL_SIZE / 2 < 0) {
          gs.ball.y = BALL_SIZE / 2;
          gs.ball.vy = Math.abs(gs.ball.vy);
        }
        if (gs.ball.y + BALL_SIZE / 2 > LOGH) {
          gs.ball.y = LOGH - BALL_SIZE / 2;
          gs.ball.vy = -Math.abs(gs.ball.vy);
        }

        // Player paddle collision (left)
        const playerLeft = PADDLE_MARGIN;
        const playerRight = PADDLE_MARGIN + PADDLE_W;
        if (
          gs.ball.vx < 0 &&
          gs.ball.x - BALL_SIZE / 2 <= playerRight &&
          gs.ball.x + BALL_SIZE / 2 >= playerLeft &&
          gs.ball.y + BALL_SIZE / 2 >= gs.playerY &&
          gs.ball.y - BALL_SIZE / 2 <= gs.playerY + PADDLE_H
        ) {
          gs.ball.x = playerRight + BALL_SIZE / 2;
          // Angle based on hit position (-1 to 1 relative to paddle center)
          const hitPos = (gs.ball.y - (gs.playerY + PADDLE_H / 2)) / (PADDLE_H / 2);
          const angle = hitPos * (Math.PI / 4); // max 45 degrees
          const currentSpeed = Math.hypot(gs.ball.vx, gs.ball.vy);
          const newSpeed = Math.max(currentSpeed, speed);
          gs.ball.vx = newSpeed * Math.cos(angle);
          gs.ball.vy = newSpeed * Math.sin(angle);
        }

        // CPU paddle collision (right)
        const cpuLeft = LOGW - PADDLE_MARGIN - PADDLE_W;
        const cpuRight = LOGW - PADDLE_MARGIN;
        if (
          gs.ball.vx > 0 &&
          gs.ball.x + BALL_SIZE / 2 >= cpuLeft &&
          gs.ball.x - BALL_SIZE / 2 <= cpuRight &&
          gs.ball.y + BALL_SIZE / 2 >= gs.cpuY &&
          gs.ball.y - BALL_SIZE / 2 <= gs.cpuY + PADDLE_H
        ) {
          gs.ball.x = cpuLeft - BALL_SIZE / 2;
          const hitPos = (gs.ball.y - (gs.cpuY + PADDLE_H / 2)) / (PADDLE_H / 2);
          const angle = hitPos * (Math.PI / 4);
          const currentSpeed = Math.hypot(gs.ball.vx, gs.ball.vy);
          const newSpeed = Math.max(currentSpeed, speed);
          gs.ball.vx = -(newSpeed * Math.cos(angle));
          gs.ball.vy = newSpeed * Math.sin(angle);
        }

        // Score check
        let scored = false;
        if (gs.ball.x < 0) {
          // CPU scores
          gs.cpuScore += 1;
          gs.pointFlash = performance.now();
          gs.pointWinner = "cpu";
          scored = true;
          const newCpuScore = gs.cpuScore;
          const newPlayerScore = gs.playerScore;
          setCpuScore(newCpuScore);
          onScoreChange?.(newPlayerScore);
          setAnnouncement(`CPU scores. Player ${newPlayerScore}, CPU ${newCpuScore}`);

          if (gs.cpuScore >= MAX_SCORE) {
            setStatus("gameover");
            setWinner("cpu");
            setAnnouncement("Game over. CPU wins!");
            onGameOver?.({ score: gs.playerScore, won: false });
            gameStateRef.current = gs;
          } else {
            gs.ball = initBall(true, speed); // serve toward player (they lost)
          }
        } else if (gs.ball.x > LOGW) {
          // Player scores
          gs.playerScore += 1;
          gs.pointFlash = performance.now();
          gs.pointWinner = "player";
          scored = true;
          const newPlayerScore = gs.playerScore;
          const newCpuScore = gs.cpuScore;
          setPlayerScore(newPlayerScore);
          onScoreChange?.(newPlayerScore);
          setAnnouncement(`Player scores. Player ${newPlayerScore}, CPU ${newCpuScore}`);

          if (gs.playerScore >= MAX_SCORE) {
            setStatus("gameover");
            setWinner("player");
            setAnnouncement("Game over. You win!");
            onGameOver?.({ score: gs.playerScore, won: true });
            gameStateRef.current = gs;
          } else {
            gs.ball = initBall(false, speed); // serve toward CPU (they lost)
          }
        }

        if (scored) {
          // Reset paddle positions gently
          gs.playerY = LOGH / 2 - PADDLE_H / 2;
          gs.cpuY = LOGH / 2 - PADDLE_H / 2;
        }
      } else if (!active) {
        // Nothing
      }

      draw(gameStateRef.current);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [onGameOver, onScoreChange]);

  // Keyboard
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const gameKeys = new Set(["ArrowUp", "ArrowDown", "w", "s", "W", "S"]);
      if (gameKeys.has(e.key)) {
        e.preventDefault();
        keysRef.current.add(e.key);
        if (statusRef.current !== "playing") start();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (statusRef.current !== "playing") start();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    const el = wrapperRef.current;
    el?.addEventListener("keydown", onKeyDown);
    el?.addEventListener("keyup", onKeyUp);
    return () => {
      el?.removeEventListener("keydown", onKeyDown);
      el?.removeEventListener("keyup", onKeyUp);
    };
  }, [start]);

  // Pointer / touch drag for player paddle
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getRelativeY = (clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return ((clientY - rect.top) / rect.height) * LOGH;
    };

    const onPointerDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      pointerYRef.current = getRelativeY(e.clientY);
      if (statusRef.current !== "playing") start();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.buttons === 0) return;
      pointerYRef.current = getRelativeY(e.clientY);
    };
    const onPointerUp = () => {
      pointerYRef.current = null;
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
  }, [start]);

  React.useEffect(() => {
    if (autoFocus) wrapperRef.current?.focus();
  }, [autoFocus]);

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      role="application"
      aria-label="Pong game"
      style={width ? { maxWidth: width } : undefined}
      className={cn(
        "relative flex w-full select-none flex-col gap-2 outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {/* Score bar */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <span
          className="inline-flex items-center rounded-md border bg-secondary px-2 py-0.5 font-medium text-secondary-foreground tabular-nums"
        >
          You {playerScore}
        </span>
        <span className="text-muted-foreground text-xs">First to {MAX_SCORE}</span>
        <span className="inline-flex items-center rounded-md border bg-secondary px-2 py-0.5 font-medium text-secondary-foreground tabular-nums">
          CPU {cpuScore}
        </span>
      </div>

      {/* aria-live region */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div
        ref={playfieldRef}
        className="relative aspect-[3/2] w-full overflow-hidden rounded-lg border bg-background"
      >
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none" />

        {status !== "playing" && (
          <div className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              {status === "gameover" ? (
                <>
                  <p className="font-semibold text-lg">
                    {winner === "player" ? "You win!" : "CPU wins"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {playerScore} – {cpuScore}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-lg">Pong</p>
                  <p className="text-muted-foreground text-sm">
                    W/S or Arrow keys to move. Drag on mobile.
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
      </div>
    </div>
  );
}

export default Pong;
