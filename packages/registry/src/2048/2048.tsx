"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                   Engine                                    */
/* -------------------------------------------------------------------------- */

type Dir = "up" | "down" | "left" | "right";

const SIZE = 4;

/** A tile has a value and a stable id for React keying / animation. */
interface Tile {
  id: number;
  value: number;
  /** true the frame it was spawned */
  fresh: boolean;
  /** true the frame it was merged */
  merged: boolean;
}

type Board = (Tile | null)[][];

interface GameState {
  board: Board;
  score: number;
  won: boolean;
  over: boolean;
  /** Whether the player chose to keep going after 2048 */
  keepGoing: boolean;
}

let nextId = 1;
function mkTile(value: number, fresh = true, merged = false): Tile {
  return { id: nextId++, value, fresh, merged };
}

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array<Tile | null>(SIZE).fill(null));
}

function emptyCells(board: Board): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r]?.[c] == null) cells.push([r, c]);
    }
  }
  return cells;
}

function spawnRandom(board: Board): Board {
  const cells = emptyCells(board);
  if (cells.length === 0) return board;
  const idx = Math.floor(Math.random() * cells.length);
  const cell = cells[idx];
  if (!cell) return board;
  const [r, c] = cell;
  const value = Math.random() < 0.9 ? 2 : 4;
  const next: Board = board.map((row) => [...row]);
  const row = next[r];
  if (row) row[c] = mkTile(value, true, false);
  return next;
}

function initBoard(): Board {
  let board = emptyBoard();
  board = spawnRandom(board);
  board = spawnRandom(board);
  return board;
}

/** Returns a fresh board where each tile's fresh/merged flags are cleared. */
function clearFlags(board: Board): Board {
  return board.map((row) =>
    row.map((tile) =>
      tile ? { ...tile, fresh: false, merged: false } : null,
    ),
  );
}

/** Slide + merge a single row to the left. Returns { row, gained }. */
function slideLeft(row: (Tile | null)[]): { row: (Tile | null)[]; gained: number } {
  // Compact non-null tiles
  const tiles = row.filter((t): t is Tile => t !== null);
  const result: (Tile | null)[] = Array<Tile | null>(SIZE).fill(null);
  let gained = 0;
  let wi = 0;
  let ri = 0;
  while (ri < tiles.length) {
    const cur = tiles[ri];
    const nxt = tiles[ri + 1];
    if (!cur) { ri++; continue; }
    if (nxt && cur.value === nxt.value) {
      // Merge
      const mergedValue = cur.value * 2;
      gained += mergedValue;
      result[wi++] = mkTile(mergedValue, false, true);
      ri += 2;
    } else {
      result[wi++] = { ...cur, fresh: false, merged: false };
      ri++;
    }
  }
  return { row: result, gained };
}

function rotateBoard(board: Board): Board {
  // Rotate 90° clockwise: new[c][SIZE-1-r] = old[r][c]
  const next = emptyBoard();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const tile = board[r]?.[c] ?? null;
      const newRow = next[c];
      if (newRow) newRow[SIZE - 1 - r] = tile;
    }
  }
  return next;
}

function rotateN(board: Board, n: number): Board {
  let b = board;
  for (let i = 0; i < n; i++) b = rotateBoard(b);
  return b;
}

/** Apply a move direction. Returns { board, gained, changed }. */
function applyMove(board: Board, dir: Dir): { board: Board; gained: number; changed: boolean } {
  // Rotate so we always slide left, then rotate back.
  const rotations: Record<Dir, number> = { left: 0, up: 1, right: 2, down: 3 };
  const rot = rotations[dir];
  let working = rotateN(board, rot);

  let totalGained = 0;
  let changed = false;

  const nextBoard: Board = working.map((row) => {
    const before = row.map((t) => t?.id ?? null);
    const { row: slid, gained } = slideLeft(row);
    const after = slid.map((t) => t?.id ?? null);
    if (JSON.stringify(before) !== JSON.stringify(after)) changed = true;
    totalGained += gained;
    return slid;
  });
  working = nextBoard;

  // Rotate back
  const backRot = (4 - rot) % 4;
  working = rotateN(working, backRot);

  return { board: working, gained: totalGained, changed };
}

function hasMovesLeft(board: Board): boolean {
  // Any empty cell?
  if (emptyCells(board).length > 0) return true;
  // Any adjacent equal values?
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const val = board[r]?.[c]?.value;
      if (val == null) continue;
      if (board[r]?.[c + 1]?.value === val) return true;
      if (board[r + 1]?.[c]?.value === val) return true;
    }
  }
  return false;
}

