import { docsOgImage } from "@/lib/og";
import { GAMES } from "@/registry/games";

/**
 * Per-page OG cards, statically generated at build time and referenced from
 * the docs pages' `openGraph.images`. URLs mirror the docs tree:
 *   /og/docs              → generic card (docs index)
 *   /og/docs/installation → generic card
 *   /og/docs/games/snake  → snake pixel-art card
 *
 * (A route handler instead of the `opengraph-image` file convention because
 * Turbopack disallows metadata files inside a catch-all segment.)
 */

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [
    { slug: [] },
    { slug: ["installation"] },
    ...GAMES.filter((g) => g.ready).map((g) => ({ slug: ["games", g.name] })),
  ];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  return docsOgImage(slug);
}
