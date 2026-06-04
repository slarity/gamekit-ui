"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                   Engine                                    */
/* -------------------------------------------------------------------------- */

const COLS = 9;
const ROWS = 9;
const MINE_COUNT = 10;

type CellState = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacentMines: number;
};

type Grid = CellState[][];

function createEmptyGrid(): Grid {
  const grid: Grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row: CellState[] = [];
    for (let c = 0; c < COLS; c++) {
      row.push({ mine: false, revealed: false, flagged: false, adjacentMines: 0 });
    }
    grid.push(row);
  }
  return grid;
}

function getNeighbors(r: number, c: number): [number, number][] {
  const neighbors: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        neighbors.push([nr, nc]);
      }
    }
  }
  return neighbors;
}

function placeMines(grid: Grid, safeR: number, safeC: number): Grid {
  // Safe zone: clicked cell + its neighbors
  const safeSet = new Set<string>();
  safeSet.add(`${safeR},${safeC}`);
  for (const [nr, nc] of getNeighbors(safeR, safeC)) {
    safeSet.add(`${nr},${nc}`);
  }

  const candidates: [number, number][] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!safeSet.has(`${r},${c}`)) {
        candidates.push([r, c]);
      }
    }
  }

  // Fisher-Yates shuffle, take first MINE_COUNT
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = candidates[i];
    const swap = candidates[j];
    if (tmp !== undefined && swap !== undefined) {
      candidates[i] = swap;
      candidates[j] = tmp;
    }
  }

  const newGrid: Grid = grid.map((row) => row.map((cell) => ({ ...cell })));

  for (let i = 0; i < MINE_COUNT && i < candidates.length; i++) {
    const coord = candidates[i];
    if (coord === undefined) continue;
    const [mr, mc] = coord;
    const mineRow = newGrid[mr];
    if (mineRow === undefined) continue;
    const mineCell = mineRow[mc];
    if (mineCell === undefined) continue;
    mineCell.mine = true;
  }

  // Calculate adjacency
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const row = newGrid[r];
      if (row === undefined) continue;
      const cell = row[c];
      if (cell === undefined) continue;
      if (cell.mine) continue;
      let count = 0;
      for (const [nr, nc] of getNeighbors(r, c)) {
        const nrow = newGrid[nr];
        if (nrow === undefined) continue;
        const ncell = nrow[nc];
        if (ncell === undefined) continue;
        if (ncell.mine) count++;
      }
      cell.adjacentMines = count;
    }
  }

  return newGrid;
}

function floodReveal(grid: Grid, startR: number, startC: number): Grid {
  const newGrid: Grid = grid.map((row) => row.map((cell) => ({ ...cell })));
  const queue: [number, number][] = [[startR, startC]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const item = queue.shift();
    if (item === undefined) break;
    const [r, c] = item;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const row = newGrid[r];
    if (row === undefined) continue;
    const cell = row[c];
    if (cell === undefined) continue;
    if (cell.flagged || cell.mine) continue;

    cell.revealed = true;

    if (cell.adjacentMines === 0) {
      for (const [nr, nc] of getNeighbors(r, c)) {
        const nrow = newGrid[nr];
        if (nrow === undefined) continue;
        const ncell = nrow[nc];
        if (ncell === undefined) continue;
        if (!ncell.revealed && !ncell.flagged) {
          queue.push([nr, nc]);
        }
      }
    }
  }

  return newGrid;
}

function revealAllMines(grid: Grid): Grid {
  return grid.map((row) =>
    row.map((cell) => (cell.mine ? { ...cell, revealed: true } : { ...cell })),
  );
}

function checkWin(grid: Grid): boolean {
  for (const row of grid) {
    for (const cell of row) {
      if (!cell.mine && !cell.revealed) return false;
    }
  }
  return true;
}

function countFlags(grid: Grid): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell.flagged) count++;
    }
  }
  return count;
}

/* -------------------------------------------------------------------------- */
/*                              Shared primitives                              */
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
/*                                  Component                                  */
/* -------------------------------------------------------------------------- */

export interface MinesweeperProps {
  className?: string;
  width?: number;
  autoFocus?: boolean;
  persistHighScore?: boolean | string;
  onScoreChange?: (score: number) => void;
  onGameOver?: (r: { score: number; won: boolean }) => void;
  onStart?: () => void;
}

