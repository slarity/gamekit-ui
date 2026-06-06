# gamekitui — Product Requirements Document (v1.0)

> An open-source shadcn component registry shipping 10 minimal, drop-in browser games as React/TSX primitives. Installable via the shadcn CLI (`npx shadcn@latest add` by URL or `@gamekitui` namespace). Pure craft / open-source project — no backend, no auth, no monetization.

**Status:** Ready to scaffold. This document is the source of truth handed to the implementer (e.g. Claude Code). Paths, configs, and acceptance criteria are concrete on purpose.

**Last updated:** 2026-06-04

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Naming & namespace](#2-naming--namespace)
3. [v1 game lineup](#3-v1-game-lineup)
4. [MDX docs engine decision](#4-mdx-docs-engine-decision)
5. [Product requirements](#5-product-requirements)
6. [Technical architecture](#6-technical-architecture)
7. [Tooling & dev setup](#7-tooling--dev-setup)
8. [Testing strategy](#8-testing-strategy)
9. [Build plan / milestones](#9-build-plan--milestones)
10. [OSS launch & maintenance checklist](#10-oss-launch--maintenance-checklist)
11. [Appendix: validated facts & sources](#11-appendix-validated-facts--sources)

---

## 1. Executive summary

**What we're building.** `gamekitui` is an open-source shadcn registry of 10 minimal-footprint, single-file browser games — Snake, Tic-Tac-Toe, 2048, Memory Match, Minesweeper, Breakout, Flappy, Dino Runner, Pong, Whack-a-Mole — packaged as React/TSX components a developer can drop anywhere (404 pages, empty states, loading screens, landing-page easter eggs). Each game is consumed via the official shadcn CLI:

```bash
npx shadcn@latest add https://gamekitui.com/r/snake.json
# or, with the namespace registered (npx shadcn@latest registry add @gamekitui):
npx shadcn@latest add @gamekitui/snake
```

**Footprint / identity principle.** Every game obeys a hard per-game budget enforced in CI:

- **≤ ~6 KB gzipped** per game (full library ≤ 60 KB gzipped).
- **Zero external runtime dependencies** beyond what shadcn already implies (`react`, the user's existing `cn` helper).
- **Zero external asset files** — no images, audio, or fonts; all art is drawn via CSS or `<canvas>`.

The whole library is "the smallest reasonable game with the cleanest reasonable API."

**Locked stack (final).**

| Concern | Choice |
|---|---|
| Runtime / package manager | **Bun** (`bun@1.3.x`) — install, scripts, runtime; Bun workspaces |
| Monorepo orchestration | **Turborepo** (`^2.x`) on top of Bun workspaces |
| Site framework | **Next.js 16** (App Router) — one unified app `apps/www` for marketing **and** docs |
| Styling | **Tailwind CSS v4** + **shadcn/ui** (`new-york` style, `neutral` base, lucide icons) |
| Docs engine | **Fumadocs** (`fumadocs-mdx` + `fumadocs-core/source`) — confirmed as what shadcn v4 itself uses |
| Lint / format | **Biome v2** (single tool, replaces ESLint + Prettier) |
| Language | **TypeScript**, strict, shared `tsconfig` package |
| Tests | **Vitest + React Testing Library** (components); **`bun test`** (pure-logic engines only) |
| Git hooks | **Lefthook** |
| Versioning / release | **Changesets** (with the Bun `workspace:*` workaround — see §7) |
| CI | **GitHub Actions** + `oven-sh/setup-bun@v2` |
| Deploy | **Vercel** — `apps/www` serves the site **and** the registry JSON at `/r/*.json` |

---

## 2. Naming & namespace

| | |
|---|---|
| Project / package name | `gamekitui` |
| Domain | `gamekitui.com` |
| Registry catalog URL | `https://gamekitui.com/r/registry.json` |
| Registry item URL pattern | `https://gamekitui.com/r/{name}.json` |
| Recommended namespace | **`@gamekit`** (short, distinct from `@gamekitui`, matches shadcn's short-namespace convention like `@v0`, `@shadcn`) |
| `components.json` snippet a user adds | `{ "registries": { "@gamekitui": "https://gamekitui.com/r/{name}.json" } }` |
| Install (URL) | `npx shadcn@latest add https://gamekitui.com/r/snake.json` |
| Install (namespace) | `npx shadcn@latest registry add @gamekitui` then `npx shadcn@latest add @gamekitui/snake` |
| Official directory submission | ✅ Merged into `shadcn-ui/ui` (`apps/v4/registry/directory.json`, PR #10864) — listed at https://ui.shadcn.com/docs/directory?q=gamekit |

**Unaffiliated-community-project disclaimer (mandatory in README):**

> **gamekitui** is an independent, unaffiliated community project. It is not built, sponsored, or endorsed by the shadcn/ui team. It uses the shadcn registry system. The `shadcn-` prefix is reserved for official projects, which is why this project is named `gamekitui` (not `shadcn-games`).

---

## 3. v1 game lineup

All 10 are locked. Difficulty = implementation effort. Footprint headroom: `F` = fits comfortably, `M` = needs care, `T` = tight. Hard ceiling **≤ 6 KB gzipped per game** including in-file styles.

| # | Game | One-line rationale | Difficulty | Footprint |
|---|---|---|---|---|
| 1 | **Snake** | Canonical "100-line game"; best reference for the engine/wrapper pattern. | Low | F |
| 2 | **Tic-Tac-Toe** | Pure DOM, the "no-canvas" reference; easy accessibility. | Low | F |
| 3 | **2048** | High recognition; pure grid logic, no rAF needed. | Low | F |
| 4 | **Memory Match** | Pure DOM; perfect empty-state widget; teaches controlled-prop pattern. | Low | F |
| 5 | **Minesweeper** | Classic, deterministic, all DOM; right-click + long-press flag on touch. | Med | F |
| 6 | **Breakout** | First arcade canvas game; rAF + collision + paddle. | Med | M |
| 7 | **Flappy** | Tiny infinite-runner template; best fit for loading screens. | Med | M |
| 8 | **Dino Runner** | Chrome-offline-style runner; pairs perfectly with 404 / offline pages. | Med | M |
| 9 | **Pong** | Two-player + AI; demos the controls API + keyboard mapping. | Med | F |
| 10 | **Whack-a-Mole** | Pointer-only DOM game; ideal mobile demo. | Low | F |

---

## 4. MDX docs engine decision

### Decision: **Fumadocs (`fumadocs-mdx` + `fumadocs-core/source`) with a custom shadcn-based UI shell.**

This is **confirmed to be what shadcn/ui v4 itself uses** — their `apps/v4/package.json` includes `"postinstall": "fumadocs-mdx"`, and their docs UI is built on shadcn primitives (not `fumadocs-ui`). Mirroring this means our site visually matches the shadcn ecosystem out of the box and the live-component-preview problem is already solved by an established pattern.

### Comparison (Q2 2026)

| Option | App Router | Tailwind + shadcn fit | Live React previews inline | Status | Verdict |
|---|---|---|---|---|---|
| **Fumadocs (`fumadocs-mdx` + `fumadocs-core/source`)** | First-class, RSC-native | Excellent — skip `fumadocs-ui`, use a shadcn shell (what shadcn v4 does) | Native — MDX renders arbitrary React via a `React.lazy` registry index | Actively maintained; used by shadcn v4 | **PRIMARY** |
| Nextra v4 | App-Router-only since Jan 2025 | Theme-driven; harder to match a custom shadcn shell | Yes via MDX | Mature | Fallback |
| Velite | Yes | Content-only (you build UI) | Yes (you bring renderer) | Lightweight, Zod-validated | Alternative |
| Content Collections | Yes | Yes | Yes | Maintained | Alternative |
| Contentlayer | — | — | — | Unmaintained since Aug 2023 | **Reject** |
| Raw `@next/mdx` | Yes | Yes | Yes | n/a | Reject — lose page tree, TOC, frontmatter validation |

### How the docs render live games + copy-able code

- Register `<ComponentPreview>` and `<ComponentSource>` MDX components that pull from a generated `registry/__index__.tsx` (the `React.lazy` pattern shadcn v4 uses) so the actual playable game renders inline.
- Code blocks: `rehype-pretty-code` + `shiki` (themes `github-dark` / `github-light-default`), with a `<CodeBlockCommand>` MDX override that auto-detects npm/yarn/pnpm/bun (via the `__npm__`/`__yarn__`/`__pnpm__`/`__bun__` prop convention) and renders a `<Tabs>` with a `<CopyButton>`.

**Fallback.** If Fumadocs causes friction (e.g. a Next.js 16 + Turbopack regression), switch to Velite + `@next/mdx`. MDX files at `content/docs/**.mdx` and the rest of the site stay unchanged.

---

## 5. Product requirements

### 5.1 Goals

1. Ship 10 small, polished, accessible browser games as React/TSX components installable via the shadcn CLI.
2. Each game is a **primitive**: one component, one import, no provider, no peer dep beyond what shadcn already implies.
3. Pixel-perfect theming through shadcn CSS tokens (`--background`, `--foreground`, `--primary`, `--border`…), even on `<canvas>`.
4. Hit and enforce the footprint budget in CI (per-game ≤ 6 KB gzip; library ≤ 60 KB gzip).
5. Be a reference for *how to build a small, clean shadcn registry* in 2026.

### 5.2 Non-goals

- No multiplayer, no leaderboards backend, no auth, no gameplay analytics.
- No PWA / native packaging.
- No i18n beyond default English (visible text kept minimal).
- No Vue/Svelte/vanilla packaging in v1 (React/TSX only). **However**, v1 must keep `engine.ts` pure and factor `render`/`controls`/`theme`/`loop` into plain framework-agnostic modules so a vanilla host can be added in v2 without a rewrite (see §6.7). Build the guardrails; do not build a vanilla host.
- No monetization, paid tier, or email capture.

### 5.3 Target users

1. **Indie hackers / solo devs** who want a delightful 404 in 60 seconds.
2. **Design engineers** who want a landing-page easter egg that matches their theme automatically.
3. **OSS maintainers** building docs sites who want a fun empty state.
4. **Frontend learners** studying clean small-component patterns.

### 5.4 The "game-as-primitive" shared component contract

Every game implements one shared TS interface (`packages/game-core/src/types.ts`):

```ts
export type GameState = "idle" | "playing" | "paused" | "gameover";

export interface GameProps {
  className?: string;                  // Tailwind className on the outer wrapper
  width?: number;                      // Logical CSS px (canvas games scale via DPR)
  height?: number;
  paused?: boolean;                    // External pause
  autoFocus?: boolean;                 // Auto-focus on mount so keyboard works
  persistHighScore?: boolean | string; // localStorage key (or default per-game)
  controls?: Partial<ControlMap>;      // Override keyboard mapping
  theme?: Partial<GameTheme>;          // Optional override; defaults read shadcn tokens
  onScoreChange?: (score: number) => void;
  onGameOver?: (r: { score: number; won: boolean }) => void;
  onStart?: () => void;
  onStateChange?: (state: GameState) => void;
}

export interface ControlMap {
  up: string[]; down: string[]; left: string[]; right: string[];
  action: string[]; pause: string[]; restart: string[];
}

export interface GameTheme { // resolved from shadcn CSS vars at runtime
  background: string; foreground: string;
  primary: string; primaryForeground: string;
  secondary: string; secondaryForeground: string;
  accent: string; accentForeground: string;
  muted: string; mutedForeground: string;
  border: string; ring: string; destructive: string;
}
```

A user passes `className="w-full aspect-square rounded-lg border"` and the game inherits theme, dark mode, and shape from the surrounding shadcn context. **No game accepts a `style` prop for colors** — everything routes through shadcn tokens for consistency.

### 5.4a UI simplicity & theme-token mapping (binding)

**Keep chrome minimal and shadcn-native.** Every game's surrounding UI (start/restart, score, game-over overlay, controls) is built only from existing shadcn primitives — `Button`, `Card`, `Badge`, `Separator`, `Tabs` — with default variants and no custom CSS beyond Tailwind utility classes. No bespoke buttons, no gradients, no shadows beyond `shadow-sm`, no extra color values invented in a game. If a piece of chrome can't be expressed with a stock shadcn primitive + Tailwind utilities, it's too complex for v1. The game *playfield* is the only visually distinctive surface; everything around it should look like the rest of a shadcn app.

Concretely, per game:
- Buttons use `<Button variant="default">` (primary action) and `<Button variant="secondary">` / `variant="ghost"` (secondary actions). No restyling.
- Score uses `<Badge variant="secondary">`; the game-over overlay is a centered `<Card>` over a `bg-background/80` backdrop.
- The wrapper is a single `<Card>` (or a bare `div` with `rounded-lg border`) — nothing more.

**The theme's primary / secondary / accent must drive the game art, not just the chrome.** This is a hard requirement: a user who changes `--primary` (or switches a shadcn theme/preset) must see the game's *playfield* recolor accordingly. DOM games get this for free via Tailwind classes (`bg-primary`, `text-primary-foreground`, `bg-secondary`, `bg-accent`, `border-border`, `ring-ring`). Canvas games must read the tokens at runtime and use them for gameplay elements. Mandatory mapping every game follows so theming is consistent across the library:

| Game element | shadcn token | Tailwind class (DOM) / CSS var (canvas) |
|---|---|---|
| Playfield background | `--background` | `bg-background` / `--background` |
| Board lines, walls, grid, inactive cells | `--border` / `--muted` | `border-border`, `bg-muted` / `--border`, `--muted` |
| **Player / hero / primary mover** (snake body, paddle, dino, active tile, current player mark) | **`--primary`** | `bg-primary text-primary-foreground` / `--primary` |
| **Secondary actor / opponent / alt state** (CPU paddle, opponent mark, flagged cell, matched pair) | **`--secondary`** | `bg-secondary text-secondary-foreground` / `--secondary` |
| **Highlights / targets / rewards** (food, power-ups, hovered cell, mole, revealed-safe, score pulses) | **`--accent`** | `bg-accent text-accent-foreground` / `--accent` |
| Danger / loss / mines / collision flash | `--destructive` | `bg-destructive` / `--destructive` |
| Score text, secondary labels | `--muted-foreground` | `text-muted-foreground` / `--muted-foreground` |
| Focus ring | `--ring` | `ring-ring` / `--ring` |

Per-game application of primary/secondary/accent:

| Game | primary | secondary | accent |
|---|---|---|---|
| Snake | snake body | (head shade) | food pellet |
| Tic-Tac-Toe | X marks + win line | O marks | hovered/last-move cell |
| 2048 | high-value tiles ramp | low-value tiles | newly spawned/merged tile flash |
| Memory Match | face-down card | flipped card | matched-pair confirm |
| Minesweeper | number text / revealed | flag marker | hovered cell highlight |
| Breakout | paddle + ball | brick rows (alt) | power brick / score pop |
| Flappy | bird | pipes | passed-pipe / score blip |
| Dino Runner | dino | obstacles | ground line / point ticks |
| Pong | player paddle + ball | CPU paddle | center line / point flash |
| Whack-a-Mole | mole | hole rim | successful-hit burst |

**Canvas token-resolution rule.** Canvas games resolve the full `GameTheme` once at mount via `getComputedStyle(el).getPropertyValue("--primary")` etc., and re-resolve on theme change by observing the `class` attribute of `document.documentElement` with a `MutationObserver` (covers shadcn's `.dark` toggle and theme-preset swaps) — no remount needed. Because Tailwind v4 / shadcn emit these tokens in `oklch(...)`, resolved values are assigned directly to `ctx.fillStyle` / `ctx.strokeStyle` (canvas accepts `oklch()`), so no color-space conversion is needed. A shared `useGameTheme(ref)` hook in `packages/game-core` implements this once and every canvas game consumes it.

### 5.5 Per-game functional requirements

| Game | Surface | Input | Win/Lose | Score | Persisted |
|---|---|---|---|---|---|
| Snake | `<canvas>` 20×20 | arrows/WASD + swipe | wall/self collision | apples eaten | high score |
| Tic-Tac-Toe | DOM grid | click/tap, keyboard | 3-in-a-row / draw | wins–losses | session |
| 2048 | DOM grid 4×4 | arrows/WASD + swipe | reach 2048 / no moves | tile sum | high score |
| Memory Match | DOM grid 4×4 | click/tap | all pairs matched | moves (lower better) | best moves |
| Minesweeper | DOM grid 9×9 / 16×16 | left/right click, long-press | reveal safe / hit mine | time elapsed | best time |
| Breakout | `<canvas>` | ←/→ + pointer drag | clear bricks / lose lives | bricks broken | high score |
| Flappy | `<canvas>` | space/tap | hit pipe/ground | pipes passed | high score |
| Dino Runner | `<canvas>` | space/up/tap | hit obstacle | distance | high score |
| Pong | `<canvas>` | W/S vs ↑/↓ or 1P-vs-CPU | first to N | best of N | session |
| Whack-a-Mole | DOM grid | pointer | timer expires | hits in 30s | high score |

### 5.6 Accessibility & mobile requirements (every game)

- Keyboard-operable; visible focus ring on the wrapper (`ring-2 ring-ring`).
- Touch-operable: tap, swipe, or long-press as appropriate.
- `role="application"` + `aria-label`; `aria-live="polite"` region announces score milestones and game over.
- Respects `prefers-reduced-motion` (drop to a still frame / input-driven transitions only).
- High-contrast safe (every interactive element uses a shadcn token already ≥ 4.5:1).
- Pause when offscreen via `IntersectionObserver`; pause on `visibilitychange` → hidden.

### 5.7 Footprint / perf budget (enforced in CI)

| Metric | Budget | Enforcement |
|---|---|---|
| Per-game gzipped size | ≤ 6 KB | `size-limit` per game; fails CI |
| Library aggregate gzipped | ≤ 60 KB | `size-limit` total |
| Runtime deps beyond `react`/`react-dom`/`clsx`/`tailwind-merge` | 0 | dependency audit + `registry-item.json.dependencies` check |
| External fetched assets (img/audio/font) | 0 | CI grep for `fetch(`, `new Image()`, `new Audio(`, `@font-face`, `url(` |
| First-input latency (synthetic) | ≤ 100 ms | optional Playwright smoke |

### 5.8 Public install / usage contract

```tsx
// app/not-found.tsx
import { Snake } from "@/components/games/snake";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-semibold">404</h1>
        <p className="text-muted-foreground">Play a round while you decide where to go.</p>
        <Snake className="mx-auto rounded-lg border" width={320} />
      </div>
    </main>
  );
}
```

No provider, no peer-dep install, no init step.

---

## 6. Technical architecture

### 6.1 Monorepo layout

```
gamekitui/
├── apps/
│   └── www/                              # Next.js 16 marketing+docs site; also serves /r/*.json
│       ├── app/
│       │   ├── layout.tsx                # root: ThemeProvider, fonts, tooltip providers
│       │   ├── globals.css
│       │   ├── (app)/                    # route group with chrome (header, footer, sidebar)
│       │   │   ├── layout.tsx            # SiteHeader + SiteFooter
│       │   │   ├── (root)/page.tsx       # marketing landing
│       │   │   ├── games/page.tsx        # gallery (all 10 with live previews)
│       │   │   ├── docs/[[...slug]]/page.tsx
│       │   │   └── llm/[[...slug]]/route.ts   # /docs/<x>.md proxy for LLMs
│       │   └── (view)/view/[name]/page.tsx    # chromeless iframe target for ComponentPreview
│       ├── components/                   # SiteHeader, DocsSidebar, ComponentPreview, CodeBlockCommand, CopyButton…
│       ├── content/docs/                 # MDX docs (index.mdx, games/snake.mdx, …)
│       ├── lib/source.ts                 # fumadocs-core loader → page tree
│       ├── public/r/                     # built registry JSON (gitignored)
│       ├── source.config.ts              # fumadocs-mdx config + rehype-pretty-code
│       ├── mdx-components.tsx
│       ├── registry.json                 # source-of-truth catalog
│       ├── components.json               # shadcn config
│       ├── next.config.mjs
│       └── package.json
├── packages/
│   ├── registry/                         # 10 games + their registry-item JSONs (source)
│   │   ├── src/
│   │   │   ├── snake/
│   │   │   │   ├── snake.tsx             # React wrapper (shipped to users)
│   │   │   │   ├── engine.ts             # pure-logic core (unit-tested)
│   │   │   │   ├── snake.test.tsx        # vitest
│   │   │   │   └── engine.test.ts        # bun test
│   │   │   ├── tic-tac-toe/ …
│   │   │   └── … (all 10)
│   │   └── items/                        # per-game registry-item.json fragments (merged into root)
│   ├── ui/                               # shared shadcn primitives the site itself uses (@workspace/ui)
│   │   ├── src/components/ …
│   │   └── src/styles/globals.css        # Tailwind v4 source-of-truth CSS
│   ├── game-core/                        # exported TYPES ONLY (GameProps, ControlMap, GameTheme), zero runtime
│   │   └── src/types.ts
│   ├── tsconfig/                         # base.json next.json lib.json
│   └── biome-config/                     # shared biome.jsonc preset
├── .changeset/
├── .github/workflows/ci.yml release.yml
├── bunfig.toml
├── lefthook.yml
├── turbo.json
├── package.json                          # workspaces: ["apps/*", "packages/*"]
└── README.md
```

This split follows the shadcn `--monorepo` template (`apps/web` + `packages/ui`) and the 2025-2026 Bun + Turbo + shadcn convention. We add `packages/registry` (the game *sources* — kept separate from `packages/ui` because they are not a shadcn-installed dep of the site itself).

**Monorepo aliasing** (matches shadcn's documented package-imports pattern): each workspace declares local `#components/*`, `#lib/*`, `#hooks/*` in its `package.json#imports`, and the shared package is consumed as `@workspace/ui/components` / `@workspace/ui/lib/utils`. `apps/www/components.json` aliases:

```jsonc
{
  "aliases": {
    "components": "#components",
    "ui": "@workspace/ui/components",
    "lib": "#lib",
    "hooks": "#hooks",
    "utils": "@workspace/ui/lib/utils"
  }
}
```

### 6.2 Engine / wrapper pattern

For every canvas game, split logic from React. `engine.ts` exports a `createSnakeEngine(opts)` factory returning `{ step(input?), reset(), state }` — fully unit-testable with no DOM. `snake.tsx` owns the `<canvas>` ref, the rAF loop, keyboard/touch wiring, DPR scaling, theme reading from CSS vars, and `IntersectionObserver` pause. **Module scope touches no `window`/`document`.** Everything DOM-y lives inside `useEffect`, gated by `"use client"`.

Reference wrapper (shipped verbatim as `snake.tsx`, abbreviated):

```tsx
"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { createSnakeEngine } from "./engine";

export interface SnakeProps { /* GameProps shape */ }

export function Snake(props: SnakeProps) {
  const { className, width = 320, height = 320, paused, autoFocus = true,
          persistHighScore, onScoreChange, onGameOver, onStart } = props;
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const [offscreen, setOffscreen] = React.useState(false);
  const reduce = usePrefersReducedMotion();
  const theme = useGameTheme(wrapperRef); // full GameTheme, re-resolves on .dark / preset change

  React.useEffect(() => {                       // pause when offscreen
    if (!wrapperRef.current) return;
    const io = new IntersectionObserver(([e]) => setOffscreen(!e.isIntersecting));
    io.observe(wrapperRef.current);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {                        // main rAF loop
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx = cvs.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cvs.width = width * dpr; cvs.height = height * dpr;
    cvs.style.width = `${width}px`; cvs.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    const engine = createSnakeEngine({ cols: 20, rows: 20, seed: Date.now() });
    onStart?.();
    let raf = 0, last = performance.now();
    const interval = reduce ? 200 : 110;
    const tick = (t: number) => {
      if (!paused && !offscreen && t - last >= interval) {
        engine.step();
        if (engine.state.gameOver) {
          onGameOver?.({ score: engine.state.score, won: false });
          engine.reset(); onStart?.();
        }
        onScoreChange?.(engine.state.score);
        last = t;
      }
      // draw uses theme.primary (snake), theme.accent (food), theme.border (grid), theme.background (bg)
      draw(ctx, engine.state, { width, height, theme });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onKey = (e: KeyboardEvent) => { /* map keys → engine.input(...) */ };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
  }, [width, height, paused, offscreen, reduce, persistHighScore, onScoreChange, onGameOver, onStart]);

  return (
    <div ref={wrapperRef} tabIndex={autoFocus ? 0 : -1} role="application" aria-label="Snake game"
         className={cn("relative inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
      <canvas ref={canvasRef} />
    </div>
  );
}

function usePrefersReducedMotion() {
  const [r, setR] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(mq.matches);
    const h = (e: MediaQueryListEvent) => setR(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return r;
}

// packages/game-core — shared by every canvas game.
// Resolves the full shadcn GameTheme from CSS vars and re-resolves when the
// theme changes (e.g. shadcn's `.dark` class toggle or a theme-preset swap).
const TOKENS = [
  "background","foreground","primary","primary-foreground","secondary",
  "secondary-foreground","accent","accent-foreground","muted","muted-foreground",
  "border","ring","destructive",
] as const;

function useGameTheme(ref: React.RefObject<HTMLElement | null>): GameTheme {
  const read = React.useCallback(() => {
    const el = ref.current;
    const cs = getComputedStyle(el ?? document.documentElement);
    const get = (t: string) => cs.getPropertyValue(`--${t}`).trim(); // oklch(...) string; canvas accepts it directly
    return Object.fromEntries(TOKENS.map((t) => [camel(t), get(t)])) as unknown as GameTheme;
  }, [ref]);

  const [theme, setTheme] = React.useState<GameTheme>(read);
  React.useEffect(() => {
    setTheme(read());
    const mo = new MutationObserver(() => setTheme(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
    return () => mo.disconnect();
  }, [read]);
  return theme;
}

const camel = (s: string) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
```

Same pattern for Breakout/Flappy/Dino/Pong (canvas) — they all consume `useGameTheme`. DOM-only games (Tic-Tac-Toe/2048/Memory/Minesweeper/Whack-a-Mole) skip the hook and use Tailwind token classes (`bg-primary`, `bg-secondary`, `bg-accent`, …) directly, which recolor automatically.

### 6.3 shadcn registry config

`apps/www/registry.json` (root catalog):

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "gamekitui",
  "homepage": "https://gamekitui.com",
  "items": [
    {
      "name": "snake",
      "type": "registry:component",
      "title": "Snake",
      "description": "A tiny, themeable Snake game. <=6KB gzipped, zero external assets.",
      "registryDependencies": [],
      "dependencies": [],
      "files": [
        { "path": "packages/registry/src/snake/snake.tsx", "type": "registry:component", "target": "@components/games/snake.tsx" },
        { "path": "packages/registry/src/snake/engine.ts", "type": "registry:lib", "target": "@lib/games/snake-engine.ts" }
      ],
      "categories": ["games"],
      "meta": { "iframeHeight": "420px" }
    }
    // … nine more …
  ]
}
```

Key points (per the official `registry-item.json` spec):

- `type: "registry:component"` for a single component + lib helper.
- `dependencies: []` and `registryDependencies: []` — zero npm deps and no required shadcn primitive. The only assumed helper is the user's `cn`, imported via the standard shadcn path; the CLI rewrites it per the user's `components.json#aliases.utils`.
- `target` uses the portable `@components/...` / `@lib/...` aliases so installs land correctly regardless of `@/`, `#`, or workspace imports.
- `meta.iframeHeight` sizes the inline preview iframe (same convention as shadcn v4).

`apps/www/package.json` scripts (note: shadcn v4 runs its registry build through Bun even on a pnpm repo — `bun run ./scripts/build-registry.mts` — so the all-Bun choice is well within proven territory):

```jsonc
{
  "scripts": {
    "registry:build": "shadcn build",
    "dev":   "bun run registry:build && next dev --turbopack -p 3000",
    "build": "bun run registry:build && next build",
    "start": "next start -p 3000"
  }
}
```

Vercel deploys `apps/www`; `public/r/*.json` is statically hosted at `https://gamekitui.com/r/snake.json`.

### 6.4 Marketing + docs site structure (mirrors shadcn `apps/v4`)

```
app/
  layout.tsx                       — root providers (theme, tooltip)
  globals.css                      — Tailwind v4 + shadcn tokens
  (app)/
    layout.tsx                     — SiteHeader + container + SiteFooter
    (root)/page.tsx                — landing
    games/page.tsx                 — gallery with live <ComponentPreview>
    docs/[[...slug]]/page.tsx      — Fumadocs MDX renderer (custom shadcn shell)
    llm/[[...slug]]/route.ts       — /docs/<x>.md for LLM consumers
  (view)/view/[name]/page.tsx      — chromeless iframe target
```

`source.config.ts`:

```ts
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import rehypePrettyCode from "rehype-pretty-code";
import { transformers } from "@/lib/highlight-code";

export default defineConfig({
  mdxOptions: {
    rehypePlugins: (plugins) => {
      plugins.shift();
      plugins.push([rehypePrettyCode, {
        theme: { dark: "github-dark", light: "github-light-default" },
        transformers,
      }]);
      return plugins;
    },
  },
});

export const docs = defineDocs({ dir: "content/docs" });
```

`lib/source.ts`:

```ts
import { docs } from "@/.source";
import { loader } from "fumadocs-core/source";
export const source = loader({ baseUrl: "/docs", source: docs.toFumadocsSource() });
```

`app/(app)/docs/[[...slug]]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { source } from "@/lib/source";
import { mdxComponents } from "@/mdx-components";
import { DocsSidebar } from "@/components/docs-sidebar";
import { DocsTableOfContents } from "@/components/docs-toc";

export const dynamic = "force-static";
export const dynamicParams = false;
export async function generateStaticParams() { return source.generateParams(); }

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = source.getPage(slug); if (!page) notFound();
  const MDX = page.data.body;
  return (
    <div className="container grid grid-cols-[16rem_1fr_14rem] gap-8 py-8">
      <DocsSidebar tree={source.pageTree} />
      <main className="prose prose-neutral max-w-none dark:prose-invert">
        <MDX components={mdxComponents} />
      </main>
      <DocsTableOfContents toc={page.data.toc} />
    </div>
  );
}
```

`mdx-components.tsx` registers (modeled on `apps/v4/mdx-components.tsx`): `ComponentPreview`, `ComponentSource`, `CodeBlockCommand`, `CopyButton`, `Callout`, `Steps`/`Step`, `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, plus HTML-element overrides for `h1`–`h6`, `a`, `p`, `pre`, `code`, `table`, etc.

### 6.5 Live preview pipeline

A build script `scripts/build-registry-index.ts` walks `packages/registry/src/*/` and emits `apps/www/registry/__index__.tsx`:

```tsx
// AUTO-GENERATED. DO NOT EDIT.
import * as React from "react";
export const Index: Record<string, { component: React.LazyExoticComponent<React.ComponentType<any>>; meta?: { iframeHeight?: string } }> = {
  snake:         { component: React.lazy(() => import("@/registry/games/snake/snake")), meta: { iframeHeight: "420px" } },
  "tic-tac-toe": { component: React.lazy(() => import("@/registry/games/tic-tac-toe/tic-tac-toe")) },
  // … rest …
};
```

`<ComponentPreview name="snake">` reads `Index[name].component`. By default it inlines the lazy component inside a `<Tabs>` (Preview / Code) with a `<CopyButton>`. With an `iframe` prop, it renders `<iframe src={`/view/${name}`}>` sized from `meta.iframeHeight`.

### 6.6 Build pipeline & hosting

```
bun install               # writes bun.lock; resolves Bun workspaces
bun run turbo build       # Turbo orchestrates:
                          #   packages/ui#build  → bundled sources
                          #   packages/registry#lint, #typecheck, #test, #size
                          #   apps/www#build (depends on registry:build, then next build)
```

`apps/www#build` runs `shadcn build` first, emitting `public/r/*.json`. Vercel deploys `apps/www`. Domain `gamekitui.com` → primary; preview deploys on PRs.

### 6.7 Future: vanilla JS support (v2 — not shipped in v1)

Vanilla JS games are **not in v1**, but the v1 architecture is deliberately structured so a vanilla build is a thin, additive layer later — no rewrite. The insight: the engine/wrapper split (§6.2) already makes the *hard part* (game logic) framework-agnostic. A vanilla version is just a **second host** over the same core. The React host and a future vanilla host are interchangeable shells around shared, pure modules.

**Three v1 guardrails that keep the door open.** Build these in v1 even though only the React host ships — they cost almost nothing now and are expensive to retrofit:

1. **`engine.ts` stays 100% pure.** No React, no DOM, no `window`/`document`, no `requestAnimationFrame` inside the engine. Just `createEngine(opts) → { state, step(input?), reset() }` over a seeded RNG. This is already required for testability, so v1 gets it for free — it's the load-bearing rule for vanilla later.
2. **Render, input, theme, and the loop are plain functions, not React internals.** Factor these out of the `useEffect` into framework-agnostic modules the React host merely *calls*:
   - `render.ts` → `draw(ctx, state, theme)` (canvas) — plain TS.
   - `controls.ts` → maps a keyboard/pointer event to an engine input — plain TS.
   - `resolveTheme(el): GameTheme` — the plain function that `useGameTheme` wraps (§5.4a). Vanilla calls `resolveTheme` directly.
   - `createLoop(tick, { interval }): { start, stop }` — a tiny rAF helper the React effect uses; vanilla reuses it verbatim.
3. **Keep per-game files cohesive so a host swap is local.** Adding a vanilla host touches exactly one new file per game; nothing in `apps/www` or the React host changes.

**Resulting per-game folder (v1 reality → v2 addition):**

```
packages/registry/src/snake/
  engine.ts          # pure logic — shared by all hosts            (v1)
  render.ts          # draw(ctx, state, theme) — plain TS          (v1, refactored out of the effect)
  controls.ts        # input → engine input — plain TS             (v1)
  theme.ts           # resolveTheme(el) + token list — plain TS    (v1)
  loop.ts            # createLoop() — plain TS (or shared in game-core) (v1)
  snake.tsx          # React host — shipped via shadcn registry    (v1)
  snake.vanilla.ts   # vanilla host: mount(el, opts) => { destroy } (v2, future)
```

The vanilla host is small and reuses everything:

```ts
// snake.vanilla.ts  (v2)
import { createSnakeEngine } from "./engine";
import { draw } from "./render";
import { mapKey } from "./controls";
import { resolveTheme } from "./theme";
import { createLoop } from "./loop";

export interface MountOptions { width?: number; height?: number; autoFocus?: boolean;
  onScoreChange?: (n: number) => void; onGameOver?: (r: { score: number; won: boolean }) => void; }

export function mount(el: HTMLElement, opts: MountOptions = {}) {
  const { width = 320, height = 320 } = opts;
  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr; canvas.height = height * dpr;
  canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  el.appendChild(canvas);
  const ctx = canvas.getContext("2d")!; ctx.scale(dpr, dpr);

  const engine = createSnakeEngine({ cols: 20, rows: 20, seed: Date.now() });
  let theme = resolveTheme(el);
  const mo = new MutationObserver(() => (theme = resolveTheme(el)));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });

  const onKey = (e: KeyboardEvent) => { const i = mapKey(e); if (i) engine.input(i); };
  window.addEventListener("keydown", onKey);

  const loop = createLoop((/* dt */) => {
    engine.step();
    if (engine.state.gameOver) { opts.onGameOver?.({ score: engine.state.score, won: false }); engine.reset(); }
    opts.onScoreChange?.(engine.state.score);
    draw(ctx, engine.state, theme);
  }, { interval: 110 });
  loop.start();

  return { destroy() { loop.stop(); mo.disconnect(); window.removeEventListener("keydown", onKey); el.removeChild(canvas); } };
}
```

**Honest caveat — the two halves of the lineup are not equal.** The **5 canvas games** (Snake, Breakout, Flappy, Dino, Pong) port to vanilla almost for free, because their rendering is already a plain `draw(ctx, …)`. The **5 DOM games** (Tic-Tac-Toe, 2048, Memory, Minesweeper, Whack-a-Mole) render via JSX, so a vanilla version needs a **separate DOM-building renderer** (`renderDom(el, state, theme)`) — that's net-new code, not a free port. Plan vanilla v2 to start with the canvas five; treat the DOM five as a second, larger effort.

**Distribution (decide the namespace now, build later).** Vanilla builds are *not* React/TSX, so the shadcn CLI is the wrong channel for them. Plan a **second distribution path** in parallel to the registry:
- Publish a real npm package — `@gamekit/vanilla` (or per-game `@gamekit/snake-vanilla`) — exposing `mount(element, options) → { destroy() }`.
- Ship an ESM/CDN build for a `<script type="module">` drop-in (`import { mount } from "https://cdn.gamekitui.com/snake.js"`).
- **The real long-term win:** graduate the shared cores into a published `@gamekit/engines` package that *both* the React registry items and the vanilla package import. This removes duplication entirely — but it adds versioning surface (the registry items would then carry an npm dependency, breaking the "zero deps" rule unless the engine is still inlined for the React path). That trade-off is a v2 decision, not a v1 one; until then, keep the engines inlined per-game and treat any shared extraction as opt-in.

**v1 action items (so v2 isn't blocked):** refactor `render`/`controls`/`theme`/`loop` out of the React effect into plain modules (guardrail 2); keep `engine.ts` pure (guardrail 1, already required); reserve the `@gamekit/vanilla` and `@gamekit/engines` npm names; do **not** build any vanilla host, ESM bundle, or extra docs in v1.

---

## 7. Tooling & dev setup

### 7.1 Root `package.json`

```json
{
  "name": "gamekitui",
  "private": true,
  "packageManager": "bun@1.3.0",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "size": "turbo run size",
    "registry:build": "turbo run registry:build --filter=www",
    "changeset": "changeset",
    "version-packages": "changeset version && bun install",
    "release": "turbo run build --filter=...^registry... && changeset publish"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "typescript": "^5.6.0",
    "@biomejs/biome": "^2.0.0",
    "@changesets/cli": "^2.27.0",
    "lefthook": "^1.7.0",
    "size-limit": "^11.0.0",
    "@size-limit/preset-small-lib": "^11.0.0"
  }
}
```

### 7.2 `turbo.json`

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "ui": "tui",
  "tasks": {
    "build":          { "dependsOn": ["^build", "registry:build"], "outputs": [".next/**", "!.next/cache/**", "dist/**", "public/r/**"] },
    "dev":            { "cache": false, "persistent": true },
    "lint":           { "outputs": [] },
    "typecheck":      { "dependsOn": ["^build"], "outputs": [] },
    "test":           { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "size":           { "dependsOn": ["build"], "outputs": [] },
    "registry:build": { "outputs": ["public/r/**"] }
  }
}
```

### 7.3 `bunfig.toml`

```toml
[install]
registry = "https://registry.npmjs.org/"
```

### 7.4 Shared `packages/tsconfig/base.json`

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "incremental": true
  }
}
```

`packages/tsconfig/next.json` extends base and adds `{ "plugins": [{ "name": "next" }] }`. `packages/tsconfig/lib.json` adds `"declaration": true, "composite": true`.

### 7.5 `packages/biome-config/biome.jsonc`

```jsonc
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "ignoreUnknown": true },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "double", "semicolons": "always", "trailingCommas": "all" } },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": { "noUnusedVariables": "error", "useExhaustiveDependencies": "warn" },
      "style":       { "useImportType": "error", "noNonNullAssertion": "warn" },
      "suspicious":  { "noConsole": "warn" }
    }
  },
  "assist": { "actions": { "source": { "organizeImports": "on" } } }
}
```

Each package's `biome.jsonc` is `{ "root": false, "extends": "@gamekitui/biome-config/biome.jsonc" }` (Biome v2 nested-config support).

### 7.6 Testing — Vitest + RTL for components, `bun test` for engines

**Decision:** Vitest + React Testing Library for everything touching DOM/React (`*.test.tsx`). `bun test` only for pure-logic `engine.ts` files (`*.engine.test.ts`). Rationale: `bun test` is fastest but its DOM-env integration still has edge cases React relies on, and the RTL ecosystem is Vitest-first. For deterministic engine logic, `bun test` is a clean speed win with zero compatibility risk.

`apps/www/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: false,
    coverage: { provider: "v8", reporter: ["text", "html"] },
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/*.engine.test.ts", "node_modules/**"],
  },
  resolve: { alias: { "@": resolve(__dirname, "./") } },
});
```

`packages/registry/package.json`:

```jsonc
{
  "scripts": {
    "test":         "vitest run",
    "test:engine":  "bun test \"**/*.engine.test.ts\"",
    "lint":         "biome check .",
    "typecheck":    "tsc --noEmit",
    "size":         "size-limit"
  }
}
```

### 7.7 Git hooks — Lefthook (`lefthook.yml`)

```yaml
pre-commit:
  parallel: true
  commands:
    biome:
      glob: "*.{ts,tsx,js,jsx,json,jsonc,md,mdx}"
      run: bunx biome check --write --no-errors-on-unmatched {staged_files}
      stage_fixed: true
    typecheck:
      glob: "*.{ts,tsx}"
      run: bun run typecheck

