"use client";

import * as React from "react";

type LazyGame = React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>;

/**
 * Lazy registry of playable game components, keyed by registry name.
 * Mirrors the `React.lazy` pattern shadcn v4 uses for live MDX previews.
 */
export const GameIndex: Record<string, LazyGame> = {
  snake: React.lazy(() => import("@gamekitui/registry/snake/snake")),
  "tic-tac-toe": React.lazy(() => import("@gamekitui/registry/tic-tac-toe/tic-tac-toe")),
  "2048": React.lazy(() => import("@gamekitui/registry/2048/2048")),
  "memory-match": React.lazy(() => import("@gamekitui/registry/memory-match/memory-match")),
  "whack-a-mole": React.lazy(() => import("@gamekitui/registry/whack-a-mole/whack-a-mole")),
  minesweeper: React.lazy(() => import("@gamekitui/registry/minesweeper/minesweeper")),
  pong: React.lazy(() => import("@gamekitui/registry/pong/pong")),
  breakout: React.lazy(() => import("@gamekitui/registry/breakout/breakout")),
  "dino-runner": React.lazy(() => import("@gamekitui/registry/dino-runner/dino-runner")),
  flappy: React.lazy(() => import("@gamekitui/registry/flappy/flappy")),
  "fruit-ninja": React.lazy(() => import("@gamekitui/registry/fruit-ninja/fruit-ninja")),
};

export function hasPlayable(name: string): boolean {
  return name in GameIndex;
}
