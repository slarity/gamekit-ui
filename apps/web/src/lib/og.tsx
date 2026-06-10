import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { getGame } from "@/registry/games";
import { siteConfig } from "@/lib/site";

/**
 * Build-time OG image generation (next/og · satori). One branded 1200×630
 * card per docs page: game pages get a pixel-art motif of the game, other
 * pages get the generic gamepad. Fonts are vendored in src/assets/og so
 * builds never depend on a font CDN.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/* -------------------------------------------------------------------------- */
/*                                   Fonts                                    */
/* -------------------------------------------------------------------------- */

type OgFont = { name: string; data: Buffer; weight: 400 | 500 | 700 };

let fontsPromise: Promise<OgFont[]> | null = null;

function loadFonts(): Promise<OgFont[]> {
  fontsPromise ??= Promise.all(
    (
      [
        ["Geist", "geist-400.woff", 400],
        ["Geist", "geist-700.woff", 700],
        ["Geist Mono", "geist-mono-500.woff", 500],
        ["Press Start 2P", "press-start-2p-400.woff", 400],
      ] as const
    ).map(async ([name, file, weight]) => ({
      name,
      data: await readFile(join(process.cwd(), "src/assets/og", file)),
      weight,
    })),
  );
  return fontsPromise;
}

/* -------------------------------------------------------------------------- */
/*                                Pixel motifs                                */
/* -------------------------------------------------------------------------- */

interface Motif {
  accent: string;
  art: ReactNode;
}

