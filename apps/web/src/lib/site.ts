export const siteConfig = {
  name: "GameKit UI",
  shortName: "gamekitui",
  url: "https://gamekitui.com",
  ogImage: "https://gamekitui.com/opengraph-image.png",
  description:
    "An open-source shadcn registry of minimal, themeable browser games — Snake, 2048, Minesweeper and more. Install with the shadcn CLI. Zero deps, zero assets.",
  tagline: "Drop-in browser games for shadcn",
  twitterHandle: "@gamekitui",
  keywords: [
    "shadcn",
    "shadcn registry",
    "shadcn ui",
    "react games",
    "browser games",
    "tsx games",
    "snake game react",
    "2048 react",
    "minesweeper react",
    "404 page games",
    "tailwindcss",
    "nextjs",
    "drop-in components",
  ],
  github: "https://github.com/slarity/gamekit-ui",
  author: "GameKit UI contributors",
  registryNamespace: "@gamekitui",
} as const;

export type SiteConfig = typeof siteConfig;
