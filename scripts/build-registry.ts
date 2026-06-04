#!/usr/bin/env bun
/**
 * Builds the shadcn registry artifacts consumed by the CLI:
 *   apps/web/public/r/registry.json   — the catalog
 *   apps/web/public/r/<name>.json     — one registry-item per game
 *
 * Each item embeds the source file content verbatim. Games import `cn` from
 * the standard `@/lib/utils` path, which the consumer's shadcn CLI rewrites to
 * their own utils alias on install — so no rewrite happens here.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GAMES } from "../apps/web/src/registry/games";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "apps/web/public/r");
const HOMEPAGE = "https://gamekitui.com";

function fileType(path: string): "registry:component" | "registry:lib" {
  return path.endsWith("engine.ts") || path.includes("/lib/") ? "registry:lib" : "registry:component";
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const catalogItems: unknown[] = [];

  for (const game of GAMES) {
    if (!game.ready) continue;

    const files = await Promise.all(
      game.files.map(async (f) => {
        const content = await readFile(join(ROOT, f.path), "utf8");
        const base = f.path.split("/").pop() ?? f.path;
        return {
          path: `registry/games/${base}`,
          content,
          type: fileType(f.path),
          target: f.target,
        };
      }),
    );

    const item = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: game.name,
      type: "registry:component" as const,
      title: game.title,
      description: game.description,
      dependencies: [] as string[],
      registryDependencies: [] as string[],
      files,
      categories: ["games"],
      meta: { iframeHeight: game.iframeHeight, surface: game.surface },
    };

    await writeFile(join(OUT, `${game.name}.json`), `${JSON.stringify(item, null, 2)}\n`);

    catalogItems.push({
      name: game.name,
      type: item.type,
      title: game.title,
      description: game.description,
      registryDependencies: [],
      dependencies: [],
      files: game.files.map((f) => ({ path: f.path, type: fileType(f.path), target: f.target })),
      categories: ["games"],
      meta: { iframeHeight: game.iframeHeight },
    });
  }

  const catalog = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "gamekitui",
    homepage: HOMEPAGE,
    items: catalogItems,
  };
  await writeFile(join(OUT, "registry.json"), `${JSON.stringify(catalog, null, 2)}\n`);

  // eslint-disable-next-line no-console
  console.log(`✓ Built ${catalogItems.length} registry items → apps/web/public/r/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