pre-push:
  parallel: true
  commands:
    test: { run: bun run test }
    size: { run: bun run size }
```

Lefthook is one YAML, parallel by default, no Node startup overhead, and no `prepare`-script gotcha. Install once with `bunx lefthook install`.

### 7.8 Changesets — with the Bun workaround

`bunx changeset init`. `.changeset/config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["www"]
}
```

**Bun gotcha:** `changeset publish` does not rewrite `workspace:*` references with a Bun lockfile, so published packages could contain unresolvable `"workspace:*"`. Workaround: run `bun update` (or `bun install`) immediately after `changeset version` so the lockfile resolves new versions, then publish per package with `bun publish` (which rewrites `workspace:*` correctly). Our `version-packages` script already does `changeset version && bun install`. For v1 only `packages/game-core` (types) is published to npm — the 10 games ship via the shadcn registry, not npm — so this barely bites in practice.

### 7.9 GitHub Actions

`.github/workflows/ci.yml`:

```yaml
name: CI
on: { push: { branches: [main] }, pull_request: {} }
concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: 1.3.0 }
      - uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lock') }}
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run typecheck
      - run: bun run test
      - run: bun run build
      - run: bun run size            # fails if any game >6KB gz or library >60KB gz
      - name: Assert no external assets
        run: |
          ! grep -RInE "fetch\(|new Image\(|new Audio\(|@font-face|url\(" packages/registry/src \
            | grep -v "url\(--" || (echo "External asset detected" && exit 1)
