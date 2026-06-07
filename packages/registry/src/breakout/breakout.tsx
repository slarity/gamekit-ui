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

// Logical (design) coordinate space. All drawing & physics happen in this space;
// the canvas is scaled to its rendered CSS size via setTransform.
const LOGW = 360;
const LOGH = 300;

const BRICK_COLS = 8;
const BRICK_ROWS = 5;
const BRICK_GAP = 4;
const PADDLE_HEIGHT = 10;
const PADDLE_WIDTH_RATIO = 0.22; // fraction of logical width
const BALL_RADIUS = 7;
const INITIAL_LIVES = 3;
const POINTS_PER_BRICK = 10;
const SPEED_GROWTH = 1.07; // per-level ball speed multiplier
const MAX_SPEED_MULT = 2.2; // clamp on level-based speed growth

/* -------------------------------------------------------------------------- */
/*                              Game state types                               */
/* -------------------------------------------------------------------------- */

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Paddle {
  x: number; // left edge
  width: number;
}

interface Brick {
  col: number;
  row: number;
  alive: boolean;
}

interface BreakoutState {
  ball: Ball;
  paddle: Paddle;
  bricks: Brick[];
  lives: number;
  score: number;
  level: number; // 1-based; increments forever
  launched: boolean; // false = ball sitting on paddle, not yet launched
}

/* -------------------------------------------------------------------------- */
/*                              Engine factory                                 */
/* -------------------------------------------------------------------------- */

function makeBricks(): Brick[] {
  const bricks: Brick[] = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({ col: c, row: r, alive: true });
    }
  }
  return bricks;
}

