import type { CSSProperties } from "react";

/**
 * Phosphor-glow treatment for the landing page's primary CTAs ONLY (hero +
 * closing band). Inline so it never depends on global-CSS recompilation, and so
 * the rest of the app's buttons keep the plain shadcn style. Recolors with
 * `--primary`. Pair with `hover:brightness-110` for a little lift.
 */
export const arcadeGlow: CSSProperties = {
  boxShadow:
    "0 0 0 1px color-mix(in oklab, var(--primary) 55%, transparent), 0 0 28px -6px color-mix(in oklab, var(--primary) 70%, transparent)",
};
