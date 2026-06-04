# LLM / agent distribution plan

Goal: make it trivial for an LLM or coding agent to install and use GameKit UI games on a user's behalf.

## Shipped

1. **`/llms.txt`** (`apps/web/src/app/llms.txt/route.ts`) — the [llmstxt.org](https://llmstxt.org) index: a one-paragraph summary, the install command pattern, and a link per game. Served at `https://gamekitui.com/llms.txt`.
2. **`/llms-full.txt`** (`apps/web/src/app/llms-full.txt/route.ts`) — the full machine-readable reference: properties, step-by-step install instructions for an agent, shared props, and a per-game block (description, surface, platforms, inputs, install command, usage snippet).
3. **Agent skill** (`skills/gamekitui/SKILL.md`) — a Claude Code / OpenClaw-style skill (frontmatter `name` + `description`, then instructions) that teaches an agent when and how to install a game.
4. **Structured data** — `SoftwareApplication` + `ItemList` (site) and `VideoGame` (per game) JSON-LD, plus `robots.txt` explicitly allowing AI crawlers (GPTBot, ClaudeBot, PerplexityBot, …) and a `sitemap.xml`.

## Next steps (when ready to publish)

- **Publish the skill to [skills.sh / clawskills.sh](https://clawskills.sh).** Submit `skills/gamekitui/SKILL.md` so agents can `install` it by name. Keep the install names + game list in sync with `apps/web/src/registry/games.ts`.
- **Submit to the shadcn registry directory** (PR to `shadcn-ui/ui` `apps/v4/registry/directory.json`) so `@gamekit` appears in `npx shadcn@latest add` discovery.
- **Cross-list** on `registry.directory` and `birobirobiro/awesome-shadcn-ui`.
- **Keep generators in sync.** `/llms.txt`, `/llms-full.txt`, the skill table, and the structured data all derive (or should derive) from `GAMES` in `apps/web/src/registry/games.ts`; when a game is added, only that file + the registry index need updating, and the LLM surfaces update automatically (the skill table is currently hand-maintained — consider generating it).
