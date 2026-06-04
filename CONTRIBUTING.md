# Contributing to gamekitui

Thanks for your interest! gamekitui is a craft project — the bar is "the smallest reasonable game with the cleanest reasonable API." This guide covers adding a new game.

## Setup

```bash
bun install
bun run dev        # site on http://localhost:3001
```

## The game-as-primitive contract

Every game is a **single, self-contained `.tsx` file** that:

- starts with `"use client";`
- imports **only** `react` and `cn` from `@/lib/utils` — nothing else;
- uses **zero external assets** (no images, audio, fonts; draw with CSS or `<canvas>`);
- exports a named PascalCase component **and** a default export;
- accepts the shared props subset (`className`, `width`, `height`, `paused`, `autoFocus`, `persistHighScore`, `onScoreChange`, `onGameOver`, `onStart`).

The reference implementation is [`packages/registry/src/snake/snake.tsx`](./packages/registry/src/snake/snake.tsx). Copy its patterns: the canvas/DPR setup, the `readTheme` / `useGameTheme` helpers, `usePrefersReducedMotion`, the rAF loop driven by refs, offscreen/visibility pause, and the score/overlay chrome.

## Theming (required)

The theme's primary/secondary/accent must drive the **playfield**, not just the chrome:

| Element | Token | DOM class / canvas var |
|---|---|---|
| Playfield background | `--background` | `bg-background` / `--background` |
| Lines, walls, inactive cells | `--border` / `--muted` | `border-border`, `bg-muted` |
| Player / hero / primary mover | `--primary` | `bg-primary text-primary-foreground` |
| Opponent / alt state | `--secondary` | `bg-secondary text-secondary-foreground` |
| Highlights / targets / rewards | `--accent` | `bg-accent text-accent-foreground` |
| Danger / loss | `--destructive` | `bg-destructive` |
| Focus ring | `--ring` | `ring-ring` |

- **DOM games** use Tailwind token classes directly — they recolor for free.
- **Canvas games** read the tokens at runtime via `getComputedStyle` and re-resolve on theme change with a `MutationObserver` (see `useGameTheme` in the reference). Assign the resolved `oklch(...)` strings straight to `ctx.fillStyle`.

## Accessibility (required)

- Wrapper has `role="application"`, an `aria-label`, `tabIndex={0}`, and a visible `focus-visible:ring-2 focus-visible:ring-ring`.
- An `aria-live="polite"` region announces score milestones and game over.
- Keyboard- and touch-operable.
- Respects `prefers-reduced-motion`; canvas/timer games pause when offscreen and on `visibilitychange`.

## Chrome (keep it minimal)

Build start/restart/score/overlay UI from plain elements + Tailwind token utilities only — match the reference. No invented colors, no custom CSS beyond utilities, no shadows beyond `shadow-sm`. The playfield is the only distinctive surface.

## Steps to add a game

1. Create `packages/registry/src/<slug>/<slug>.tsx` following the contract above.
2. Add an entry to `apps/web/src/registry/games.ts` (metadata + files + `ready: true`).
3. Add a `React.lazy` entry to `apps/web/src/registry/index.tsx`.
4. Add a `transpilePackages` path only if you introduce a new package (usually not needed).
5. Verify:
   ```bash
   cd packages/registry && bun run check-types && bun smoke.tsx
   cd apps/web && bun run build
   ```
6. The registry JSON (`/r/<slug>.json`) is generated automatically by `scripts/build-registry.ts` during the build.

## Size budget

Each game must stay **≤ 6 KB gzipped** (the library ≤ 60 KB). Keep logic tight, inline only what you need, and avoid abstractions that don't earn their bytes.

## Pull request checklist

- [ ] Single self-contained file, only `react` + `cn` imported.
- [ ] No external assets; no `fetch` / `new Image` / `new Audio` / `@font-face`.
- [ ] Theme primary/secondary/accent visibly drive the playfield (tested in light + dark + a custom accent).
- [ ] Keyboard, touch, focus ring, `aria-live`, and reduced-motion all work.
- [ ] `check-types`, `smoke.tsx`, and the site build pass.
