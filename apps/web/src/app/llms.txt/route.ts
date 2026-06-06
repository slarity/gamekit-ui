import { GAMES } from "@/registry/games";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-static";

// https://llmstxt.org — concise, link-first index for LLMs.
export function GET() {
  const url = siteConfig.url;
  const games = GAMES.filter((g) => g.ready)
    .map(
      (g) =>
        `- [${g.title}](${url}/docs/games/${g.name}): install with \`npx shadcn@latest add ${siteConfig.registryNamespace}/${g.name}\``,
    )
    .join("\n");

  const body = `# ${siteConfig.name}

> ${siteConfig.description}

${siteConfig.name} is a shadcn registry. Each game is a single drop-in React/TSX file installed with the shadcn CLI. There is no provider, no peer dependency, and no init step — a game fills its container and inherits the host app's shadcn theme (light/dark and any preset). Games are zero-asset (drawn with CSS or <canvas>) and 2–4 KB each minified + gzipped (the raw source file is larger because it inlines its engine and theme hooks). Each game is a self-contained module, so it can be lazy-loaded (React.lazy / next/dynamic) and stays out of the initial bundle.

## Install a game

${siteConfig.name} is listed in the official shadcn registry directory (https://ui.shadcn.com/docs/directory?q=gamekit), so install any game by short name — no setup needed, the CLI resolves the \`${siteConfig.registryNamespace}\` namespace automatically:

\`\`\`bash
npx shadcn@latest add ${siteConfig.registryNamespace}/snake
\`\`\`

Replace \`snake\` with any game name. Optionally run \`npx shadcn@latest registry add ${siteConfig.registryNamespace}\` to pin the registry in your \`components.json\`, or install by direct URL: \`npx shadcn@latest add ${url}/r/snake.json\`.

## Docs

- [Introduction](${url}/docs): what GameKit UI is and how it works.
- [Installation](${url}/docs/installation): install, namespace setup, usage, and shared props.
- [llms-full.txt](${url}/llms-full.txt): full machine-readable reference with every game and usage example.

## Games

${games}
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
