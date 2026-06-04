import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0a0a0a",
        color: "#fafafa",
        padding: 80,
        fontFamily: "sans-serif",
        backgroundImage: "radial-gradient(circle at 1px 1px, #262626 1px, transparent 0)",
        backgroundSize: "32px 32px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ fontSize: 60, display: "flex" }}>👾</div>
        <div style={{ fontSize: 34, fontWeight: 600 }}>{siteConfig.name}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900 }}>
          Drop-in browser games for shadcn.
        </div>
        <div style={{ fontSize: 32, color: "#a3a3a3", maxWidth: 880 }}>
          Tiny, themeable React/TSX games. Install with the shadcn CLI — zero deps, zero assets.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26, color: "#a3a3a3" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            border: "1px solid #262626",
            borderRadius: 8,
            padding: "10px 18px",
            fontFamily: "monospace",
            color: "#fafafa",
          }}
        >
          npx shadcn@latest add gamekitui.com/r/snake.json
        </div>
      </div>
    </div>,
    { ...size },
  );
}