```

`.github/workflows/release.yml`:

```yaml
name: Release
on: { push: { branches: [main] } }
jobs:
  release:
    runs-on: ubuntu-latest
    permissions: { contents: write, pull-requests: write, id-token: write }
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: 1.3.0 }
      - run: bun install --frozen-lockfile
      - run: bun run build
      - uses: changesets/action@v1
        with:
          version: bun run version-packages
          publish: bun run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

The Next.js site deploys via Vercel's native integration (no GitHub Actions step required).

### 7.10 Dev bootstrap script

`scripts/bootstrap.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
command -v bun >/dev/null || { echo "Installing Bun…"; curl -fsSL https://bun.com/install | bash; export PATH="$HOME/.bun/bin:$PATH"; }
bun --version
bun install --frozen-lockfile
bunx lefthook install
bun run typecheck
bun run lint
bun run test --filter=registry
echo "gamekitui dev environment ready. Try: bun run dev"
```

Documented in CONTRIBUTING.md as the one-liner: `bash scripts/bootstrap.sh`.

---

## 8. Testing strategy

| Layer | Tool | Tests | Why separated |
|---|---|---|---|
| **Engine** (`*.engine.test.ts`) | `bun test` | Deterministic transitions `step({input}) → state`; seeded RNG; full game played in a loop. Catches off-by-one in collision, wraparound, scoring. | Pure functions, no DOM; sub-100 ms startup; hundreds of simulations in ms. |
| **Component smoke** (`*.test.tsx`) | Vitest + RTL + jsdom | Mounts, simulates keydown, asserts `onScoreChange` fires; asserts cleanup on unmount; asserts `paused` pauses; asserts focus ring renders. | jsdom + RTL is the mature React path; we don't validate canvas pixels. |
| **Registry contract** (`*.contract.test.ts`) | Vitest | Reads built `public/r/*.json`; asserts schema-valid, `dependencies: []`, `registryDependencies: []`, no `fetch(`/`new Image(`, `target` uses portable aliases. | Single source of truth for what ships. |
| **Size** (CI step) | `size-limit` | Each game ≤ 6 KB gz; library ≤ 60 KB gz. | Hard footprint guarantee. |
| **A11y smoke** (Phase 4+) | `axe-core` via Vitest | DOM games pass automated rule set. | Catches obvious aria/role regressions. |

