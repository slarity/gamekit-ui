---
name: gamekitui
description: Install and use GameKit UI — drop-in browser games (Snake, Tic-Tac-Toe, 2048, Memory Match, Whack-a-Mole, Minesweeper, Pong, Breakout, Dino Runner, Flappy) from the shadcn registry. Use when a user wants to add a small playable game to a React/shadcn app — for a 404 page, empty state, loading screen, or landing-page easter egg.
---

# GameKit UI

GameKit UI is an open-source **shadcn registry** of minimal, themeable browser games. Each game is a single self-contained React/TSX file installed with the shadcn CLI — no provider, no peer dependency, no init step. Games are zero-asset (drawn with CSS or `<canvas>`), ≤6 KB gzipped, fully responsive, accessible, and inherit the host app's shadcn theme.

Machine-readable reference: <https://gamekitui.com/llms.txt> and <https://gamekitui.com/llms-full.txt>.

## When to use

The user wants to drop a playable game into their React app (commonly a 404 page, empty state, loading screen, or easter egg) and is using shadcn/ui (Tailwind v4 + a `cn` helper).

## Steps

1. **Verify prerequisites.** The project must be a shadcn/ui project (Tailwind v4, a `cn` helper at `@/lib/utils`, a `components.json`). If not initialized, run `npx shadcn@latest init` first.
2. **Pick a game** from the list below based on the user's need (e.g. Dino Runner or Snake for a 404; Flappy for a loading screen; Whack-a-Mole/Memory Match for an empty state).
3. **Install it:**
   ```bash
   npx shadcn@latest add https://gamekitui.com/r/<game>.json
   ```
   This copies a single file to `@/components/games/<game>.tsx` and rewrites the `cn` import to the project's own.
4. **Render it.** It fills its container, so wrap it in a sized element:
   ```tsx
   import { Snake } from "@/components/games/snake";

   export default function NotFound() {
     return (
       <main className="grid min-h-svh place-items-center">
         <Snake className="mx-auto w-full max-w-sm" />
       </main>
     );
   }
   ```

Note: the `2048` component is exported as `Game2048` (identifiers can't start with a digit). All others are PascalCase of the title (e.g. `TicTacToe`, `WhackAMole`, `DinoRunner`).

## Available games

| Game | install name | mobile-friendly |
|---|---|---|
| Snake | `snake` | desktop-first |
| Tic-Tac-Toe | `tic-tac-toe` | yes |
| 2048 | `2048` | yes |
| Memory Match | `memory-match` | yes |
| Whack-a-Mole | `whack-a-mole` | yes |
| Minesweeper | `minesweeper` | desktop-first |
| Pong | `pong` | yes |
| Breakout | `breakout` | yes |
| Dino Runner | `dino-runner` | yes |
| Flappy | `flappy` | yes |

## Shared props

`className`, `width` (optional max-width; the game otherwise fills its container), `paused`, `autoFocus`, `persistHighScore`, `onScoreChange`, `onGameOver`, `onStart`.

## Namespace install (optional)

Add to `components.json`:

```json
{ "registries": { "@gamekit": "https://gamekitui.com/r/{name}.json" } }
```

Then: `npx shadcn@latest add @gamekit/snake`.
