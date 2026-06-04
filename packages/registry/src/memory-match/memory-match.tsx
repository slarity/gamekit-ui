"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                               Shared helpers                                */
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
/*                               Game constants                                */
/* -------------------------------------------------------------------------- */

// 8 distinct symbols rendered as large bold characters — A through H.
const SYMBOLS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
type Symbol = (typeof SYMBOLS)[number];

const GRID_SIZE = 16; // 4×4

interface Card {
  id: number;
  symbol: Symbol;
  state: "face-down" | "flipped" | "matched";
}

/* -------------------------------------------------------------------------- */
/*                                Shuffle util                                 */
/* -------------------------------------------------------------------------- */

function buildDeck(): Card[] {
  // Duplicate each symbol to form pairs, then shuffle.
  const pairs: Symbol[] = [...SYMBOLS, ...SYMBOLS];
  // Fisher-Yates shuffle with Math.random
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pairs[i];
    const src = pairs[j];
    if (tmp !== undefined && src !== undefined) {
      pairs[i] = src;
      pairs[j] = tmp;
    }
  }
  return pairs.map((symbol, id) => ({ id, symbol, state: "face-down" as const }));
}

// Deterministic face-down deck for the idle screen so the board reserves its
// full size before the game starts (and matches SSR markup — no random tiles).
function placeholderDeck(): Card[] {
  return Array.from({ length: GRID_SIZE }, (_, id) => ({
    id,
    symbol: SYMBOLS[id % SYMBOLS.length] as Symbol,
    state: "face-down" as const,
  }));
}

/* -------------------------------------------------------------------------- */
/*                                  Props                                      */
/* -------------------------------------------------------------------------- */

export interface MemoryMatchProps {
  className?: string;
  autoFocus?: boolean;
  persistHighScore?: boolean | string;
  onScoreChange?: (score: number) => void;
  onGameOver?: (r: { score: number; won: boolean }) => void;
  onStart?: () => void;
  width?: number;
}

/* -------------------------------------------------------------------------- */
/*                                 Component                                   */
/* -------------------------------------------------------------------------- */