const NUMBER_COLORS: Record<number, string> = {
  1: "text-blue-600 dark:text-blue-400",
  2: "text-green-600 dark:text-green-500",
  3: "text-red-600 dark:text-red-400",
  4: "text-purple-800 dark:text-purple-400",
  5: "text-red-900 dark:text-red-300",
  6: "text-teal-600 dark:text-teal-400",
  7: "text-black dark:text-white",
  8: "text-muted-foreground",
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

export function Minesweeper({
  className,
  width,
  autoFocus = true,
  persistHighScore = true,
  onScoreChange,
  onGameOver,
  onStart,
}: MinesweeperProps) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const reduce = usePrefersReducedMotion();

  const storageKey =
    typeof persistHighScore === "string"
      ? persistHighScore
      : persistHighScore === false
        ? null
        : "gamekitui:minesweeper:hi";

  type GameStatus = "idle" | "playing" | "won" | "lost";

  const [status, setStatus] = React.useState<GameStatus>("idle");
  const [grid, setGrid] = React.useState<Grid>(createEmptyGrid);
  const [elapsed, setElapsed] = React.useState(0);
  const [bestTime, setBestTime] = React.useState<number | null>(null);

  // Refs for timer
  const startTimeRef = React.useRef<number | null>(null);
  const timerIdRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = React.useRef<GameStatus>("idle");
  statusRef.current = status;

  // Long-press refs for touch flag toggling
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = React.useRef(false);

  // Load best time from localStorage
  React.useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = Number(raw);
        if (!isNaN(parsed) && parsed > 0) setBestTime(parsed);
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const saveBestTime = React.useCallback(
    (seconds: number) => {
      setBestTime((prev) => {
        const isNew = prev === null || seconds < prev;
        if (!isNew) return prev;
        if (storageKey) {
          try {
            window.localStorage.setItem(storageKey, String(seconds));
          } catch {
            /* ignore */
          }
        }
        return seconds;
      });
    },
    [storageKey],
  );

  // Timer management
  const stopTimer = React.useCallback(() => {
    if (timerIdRef.current !== null) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
  }, []);

  const startTimer = React.useCallback(() => {
    stopTimer();
    startTimeRef.current = Date.now();
    setElapsed(0);
    timerIdRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 500);
  }, [stopTimer]);

  // Pause timer on visibility change
  React.useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        stopTimer();
      } else if (statusRef.current === "playing" && startTimeRef.current !== null) {
        // Restart timer keeping elapsed time
        const alreadyElapsed = elapsed;
        timerIdRef.current = setInterval(() => {
          setElapsed(alreadyElapsed + Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000));
        }, 500);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [stopTimer, elapsed]);

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const startGame = React.useCallback(() => {
    stopTimer();
    setGrid(createEmptyGrid());
    setElapsed(0);
    startTimeRef.current = null;
    setStatus("idle");
    wrapperRef.current?.focus();
  }, [stopTimer]);

  const handleCellReveal = React.useCallback(
    (r: number, c: number) => {
      if (statusRef.current === "won" || statusRef.current === "lost") return;

      setGrid((prev) => {
        const row = prev[r];
        if (row === undefined) return prev;
        const cell = row[c];
        if (cell === undefined) return prev;
        if (cell.revealed || cell.flagged) return prev;

        let workGrid = prev;

        // First reveal: place mines, start timer
        if (statusRef.current === "idle") {
          workGrid = placeMines(prev, r, c);
          setStatus("playing");
          startTimer();
          onStart?.();
        }

        if (statusRef.current === "idle" || statusRef.current === "playing") {
          const workRow = workGrid[r];
          if (workRow === undefined) return prev;
          const workCell = workRow[c];
          if (workCell === undefined) return prev;

          if (workCell.mine) {
            // Hit a mine
            const revealed = revealAllMines(workGrid);
            stopTimer();
            setStatus("lost");
            onGameOver?.({ score: elapsed, won: false });
            onScoreChange?.(elapsed);
            return revealed;
          }

          const flooded = floodReveal(workGrid, r, c);
          if (checkWin(flooded)) {
            stopTimer();
            setStatus("won");
            saveBestTime(elapsed);
            onGameOver?.({ score: elapsed, won: true });
            onScoreChange?.(elapsed);
            return flooded;
          }

          return flooded;
        }

        return prev;
      });
    },
    [elapsed, onGameOver, onScoreChange, onStart, saveBestTime, startTimer, stopTimer],
  );

  const handleCellFlag = React.useCallback((r: number, c: number) => {
    if (statusRef.current !== "playing" && statusRef.current !== "idle") return;
    setGrid((prev) => {
      const row = prev[r];
      if (row === undefined) return prev;
      const cell = row[c];
      if (cell === undefined) return prev;
      if (cell.revealed) return prev;

      return prev.map((rowArr, ri) =>
        ri === r
          ? rowArr.map((cellItem, ci) =>
              ci === c ? { ...cellItem, flagged: !cellItem.flagged } : cellItem,
            )
          : rowArr,
      );
    });
  }, []);

  // Context menu prevention on the wrapper
  const onContextMenu = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Touch long-press handlers
  const onTouchStart = React.useCallback(
    (r: number, c: number) => (e: React.TouchEvent) => {
      e.stopPropagation();
      longPressTriggeredRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        handleCellFlag(r, c);
      }, 450);
    },
    [handleCellFlag],
  );

  const onTouchEnd = React.useCallback(
    (r: number, c: number) => (e: React.TouchEvent) => {
      e.stopPropagation();
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (!longPressTriggeredRef.current) {
        handleCellReveal(r, c);
      }
    },
    [handleCellReveal],
  );

  const onTouchCancel = React.useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (autoFocus) wrapperRef.current?.focus();
  }, [autoFocus]);

  // Keyboard navigation
  const [cursor, setCursor] = React.useState<[number, number]>([0, 0]);
  React.useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (status === "won" || status === "lost") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startGame();
        }
        return;
      }
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setCursor(([r, c]) => [Math.max(0, r - 1), c]);
          break;
        case "ArrowDown":
          e.preventDefault();
          setCursor(([r, c]) => [Math.min(ROWS - 1, r + 1), c]);
          break;
        case "ArrowLeft":
          e.preventDefault();
          setCursor(([r, c]) => [r, Math.max(0, c - 1)]);
          break;
        case "ArrowRight":
          e.preventDefault();
          setCursor(([r, c]) => [r, Math.min(COLS - 1, c + 1)]);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          setCursor(([r, c]) => {
            handleCellReveal(r, c);
            return [r, c];
          });
          break;
        case "f":
        case "F":
          e.preventDefault();
          setCursor(([r, c]) => {
            handleCellFlag(r, c);
            return [r, c];
          });
          break;
        default:
          break;
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [status, handleCellReveal, handleCellFlag, startGame]);

  const flags = countFlags(grid);
  const minesRemaining = MINE_COUNT - flags;

  const statusText = React.useMemo(() => {
    if (status === "idle") return "Click a cell to start. Right-click or long-press to flag.";
    if (status === "won") return `You win! Time: ${formatTime(elapsed)}${bestTime !== null && elapsed <= bestTime ? " — new best!" : ""}`;
    if (status === "lost") return "Game over — mine detonated!";
    return `${minesRemaining >= 0 ? minesRemaining : 0} mines remaining`;
  }, [status, elapsed, bestTime, minesRemaining]);

  const isGameOver = status === "won" || status === "lost";

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      role="application"
      aria-label="Minesweeper game"
      style={width !== undefined ? { maxWidth: width } : undefined}
      className={cn(
        "relative flex w-full max-w-md select-none flex-col gap-2 outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      onContextMenu={onContextMenu}
    >
      {/* Score badges */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <span
          className="inline-flex items-center rounded-md border bg-secondary px-2 py-0.5 font-medium text-secondary-foreground tabular-nums"
          title="Mines remaining"
        >
          {/* Mine marker: a small diamond shape via CSS */}
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-foreground opacity-70" aria-hidden="true" />
          {Math.max(0, minesRemaining)}
        </span>
        <span
          className="inline-flex items-center rounded-md border bg-secondary px-2 py-0.5 font-medium text-secondary-foreground tabular-nums"
          title="Elapsed time"
        >
          {formatTime(elapsed)}
        </span>
        {bestTime !== null && (
          <span className="text-muted-foreground tabular-nums" title="Best time">
            Best {formatTime(bestTime)}
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="relative rounded-lg border bg-background overflow-hidden">
        <div
          role="grid"
          aria-label="Minesweeper grid"
          className="@container grid grid-cols-9 grid-rows-9 w-full aspect-square gap-[1.5%]"
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const isCursor = cursor[0] === r && cursor[1] === c;
              const numColor = cell.adjacentMines > 0 ? (NUMBER_COLORS[cell.adjacentMines] ?? "text-foreground") : "";

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  role="gridcell"
                  aria-label={
                    cell.revealed
                      ? cell.mine
                        ? "Mine"
                        : cell.adjacentMines > 0
                          ? `${cell.adjacentMines} adjacent mines`
                          : "Empty cell"
                      : cell.flagged
                        ? "Flagged cell"
                        : "Hidden cell"
                  }
                  aria-pressed={cell.flagged}
                  disabled={cell.revealed || isGameOver}
                  onClick={() => {
                    if (!cell.revealed && !cell.flagged) {
                      handleCellReveal(r, c);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleCellFlag(r, c);
                  }}
                  onTouchStart={onTouchStart(r, c)}
                  onTouchEnd={onTouchEnd(r, c)}
                  onTouchCancel={onTouchCancel}
                  className={cn(
                    "relative flex size-full items-center justify-center border-r border-b border-border",
                    "text-[clamp(0.5rem,6cqi,1rem)] font-bold",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
                    // Revealed mine (loss) → destructive
                    cell.revealed && cell.mine && "bg-destructive text-destructive-foreground",
                    // Revealed safe cell → background
                    cell.revealed && !cell.mine && "bg-background cursor-default",
                    // Covered, flagged
                    !cell.revealed && cell.flagged && "bg-secondary text-secondary-foreground",
                    // Covered, not flagged, hoverable
                    !cell.revealed && !cell.flagged && !isGameOver && "bg-muted hover:bg-accent cursor-pointer",
                    // Covered, game over (lost), no flag → show as muted
                    !cell.revealed && !cell.flagged && isGameOver && "bg-muted cursor-default",
                    // Keyboard cursor highlight
                    isCursor && !cell.revealed && "ring-1 ring-inset ring-ring",
                    // Reveal animation — only when not reduced motion
                    !reduce && cell.revealed && !cell.mine && "transition-colors duration-100",
                  )}
                >
                  {cell.revealed && !cell.mine && cell.adjacentMines > 0 && (
                    <span className={numColor} aria-hidden="true">
                      {cell.adjacentMines}
                    </span>
                  )}
                  {cell.revealed && cell.mine && (
                    // Mine: small filled circle styled with destructive contrast, scales with cell
                    <span
                      className="inline-block rounded-full bg-destructive-foreground"
                      style={{ width: "40%", height: "40%" }}
                      aria-hidden="true"
                    />
                  )}
                  {!cell.revealed && cell.flagged && (
                    // Flag: a vertical bar (pole) + triangle top via CSS borders, scales with cell
                    <span
                      className="inline-flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <span
                        className="inline-block rounded-sm bg-primary"
                        style={{ width: "30%", height: "50%" }}
                      />
                    </span>
                  )}
                </button>
              );
            }),
          )}
        </div>

        {/* Game-over overlay (won/lost). At idle the board is shown and the first
            click starts the game — no blocking overlay, like classic minesweeper. */}
        {isGameOver && (
          <div className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              {status === "won" ? (
                <>
                  <p className="font-semibold text-lg">You win!</p>
                  <p className="text-muted-foreground text-sm">
                    Cleared in {formatTime(elapsed)}
                    {bestTime !== null && elapsed <= bestTime ? " — new best!" : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-lg">Game over</p>
                  <p className="text-muted-foreground text-sm">A mine was detonated.</p>
                </>
              )}
              <button
                type="button"
                onClick={startGame}
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm",
                  "transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                Play again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* aria-live region */}
      <p
        className="text-center text-sm text-muted-foreground min-h-[1.25rem]"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusText}
      </p>
    </div>
  );
}

export default Minesweeper;
