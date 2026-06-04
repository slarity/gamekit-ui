import { Badge } from "@gamekitui/ui/components/badge";
import { buttonVariants } from "@gamekitui/ui/components/button";
import { cn } from "@gamekitui/ui/lib/utils";
import { Accessibility, ArrowRight, ImageOff, Package, Palette } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { AttractMarquee } from "@/components/landing/attract-marquee";
import { Cabinet } from "@/components/landing/cabinet";
import { CtaBand } from "@/components/landing/cta-band";
import { Lineup } from "@/components/landing/lineup";
import { ThemeSwatches } from "@/components/landing/theme-swatches";
import { InstallCommand } from "@/components/install-command";
import { GAMES } from "@/registry/games";

const PILLARS = [
  {
    icon: Package,
    title: "Minimal",
    body: "Each game is ≤6 KB gzipped — a single drop-in file with zero npm dependencies.",
  },
  {
    icon: Palette,
    title: "Themeable",
    body: "Reads your shadcn tokens at runtime. Change --primary and the playfield recolors.",
  },
  {
    icon: ImageOff,
    title: "Zero assets",
    body: "No images, audio, or fonts. Every pixel is drawn with CSS or <canvas>.",
  },
  {
    icon: Accessibility,
    title: "Accessible",
    body: "Keyboard + touch, focus rings, aria-live, and reduced-motion in every game.",
  },
];

export default function Home() {
  return (
    <main>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden border-b">
        <div className="-z-10 pointer-events-none absolute inset-0 arcade-dots opacity-60" />
        <div className="container mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1.5 font-mono font-normal text-muted-foreground">
                  <span className="size-1.5 bg-primary" />
                  {GAMES.length} games
                </Badge>
                <Badge variant="outline" className="font-mono font-normal text-muted-foreground">
                  shadcn registry
                </Badge>
                <Badge variant="outline" className="font-mono font-normal text-muted-foreground">
                  zero deps · ≤6 KB
                </Badge>
              </div>

              <h1 className="text-balance font-semibold text-5xl leading-[1.04] tracking-tight sm:text-6xl">
                Drop-in <span className="text-primary">arcade</span> for your shadcn app.
              </h1>

              <p className="max-w-md text-pretty text-base text-muted-foreground leading-relaxed">
                Tiny, themeable React games for your 404s, empty states, and landing-page easter
                eggs. Install with the shadcn CLI — no provider, no peer deps, no init step.
              </p>

              <div className="max-w-md">
                <InstallCommand name="snake" />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Link href={"/games" as Route} className={cn(buttonVariants({ size: "lg" }), "group")}>
                  Browse all {GAMES.length} games
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href={"/docs" as Route}
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Read the docs
                </Link>
              </div>

              <ThemeSwatches className="pt-2" />
            </div>

            <Cabinet />
          </div>
        </div>
      </section>

      {/* ============ ATTRACT MARQUEE ============ */}
      <AttractMarquee />

      {/* ============ PILLARS ============ */}
      <section className="container mx-auto max-w-6xl px-4 py-20">
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em]">Why GameKit</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <h2 className="mt-5 max-w-2xl font-semibold text-3xl tracking-tight sm:text-4xl">
          Small enough to forget. Fun enough to ship.
        </h2>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <div key={p.title} className="rounded-lg border bg-card p-6">
              <p.icon className="size-7 text-primary" strokeWidth={1.6} />
              <p className="mt-4 font-mono text-muted-foreground text-xs">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-1 font-medium text-base">{p.title}</h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ LINEUP ============ */}
      <Lineup />

      {/* ============ QUICKSTART ============ */}
      <section className="container mx-auto max-w-6xl px-4 pb-20">
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em]">
            Quickstart · 30 seconds
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="mt-9 grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <ol className="flex flex-col gap-6">
            {[
              {
                h: "Run the CLI",
                p: "Point the shadcn CLI at any game's registry URL. It drops one file into your project.",
              },
              {
                h: "Import & render",
                p: "No provider, no init. Render the component anywhere — it inherits your theme tokens.",
              },
              {
                h: "Ship the easter egg",
                p: "Drop it on a 404, an empty state, or a loading screen. It just works.",
              },
            ].map((step, i) => (
              <li key={step.h} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-card font-pixel text-[12px] text-primary">
                  {i + 1}
                </span>
                <div>
                  <h4 className="font-medium text-base">{step.h}</h4>
                  <p className="mt-1 text-muted-foreground text-sm">{step.p}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="flex items-center gap-2 border-b px-4 py-3 font-mono text-[11px] text-muted-foreground">
              <span className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-muted-foreground/30" />
                <span className="size-2.5 rounded-full bg-muted-foreground/30" />
                <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              </span>
              <span className="ml-2">app/not-found.tsx</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[12.5px] text-muted-foreground leading-relaxed">
              <code>{`// 1 — install
$ npx shadcn@latest add gamekitui.com/r/snake.json

// 2 — use it
import { Snake } from "@/components/games/snake"

export default function NotFound() {
  return (
    <main className="grid place-items-center">
      <Snake />   {/* inherits --primary */}
    </main>
  )
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <CtaBand />
    </main>
  );
}