function PixelArt({
  grid,
  palette,
  cell = 24,
}: {
  grid: string[];
  palette: Record<string, string>;
  cell?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {grid.map((row, y) => (
        <div key={y} style={{ display: "flex" }}>
          {[...row].map((ch, x) => (
            <div
              key={x}
              style={{
                width: cell,
                height: cell,
                backgroundColor: palette[ch] ?? "transparent",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

const snakeArt = (
  <PixelArt
    palette={{ g: "#4ade80", k: "#052e16", r: "#f87171" }}
    grid={[
      "............",
      ".ggggggggg..",
      ".ggggggggg..",
      "........gg..",
      "...rr...gg..",
      ".ggggggggg..",
      ".ggggggggg..",
      ".gg.........",
      ".gg.........",
      ".ggggggggg..",
      ".gggggggkg..",
      "............",
    ]}
  />
);

const mineArt = (
  <PixelArt
    palette={{ m: "#cbd5e1", w: "#ffffff" }}
    grid={[
      ".....mm.....",
      ".....mm.....",
      "..m......m..",
      "...mmmmmm...",
      "..mmwmmmmm..",
      "mmmmmmmmmmmm",
      "mmmmmmmmmmmm",
      "..mmmmmmmm..",
      "...mmmmmm...",
      "..m......m..",
      ".....mm.....",
      ".....mm.....",
    ]}
  />
);

const dinoArt = (
  <PixelArt
    palette={{ d: "#a8b0c0", k: "#0d0e13" }}
    grid={[
      ".......ddddd",
      ".......dkddd",
      ".......ddddd",
      ".......ddd..",
      ".......ddddd",
      "d......ddd..",
      "dd....dddd..",
      "ddd..ddddd..",
      ".ddddddddd..",
      "..ddddddd...",
      "...ddddd....",
      "...dd..dd...",
    ]}
  />
);

const flappyArt = (
  <PixelArt
    palette={{ b: "#fde047", w: "#ffffff", k: "#0d0e13", o: "#fb923c" }}
    grid={[
      "............",
      "....bbbb....",
      "...bbbbbb...",
      "..bbbbbwkw..",
      "..bbbbbwww..",
      ".wwwbbbbbb..",
      ".wwwwbboooo.",
      "..wwbbbooo..",
      "...bbbbbb...",
      "....bbbb....",
      "............",
      "............",
    ]}
  />
);

const melonArt = (
  <PixelArt
    palette={{ r: "#fb5d6a", k: "#1f2937", G: "#bbf7d0", g: "#2e9e4f" }}
    grid={[
      "rrrrrrrrrrrr",
      "rrrkrrrkrrrr",
      "rrrrrrrrrrrr",
      "rkrrrkrrrkrr",
      "rrrrrrrrrrrr",
      ".rrkrrrkrr..",
      ".rrrrrrrrr..",
      "..GGrrrrG...",
      "..gGGGGGg...",
      "...gggggg...",
      "....gggg....",
      "............",
    ]}
  />
);

const moleArt = (
  <PixelArt
    palette={{ b: "#a16207", k: "#0d0e13", n: "#fda4af", h: "#111827" }}
    grid={[
      "............",
      "...bbbbbb...",
      "..bbbbbbbb..",
      "..bkbbbbkb..",
      "..bbbbbbbb..",
      "..bbbnnbbb..",
      "..bbbnnbbb..",
      "...bbbbbb...",
      "............",
      "..hhhhhhhh..",
      ".hhhhhhhhhh.",
      "............",
    ]}
  />
);

const gamepadArt = (
  <PixelArt
    palette={{ p: "#7c86ff", k: "#0d0e13", r: "#f87171", y: "#fbbf24" }}
    grid={[
      "............",
      "............",
      "..pppppppp..",
      ".pppppppppp.",
      "pppkpppppppp",
      "ppkkkppyppyp",
      "pppkpppppppp",
      ".pppppppppp.",
      ".ppp....ppp.",
      "............",
      "............",
      "............",
    ]}
  />
);

/* ------------------------------ JSX motifs -------------------------------- */

const ps2p = (size: number, color: string) =>
  ({
    fontFamily: "Press Start 2P",
    fontSize: size,
    color,
  }) as const;

const tttArt = (
  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    {[
      ["X", "O", "X"],
      ["", "X", ""],
      ["O", "", "O"],
    ].map((row, y) => (
      <div key={y} style={{ display: "flex", gap: 10 }}>
        {row.map((m, x) => (
          <div
            key={x}
            style={{
              display: "flex",
              width: 88,
              height: 88,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              backgroundColor: "rgba(255,255,255,0.06)",
              ...ps2p(36, m === "X" ? "#7c86ff" : "#fbbf24"),
            }}
          >
            {m}
          </div>
        ))}
      </div>
    ))}
  </div>
);

const tiles2048 = (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    {[
      [
        ["2", "#eee4da"],
        ["0", "#ede0c8"],
      ],
      [
        ["4", "#f2b179"],
        ["8", "#f59563"],
      ],
    ].map((row, y) => (
      <div key={y} style={{ display: "flex", gap: 12 }}>
        {row.map(([v, bg], x) => (
          <div
            key={x}
            style={{
              display: "flex",
              width: 130,
              height: 130,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              backgroundColor: bg,
              ...ps2p(52, "#776e65"),
            }}
          >
            {v}
          </div>
        ))}
      </div>
    ))}
  </div>
);

const memoryArt = (
  <div style={{ display: "flex" }}>
    <div
      style={{
        display: "flex",
        width: 140,
        height: 190,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        backgroundColor: "#7c86ff",
        transform: "rotate(-8deg)",
        ...ps2p(48, "#ffffff"),
      }}
    >
      ?
    </div>
    <div
      style={{
        display: "flex",
        width: 140,
        height: 190,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        backgroundColor: "#fbbf24",
        transform: "rotate(8deg)",
        marginLeft: -24,
        ...ps2p(48, "#0d0e13"),
      }}
    >
      !
    </div>
  </div>
);

const pongArt = (
  <div
    style={{
      display: "flex",
      width: 300,
      height: 300,
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ width: 8, height: 24, backgroundColor: "rgba(255,255,255,0.25)" }} />
      ))}
    </div>
    <div
      style={{ position: "absolute", left: 8, top: 60, width: 16, height: 92, backgroundColor: "#7c86ff" }}
    />
    <div
      style={{ position: "absolute", right: 8, top: 160, width: 16, height: 92, backgroundColor: "#fbbf24" }}
    />
    <div
      style={{ position: "absolute", left: 190, top: 96, width: 20, height: 20, backgroundColor: "#ffffff" }}
    />
  </div>
);

const breakoutArt = (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
    {["#f87171", "#fbbf24", "#4ade80"].map((c, y) => (
      <div key={y} style={{ display: "flex", gap: 8 }}>
        {[0, 1, 2, 3, 4].map((x) => (
          <div key={x} style={{ width: 52, height: 22, borderRadius: 4, backgroundColor: c }} />
        ))}
      </div>
    ))}
    <div style={{ display: "flex", width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", marginTop: 44, marginLeft: 60 }} />
    <div style={{ display: "flex", width: 110, height: 16, borderRadius: 8, backgroundColor: "#7c86ff", marginTop: 28 }} />
  </div>
);

// Stack's actual mechanic: each layer a shade of the palette, shrinking as it climbs.
const stackArt = (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
      <div
        key={i}
        style={{
          width: 120 + i * 24,
          height: 32,
          borderRadius: 6,
          backgroundColor: `hsl(${238 - (7 - i) * 9} 70% ${62 - (7 - i) * 3}%)`,
          marginLeft: i % 2 === 0 ? 10 : -10,
        }}
      />
    ))}
  </div>
);

/* -------------------------------------------------------------------------- */

const MOTIFS: Record<string, Motif> = {
  snake: { accent: "#4ade80", art: snakeArt },
  "tic-tac-toe": { accent: "#7c86ff", art: tttArt },
  "2048": { accent: "#f2b179", art: tiles2048 },
  "memory-match": { accent: "#fbbf24", art: memoryArt },
  "whack-a-mole": { accent: "#ca8a04", art: moleArt },
  minesweeper: { accent: "#cbd5e1", art: mineArt },
  pong: { accent: "#7c86ff", art: pongArt },
  breakout: { accent: "#f87171", art: breakoutArt },
  "dino-runner": { accent: "#a8b0c0", art: dinoArt },
  flappy: { accent: "#fde047", art: flappyArt },
  "fruit-ninja": { accent: "#fb5d6a", art: melonArt },
  stack: { accent: "#8b8bff", art: stackArt },
};

const GENERIC_MOTIF: Motif = { accent: "#7c86ff", art: gamepadArt };

/* -------------------------------------------------------------------------- */
/*                                 Template                                   */
/* -------------------------------------------------------------------------- */

interface OgCardProps {
  title: string;
  description: string;
  pill: string;
  motif: Motif;
}

function OgCard({ title, description, pill, motif }: OgCardProps) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundColor: "#0d0e13",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)",
        backgroundSize: "100% 44px",
        fontFamily: "Geist",
        position: "relative",
      }}
    >
      {/* Accent glow behind the motif panel */}
      <div
        style={{
          position: "absolute",
          right: 40,
          top: 95,
          width: 440,
          height: 440,
          borderRadius: 220,
          backgroundColor: motif.accent,
          opacity: 0.14,
          filter: "blur(80px)",
        }}
      />

      {/* Left column */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 0 56px 72px",
          width: 690,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              width: 18,
              height: 18,
              backgroundColor: motif.accent,
            }}
          />
          <div style={ps2p(22, "#e8e9f0")}>GAMEKIT UI</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 78,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: -2.5,
              lineHeight: 1.02,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 29,
              color: "#9aa0b4",
              lineHeight: 1.4,
              maxWidth: 600,
            }}
          >
            {description}
          </div>
        </div>

        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "14px 24px",
              borderRadius: 10,
              backgroundColor: "rgba(124,134,255,0.10)",
              border: "1px solid rgba(124,134,255,0.35)",
              fontFamily: "Geist Mono",
              fontSize: 24,
              color: "#c3c8ff",
            }}
          >
            {pill}
          </div>
        </div>
      </div>

      {/* Motif panel */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: 72,
          top: 127,
          width: 376,
          height: 376,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 24,
          backgroundColor: "rgba(255,255,255,0.04)",
          border: "2px solid rgba(255,255,255,0.10)",
        }}
      >
        {motif.art}
      </div>

      {/* Footer URL */}
      <div
        style={{
          position: "absolute",
          right: 72,
          bottom: 36,
          fontFamily: "Geist Mono",
          fontSize: 20,
          color: "#565d72",
        }}
      >
        gamekitui.com
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Entry                                     */
/* -------------------------------------------------------------------------- */