**Intentionally NOT auto-tested:** pixel-perfect canvas output, 60 fps under load, real touch-gesture timing, visual regression of the marketing site. These are validated manually per release.

---

## 9. Build plan / milestones

Hand to the implementer as ordered tasks. Each phase has explicit **acceptance criteria** — do not advance until met.

### Phase 0 — Scaffold

**Tasks**
1. `mkdir gamekitui && cd gamekitui && bun init -y`.
2. Configure root `package.json` (§7.1); create `apps/`, `packages/`, `.changeset/`, `.github/workflows/`, `scripts/`.
3. Add `turbo.json`, `bunfig.toml`, `lefthook.yml`, root `biome.jsonc`, `tsconfig.base.json`, `.gitignore`, `LICENSE` (MIT), `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `CONTRIBUTING.md` skeleton, `README.md` skeleton.
4. Create `packages/tsconfig`, `packages/biome-config`, `packages/game-core` (types-only), `packages/ui` (empty), `packages/registry` (empty).
5. `bunx --bun shadcn@latest init --monorepo` at the root (Next.js template → `apps/web` + `packages/ui`). Rename `apps/web` → `apps/www`.
6. `bunx lefthook install`.
7. Commit.

**Acceptance criteria**
- `bun install` succeeds; `bun.lock` exists at root.
- `bun run typecheck`, `bun run lint`, `bun run build` all green on the empty scaffold.
- `bun run dev` starts the Next.js app at http://localhost:3000.
- `git commit` triggers Lefthook, which runs Biome on staged files.

### Phase 1 — Registry plumbing + docs engine + Snake end-to-end + first deploy

**Tasks**
1. **Fumadocs.** Add `fumadocs-mdx`, `fumadocs-core`, `rehype-pretty-code`, `shiki` to `apps/www`. Create `source.config.ts`, `lib/source.ts`, `mdx-components.tsx` (with `ComponentPreview`, `ComponentSource`, `CodeBlockCommand`, `CopyButton`, `Callout`, `Steps`). Wire `app/(app)/docs/[[...slug]]/page.tsx`. Create `content/docs/index.mdx`, `installation.mdx`, `games/snake.mdx`. Add `"postinstall": "fumadocs-mdx"` to `apps/www/package.json` (matches shadcn v4).
2. **Site shell.** `app/(app)/layout.tsx` with `<SiteHeader>` (logo, search, GitHub, theme toggle) + `<SiteFooter>`. Marketing `app/(app)/(root)/page.tsx`.
3. **shadcn registry.** Create `apps/www/registry.json` with one item (`snake`). Add `registry:build`. Verify it emits `apps/www/public/r/snake.json`.
4. **Snake game.** In `packages/registry/src/snake/`: `engine.ts`, `snake.tsx` (§6.2), `engine.test.ts`, `snake.test.tsx`. Hit ≤ 6 KB gz.
5. **Live preview index.** `scripts/build-registry-index.ts` → `apps/www/registry/__index__.tsx` with `React.lazy()` entries; hook into `registry:build`.
6. **Iframe view route.** `app/(view)/view/[name]/page.tsx` renders the lazy component bare.
7. **`<ComponentPreview name="snake">`** working inline in `content/docs/games/snake.mdx`.
8. **Deploy.** Create Vercel project pointed at `apps/www`; set domain `gamekitui.com`; deploy.

**Acceptance criteria**
- `https://gamekitui.com/r/snake.json` returns a valid registry item.
- `npx shadcn@latest add https://gamekitui.com/r/snake.json` succeeds in a fresh Next.js + shadcn app and the game renders.
- `/docs/games/snake` shows a playable Snake inline.
- Snake passes engine tests, component smoke test, size budget, and the no-asset grep.
- `bun run build` succeeds; Vercel deploy is green.

