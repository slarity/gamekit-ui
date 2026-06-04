import { cn } from "@gamekitui/ui/lib/utils";
import { PixelInvader } from "@/components/pixel-invader";

/**
 * The GameKit UI lockup: pixel invader mark + pixel wordmark with a phosphor
 * "UI". Uses Press Start 2P (chrome only), so keep the size small and tight.
 */
export function BrandWordmark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <PixelInvader
        className={cn("w-[18px] text-primary", markClassName)}
        aria-label="GameKit UI home"
      />
      {/* Press Start 2P is single-weight; thicken the pixel strokes for a bolder mark. */}
      <span
        className="pixel text-[13px] leading-none tracking-tight"
        style={{ WebkitTextStroke: "0.6px currentColor" }}
      >
        GAMEKIT<span className="text-primary">UI</span>
      </span>
    </span>
  );
}
