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
    <main className="container mx-auto grid max-w-xl place-items-center px-4 py-20">
      <div className="space-y-6 text-center">
        <div className="space-y-1">
          <h1 className="font-semibold text-5xl tracking-tight">404</h1>
          <p className="text-muted-foreground">Play a round while you decide where to go.</p>
        </div>
        <div className="flex justify-center">
          <GamePreview name="dino-runner" width={420} height={180} />
        </div>
        <Link href={"/" as Route} className="inline-block text-muted-foreground text-sm hover:text-foreground">
          ← Back home
        </Link>
      </div>
    </main>
  );
}
