/**
 * The shared "game-as-primitive" contract every gamekitui game implements.
 *
 * This package ships **types only** — zero runtime. Each game inlines whatever
 * subset it needs so it stays a single, drop-in file with no extra dependency.
 */

export type GameState = "idle" | "playing" | "paused" | "gameover";

export interface GameProps {
  /** Tailwind className on the outer wrapper. */
  className?: string;
  /** Logical CSS px (canvas games scale via DPR). */
  width?: number;
  height?: number;
  /** External pause. */
  paused?: boolean;
  /** Auto-focus on mount so keyboard works. */
  autoFocus?: boolean;
  /**
   * When true (the default), the game listens for keyboard input on `window` so
   * it responds without being focused first — ideal for single-game pages (404s,
   * loading/empty states). Set false when multiple games share a page, or the
   * game sits in scrollable content, so it only responds while focused (and
   * doesn't capture the page's scroll keys). Ignores keystrokes aimed at form
   * fields.
   */
  captureGlobalKeys?: boolean;
  /** localStorage key (or default per-game) for high score persistence. */
  persistHighScore?: boolean | string;
  /** Override keyboard mapping. */
  controls?: Partial<ControlMap>;
  /** Optional override; defaults read shadcn tokens. */
  theme?: Partial<GameTheme>;
  onScoreChange?: (score: number) => void;
  onGameOver?: (result: { score: number; won: boolean }) => void;
  onStart?: () => void;
  onStateChange?: (state: GameState) => void;
}

export interface ControlMap {
  up: string[];
  down: string[];
  left: string[];
  right: string[];
  action: string[];
  pause: string[];
  restart: string[];
}

/** Resolved from shadcn CSS vars at runtime (canvas games). */
export interface GameTheme {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  ring: string;
  destructive: string;
}

/** Minimal pure engine shape every game's `engine.ts` returns. */
export interface GameEngine<TState, TInput = unknown> {
  readonly state: TState;
  step(input?: TInput): void;
  reset(): void;
}
