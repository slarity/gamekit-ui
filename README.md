# GameKit UI

> Drop-in browser games for shadcn. Minimal, themeable React/TSX games installable with the shadcn CLI — perfect for 404 pages, empty states, loading screens, and landing-page easter eggs.

```bash
npx shadcn@latest add https://gamekitui.com/r/snake.json
```

No provider. No peer deps. No init step. Each game is a single drop-in file that **inherits your shadcn theme** automatically (light/dark and any preset).

## The lineup

| Game | Surface | Install |
|---|---|---|
| Snake | canvas | `…/r/snake.json` |
| Tic-Tac-Toe | DOM | `…/r/tic-tac-toe.json` |
| 2048 | DOM | `…/r/2048.json` |
| Memory Match | DOM | `…/r/memory-match.json` |
| Whack-a-Mole | DOM | `…/r/whack-a-mole.json` |
| Minesweeper | DOM | `…/r/minesweeper.json` |
| Pong | canvas | `…/r/pong.json` |
| Breakout | canvas | `…/r/breakout.json` |
| Dino Runner | canvas | `…/r/dino-runner.json` |
| Flappy | canvas | `…/r/flappy.json` |

Base URL: `https://gamekitui.com`

## Principles

- **Minimal** — each game is a single file with zero npm dependencies beyond `react` and your existing `cn` helper.
- **Themeable** — the theme's `--primary` / `--secondary` / `--accent` drive the *playfield*, not just the chrome. Canvas games read the tokens at runtime; DOM games use Tailwind token classes. Change your theme and the games recolor.
- **Zero assets** — no images, audio, or fonts. Every pixel is drawn with CSS or `<canvas>`.
- **Accessible** — keyboard + touch input, visible focus rings, `aria-live` announcements, and `prefers-reduced-motion` support in every game.

## Usage

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

### Namespace install (optional)

Register the `@gamekit` namespace in your `components.json`:

```jsonc
{
  "registries": {
    "@gamekit": "https://gamekitui.com/r/{name}.json"
  }
}
```

```bash
npx shadcn@latest add @gamekit/snake
```

## Shared props

Every game accepts a common subset of props:

| Prop | Type | Description |
|---|---|---|
| `className` | `string` | Tailwind classes on the wrapper. |
| `width` / `height` | `number` | Logical size in CSS px (canvas games scale via DPR). |
| `paused` | `boolean` | Externally pause the game. |
| `autoFocus` | `boolean` | Focus on mount so keyboard input works. |
| `persistHighScore` | `boolean \| string` | localStorage key, or a default per game. |
| `onScoreChange` | `(score: number) => void` | Fires when the score changes. |
| `onGameOver` | `(r: { score: number; won: boolean }) => void` | Fires on game over. |

## Repository layout

```
apps/web                  Next.js 16 marketing + docs site; serves /r/*.json
packages/registry         The game sources (one self-contained file each)
packages/game-core        Shared contract types + reference hooks (zero runtime)
packages/ui               shadcn primitives used by the site
scripts/build-registry.ts Emits apps/web/public/r/*.json from the game sources
```

## Development

```bash
bun install
bun run dev            # builds the registry, then starts the site on :3001
```

Other scripts:

```bash
bun run build          # registry build + next build
bun run check-types    # typecheck every workspace
cd packages/registry && bun smoke.tsx   # render smoke test for every game
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the "add a new game" guide (engine/wrapper template, the shared props contract, the theme-token mapping, and the size budget).

## Disclaimer

**GameKit UI** is an independent, unaffiliated community project. It is not built, sponsored, or endorsed by the shadcn/ui team. It uses the shadcn registry system. The `shadcn-` prefix is reserved for official projects, which is why this project is named `gamekitui` (not `shadcn-games`).

## License

[MIT](./LICENSE)
