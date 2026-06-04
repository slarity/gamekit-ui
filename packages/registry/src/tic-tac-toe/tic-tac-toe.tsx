"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                   Engine                                    */
/* -------------------------------------------------------------------------- */

type Player = "X" | "O";
type Cell = Player | null;
type Board = [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];

const WIN_LINES: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(board: Board): { winner: Player; line: [number, number, number] } | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    const va = board[a!];
    const vb = board[b!];
    const vc = board[c!];
    if (va && va === vb && va === vc) {
      return { winner: va, line };
    }
  }
  return null;
}

function isDraw(board: Board): boolean {
  return board.every((c) => c !== null) && checkWinner(board) === null;
}

/** Minimax — returns best score from the perspective of `player`. */
function minimax(board: Board, player: Player, depth: number): number {
  const result = checkWinner(board);
  if (result) return result.winner === "O" ? 10 - depth : depth - 10;
  if (isDraw(board)) return 0;

  const next: Player = player === "X" ? "O" : "X";
  let best = player === "O" ? -Infinity : Infinity;

  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    const copy = board.slice() as Board;
    copy[i] = player;
    const score = minimax(copy, next, depth + 1);
    if (player === "O") {
      if (score > best) best = score;
    } else {
      if (score < best) best = score;
    }
  }
  return best;
}

function bestMove(board: Board): number {
  let best = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    const copy = board.slice() as Board;
    copy[i] = "O";
    const score = minimax(copy, "X", 0);
    if (score > best) {
      best = score;
      move = i;
    }
  }
  return move;
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

export interface TicTacToeProps {
  className?: string;
  width?: number;
  autoFocus?: boolean;
  persistHighScore?: boolean | string;
  onScoreChange?: (score: number) => void;
  onGameOver?: (r: { score: number; won: boolean }) => void;
  onStart?: () => void;
}

function emptyBoard(): Board {
  return [null, null, null, null, null, null, null, null, null];
}