// Titles/descriptions for the non-game docs pages (kept in sync by hand —
// importing the fumadocs source here would drag MDX into the image route).
const DOC_PAGES: Record<string, { title: string; description: string }> = {
  "": { title: "Docs", description: siteConfig.description },
  installation: {
    title: "Installation",
    description: "Install any game with the shadcn CLI. One file, zero deps, zero assets.",
  },
};

export async function docsOgImage(slug: string[] | undefined): Promise<ImageResponse> {
  const fonts = await loadFonts();

  let card: OgCardProps;
  const gameName = slug?.[0] === "games" ? slug[1] : undefined;
  const game = gameName ? getGame(gameName) : undefined;

  if (game) {
    card = {
      title: game.title,
      // First sentence only — OG cards want a hook, not a spec.
      description: game.description.split(". ")[0]!.replace(/\.?$/, "."),
      pill: `npx shadcn add @gamekitui/${game.name}`,
      motif: MOTIFS[game.name] ?? GENERIC_MOTIF,
    };
  } else {
    const doc = DOC_PAGES[slug?.join("/") ?? ""] ?? {
      title: "Docs",
      description: siteConfig.description,
    };
    card = {
      title: doc.title,
      description: doc.description,
      pill: siteConfig.tagline,
      motif: GENERIC_MOTIF,
    };
  }

  return new ImageResponse(<OgCard {...card} />, { ...OG_SIZE, fonts });
}
