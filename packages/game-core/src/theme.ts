import * as React from "react";
import type { GameTheme } from "./types";

export const THEME_TOKENS = [
  "background",
  "foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "accent",
  "accent-foreground",
  "muted",
  "muted-foreground",
  "border",
  "ring",
  "destructive",
] as const;

const camel = (s: string) => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/**
 * Resolve the full shadcn {@link GameTheme} from CSS custom properties.
 * Values come back as `oklch(...)` strings which canvas accepts directly on
 * `ctx.fillStyle` / `ctx.strokeStyle` — no color-space conversion needed.
 */
export function resolveTheme(el: HTMLElement | null): GameTheme {
  const target = el ?? (typeof document !== "undefined" ? document.documentElement : null);
  if (!target) {
    return Object.fromEntries(THEME_TOKENS.map((t) => [camel(t), ""])) as unknown as GameTheme;
  }
  const cs = getComputedStyle(target);
  const get = (t: string) => cs.getPropertyValue(`--${t}`).trim();
  return Object.fromEntries(THEME_TOKENS.map((t) => [camel(t), get(t)])) as unknown as GameTheme;
}

/**
 * Resolve the shadcn theme once at mount and re-resolve whenever the theme
 * changes (the `.dark` class toggle or a theme-preset swap) — no remount.
 */
export function useGameTheme(ref: React.RefObject<HTMLElement | null>): GameTheme {
  const read = React.useCallback(() => resolveTheme(ref.current), [ref]);
  const [theme, setTheme] = React.useState<GameTheme>(read);

  React.useEffect(() => {
    setTheme(read());
    const mo = new MutationObserver(() => setTheme(read()));
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    return () => mo.disconnect();
  }, [read]);

  return theme;
}
