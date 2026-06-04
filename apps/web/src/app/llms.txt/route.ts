import { GAMES } from "@/registry/games";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-static";

// https://llmstxt.org — concise, link-first index for LLMs.
export function GET() {
  const url = siteConfig.url;
  const games = GAMES.filter((g) => g.ready)
    .map(
      (g) =>
        `- [${g.title}](${url}/docs/games/${g.name}): install with \`npx shadcn@latest add ${url}/r/${g.name}.json\``,
    )
    .join("\n");

  const body = `# ${siteConfig.name}

> ${siteConfig.description}

${siteConfig.name} is a shadcn registry. Each game is a single drop-in React/TSX file installed with the shadcn CLI. There is no provider, no peer dependency, and no init step — a game fills its container and inherits the host app's shadcn theme (light/dark and any preset). Games are zero-asset (drawn with CSS or <canvas>) and ≤6 KB gzipped each.

## Install a game

Run, replacing \`snake\` with any game name:

\`\`\`bash
npx shadcn@latest add ${url}/r/snake.json
\`\`\`

Optionally register the \`${siteConfig.registryNamespace}\` namespace in components.json, then \`npx shadcn@latest add ${siteConfig.registryNamespace}/snake\`.

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
