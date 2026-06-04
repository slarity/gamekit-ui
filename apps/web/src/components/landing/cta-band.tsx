import { buttonVariants } from "@gamekitui/ui/components/button";
import { cn } from "@gamekitui/ui/lib/utils";
import type { Route } from "next";
import Link from "next/link";
import { arcadeGlow } from "@/components/landing/cta-styles";
import { PixelInvader } from "@/components/pixel-invader";
import { siteConfig } from "@/lib/site";

const INVADER_COLORS = [
  "text-arcade-green",
  "text-arcade-magenta",
  "text-arcade-cyan",
  "text-arcade-amber",
];

/** "Insert coin" closing band — a row of invaders over a phosphor glow. */
export function CtaBand() {
  return (
    <section className="container mx-auto max-w-6xl px-4 pt-8 pb-24">
      <div className="relative overflow-hidden rounded-2xl border bg-card px-7 py-16 text-center">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 120% at 50% 0%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 70%)",
          }}
        />

        <div className="relative mb-7 flex justify-center gap-5">
          {INVADER_COLORS.map((color) => (
            <PixelInvader key={color} className={cn("w-7", color)} aria-label="" />
          ))}
        </div>

        <h2 className="relative font-semibold text-3xl tracking-tight sm:text-4xl">
          Give your 404 a high score.
        </h2>
        <p className="relative mt-3 font-pixel text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
          Insert coin to continue
        </p>

        <div className="relative mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href={"/games" as Route}
            style={arcadeGlow}
            className={cn(buttonVariants({ size: "lg" }), "transition-[filter] hover:brightness-110")}
          >
            Browse the cabinet
          </Link>
          <a
            href={siteConfig.github}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
