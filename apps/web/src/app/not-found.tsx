import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { GamePreview } from "@/components/game-preview";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="container mx-auto grid max-w-2xl place-items-center px-4 py-24">
      <div className="flex w-full flex-col items-center gap-8 text-center">
        <div className="space-y-2">
          <h1 className="font-semibold text-6xl tracking-tight">404</h1>
          <p className="text-base text-muted-foreground">
            Play a round while you decide where to go.
          </p>
        </div>
        <div className="w-full max-w-xl">
          {/* The page is the game — global key capture is the default, so just drop it in. */}
          <GamePreview name="dino-runner" />
        </div>
        <Link href={"/" as Route} className="inline-block text-muted-foreground text-sm hover:text-foreground">
          ← Back home
        </Link>
      </div>
    </main>
  );
}
