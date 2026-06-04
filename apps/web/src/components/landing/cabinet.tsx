import { GamePreview } from "@/components/game-preview";

/**
 * CRT arcade cabinet that frames the live, themeable Snake. The game brings its
 * own start button / score, so the cabinet only adds chrome: marquee, screen
 * glass, and a footer hint.
 */
export function Cabinet() {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[0_40px_90px_-50px_#000] ring-1 ring-foreground/5">
      {/* Marquee */}
      <div className="flex items-center justify-between px-2 pt-1 pb-3 font-pixel text-[10px] text-muted-foreground">
        <span>
          <span className="text-primary">GAMEKIT</span> // SNAKE
        </span>
        <span className="blink text-primary">●</span>
      </div>

      {/* Screen */}
      <div className="crt-screen rounded-lg">
        <div className="relative z-[1] p-2">
          {/* Decorative on a scrollable page — click to play; don't capture scroll keys. */}
          <GamePreview name="snake" autoFocus={false} captureGlobalKeys={false} />
        </div>
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-center gap-2 pt-3 text-center font-mono text-[11px] text-muted-foreground">
        Recolor it — hit a{" "}
        <kbd className="rounded border border-b-2 bg-muted px-1.5 py-px text-foreground">swatch</kbd>{" "}
        and the playfield repaints live.
      </div>
    </div>
  );
}