export function MemoryMatch({
  className,
  autoFocus = true,
  persistHighScore = true,
  onScoreChange,
  onGameOver,
  onStart,
  width,
}: MemoryMatchProps) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const reduce = usePrefersReducedMotion();

  const storageKey =
    typeof persistHighScore === "string"
      ? persistHighScore
      : persistHighScore === false
        ? null
        : "gamekitui:memory-match:hi";

  // ── game state ──────────────────────────────────────────────────────────────
  const [status, setStatus] = React.useState<"idle" | "playing" | "won">("idle");
  const [cards, setCards] = React.useState<Card[]>(placeholderDeck);
  const [moves, setMoves] = React.useState(0);
  const [best, setBest] = React.useState(0);
  const [announcement, setAnnouncement] = React.useState("");

  // flipped indices (at most 2 during a turn)
  const [flipped, setFlipped] = React.useState<[number, number] | [number] | []>([]);
  // locked while mismatch timeout is running
  const [locked, setLocked] = React.useState(false);

  // ── load persisted best ─────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = Number(raw);
        if (parsed > 0) setBest(parsed);
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  // ── submit best (lower = better) ────────────────────────────────────────────
  const submitBest = React.useCallback(
    (m: number) => {
      setBest((prev) => {
        const isNewBest = prev === 0 || m < prev;
        if (!isNewBest) return prev;
        if (storageKey) {
          try {
            window.localStorage.setItem(storageKey, String(m));
          } catch {
            /* ignore */
          }
        }
        return m;
      });
    },
    [storageKey],
  );

  // ── start / restart ─────────────────────────────────────────────────────────
  const start = React.useCallback(() => {
    setCards(buildDeck());
    setMoves(0);
    setFlipped([]);
    setLocked(false);
    setStatus("playing");
    setAnnouncement("Game started. Flip cards to find matching pairs.");
    onStart?.();
    onScoreChange?.(0);
    wrapperRef.current?.focus();
  }, [onStart, onScoreChange]);

  // auto-focus
  React.useEffect(() => {
    if (autoFocus) wrapperRef.current?.focus();
  }, [autoFocus]);

  // ── flip logic ──────────────────────────────────────────────────────────────
  const handleFlip = React.useCallback(
    (index: number) => {
      if (locked || status !== "playing") return;

      setCards((prev) => {
        const card = prev[index];
        if (!card || card.state !== "face-down") return prev;
        return prev.map((c, i) => (i === index ? { ...c, state: "flipped" as const } : c));
      });

      setFlipped((prev) => {
        if (prev.length === 0) {
          return [index];
        }
        if (prev.length === 1) {
          const firstIdx = prev[0];
          if (firstIdx === undefined || firstIdx === index) return prev;

          // We need to check outside of this setter; use a ref trick below.
          return [firstIdx, index] as [number, number];
        }
        return prev;
      });
    },
    [locked, status],
  );

  // ── check for match whenever flipped has 2 entries ──────────────────────────
  React.useEffect(() => {
    if (flipped.length !== 2) return;

    const [a, b] = flipped as [number, number];
    const cardA = cards[a];
    const cardB = cards[b];

    if (!cardA || !cardB) return;

    const newMoves = moves + 1;
    setMoves(newMoves);
    onScoreChange?.(newMoves);

    if (cardA.symbol === cardB.symbol) {
      // Match!
      const nextCards = cards.map((c, i) =>
        i === a || i === b ? { ...c, state: "matched" as const } : c,
      );
      setCards(nextCards);
      setFlipped([]);

      const allMatched = nextCards.every((c) => c.state === "matched");
      if (allMatched) {
        setStatus("won");
        submitBest(newMoves);
        const isNewBest = best === 0 || newMoves < best;
        setAnnouncement(
          `You won in ${newMoves} moves!${isNewBest ? " New best!" : ""}`,
        );
        onGameOver?.({ score: newMoves, won: true });
      } else {
        setAnnouncement(`Match! ${newMoves} moves so far.`);
      }
    } else {
      // No match — lock and flip back after delay.
      setLocked(true);
      setAnnouncement(`No match. ${newMoves} moves so far.`);
      const delay = reduce ? 0 : 700;
      const timer = setTimeout(() => {
        setCards((prev) =>
          prev.map((c, i) =>
            i === a || i === b ? { ...c, state: "face-down" as const } : c,
          ),
        );
        setFlipped([]);
        setLocked(false);
      }, delay);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);
  // NOTE: intentionally not including `cards`, `moves`, `best`, etc. in deps
  // to avoid double-firing; this effect is keyed entirely on the `flipped` pair.

  // ── keyboard: wrapper handles Enter/Space on idle/won ───────────────────────
  const handleWrapperKey = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if ((e.key === "Enter" || e.key === " ") && status !== "playing") {
        e.preventDefault();
        start();
      }
    },
    [status, start],
  );

  // ── card bg / text classes ──────────────────────────────────────────────────
  function cardClasses(state: Card["state"]): string {
    if (state === "face-down") {
      return "bg-primary text-primary-foreground";
    }
    if (state === "flipped") {
      return "bg-secondary text-secondary-foreground";
    }
    // matched
    return "bg-accent text-accent-foreground opacity-60";
  }

  // ── flip animation class ────────────────────────────────────────────────────
  // We use a simple scale trick when not reduce. CSS-only via Tailwind.
  function transitionClass(state: Card["state"]): string {
    if (reduce) return "";
    if (state === "face-down") return "transition-transform duration-200";
    return "transition-transform duration-200 scale-95";
  }

  const isNewBestOnWin = status === "won" && (best === 0 || moves <= best);

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      role="application"
      aria-label="Memory Match game"
      onKeyDown={handleWrapperKey}
      style={width ? { maxWidth: width } : undefined}
      className={cn(
        "relative flex w-full max-w-sm select-none flex-col gap-2 outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {/* ── score bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <span
          className="inline-flex items-center rounded-md border bg-secondary px-2 py-0.5 font-medium text-secondary-foreground tabular-nums"
          aria-live="polite"
        >
          Moves {moves}
        </span>
        <span className="text-muted-foreground tabular-nums">
          Best {best === 0 ? "—" : best}
        </span>
      </div>

      {/* ── board ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-lg border bg-muted p-2">
        <div
          className="@container grid grid-cols-4 grid-rows-4 w-full aspect-square gap-[3%]"
        >
          {cards.map((card, index) => (
            <button
              key={card.id}
              type="button"
              disabled={card.state !== "face-down" || locked || status !== "playing"}
              aria-label={
                card.state === "face-down"
                  ? `Card ${index + 1}, face down`
                  : card.state === "matched"
                    ? `Card ${index + 1}, matched ${card.symbol}`
                    : `Card ${index + 1}, showing ${card.symbol}`
              }
              onClick={() => handleFlip(index)}
              className={cn(
                "size-full flex items-center justify-center rounded-md",
                "text-[clamp(1rem,14cqi,2.5rem)] font-bold",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:cursor-default",
                cardClasses(card.state),
                transitionClass(card.state),
              )}
            >
              {card.state !== "face-down" ? card.symbol : null}
            </button>
          ))}
        </div>

        {/* ── overlay ─────────────────────────────────────────────────────── */}
        {status !== "playing" && (
          <div className="absolute inset-0 grid place-items-center rounded-lg bg-background/80 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              {status === "won" ? (
                <>
                  <p className="text-lg font-semibold">You won!</p>
                  <p className="text-sm text-muted-foreground">
                    {moves} moves
                    {isNewBestOnWin ? " — new best!" : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold">Memory Match</p>
                  <p className="text-sm text-muted-foreground">
                    Flip cards to find all 8 matching pairs.
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
                {status === "won" ? "Play again" : "Start"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── aria-live region for screen readers ──────────────────────────── */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

export default MemoryMatch;
