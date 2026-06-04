# GameKit UI — Brand Asset Pack 👾

Everything you need to brand GameKit UI: the space-invader mark, wordmark lockups,
favicons, app icons, and social cards. Retro-arcade soul, modern-clean execution.

```
brand-assets/
├─ favicon/
│  ├─ favicon.svg            ← vector mark (dark rounded tile + green invader)
│  ├─ favicon-16.png
│  ├─ favicon-32.png
│  ├─ favicon-48.png
│  ├─ apple-touch-icon.png   ← 180×180
│  ├─ icon-192.png           ← PWA, "any maskable"
│  └─ icon-512.png           ← PWA, "any maskable"
├─ logo/
│  ├─ logo-horizontal-on-dark.png   ← light wordmark, use on dark bg
│  ├─ logo-horizontal-on-light.png  ← dark wordmark, use on light bg
│  ├─ logo-stacked-on-dark.png
│  ├─ logo-stacked-on-light.png
│  ├─ wordmark-on-dark.png          ← text only, no mark
│  ├─ wordmark-on-light.png
│  ├─ mark-green.png                ← the invader alone (512, transparent)
│  ├─ mark-magenta.png  mark-cyan.png  mark-amber.png
├─ social/
│  ├─ og-image.png           ← 1200×630 Open Graph card
│  └─ twitter-image.png      ← 1200×630 (summary_large_image)
├─ site.webmanifest
├─ HANDOFF.md                ← copy-paste metadata for Next.js / HTML
└─ reference/                ← the full landing + brand-guide design system
   ├─ GameKit Landing.html
   ├─ GameKit Brand Guidelines.html
   ├─ gamekit.css
   └─ landing.js
```

## Brand tokens (source of truth)

**Color** — authored in `oklch`, hex shown for tools that need it.

| Token        | oklch                      | hex ≈     | use                         |
|--------------|----------------------------|-----------|-----------------------------|
| `--bg`       | `oklch(0.155 0.012 260)`   | `#0d0e13` | page background / theme-color |
| `--bg-1`     | `oklch(0.185 0.014 260)`   | `#15161c` | panels                      |
| `--line`     | `oklch(0.320 0.018 262)`   | `#2b2e39` | borders                     |
| `--ink`      | `oklch(0.972 0.004 250)`   | `#f3f4f6` | primary text                |
| `--green` ◆  | `oklch(0.872 0.205 148)`   | `#57f2a4` | **primary accent** (phosphor) |
| `--magenta`  | `oklch(0.720 0.250 350)`   | `#ff5db1` | secondary                   |
| `--cyan`     | `oklch(0.840 0.135 205)`   | `#67dcf0` | tertiary                    |
| `--amber`    | `oklch(0.840 0.155 78)`    | `#f0c45c` | hi-score / quaternary       |

**Type**
- **Geist** — headlines, UI, body
- **Geist Mono** — code, install commands, HUD score numerals
- **Press Start 2P** — chrome ONLY: the wordmark, marquees, "insert coin". Never body copy.

## The mark
The 👾 space-invader is the whole identity. Keep it pixel-hard (no anti-alias, no
gradients, no shadows), recolor only with the palette accents, and give it one
mark-height of clearspace. Minimum sizes: mark 16px, wordmark 11px.

See `reference/GameKit Brand Guidelines.html` for the full do/don't, clearspace,
and motif rules.
