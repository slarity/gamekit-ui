import type { Route } from "next";
import Link from "next/link";
import { GamePreview } from "@/components/game-preview";
import { getGame } from "@/registry/games";

// A mix of canvas action + a quick puzzle, playable right on the page.
const FEATURED = ["flappy", "breakout", "tic-tac-toe"] as const;

export function PlayableGames() {
  return (
    <section className="container mx-auto max-w-6xl px-4 py-20">
      <div className="flex items-center gap-4 text-muted-foreground">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em]">Play it now</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-5 max-w-2xl">
        <h2 className="font-semibold text-3xl tracking-tight sm:text-4xl">
          Try a few, right in the browser.
        </h2>
        <p className="mt-2 text-muted-foreground text-sm">
          No install needed — these are the real components, themed live. Recolor them with a swatch
          above and watch them follow.
        </p>
      </div>

      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURED.map((name) => {
          const game = getGame(name);
          if (!game) return null;
          return (
            <div
              key={name}
              className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-[0_40px_90px_-60px_#000]"
            >
              {/* Marquee header */}
              <div className="flex items-center justify-between border-b px-4 py-2.5 font-pixel text-[9px] text-muted-foreground">
                <span>
                  <span className="text-primary">GAMEKIT</span> // {game.title}
                </span>
                <span className="blink text-primary">●</span>
              </div>

              {/* Live, playable game — centered in the equal-height card */}
              <div className="flex flex-1 items-center justify-center p-4">
                <GamePreview name={name} autoFocus={false} captureGlobalKeys={false} />
              </div>

              {/* Footer link */}
              <Link
                href={`/docs/games/${name}` as Route}
                className="border-t px-4 py-2.5 font-mono text-muted-foreground text-xs transition-colors hover:text-primary"
              >
                Install {game.title} →
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
