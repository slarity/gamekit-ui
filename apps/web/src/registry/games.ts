export type GameSurface = "canvas" | "dom";

export interface GameControls {
  keyboard: boolean;
  mouse: boolean;
  touch: boolean;
  /** Human-readable summary shown in the Controls section. */
  help: string;
}

export interface GamePlatforms {
  desktop: boolean;
  mobile: boolean;
}

export interface GameMeta {
  /** Registry item name / URL slug. */
  name: string;
  title: string;
  /** One-line description (also used in registry JSON). */
  description: string;
  surface: GameSurface;
  /** Inline preview iframe height. */
  iframeHeight: string;
  /** Source files shipped via the shadcn registry. */
  files: { path: string; target: string }[];
  /** Which platforms the game is optimized for. */
  platforms: GamePlatforms;
  /** Supported input methods. */
  controls: GameControls;
  /** Whether the game implementation has landed yet. */
  ready: boolean;
}

export const GAMES: GameMeta[] = [
  {
    name: "snake",
    title: "Snake",
    description: "A tiny, themeable Snake game. ≤6KB gzipped, zero external assets.",
    surface: "canvas",
    iframeHeight: "460px",
    files: [{ path: "packages/registry/src/snake/snake.tsx", target: "@/components/games/snake.tsx" }],
    platforms: { desktop: true, mobile: false },
    controls: { keyboard: true, mouse: false, touch: true, help: "Arrow keys / WASD to steer, or swipe. Best on desktop — continuous swipe steering is fiddly on small screens." },
    ready: true,
  },
  {
    name: "tic-tac-toe",
    title: "Tic-Tac-Toe",
    description: "Classic 3×3 Tic-Tac-Toe with an unbeatable CPU. Pure DOM, fully themeable.",
    surface: "dom",
    iframeHeight: "460px",
    files: [{ path: "packages/registry/src/tic-tac-toe/tic-tac-toe.tsx", target: "@/components/games/tic-tac-toe.tsx" }],
    platforms: { desktop: true, mobile: true },
    controls: { keyboard: true, mouse: true, touch: true, help: "Click or tap a cell. Arrow keys move the cursor; Enter places your mark." },
    ready: true,
  },
  {
    name: "2048",
    title: "2048",
    description: "The addictive sliding-tile puzzle. Reach 2048. Swipe or arrow keys.",
    surface: "dom",
    iframeHeight: "520px",
    files: [{ path: "packages/registry/src/2048/2048.tsx", target: "@/components/games/2048.tsx" }],
    platforms: { desktop: true, mobile: true },
    controls: { keyboard: true, mouse: false, touch: true, help: "Arrow keys / WASD to slide tiles, or swipe." },
    ready: true,
  },
  {
    name: "memory-match",
    title: "Memory Match",
    description: "Flip cards to find matching pairs in as few moves as possible.",
    surface: "dom",
    iframeHeight: "520px",
    files: [{ path: "packages/registry/src/memory-match/memory-match.tsx", target: "@/components/games/memory-match.tsx" }],
    platforms: { desktop: true, mobile: true },
    controls: { keyboard: true, mouse: true, touch: true, help: "Click or tap a card to flip it. Tab + Enter also work." },
    ready: true,
  },
  {
    name: "whack-a-mole",
    title: "Whack-a-Mole",
    description: "Tap the moles before they duck. 30-second pointer-only arcade game.",
    surface: "dom",
    iframeHeight: "500px",
    files: [{ path: "packages/registry/src/whack-a-mole/whack-a-mole.tsx", target: "@/components/games/whack-a-mole.tsx" }],
    platforms: { desktop: true, mobile: true },
    controls: { keyboard: false, mouse: true, touch: true, help: "Click or tap the moles before they disappear." },
    ready: true,
  },
  {
    name: "minesweeper",
    title: "Minesweeper",
    description: "Deterministic 9×9 Minesweeper. Left-click reveals, right-click / long-press flags.",
    surface: "dom",
    iframeHeight: "540px",
    files: [{ path: "packages/registry/src/minesweeper/minesweeper.tsx", target: "@/components/games/minesweeper.tsx" }],
    platforms: { desktop: true, mobile: false },
    controls: { keyboard: true, mouse: true, touch: true, help: "Left-click reveals, right-click flags. Long-press to flag on touch." },
    ready: true,
  },
  {
    name: "pong",
    title: "Pong",
    description: "The original. Player vs CPU. First to 7. W/S or arrow keys.",
    surface: "canvas",
    iframeHeight: "460px",
    files: [{ path: "packages/registry/src/pong/pong.tsx", target: "@/components/games/pong.tsx" }],
    platforms: { desktop: true, mobile: true },
    controls: { keyboard: true, mouse: true, touch: true, help: "W/S or arrow keys to move your paddle, or drag on the court." },
    ready: true,
  },
  {
    name: "breakout",
    title: "Breakout",
    description: "Bounce the ball, clear the bricks, don't drop. Endless levels.",
    surface: "canvas",
    iframeHeight: "520px",
    files: [{ path: "packages/registry/src/breakout/breakout.tsx", target: "@/components/games/breakout.tsx" }],
    platforms: { desktop: true, mobile: true },
    controls: { keyboard: true, mouse: true, touch: true, help: "←/→ or A/D to move the paddle, or drag. Space launches." },
    ready: true,
  },
  {
    name: "dino-runner",
    title: "Dino Runner",
    description: "The offline-dino endless runner. Jump the cacti. Perfect for 404 pages.",
    surface: "canvas",
    iframeHeight: "420px",
    files: [{ path: "packages/registry/src/dino-runner/dino-runner.tsx", target: "@/components/games/dino-runner.tsx" }],
    platforms: { desktop: true, mobile: true },
    controls: { keyboard: true, mouse: true, touch: true, help: "Space, Up, click, or tap to jump." },
    ready: true,
  },
  {
    name: "flappy",
    title: "Flappy",
    description: "Tap to flap through the pipes. A tiny infinite runner for loading screens.",
    surface: "canvas",
    iframeHeight: "520px",
    files: [{ path: "packages/registry/src/flappy/flappy.tsx", target: "@/components/games/flappy.tsx" }],
    platforms: { desktop: true, mobile: true },
    controls: { keyboard: true, mouse: true, touch: true, help: "Space, Up, click, or tap to flap." },
    ready: true,
  },
  {
    name: "fruit-ninja",
    title: "Fruit Ninja",
    description: "Slice the flying fruit, dodge the bombs, beat the clock. A juicy 60-second arcade run.",
    surface: "canvas",
    iframeHeight: "620px",
    files: [{ path: "packages/registry/src/fruit-ninja/fruit-ninja.tsx", target: "@/components/games/fruit-ninja.tsx" }],
    platforms: { desktop: true, mobile: true },
    controls: { keyboard: false, mouse: true, touch: true, help: "Drag or swipe the blade across the fruit to slice it. Bombs cost points — avoid them. Press Enter to start. 60-second arcade run." },
    ready: true,
  },
];

export const getGame = (name: string) => GAMES.find((g) => g.name === name);
