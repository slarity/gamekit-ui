import type { MetadataRoute } from "next";
import { GAMES } from "@/registry/games";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  // Stable content date (not server boot time, which would change every deploy
  // and make Googlebot distrust lastmod). Bump when content changes materially.
  const now = new Date("2026-06-04");
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteConfig.url, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/games`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteConfig.url}/docs`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteConfig.url}/docs/installation`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];
  const gameRoutes: MetadataRoute.Sitemap = GAMES.map((game) => ({
    url: `${siteConfig.url}/docs/games/${game.name}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  return [...staticRoutes, ...gameRoutes];
}
