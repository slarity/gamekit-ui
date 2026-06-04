"use client";

import * as React from "react";
import { GameIndex } from "@/registry";

export function GamePreview({
  name,
  className,
  ...props
}: { name: string; className?: string } & Record<string, unknown>) {
  const Game = GameIndex[name];
  if (!Game) {
    return (
      <div className="grid h-48 w-full place-items-center rounded-lg border border-dashed text-muted-foreground text-sm">
        Coming soon
      </div>
    );
  }
  return (
    <React.Suspense
      fallback={<div className="grid h-48 w-full place-items-center text-muted-foreground text-sm">Loading…</div>}
    >
      <Game className={className} {...props} />
    </React.Suspense>
  );
}