function initState(): BreakoutState {
  const paddleW = LOGW * PADDLE_WIDTH_RATIO;
  const paddle: Paddle = { x: (LOGW - paddleW) / 2, width: paddleW };
  const ball: Ball = {
    x: LOGW / 2,
    y: LOGH - PADDLE_HEIGHT - 20 - BALL_RADIUS,
    vx: 0,
    vy: 0,
  };
  return {
    ball,
    paddle,
    bricks: makeBricks(),
    lives: INITIAL_LIVES,
    score: 0,
    level: 1,
    launched: false,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Props                                          */
/* -------------------------------------------------------------------------- */

export interface BreakoutProps {
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
  onGameOver?: (r: { score: number; won: boolean }) => void;
  onStart?: () => void;
}

/* -------------------------------------------------------------------------- */
/*                              Component                                      */
/* -------------------------------------------------------------------------- */

export function Breakout({
  className,
  width,
  paused = false,
  autoFocus = true,
  captureGlobalKeys = true,
  persistHighScore = true,
  onScoreChange,
  onGameOver,
  onStart,
}: BreakoutProps) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const playfieldRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const theme = useGameTheme(wrapperRef);
  const reduce = usePrefersReducedMotion();

  const [status, setStatus] = React.useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = React.useState(0);
  const [lives, setLives] = React.useState(INITIAL_LIVES);
  const [level, setLevel] = React.useState(1);
  const [high, setHigh] = React.useState(0);
  const [offscreen, setOffscreen] = React.useState(false);

  const storageKey =
    typeof persistHighScore === "string"
      ? persistHighScore
      : persistHighScore === false
        ? null
        : "gamekitui:breakout:hi";

  // Mutable refs for the rAF loop — never cause re-renders.
  const stateRef = React.useRef<BreakoutState | null>(null);
  const statusRef = React.useRef(status);
  const pausedRef = React.useRef(paused);
  const offscreenRef = React.useRef(offscreen);
  const themeRef = React.useRef(theme);
  const reduceRef = React.useRef(reduce);
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
    setScore(0);
    setLives(INITIAL_LIVES);
    setLevel(1);
    setStatus("playing");
    onStart?.();
    onScoreChangeRef.current?.(0);
    // Focus the wrapper so keyboard controls work after the Start button unmounts.
    wrapperRef.current?.focus();
  }, [onStart]);

  // Brick layout helpers (computed in logical space).
  const getBrickLayout = React.useCallback(() => {
    const topMargin = 30;
    const sideMargin = 8;
    const totalW = LOGW - sideMargin * 2;
    const brickW = (totalW - BRICK_GAP * (BRICK_COLS - 1)) / BRICK_COLS;
    const brickH = 14;
    return { topMargin, sideMargin, brickW, brickH };
  }, []);

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

  // Main rAF loop + drawing.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ------------------------------------------------------------------
    // Draw helpers
    // ------------------------------------------------------------------

    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    };

    const draw = () => {
      const t = themeRef.current;
      const gs = stateRef.current;

      // Background.
      ctx.clearRect(0, 0, LOGW, LOGH);
      ctx.fillStyle = t.background || "#fff";
      ctx.fillRect(0, 0, LOGW, LOGH);

      // Border line at top.
      ctx.fillStyle = t.border || "rgba(0,0,0,.15)";
      ctx.fillRect(0, 0, LOGW, 2);

      if (!gs) return;

      const { topMargin, sideMargin, brickW, brickH } = getBrickLayout();

      // Draw bricks.
      for (const brick of gs.bricks) {
        if (!brick.alive) continue;
        const bx = sideMargin + brick.col * (brickW + BRICK_GAP);
        const by = topMargin + brick.row * (brickH + BRICK_GAP);

        // Alternating primary / muted-foreground bricks — themeable and visible
        // on both light and dark backgrounds. (Tokens are already full color
        // strings like "oklch(…)", so use them directly — no extra wrapping.)
        const fill =
          brick.row % 2 === 0
            ? t.primary || "#3b82f6"
            : t["muted-foreground"] || "#64748b";

        drawRoundRect(bx, by, brickW, brickH, 3, fill);

        // Shine highlight.
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(bx + 2, by + 2, brickW - 4, 3, 1);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Paddle.
      const paddleY = LOGH - PADDLE_HEIGHT - 10;
      const pFill = t.primary || "#3b82f6";
      drawRoundRect(gs.paddle.x, paddleY, gs.paddle.width, PADDLE_HEIGHT, 5, pFill);

      // Ball.
      const bFill = t.primary || "#3b82f6";
      ctx.fillStyle = bFill;
      ctx.beginPath();
      ctx.arc(gs.ball.x, gs.ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      // Ball glint.
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(gs.ball.x - 2, gs.ball.y - 2, BALL_RADIUS * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    // ------------------------------------------------------------------
    // Physics step
    // ------------------------------------------------------------------

    const step = (dt: number) => {
      const gs = stateRef.current;
      if (!gs || !gs.launched) return;

      // Speed scales with level (clamped) and reduced-motion preference.
      const levelMult = Math.min(SPEED_GROWTH ** (gs.level - 1), MAX_SPEED_MULT);
      const maxSpeed = (reduceRef.current ? 180 : 320) * levelMult; // px/s

      // Cap speed.
      const speed = Math.sqrt(gs.ball.vx ** 2 + gs.ball.vy ** 2);
      let vx = gs.ball.vx;
      let vy = gs.ball.vy;
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        vx *= scale;
        vy *= scale;
      }

      let nx = gs.ball.x + vx * dt;
      let ny = gs.ball.y + vy * dt;

      // Wall collisions (left, right, top).
      if (nx - BALL_RADIUS < 0) {
        nx = BALL_RADIUS;
        vx = Math.abs(vx);
      }
      if (nx + BALL_RADIUS > LOGW) {
        nx = LOGW - BALL_RADIUS;
        vx = -Math.abs(vx);
      }
      if (ny - BALL_RADIUS < 0) {
        ny = BALL_RADIUS;
        vy = Math.abs(vy);
      }

      // Paddle collision.
      const paddleY = LOGH - PADDLE_HEIGHT - 10;
      const paddleLeft = gs.paddle.x;
      const paddleRight = gs.paddle.x + gs.paddle.width;

      if (
        vy > 0 &&
        ny + BALL_RADIUS >= paddleY &&
        ny - BALL_RADIUS <= paddleY + PADDLE_HEIGHT &&
        nx >= paddleLeft - BALL_RADIUS &&
        nx <= paddleRight + BALL_RADIUS
      ) {
        ny = paddleY - BALL_RADIUS;
        // Angle based on hit position relative to paddle center.
        const hitPos = (nx - (paddleLeft + gs.paddle.width / 2)) / (gs.paddle.width / 2);
        const angle = hitPos * (Math.PI / 3); // max ±60°
        const currSpeed = Math.max(Math.sqrt(vx ** 2 + vy ** 2), reduceRef.current ? 130 : 200);
        vx = currSpeed * Math.sin(angle);
        vy = -Math.abs(currSpeed * Math.cos(angle));
      }

      // Brick collisions. Resolve at most ONE brick hit per step: find the first
      // alive brick the ball overlaps, reflect the correct axis (minimal-penetration
      // resolution), push the ball out of the brick, destroy it, then stop. This
      // prevents the ball from tunnelling through (and flattening) a whole column
      // of bricks in a single frame.
      const { topMargin, sideMargin, brickW, brickH } = getBrickLayout();
      let scoreGain = 0;
      let bricksRemaining = 0;
      let hitBrick: Brick | null = null;
      let hitBx = 0;
      let hitBy = 0;

      for (const brick of gs.bricks) {
        if (!brick.alive) continue;
        bricksRemaining++;
        if (hitBrick) continue; // already found this step's collision; just keep counting

        const bx = sideMargin + brick.col * (brickW + BRICK_GAP);
        const by = topMargin + brick.row * (brickH + BRICK_GAP);

        // AABB + circle collision.
        const closestX = Math.max(bx, Math.min(nx, bx + brickW));
        const closestY = Math.max(by, Math.min(ny, by + brickH));
        const distX = nx - closestX;
        const distY = ny - closestY;
        const distSq = distX ** 2 + distY ** 2;

        if (distSq < BALL_RADIUS ** 2) {
          hitBrick = brick;
          hitBx = bx;
          hitBy = by;
        }
      }

      if (hitBrick) {
        hitBrick.alive = false;
        bricksRemaining--;
        scoreGain += POINTS_PER_BRICK;

        // Pick the reflection axis by minimal penetration. Compare how far the ball
        // has entered the brick on each axis (using its expanded AABB by BALL_RADIUS);
        // reflect whichever axis the ball is shallowest in, which corresponds to the
        // side it actually crossed.
        const penLeft = nx + BALL_RADIUS - hitBx; // entering from the left edge
        const penRight = hitBx + brickW + BALL_RADIUS - nx; // from the right edge
        const penTop = ny + BALL_RADIUS - hitBy; // from the top edge
        const penBottom = hitBy + brickH + BALL_RADIUS - ny; // from the bottom edge
        const penX = Math.min(penLeft, penRight);
        const penY = Math.min(penTop, penBottom);

        if (penX < penY) {
          // Horizontal hit — reflect vx and push the ball clear on the x axis.
          vx = penLeft < penRight ? -Math.abs(vx) : Math.abs(vx);
          nx = penLeft < penRight ? hitBx - BALL_RADIUS : hitBx + brickW + BALL_RADIUS;
        } else {
          // Vertical hit — reflect vy and push the ball clear on the y axis.
          vy = penTop < penBottom ? -Math.abs(vy) : Math.abs(vy);
          ny = penTop < penBottom ? hitBy - BALL_RADIUS : hitBy + brickH + BALL_RADIUS;
        }
      }

      // Update score.
      if (scoreGain > 0) {
        gs.score += scoreGain;
        const newScore = gs.score;
        setScore(newScore);
        onScoreChangeRef.current?.(newScore);
      }

      // Ball fell below paddle.
      if (ny - BALL_RADIUS > LOGH) {
        gs.lives -= 1;
        const newLives = gs.lives;
        setLives(newLives);

        if (newLives <= 0) {
          // The only terminal state: out of lives.
          const finalScore = gs.score;
          submitHighRef.current(finalScore);
          onGameOverRef.current?.({ score: finalScore, won: false });
          setStatus("gameover");
          return;
        }

        // Reset ball to paddle.
        gs.ball = {
          x: gs.paddle.x + gs.paddle.width / 2,
          y: paddleY - BALL_RADIUS - 1,
          vx: 0,
          vy: 0,
        };
        gs.launched = false;
        return;
      }

      // All bricks cleared — advance to the next level (endless). Keep score &
      // lives, regenerate the grid, and reset the ball onto the paddle so the
      // player re-launches. Difficulty rises via the level-based speed multiplier.
      if (bricksRemaining === 0) {
        gs.level += 1;
        gs.bricks = makeBricks();
        gs.ball = {
          x: gs.paddle.x + gs.paddle.width / 2,
          y: paddleY - BALL_RADIUS - 1,
          vx: 0,
          vy: 0,
        };
        gs.launched = false;
        setLevel(gs.level);
        return;
      }

      gs.ball.x = nx;
      gs.ball.y = ny;
      gs.ball.vx = vx;
      gs.ball.vy = vy;
    };

    let raf = 0;
    let last = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (last === 0) last = now;
      const rawDt = Math.min((now - last) / 1000, 0.05); // seconds, capped at 50ms
      last = now;

      const active =
        statusRef.current === "playing" && !pausedRef.current && !offscreenRef.current;

      if (active) {
        step(rawDt);
      }
      draw();
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [getBrickLayout]);

  // Keyboard handler.
  React.useEffect(() => {
    const PADDLE_SPEED = 280; // px/s — but we use key-held logic
    let leftHeld = false;
    let rightHeld = false;
    let moveRaf = 0;
    let moveLast = 0;

    const movePaddle = (now: number) => {
      const gs = stateRef.current;
      if (!gs) {
        moveRaf = requestAnimationFrame(movePaddle);
        return;
      }
      if (moveLast === 0) moveLast = now;
      const dt = Math.min((now - moveLast) / 1000, 0.05);
      moveLast = now;

      if (leftHeld) {
        gs.paddle.x = Math.max(0, gs.paddle.x - PADDLE_SPEED * dt);
      }
      if (rightHeld) {
        gs.paddle.x = Math.min(LOGW - gs.paddle.width, gs.paddle.x + PADDLE_SPEED * dt);
      }

      // Keep ball on paddle if not launched.
      if (!gs.launched) {
        const paddleY = LOGH - PADDLE_HEIGHT - 10;
        gs.ball.x = gs.paddle.x + gs.paddle.width / 2;
        gs.ball.y = paddleY - BALL_RADIUS - 1;
      }

      if (leftHeld || rightHeld) {
        moveRaf = requestAnimationFrame(movePaddle);
      }
    };

    const launchBall = () => {
      const gs = stateRef.current;
      if (!gs || gs.launched) return;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 4); // upward, slight random spread
      const levelMult = Math.min(SPEED_GROWTH ** (gs.level - 1), MAX_SPEED_MULT);
      const speed = (reduceRef.current ? 150 : 230) * levelMult;
      gs.ball.vx = speed * Math.cos(angle);
      gs.ball.vy = speed * Math.sin(angle);
      gs.launched = true;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // In global mode, ignore keys aimed at form fields / editable content.
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        if (statusRef.current === "idle") start();
        if (!leftHeld) {
          leftHeld = true;
          moveLast = 0;
          moveRaf = requestAnimationFrame(movePaddle);
        }
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        if (statusRef.current === "idle") start();
        if (!rightHeld) {
          rightHeld = true;
          moveLast = 0;
          moveRaf = requestAnimationFrame(movePaddle);
        }
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (statusRef.current === "idle" || statusRef.current === "gameover") {
          start();
        } else if (statusRef.current === "playing") {
          launchBall();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        leftHeld = false;
        cancelAnimationFrame(moveRaf);
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        rightHeld = false;
        cancelAnimationFrame(moveRaf);
      }
    };

    // Single-game pages can opt into window-level capture so keys work without
    // focusing the game; otherwise listen on the wrapper (focus-scoped).
    const target: Window | HTMLElement | null = captureGlobalKeys
      ? window
      : wrapperRef.current;
    target?.addEventListener("keydown", onKeyDown as EventListener);
    target?.addEventListener("keyup", onKeyUp as EventListener);
    return () => {
      target?.removeEventListener("keydown", onKeyDown as EventListener);
      target?.removeEventListener("keyup", onKeyUp as EventListener);
      cancelAnimationFrame(moveRaf);
    };
  }, [start, captureGlobalKeys]);

  // Pointer / touch — move paddle to pointer x.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Map a client X coordinate into logical (LOGW) space.
    const getLogicalX = (clientX: number): number => {
      const rect = canvas.getBoundingClientRect();
      return ((clientX - rect.left) / rect.width) * LOGW;
    };

    const movePaddleTo = (logicalX: number) => {
      const gs = stateRef.current;
      if (!gs) return;
      const half = gs.paddle.width / 2;
      gs.paddle.x = Math.max(0, Math.min(LOGW - gs.paddle.width, logicalX - half));
      // Keep ball on paddle if not launched.
      if (!gs.launched) {
        const paddleY = LOGH - PADDLE_HEIGHT - 10;
        gs.ball.x = gs.paddle.x + gs.paddle.width / 2;
        gs.ball.y = paddleY - BALL_RADIUS - 1;
      }
    };

    let pointerDown = false;

    const onPointerDown = (e: PointerEvent) => {
      pointerDown = true;
      if (statusRef.current === "idle") start();
      movePaddleTo(getLogicalX(e.clientX));
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointerDown) return;
      movePaddleTo(getLogicalX(e.clientX));
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pointerDown && statusRef.current === "playing") {
        const gs = stateRef.current;
        if (gs && !gs.launched) {
          // Tap/click launches the ball.
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 4);
          const levelMult = Math.min(SPEED_GROWTH ** (gs.level - 1), MAX_SPEED_MULT);
          const speed = (reduceRef.current ? 150 : 230) * levelMult;
          gs.ball.vx = speed * Math.cos(angle);
          gs.ball.vy = speed * Math.sin(angle);
          gs.launched = true;
        }
        movePaddleTo(getLogicalX(e.clientX));
      }
      pointerDown = false;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerUp);
    };
  }, [start]);

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
      aria-label="Breakout game"
      style={width ? { maxWidth: width } : undefined}
      className={cn(
        "relative flex w-full select-none flex-col gap-2 outline-none",
        // Focus ring only matters when keys are focus-scoped; global capture hides it.
        !captureGlobalKeys &&
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {/* Score bar */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex items-center rounded-md border bg-secondary px-2 py-0.5 font-medium text-secondary-foreground tabular-nums">
            Score {score}
          </span>
          <span className="inline-flex items-center rounded-md border bg-secondary px-2 py-0.5 font-medium text-secondary-foreground tabular-nums">
            Lvl {level}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums text-muted-foreground">
          {lives > 0 && (
            <span aria-hidden="true" className="tracking-[0.15em]">
              {"♥".repeat(lives)}
            </span>
          )}
          <span>
            {lives === 0 ? "no lives" : lives === 1 ? "1 life" : `${lives} lives`}
          </span>
        </span>
        <span className="text-muted-foreground tabular-nums">Best {high}</span>
      </div>

      {/* aria-live region */}
      <div aria-live="polite" className="sr-only">
        {status === "playing"
          ? `Level ${level}, score ${score}, ${lives} lives remaining`
          : status === "gameover"
            ? `Game over. Final score ${score}`
            : "Breakout game. Press Start to play."}
      </div>

      {/* Canvas container */}
      <div
        ref={playfieldRef}
        className="relative aspect-[6/5] w-full overflow-hidden rounded-lg border bg-background"
      >
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none" />

        {/* Overlays */}
        {status !== "playing" && (
          <div className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              {isOver ? (
                <>
                  <p className="text-lg font-semibold">Game over</p>
                  <p className="text-sm text-muted-foreground">
                    You scored {score}
                    {score >= high && score > 0 ? " — new best!" : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold">Breakout</p>
                  <p className="text-sm text-muted-foreground">
                    Arrow keys / A D to move. Space or tap to launch.
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

export default Breakout;
