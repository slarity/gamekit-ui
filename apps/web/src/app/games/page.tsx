import { GamesGrid } from "@/components/games-grid";
import { GAMES } from "@/registry/games";

export const metadata = {
  title: "Games",
  description:
    "Browse every GameKit UI game — Snake, 2048, Minesweeper, Pong and more. Each is a single drop-in TSX file with zero dependencies, installed with the shadcn CLI and themed to match your app.",
  alternates: { canonical: "/games" },
  openGraph: {
    title: "Games — GameKit UI",
    description: "Minimal, themeable, drop-in browser games for shadcn, installed with the shadcn CLI.",
    url: "/games",
  },
};

export default function GamesPage() {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-14">
      <div className="max-w-2xl space-y-3">
        <h1 className="font-semibold text-4xl tracking-tight">Games</h1>
        <p className="text-muted-foreground leading-relaxed">
          {GAMES.length} tiny browser games as drop-in React components. Each inherits your shadcn
          theme automatically — change a token and the playfield recolors.
        </p>
      </div>

      <div className="mt-10">
        <GamesGrid />
      </div>
    </main>
  );
}
