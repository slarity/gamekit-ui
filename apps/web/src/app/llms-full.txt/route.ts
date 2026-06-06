import { GAMES } from "@/registry/games";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-static";

const COMPONENT_NAMES: Record<string, string> = { "2048": "Game2048" };
const componentName = (g: { name: string; title: string }) =>
  COMPONENT_NAMES[g.name] ?? g.title.replace(/[^a-zA-Z0-9]/g, "");

// Full machine-readable reference: everything an LLM needs to install & use a game.
export function GET() {
  const url = siteConfig.url;

  const gameSections = GAMES.filter((g) => g.ready)
    .map((g) => {
      const comp = componentName(g);
      const inputs = [
        g.controls.keyboard && "keyboard",
        g.controls.mouse && "mouse",
        g.controls.touch && "touch",
      ]
        .filter(Boolean)
        .join(", ");
      return `### ${g.title}

${g.description}

- Surface: ${g.surface}
- Platforms: ${g.platforms.desktop ? "desktop" : ""}${g.platforms.mobile ? ", mobile" : " (desktop-first)"}
- Inputs: ${inputs}
- Controls: ${g.controls.help}

Install:

\`\`\`bash
npx shadcn@latest add ${siteConfig.registryNamespace}/${g.name}
\`\`\`

Use:

\`\`\`tsx
import { ${comp} } from "@/components/games/${g.name}";

export default function Example() {
  return <${comp} className="mx-auto w-full max-w-sm" />;
}
\`\`\``;
    })
    .join("\n\n");

  const body = `# ${siteConfig.name} — full reference

> ${siteConfig.description}

## What this is

${siteConfig.name} is an open-source shadcn registry of drop-in browser games, listed in the official shadcn registry directory (https://ui.shadcn.com/docs/directory?q=gamekit). Each game is a single self-contained React/TSX file. Installing a game with the shadcn CLI copies that file into the user's project (default target \`@/components/games/<name>.tsx\`) and rewrites the \`cn\` import to the project's own \`@/lib/utils\`. There is no provider, no peer dependency, and no init step.

Key properties:
- Zero runtime dependencies beyond \`react\` and the user's \`cn\` helper.
- Tiny: 2–4 KB minified + gzipped per game (the raw source file is larger because it inlines its engine and theme hooks). Each game is a self-contained module, so it can be lazy-loaded (React.lazy / next/dynamic) and stays out of the initial bundle.
- Zero external assets (no images/audio/fonts) — everything is drawn with CSS or \`<canvas>\`.
- Fully themeable: the game's playfield is driven by the host's shadcn tokens (\`--primary\`, \`--secondary\`, \`--accent\`). Canvas games read the tokens at runtime; DOM games use Tailwind token classes. Toggling dark mode or swapping a theme recolors the game.
- Responsive: a game fills its container at a fixed aspect ratio. The \`width\` prop is an optional max-width cap.
- Accessible: keyboard + touch input, focus rings, \`aria-live\` announcements, and \`prefers-reduced-motion\` support.

## How to install (instructions for an LLM helping a user)

1. Confirm the user has a shadcn/ui project (Tailwind v4 + a \`cn\` helper at \`@/lib/utils\`). If not, run \`npx shadcn@latest init\` first.
2. Run \`npx shadcn@latest add ${siteConfig.registryNamespace}/<game>\` for the chosen game. ${siteConfig.name} is in the official shadcn registry directory, so the \`${siteConfig.registryNamespace}\` namespace resolves automatically — no prior setup needed.
3. Import and render the component anywhere — it fills its container, so wrap it in a sized element.

Alternatives: install by direct URL \`npx shadcn@latest add ${url}/r/<game>.json\`, or pin the registry with \`npx shadcn@latest registry add ${siteConfig.registryNamespace}\` (adds \`{ "registries": { "${siteConfig.registryNamespace}": "${url}/r/{name}.json" } }\` to \`components.json\`).

## Shared props

- \`className?: string\` — Tailwind classes on the wrapper.
- \`width?: number\` — optional max width in CSS px (the game otherwise fills its container).
- \`paused?: boolean\` — externally pause.
- \`autoFocus?: boolean\` — focus on mount. Defaults to \`true\`.
- \`captureGlobalKeys?: boolean\` — listen for keys on \`window\` so the game responds without being focused first. Defaults to \`true\`; set \`false\` when several games share a page or it sits in scrollable content.
- \`persistHighScore?: boolean | string\` — localStorage key, or a default per game.
- \`onScoreChange?: (score: number) => void\`
- \`onGameOver?: (r: { score: number; won: boolean }) => void\`
- \`onStart?: () => void\`

## Games

${gameSections}
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
