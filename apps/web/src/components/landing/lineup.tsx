import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { GameMotif } from "@/components/landing/game-motifs";
import { GAMES } from "@/registry/games";

export function Lineup() {
  return (
    <section className="container mx-auto max-w-6xl px-4 py-20">
      <div className="flex items-center gap-4 text-muted-foreground">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em]">
          The lineup · {GAMES.length} classics
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-5 flex items-end justify-between gap-5">
        <div>
          <h2 className="font-semibold text-3xl tracking-tight sm:text-4xl">
            Ten classics, themed to your app.
          </h2>
          <p className="mt-2 text-muted-foreground text-sm">
            Canvas or DOM, all under 6&nbsp;KB. Install one, or grab the whole cabinet.
          </p>
        </div>
        <Link
          href={"/games" as Route}
          className="group hidden shrink-0 items-center gap-1 text-muted-foreground text-sm hover:text-foreground sm:inline-flex"
        >
          View all
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="mt-9 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {GAMES.map((game) => (
          <Link
            key={game.name}
            href={`/docs/games/${game.name}` as Route}
            className="lineup-card group flex flex-col overflow-hidden rounded-lg border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[0_18px_40px_-28px_#000]"
          >
            <div className="crt-screen grid aspect-[16/11] place-items-center border-b">
              <div className="relative z-[1]">
                <GameMotif name={game.name} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 px-3.5 py-3">
              <span className="font-medium text-sm">{game.title}</span>
              <span className="rounded border px-1.5 py-px font-mono text-[9.5px] text-muted-foreground uppercase tracking-[0.1em]">
                {game.surface}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
