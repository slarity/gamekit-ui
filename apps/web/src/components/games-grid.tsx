"use client";

import { Badge } from "@gamekitui/ui/components/badge";
import { cn } from "@gamekitui/ui/lib/utils";
import { Keyboard, Monitor, MousePointer2, Smartphone } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";
import { GamePreview } from "@/components/game-preview";
import { GAMES, type GameMeta } from "@/registry/games";

type Filter = "all" | "mobile" | "desktop";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "desktop", label: "Desktop" },
  { value: "mobile", label: "Mobile" },
];

function ControlIcons({ game }: { game: GameMeta }) {
  const items = [
    { on: game.controls.keyboard, Icon: Keyboard, label: "Keyboard" },
    { on: game.controls.mouse, Icon: MousePointer2, label: "Mouse" },
    { on: game.controls.touch, Icon: Smartphone, label: "Touch" },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {items.map(({ on, Icon, label }) => (
        <span
          key={label}
          title={`${label} ${on ? "supported" : "not supported"}`}
          className={cn(on ? "text-foreground" : "text-muted-foreground/30")}
        >
          <Icon className="size-3.5" />
        </span>
      ))}
    </div>
  );
}

export function GamesGrid() {
  const [filter, setFilter] = React.useState<Filter>("all");

  const games = GAMES.filter((g) => {
    if (filter === "mobile") return g.platforms.mobile;
    if (filter === "desktop") return g.platforms.desktop;
    return true;
  });

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">Filter:</span>
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg ring-1 ring-foreground/10">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "px-2.5 py-1 font-medium text-xs transition-colors",
                filter === f.value
                  ? "bg-background text-foreground rounded-lg ring-1 ring-foreground/10"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-muted-foreground text-sm tabular-nums">{games.length} games</span>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {games.map((game) => (
          <div
            key={game.name}
            className="group flex flex-col overflow-hidden bg-card rounded-lg ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/20"
          >
            <div className="flex items-start justify-between gap-3 p-5 pb-4">
              <div className="min-w-0">
                <Link
                  href={`/docs/games/${game.name}` as Route}
                  className="font-medium text-base underline-offset-4 hover:underline"
                >
                  {game.title}
                </Link>
                <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">{game.description}</p>
              </div>
              <Badge variant="outline" className="shrink-0 capitalize">
                {game.surface}
              </Badge>
            </div>

            <div className="flex items-center gap-3 px-5 pb-4 text-muted-foreground text-xs">
              <ControlIcons game={game} />
              <span className="h-3 w-px bg-border" />
              <span className="flex items-center gap-1" title={game.platforms.desktop ? "Desktop optimized" : ""}>
                <Monitor className={cn("size-3.5", game.platforms.desktop ? "text-foreground" : "text-muted-foreground/30")} />
              </span>
              <span
                className="flex items-center gap-1"
                title={game.platforms.mobile ? "Mobile optimized" : "Not optimized for mobile"}
              >
                <Smartphone className={cn("size-3.5", game.platforms.mobile ? "text-foreground" : "text-muted-foreground/30")} />
                {!game.platforms.mobile && <span className="text-[10px]">desktop only</span>}
              </span>
            </div>

            <div className="relative grid min-h-[300px] flex-1 place-items-center overflow-hidden border-t bg-dots p-6">
              <div className="mx-auto w-full max-w-[340px]">
                <GamePreview name={game.name} autoFocus={false} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