function has2048(board: Board): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if ((board[r]?.[c]?.value ?? 0) >= 2048) return true;
    }
  }
  return false;
}

// Deterministic empty state for the idle screen — keeps server and client
// markup identical so there's no hydration mismatch from random tiles.
function createInitialState(): GameState {
  return {
    board: emptyBoard(),
    score: 0,
    won: false,
    over: false,
    keepGoing: false,
  };
}

// Playable state with two starting tiles — only created client-side on start.
function createPlayingState(): GameState {
  return {
    board: initBoard(),
    score: 0,
    won: false,
    over: false,
    keepGoing: false,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Shared primitives                             */
/* -------------------------------------------------------------------------- */

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
/*                               Tile theming                                  */
/* -------------------------------------------------------------------------- */

function tileClasses(value: number, fresh: boolean, merged: boolean, reduce: boolean): string {
  const base =
    "absolute inset-0 flex items-center justify-center rounded-md font-bold tabular-nums select-none transition-all";

  let colorClass: string;
  if (value <= 4) {
    colorClass = "bg-secondary text-secondary-foreground";
  } else if (value <= 32) {
    colorClass = "bg-accent text-accent-foreground";
  } else {
    colorClass = "bg-primary text-primary-foreground";
  }

  const ringClass =
    !reduce && (fresh || merged)
      ? "ring-2 ring-ring ring-offset-1 ring-offset-background"
      : "";

  const animClass =
    !reduce && fresh
      ? "animate-[pop_150ms_ease-out]"
      : !reduce && merged
        ? "animate-[pop_120ms_ease-out]"
        : "";

  // Text sizing: use container-query units so font scales with tile size.
  // 4-digit values (1024, 2048, 4096…) get a smaller clamp.
  const textClass =
    value >= 1024
      ? "text-[clamp(0.6rem,8cqi,1.5rem)]"
      : value >= 128
        ? "text-[clamp(0.75rem,9cqi,1.75rem)]"
        : "text-[clamp(0.875rem,11cqi,2rem)]";

  return cn(base, colorClass, textClass, ringClass, animClass);
}

/* -------------------------------------------------------------------------- */
/*                                  Component                                  */
/* -------------------------------------------------------------------------- */

export interface Game2048Props {
  className?: string;
  /** Optional max-width override (e.g. "320px", "24rem"). Defaults to max-w-sm. */
  width?: string;
  autoFocus?: boolean;
  persistHighScore?: boolean | string;
  onScoreChange?: (score: number) => void;
  onGameOver?: (r: { score: number; won: boolean }) => void;
  onStart?: () => void;
}

export function Game2048({
  className,
  width,
  autoFocus = true,
  persistHighScore = true,
  onScoreChange,
  onGameOver,
  onStart,
}: Game2048Props) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const reduce = usePrefersReducedMotion();

  const storageKey =
    typeof persistHighScore === "string"
      ? persistHighScore
      : persistHighScore === false
        ? null
        : "gamekitui:2048:hi";

  const [status, setStatus] = React.useState<"idle" | "playing" | "won" | "gameover">("idle");
  const [gameState, setGameState] = React.useState<GameState>(createInitialState);
  const [high, setHigh] = React.useState(0);
  const [announcement, setAnnouncement] = React.useState("");

  // Mutable ref so event handlers always see latest status without re-subscribing.
  const statusRef = React.useRef(status);
  statusRef.current = status;

  const gameStateRef = React.useRef(gameState);
  gameStateRef.current = gameState;

  // Load persisted high score.
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

  const startGame = React.useCallback(() => {
    const state = createPlayingState();
    setGameState(state);
    setStatus("playing");
    onStart?.();
    onScoreChange?.(0);
    setAnnouncement("Game started. Score: 0");
    // Focus so keyboard/WASD work immediately after the Start button unmounts.
    wrapperRef.current?.focus();
  }, [onScoreChange, onStart]);

  /** Process a move direction. */
  const move = React.useCallback(
    (dir: Dir) => {
      if (statusRef.current !== "playing") return;

      setGameState((prev) => {
        // Clear previous animation flags first
        const cleanBoard = clearFlags(prev.board);
        const { board: moved, gained, changed } = applyMove(cleanBoard, dir);

        if (!changed) return prev;

        const newScore = prev.score + gained;
        const boardWithSpawn = spawnRandom(moved);
        const nowWon = !prev.keepGoing && has2048(boardWithSpawn);
        const nowOver = !hasMovesLeft(boardWithSpawn);

        const next: GameState = {
          board: boardWithSpawn,
          score: newScore,
          won: nowWon || prev.won,
          over: nowOver,
          keepGoing: prev.keepGoing,
        };

        // Side effects scheduled via queueMicrotask to avoid setState-in-setState warnings.
        queueMicrotask(() => {
          onScoreChange?.(newScore);
          if (nowWon && !prev.keepGoing) {
            setStatus("won");
            setAnnouncement(`You reached 2048! Score: ${newScore}`);
            submitHigh(newScore);
            onGameOver?.({ score: newScore, won: true });
          } else if (nowOver) {
            setStatus("gameover");
            setAnnouncement(`Game over! Final score: ${newScore}`);
            submitHigh(newScore);
            onGameOver?.({ score: newScore, won: prev.won || nowWon });
          } else {
            setAnnouncement(`Score: ${newScore}`);
          }
        });

        return next;
      });
    },
    [onScoreChange, onGameOver, submitHigh],
  );

  const keepGoing = React.useCallback(() => {
    setGameState((prev) => ({ ...prev, keepGoing: true, won: false }));
    setStatus("playing");
    setAnnouncement("Continuing game…");
  }, []);

  // Keyboard handler on the wrapper (not window).
  React.useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      const dirMap: Record<string, Dir> = {
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
      const dir = dirMap[e.key];
      if (dir) {
        e.preventDefault();
        if (statusRef.current === "idle") {
          startGame();
        } else {
          move(dir);
        }
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (statusRef.current !== "playing") startGame();
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [startGame, move]);

  // Touch swipe (same approach as snake.tsx).
  React.useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let sx = 0;
    let sy = 0;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      sx = t.clientX;
      sy = t.clientY;
      if (statusRef.current === "idle") startGame();
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      const dir: Dir =
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      move(dir);
      sx = t.clientX;
      sy = t.clientY;
      e.preventDefault();
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [startGame, move]);

  React.useEffect(() => {
    if (autoFocus) wrapperRef.current?.focus();
  }, [autoFocus]);

  const { board, score } = gameState;

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      role="application"
      aria-label="2048 game"
      style={width ? { maxWidth: width } : undefined}
      className={cn(
        "relative flex w-full max-w-sm select-none flex-col gap-2 outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {/* Score row */}
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

      {/* Hidden aria-live region for game state announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Board */}
      <div className="relative rounded-lg border bg-muted p-2">
        {/* Inject pop keyframe animation */}
        <style>{`@keyframes pop{0%{transform:scale(.8);opacity:.6}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}`}</style>

        {/* @container enables cqi units inside for tile font scaling */}
        <div
          className="@container grid grid-cols-4 grid-rows-4 w-full aspect-square gap-[2.5%]"
        >
          {Array.from({ length: SIZE }, (_, r) =>
            Array.from({ length: SIZE }, (_, c) => {
              const tile = board[r]?.[c] ?? null;
              return (
                <div
                  key={`${r}-${c}`}
                  className="relative size-full rounded-md bg-background border border-border"
                >
                  {tile && (
                    <div
                      key={tile.id}
                      className={tileClasses(tile.value, tile.fresh, tile.merged, reduce)}
                    >
                      {tile.value}
                    </div>
                  )}
                </div>
              );
            }),
          )}
        </div>

        {/* Overlays */}
        {status !== "playing" && (
          <div className="absolute inset-0 grid place-items-center rounded-lg bg-background/80 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              {status === "gameover" ? (
                <>
                  <p className="text-lg font-semibold">Game over</p>
                  <p className="text-sm text-muted-foreground">
                    You scored {score}
                    {score >= high && score > 0 ? " — new best!" : ""}
                  </p>
                </>
              ) : status === "won" ? (
                <>
                  <p className="text-lg font-semibold">You reached 2048!</p>
                  <p className="text-sm text-muted-foreground">Score: {score}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={keepGoing}
                      className={cn(
                        "inline-flex h-9 items-center justify-center rounded-md border bg-secondary px-4 text-sm font-medium text-secondary-foreground",
                        "transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    >
                      Keep going
                    </button>
                    <button
                      type="button"
                      onClick={startGame}
                      className={cn(
                        "inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground",
                        "transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    >
                      New game
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold">2048</p>
                  <p className="text-sm text-muted-foreground">
                    Arrow keys, WASD, or swipe to play.
                  </p>
                </>
              )}
              {(status === "idle" || status === "gameover") && (
                <button
                  type="button"
                  onClick={startGame}
                  className={cn(
                    "inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground",
                    "transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  {status === "gameover" ? "Play again" : "Start"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Game2048;
