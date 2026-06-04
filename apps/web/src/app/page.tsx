import { Badge } from "@gamekitui/ui/components/badge";
import { buttonVariants } from "@gamekitui/ui/components/button";
import { cn } from "@gamekitui/ui/lib/utils";
import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { GamePreview } from "@/components/game-preview";
import { InstallCommand } from "@/components/install-command";
import { GAMES } from "@/registry/games";

const PRINCIPLES = [
  { title: "Minimal", body: "Each game is ≤6 KB gzipped — a single drop-in file, zero npm dependencies." },
  { title: "Themeable", body: "Reads your shadcn tokens at runtime. Change --primary and the playfield recolors." },
  { title: "Zero assets", body: "No images, audio, or fonts. Every pixel is drawn with CSS or <canvas>." },
  { title: "Accessible", body: "Keyboard + touch, focus rings, aria-live, and reduced-motion in every game." },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="-z-10 pointer-events-none absolute inset-0 bg-dots opacity-70" />
        <div className="container mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-7">
              <Badge variant="outline" className="gap-1.5 font-normal text-muted-foreground">
                <span className="size-1.5 bg-primary" />
                {GAMES.length} games · shadcn registry · zero deps
              </Badge>
              <h1 className="text-balance font-semibold text-5xl leading-[1.05] tracking-tight sm:text-6xl">
                Drop-in browser games for shadcn.
              </h1>
              <p className="max-w-md text-pretty text-base text-muted-foreground leading-relaxed">
                Tiny, themeable React components for your 404s, empty states, and landing-page easter
                eggs. Install with the shadcn CLI — no provider, no peer deps, no init step.
              </p>
              <div className="max-w-md">
                <InstallCommand name="snake" />
              </div>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Link href={"/games" as Route} className={cn(buttonVariants({ size: "lg" }), "group")}>
                  Browse all {GAMES.length} games
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link href={"/docs" as Route} className={buttonVariants({ variant: "outline", size: "lg" })}>
                  Read the docs
                </Link>
              </div>
            </div>

            {/* Live, themeable featured game */}
            <div className="flex flex-col items-center gap-5 bg-card p-8 rounded-lg ring-1 ring-foreground/10">
              <div className="w-full max-w-[300px]">
                <GamePreview name="snake" autoFocus={false} />
              </div>
              <p className="text-center text-muted-foreground text-xs">
                Hit <span className="font-medium text-foreground">Customize</span> in the corner and
                watch the playfield recolor live.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="border-b">
        <div className="container mx-auto grid max-w-6xl divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 [&>*]:border-border sm:[&>*:nth-child(odd)]:border-r lg:[&>*]:border-r lg:[&>*:last-child]:border-r-0">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="px-5 py-8">
              <h3 className="font-medium text-sm">{p.title}</h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery teaser */}
      <section className="container mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-semibold text-2xl tracking-tight">The lineup</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              {GAMES.length} classics, themed to match your app.
            </p>
          </div>
          <Link
            href={"/games" as Route}
            className="group inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
          >
            View all
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-px bg-border ring-1 ring-border sm:grid-cols-3 lg:grid-cols-5">
          {GAMES.map((game) => (
            <Link
              key={game.name}
              href={`/docs/games/${game.name}` as Route}
              className="group flex flex-col gap-1 bg-card p-5 transition-colors hover:bg-muted/40"
            >
              <p className="font-medium text-sm group-hover:text-foreground">{game.title}</p>
              <p className="text-muted-foreground text-xs capitalize">{game.surface}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