export function TicTacToe({
  className,
  width,
  autoFocus = true,
  onGameOver,
  onStart,
}: TicTacToeProps) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const reduce = usePrefersReducedMotion();

  const [board, setBoard] = React.useState<Board>(emptyBoard);
  const [started, setStarted] = React.useState(false);
  const [turn, setTurn] = React.useState<Player>("X");
  const [winResult, setWinResult] = React.useState<{
    winner: Player;
    line: [number, number, number];
  } | null>(null);
  const [draw, setDraw] = React.useState(false);
  const [cursor, setCursor] = React.useState(0);

  // Session tally
  const [wins, setWins] = React.useState(0);
  const [losses, setLosses] = React.useState(0);
  const [draws, setDraws] = React.useState(0);

  const gameOver = winResult !== null || draw;

  const resetBoard = React.useCallback(() => {
    setBoard(emptyBoard());
    setTurn("X");
    setWinResult(null);
    setDraw(false);
    setCursor(0);
    setStarted(true);
  }, []);

  const handleStart = React.useCallback(() => {
    resetBoard();
    wrapperRef.current?.focus();
    onStart?.();
  }, [resetBoard, onStart]);

  // After human (X) places, run CPU (O).
  const cpuMoveRef = React.useRef<Board | null>(null);

  const placeAt = React.useCallback(
    (index: number, currentBoard: Board, currentTurn: Player): void => {
      if (currentBoard[index] !== null) return;
      if (gameOver) return;

      const next = currentBoard.slice() as Board;
      next[index] = currentTurn;

      const result = checkWinner(next);
      if (result) {
        setBoard(next);
        setWinResult(result);
        if (result.winner === "X") {
          setWins((w) => w + 1);
          onGameOver?.({ score: 0, won: true });
        } else {
          setLosses((l) => l + 1);
          onGameOver?.({ score: 0, won: false });
        }
        return;
      }
      if (isDraw(next)) {
        setBoard(next);
        setDraw(true);
        setDraws((d) => d + 1);
        onGameOver?.({ score: 0, won: false });
        return;
      }

      setBoard(next);
      setTurn(currentTurn === "X" ? "O" : "X");
      if (currentTurn === "X") {
        cpuMoveRef.current = next;
      }
    },
    [gameOver, onGameOver],
  );

  // CPU plays O — triggered when turn flips to O.
  React.useEffect(() => {
    if (turn !== "O" || gameOver || !started) return;
    const pending = cpuMoveRef.current;
    if (!pending) return;
    cpuMoveRef.current = null;

    const delay = reduce ? 0 : 300;
    const id = setTimeout(() => {
      const move = bestMove(pending);
      if (move === -1) return;
      placeAt(move, pending, "O");
    }, delay);
    return () => clearTimeout(id);
  }, [turn, gameOver, started, reduce, placeAt]);

  // Keyboard navigation.
  React.useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (!started || gameOver) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleStart();
        }
        return;
      }
      if (turn !== "X") return; // block input during CPU turn

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setCursor((c) => (c % 3 === 0 ? c + 2 : c - 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          setCursor((c) => (c % 3 === 2 ? c - 2 : c + 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setCursor((c) => (c < 3 ? c + 6 : c - 3));
          break;
        case "ArrowDown":
          e.preventDefault();
          setCursor((c) => (c >= 6 ? c - 6 : c + 3));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          placeAt(cursor, board, turn);
          break;
        default:
          break;
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [started, gameOver, turn, cursor, board, placeAt, handleStart]);

  React.useEffect(() => {
    if (autoFocus) wrapperRef.current?.focus();
  }, [autoFocus]);

  const winLine = winResult?.line ?? null;

  const statusText = React.useMemo(() => {
    if (!started) return "Press Start to play";
    if (winResult) return winResult.winner === "X" ? "You win!" : "CPU wins!";
    if (draw) return "It's a draw!";
    if (turn === "X") return "Your turn (X)";
    return "CPU is thinking…";
  }, [started, winResult, draw, turn]);

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      role="application"
      aria-label="Tic-Tac-Toe game"
      style={width ? { maxWidth: width } : undefined}
      className={cn(
        "relative flex w-full max-w-sm select-none flex-col gap-3 outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {/* Session tally */}
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center rounded-md border bg-primary px-2 py-0.5 font-medium text-primary-foreground tabular-nums">
          W {wins}
        </span>
        <span className="inline-flex items-center rounded-md border bg-secondary px-2 py-0.5 font-medium text-secondary-foreground tabular-nums">
          L {losses}
        </span>
        <span className="inline-flex items-center rounded-md border bg-muted px-2 py-0.5 font-medium text-muted-foreground tabular-nums">
          D {draws}
        </span>
      </div>

      {/* Board */}
      <div className="relative rounded-lg border bg-muted overflow-hidden">
        <div
          className="@container grid grid-cols-3 grid-rows-3 w-full aspect-square gap-[2%]"
          role="grid"
          aria-label="Tic-Tac-Toe board"
        >
          {board.map((cell, i) => {
            const isWinCell = winLine !== null && winLine.includes(i);
            const isCursor = cursor === i && started && !gameOver && turn === "X";
            const isLastRow = i >= 6;
            const isLastCol = i % 3 === 2;

            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                aria-label={`Cell ${i + 1}${cell ? `, ${cell}` : ", empty"}`}
                aria-pressed={cell !== null}
                disabled={cell !== null || gameOver || turn !== "X" || !started}
                onClick={() => {
                  if (!started) {
                    handleStart();
                    return;
                  }
                  setCursor(i);
                  placeAt(i, board, turn);
                }}
                className={cn(
                  "relative flex size-full items-center justify-center",
                  "text-[clamp(1.5rem,22cqi,4rem)] font-bold leading-none",
                  "border-border bg-background",
                  !isLastRow && "border-b",
                  !isLastCol && "border-r",
                  // hover accent when empty and playable
                  cell === null && !gameOver && turn === "X" && started && "hover:bg-accent cursor-pointer",
                  // cursor highlight
                  isCursor && "bg-accent",
                  // win cell highlight
                  isWinCell && "bg-primary/10",
                  // transition unless reduced motion
                  !reduce && "transition-colors duration-150",
                  // disabled cursor
                  (cell !== null || gameOver || turn !== "X" || !started) && "cursor-default",
                )}
              >
                {cell === "X" && (
                  <span
                    className={cn(
                      "leading-none",
                      isWinCell ? "text-primary" : "text-primary",
                    )}
                    aria-hidden="true"
                  >
                    X
                  </span>
                )}
                {cell === "O" && (
                  <span
                    className={cn(
                      "leading-none",
                      isWinCell ? "text-secondary-foreground" : "text-secondary-foreground",
                    )}
                    aria-hidden="true"
                  >
                    O
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Game-over / idle overlay */}
        {(!started || gameOver) && (
          <div className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              {!started ? (
                <>
                  <p className="font-semibold text-lg">Tic-Tac-Toe</p>
                  <p className="text-muted-foreground text-sm">You play X. CPU is unbeatable.</p>
                </>
              ) : winResult ? (
                <>
                  <p className="font-semibold text-lg">
                    {winResult.winner === "X" ? "You win!" : "CPU wins!"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {winResult.winner === "X" ? "Impressive!" : "Better luck next time."}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-lg">Draw!</p>
                  <p className="text-muted-foreground text-sm">Neither side won.</p>
                </>
              )}
              <button
                type="button"
                onClick={handleStart}
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm",
                  "transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {!started ? "Start" : "Play again"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status / aria-live region */}
      <p
        className="text-center text-sm text-muted-foreground"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusText}
      </p>
    </div>
  );
}

export default TicTacToe;