### Phase 2 — Remaining 9 games

Order (easiest first): Tic-Tac-Toe → 2048 → Memory Match → Whack-a-Mole → Minesweeper → Pong → Breakout → Dino → Flappy.

For each: implement `engine.ts` + tests; implement `<Game>.tsx` matching `GameProps`; add `packages/registry/items/<game>.json` and include in `registry.json`; write `content/docs/games/<game>.mdx` with `<ComponentPreview>`, props table, install block; add to gallery; confirm size budget + zero-deps.

**Acceptance criteria**
- All 10 items installable by URL.
- All 10 docs pages have inline playable previews.
- `bun run size` shows all 10 under 6 KB gz, total under 60 KB gz.
- All 10 pass engine + smoke tests; DOM games pass a11y smoke.
- **Theming:** changing `--primary`, `--secondary`, or `--accent` (or toggling `.dark`) visibly recolors each game's playfield per the §5.4a mapping — verified by the theme-switcher demo on each docs page.
- **UI simplicity:** each game's chrome uses only stock shadcn primitives (`Button`/`Card`/`Badge`/`Separator`) with default variants; no invented colors or custom CSS beyond Tailwind utilities.

### Phase 3 — Marketing + docs polish

**Tasks**
1. Hero: tagline "Drop-in browser games for shadcn", animated Dino runner under the headline (pauses on `prefers-reduced-motion`).
2. Manifesto block: minimal, themeable, zero-asset, accessible.
3. One-line install per game; namespace install path explained.
4. Theme switcher demo proving token inheritance (light/dark/high-contrast).
5. Search via `fumadocs-core` (or a small Cmd-K menu over the 10 games).
6. OG image generator per game.
7. README with a GIF per game, the install one-liner, the principle, the unaffiliated disclaimer, link to gamekitui.com.

