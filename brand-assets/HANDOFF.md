# Handoff to Claude Code 👾

Goal: wire these brand assets into the GameKit UI site and (optionally) restyle the
landing page to match the arcade-cabinet direction in `reference/`.

---

## 1. Drop the files in

Copy everything from `favicon/`, `social/`, and `site.webmanifest` into your
Next.js **`public/`** folder (flat — so they resolve at `/favicon.svg`,
`/og-image.png`, etc.). Logos go wherever you reference them (e.g. `public/brand/`).

```
public/
  favicon.svg  favicon-16.png  favicon-32.png  favicon-48.png
  apple-touch-icon.png  icon-192.png  icon-512.png
  og-image.png  twitter-image.png  site.webmanifest
```

## 2. App Router metadata (`app/layout.tsx`)

```ts
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://gamekitui.com"),
  title: "GameKit UI — Drop-in browser games for shadcn",
  description:
    "An open-source shadcn registry of minimal, themeable browser games — Snake, 2048, Minesweeper and more. Install with the shadcn CLI. Zero deps, zero assets.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "GameKit UI",
    title: "GameKit UI — Drop-in browser games for shadcn",
    description: "Tiny, themeable browser games for shadcn. Install with one CLI command.",
    url: "https://gamekitui.com",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GameKit UI" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@gamekitui",
    title: "GameKit UI — Drop-in browser games for shadcn",
    description: "Tiny, themeable browser games for shadcn.",
    images: ["/twitter-image.png"],
  },
};

export const viewport = { themeColor: "#0d0e13" };
```

### Plain-HTML equivalent (if not Next.js)

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
<link rel="icon" href="/favicon-16.png" sizes="16x16" type="image/png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#0d0e13" />
<meta property="og:image" content="https://gamekitui.com/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://gamekitui.com/twitter-image.png" />
```

## 3. (Optional) Restyle the landing page

`reference/` contains the complete new direction as a working static prototype:

- `gamekit.css` — the design system: color tokens, arcade chrome (scanlines, CRT,
  pixel frames, HUD), buttons, marquee, pixel-invader sprite, the live-theming
  swatches, and a Tweaks panel.
- `landing.js` — vanilla JS: the CSS pixel-invader builder, a self-contained
  themeable **Snake** (canvas), copy-to-clipboard, accent theming, marquee loop.
- `GameKit Landing.html` — the page markup that composes it all.
- `GameKit Brand Guidelines.html` — the brand bible (mark usage, color, type, voice).

Port these into your React/Next components. Notes:
- Map the CSS custom properties to your existing shadcn `globals.css` tokens. The
  brand accent is `--green`; the games already read `--primary` at runtime, so you
  can keep both.
- **Gotcha we hit:** do **not** put `background` (or `background-color`) in a CSS
  `transition` on any element whose color comes from a `var()` you change at runtime
  — this engine freezes the repaint. Transition `transform`/`border-color` only and
  let the background snap. (Already handled in `gamekit.css`.)
- The Snake in `landing.js` is framework-free and can be dropped in as-is, or
  replaced with your real `<Snake />` registry component.

## 4. Regenerating assets
All raster assets were drawn from the 11×8 invader bitmap + the three brand fonts.
The bitmap and palette are in `README.md`; ask me (or re-run the generator) if you
need additional sizes, a favicon.ico, or localized OG cards.
