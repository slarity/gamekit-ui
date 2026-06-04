"use client";

import { cn } from "@gamekitui/ui/lib/utils";
import * as React from "react";
import { getAccentHue, onThemeChange, setAccentHue } from "@/components/theme-customizer";

// The four CRT-phosphor brand accents, mapped to the live-theming hue engine.
const SWATCHES = [
  { name: "Phosphor green", hue: 150, color: "oklch(0.872 0.205 148)" },
  { name: "Hot magenta", hue: 350, color: "oklch(0.72 0.25 350)" },
  { name: "Cyan", hue: 205, color: "oklch(0.84 0.135 205)" },
  { name: "Amber", hue: 78, color: "oklch(0.84 0.155 78)" },
] as const;

/** "Theme it live" swatches — recolor the whole site (and the games) on click. */
export function ThemeSwatches({ className }: { className?: string }) {
  const [hue, setHue] = React.useState<number | null>(150);

  React.useEffect(() => {
    setHue(getAccentHue());
    return onThemeChange((s) => setHue(s.hue));
  }, []);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
        Theme it live
      </span>
      <div className="flex gap-2">
        {SWATCHES.map((s) => {
          const active = hue === s.hue;
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => setAccentHue(s.hue)}
              aria-label={s.name}
              aria-pressed={active}
              className={cn(
                "size-6 ring-offset-2 ring-offset-background transition-all",
                active ? "ring-2 ring-ring" : "hover:-translate-y-0.5",
              )}
              style={{ background: s.color }}
            />
          );
        })}
      </div>
    </div>
  );
}