**Acceptance criteria**
- Lighthouse on the landing page ≥ 95 across Performance, Accessibility, Best Practices, SEO.
- All 10 games appear in the gallery with working live previews.
- Dark and light mode both correct on every game.

### Phase 4 — CI / release

**Tasks**
1. `ci.yml` and `release.yml` (§7.9).
2. `.github/ISSUE_TEMPLATE/{bug.yml,new-game.yml}`, `PULL_REQUEST_TEMPLATE.md`.
3. `size-limit` configured per game in `packages/registry/.size-limit.cjs`.
4. `bunx changeset init` + first changeset for `@gamekit/game-core@0.1.0`.
5. README badges (CI, MIT, Contributor Covenant).

**Acceptance criteria**
- A PR runs `install → lint → typecheck → test → build → size → asset grep` in < 4 minutes.
- A `changesets/action@v1` release PR opens automatically when a changeset merges to `main`.

### Phase 5 — Launch

**Tasks**
1. PR to `shadcn-ui/ui` adding our entry to `apps/v4/registry/directory.json`; run their `validate:registries` first.
2. Post on r/reactjs, r/sideproject, Hacker News "Show HN", X, dev.to with the gallery GIF + install one-liner.
3. Cross-list on `registry.directory`; PR an entry to `birobirobiro/awesome-shadcn-ui`.
4. Watch issues for a week; patch against the latest shadcn CLI if anything breaks.

