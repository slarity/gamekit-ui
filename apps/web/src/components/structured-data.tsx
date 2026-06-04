import { GAMES } from "@/registry/games";
import { siteConfig } from "@/lib/site";

/** JSON-LD structured data for the site (WebSite + the registry as a SoftwareApplication + game list). */
export function StructuredData() {
  const graph = [
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      description: siteConfig.description,
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteConfig.url}/#software`,
      name: siteConfig.name,
      description: siteConfig.description,
      url: siteConfig.url,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@type": "Organization", name: siteConfig.author, url: siteConfig.github },
      keywords: siteConfig.keywords.join(", "),
    },
    {
      "@type": "ItemList",
      "@id": `${siteConfig.url}/#games`,
      name: "GameKit UI games",
      numberOfItems: GAMES.length,
      itemListElement: GAMES.map((game, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteConfig.url}/docs/games/${game.name}`,
        name: game.title,
        description: game.description,
      })),
    },
  ];
  const json = { "@context": "https://schema.org", "@graph": graph };

  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is a trusted, static string
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
  );
}

/** Per-game VideoGame schema, used on game docs pages. */
export function GameStructuredData({ name }: { name: string }) {
  const game = GAMES.find((g) => g.name === name);
  if (!game) return null;
  const json = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: `${game.title} — ${siteConfig.name}`,
    description: game.description,
    url: `${siteConfig.url}/docs/games/${game.name}`,
    applicationCategory: "Game",
    operatingSystem: "Web",
    gamePlatform: game.platforms.mobile ? ["Desktop", "Mobile"] : ["Desktop"],
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: { "@type": "Organization", name: siteConfig.author, url: siteConfig.github },
  };
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is a trusted, static string
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
  );
}
