import { cn } from "@gamekitui/ui/lib/utils";

// Classic 11×8 space-invader "crab" bitmap. Cells render in `currentColor`,
// so colour comes from the parent's text color (e.g. `text-primary`).
const INVADER = [
  "00100000100",
  "00010001000",
  "00111111100",
  "01101110110",
  "11111111111",
  "10111111101",
  "10100000101",
  "00011011000",
];

const CELLS = INVADER.join("").split("");

/**
 * The GameKit mark — a pixel-hard space invader. Keep it crisp: no gradients,
 * no shadows, recolour only via `text-*`. Give it one mark-height of clearspace.
 */
export function PixelInvader({
  className,
  "aria-label": ariaLabel,
}: {
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <span
      className={cn("invader", className)}
      role="img"
      aria-label={ariaLabel ?? "GameKit invader mark"}
    >
      {CELLS.map((cell, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length static bitmap
        <i key={i} className={cell === "1" ? "on" : undefined} aria-hidden="true" />
      ))}
    </span>
  );
}