**Acceptance criteria**
- gamekitui appears under `@gamekitui` in the shadcn registry directory.
- (Stretch) first external contributor PR within 14 days.

---

## 10. OSS launch & maintenance checklist

- [ ] `LICENSE` — MIT.
- [ ] `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1.
- [ ] `README.md` — tagline, hero GIF, "Install in 10 seconds" snippet, 10-game gallery, manifesto, unaffiliated disclaimer, Contributing link.
- [ ] `CONTRIBUTING.md` — "Add a new game" guide (engine/wrapper template, size-budget rules, test layout, `registry-item.json` template, PR checklist).
- [ ] `SECURITY.md` — report via GitHub Security Advisories.
- [ ] `.github/ISSUE_TEMPLATE/` + `PULL_REQUEST_TEMPLATE.md`.
- [ ] Repo description: "Open-source shadcn registry of 10 minimal, themeable React/TSX browser games. Drop-in primitives for 404s, empty states, and easter eggs."
- [ ] GitHub topics: `shadcn`, `shadcn-registry`, `react`, `typescript`, `games`, `canvas`, `tailwindcss`, `nextjs`, `bun`.
- [ ] Submit to `apps/v4/registry/directory.json`.
- [ ] Quarterly: bump `bun`, `next`, `tailwindcss`, `shadcn`, `fumadocs-mdx` (Renovate or Dependabot).
- [ ] Per release: re-record gallery GIF if visuals changed; re-validate the namespace appears in the shadcn registry directory.

---

## 11. Appendix: validated facts & sources

Findings confirmed against primary sources during research (June 2026):

- **shadcn v4 uses Fumadocs.** `apps/v4/package.json` contains `"postinstall": "fumadocs-mdx"`; docs UI is built on shadcn primitives, not `fumadocs-ui`. → drives the §4 decision.
- **shadcn v4 runs registry/build scripts through Bun even on a pnpm repo:** `"registry:build": "pnpm --filter=shadcn build && bun run ./scripts/build-registry.mts"`, `"test:apps": "bun run ./scripts/build-test-app.mts"`. → validates the all-Bun choice.
- **shadcn v4 is a Next.js 16 app.** → we target Next.js 16 for `apps/www`.
- **shadcn v4 `components.json`:** `style: new-york`, `baseColor: neutral`, `iconLibrary: lucide`, `ui` alias `@/registry/new-york-v4/ui`. → registry path convention.
- **Monorepo aliasing** (shadcn docs): local `#components/*` / `#lib/*` / `#hooks/*` via `package.json#imports`, shared via `@workspace/ui/components` + `@workspace/ui/lib/utils`. → §6.1.
- **Biome v2** (codename Biotype) shipped June 2025 with type-aware linting without the TypeScript compiler. → §7.5.
- **Changesets + Bun `workspace:*` gotcha** is documented (ianm.com, Aug 2025) and tracked in oven-sh/bun #24687. → §7.8 workaround.
- **Contentlayer** unmaintained since Aug 2023. → rejected in §4.

> Some facts above (e.g. exact current versions of Next.js, Bun, Biome, fumadocs) move quickly; pin them at scaffold time and let Renovate/Dependabot keep them current.