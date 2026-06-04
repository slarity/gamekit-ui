import { Badge } from "@gamekitui/ui/components/badge";
import { cn } from "@gamekitui/ui/lib/utils";
import { Check, Keyboard, Monitor, MousePointer2, Smartphone, X } from "lucide-react";
import { getGame } from "@/registry/games";

function Support({ on, icon: Icon, label }: { on: boolean; icon: typeof Keyboard; label: string }) {
  return (
    <div className="flex items-center gap-2 bg-card p-3 rounded-lg ring-1 ring-foreground/10">
      <Icon className="size-4 text-muted-foreground" />
      <span className="inline-flex items-center gap-1.5 text-sm">
        {on ? <Check className="size-4 text-foreground" /> : <X className="size-4 text-muted-foreground/40" />}
        <span className={on ? "text-foreground" : "text-muted-foreground line-through"}>{label}</span>
      </span>
    </div>
  );
}

/** Platform + controls summary for a game, used in docs (MDX) and elsewhere. */
export function GameInfo({ name }: { name: string }) {
  const game = getGame(name);
  if (!game) return null;
  return (
    <div className="not-prose my-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="capitalize">
          {game.surface}
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <Monitor className="size-3" /> Desktop
        </Badge>
        <Badge variant={game.platforms.mobile ? "secondary" : "outline"} className={cn("gap-1", !game.platforms.mobile && "text-muted-foreground")}>
          <Smartphone className="size-3" />
          {game.platforms.mobile ? "Mobile" : "Not mobile-optimized"}
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Support on={game.controls.keyboard} icon={Keyboard} label="Keyboard" />
        <Support on={game.controls.mouse} icon={MousePointer2} label="Mouse" />
        <Support on={game.controls.touch} icon={Smartphone} label="Touch" />
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">{game.controls.help}</p>
    </div>
  );
}
