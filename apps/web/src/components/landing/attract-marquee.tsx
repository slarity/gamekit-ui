import { GAMES } from "@/registry/games";

/** Attract-mode marquee — scrolling roll-call of the cabinet. Pauses on hover. */
export function AttractMarquee() {
  // Render the track twice so the -50% scroll loops seamlessly.
  const items = [...GAMES, ...GAMES];
  return (
    <div className="marquee border-y bg-card py-3.5" aria-hidden="true">
      <div className="marquee-track">
        {items.map((game, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: doubled static list
            key={`${game.name}-${i}`}
            className="flex items-center gap-3.5 whitespace-nowrap px-6 font-pixel text-[13px] text-muted-foreground leading-none"
          >
            <span
              aria-hidden="true"
              className="size-0 border-y-[3.5px] border-y-transparent border-l-[6px] border-l-primary"
            />
            {game.title}
            <span className="size-1.5 bg-muted-foreground/50" />
          </span>
        ))}
      </div>
    </div>
  );
}
