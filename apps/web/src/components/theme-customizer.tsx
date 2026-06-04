"use client";

import { Button } from "@gamekitui/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@gamekitui/ui/components/sheet";
import { cn } from "@gamekitui/ui/lib/utils";
import { Monitor, Moon, RotateCcw, Sliders, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

const STORAGE_KEY = "gamekitui:ui";
const STYLE_ID = "gamekitui-theme";

type Settings = { hue: number | null; radius: number };
const DEFAULTS: Settings = { hue: null, radius: 0.625 };

// Build a CSS string with separate :root (light) and .dark blocks — the tweakcn
// approach. We only recolor the brand tokens (primary/accent/ring) and always
// pair them with a white foreground; structural tokens (secondary, muted,
// background…) are left to the base theme so contrast stays correct in both modes.
function buildCss(hue: number | null, radius: number): string {
  let css = "";
  if (hue !== null) {
    const a = (hue + 35) % 360;
    const light = [
      `--primary: oklch(0.55 0.2 ${hue})`,
      `--primary-foreground: oklch(0.985 0 0)`,
      `--accent: oklch(0.58 0.17 ${a})`,
      `--accent-foreground: oklch(0.985 0 0)`,
      `--ring: oklch(0.55 0.2 ${hue})`,
    ].join(";");
    const dark = [
      `--primary: oklch(0.68 0.17 ${hue})`,
      `--primary-foreground: oklch(0.18 0.02 ${hue})`,
      `--accent: oklch(0.62 0.16 ${a})`,
      `--accent-foreground: oklch(0.985 0 0)`,
      `--ring: oklch(0.68 0.17 ${hue})`,
    ].join(";");
    css += `:root{${light}}.dark{${dark}}`;
  }
  css += `:root{--radius:${radius}rem}`;
  return css;
}

function apply(settings: Settings) {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = buildCss(settings.hue, settings.radius);
}

function read(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULTS;
}

const PRESETS: { name: string; hue: number | null; swatch: string }[] = [
  { name: "Neutral", hue: null, swatch: "oklch(0.45 0 0)" },
  { name: "Blue", hue: 256, swatch: "oklch(0.62 0.19 256)" },
  { name: "Violet", hue: 296, swatch: "oklch(0.62 0.19 296)" },
  { name: "Rose", hue: 12, swatch: "oklch(0.62 0.19 12)" },
  { name: "Orange", hue: 55, swatch: "oklch(0.62 0.19 55)" },
  { name: "Green", hue: 150, swatch: "oklch(0.62 0.19 150)" },
];

const RADII: { name: string; value: number }[] = [
  { name: "Sharp", value: 0 },
  { name: "Default", value: 0.625 },
  { name: "Round", value: 1 },
];

/** Applies persisted settings on mount (used site-wide, mounted once in layout). */
export function ThemeCustomizerInit() {
  React.useEffect(() => {
    apply(read());
  }, []);
  return null;
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: React.ReactNode; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg ring-1 ring-foreground/10">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 font-medium text-xs transition-colors",
            value === o.value
              ? "bg-background text-foreground rounded-lg ring-1 ring-foreground/10"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ThemeCustomizer() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = React.useState<Settings>(DEFAULTS);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setSettings(read());
    setMounted(true);
  }, []);

  const update = React.useCallback((next: Settings) => {
    setSettings(next);
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const reset = React.useCallback(() => {
    setTheme("system");
    update(DEFAULTS);
  }, [setTheme, update]);

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="default"
            size="lg"
            className="fixed right-4 bottom-4 z-50 shadow-lg rounded-lg ring-1 ring-foreground/10"
            aria-label="Customize theme"
          />
        }
      >
        <Sliders />
        <span className="hidden sm:inline">Customize</span>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 gap-0 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Customize UI</SheetTitle>
          <SheetDescription className="text-xs">
            Tweak the theme on any page and watch the games recolor live. Saved to this browser.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 p-4">
          {/* Mode */}
          <div className="space-y-2">
            <p className="font-medium text-sm">Mode</p>
            <Segmented
              value={mounted ? (theme ?? "system") : "system"}
              onChange={(v) => setTheme(v)}
              options={[
                { label: <><Sun className="size-3.5" /> Light</>, value: "light" },
                { label: <><Moon className="size-3.5" /> Dark</>, value: "dark" },
                { label: <><Monitor className="size-3.5" /> System</>, value: "system" },
              ]}
            />
          </div>

          {/* Accent presets */}
          <div className="space-y-2">
            <p className="font-medium text-sm">Accent</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const active = settings.hue === p.hue;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => update({ ...settings, hue: p.hue })}
                    title={p.name}
                    aria-pressed={active}
                    className={cn(
                      "size-7 ring-offset-2 ring-offset-background transition-all",
                      active ? "ring-2 ring-ring" : "hover:scale-110",
                    )}
                    style={{ background: p.swatch }}
                  />
                );
              })}
            </div>
          </div>

          {/* Hue slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">Hue</p>
              <span className="text-muted-foreground text-xs tabular-nums">
                {settings.hue === null ? "—" : Math.round(settings.hue)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={settings.hue ?? 256}
              onChange={(e) => update({ ...settings, hue: Number(e.target.value) })}
              className="h-2 w-full cursor-pointer appearance-none rounded-full"
              style={{
                background:
                  "linear-gradient(to right, oklch(0.62 0.19 0), oklch(0.62 0.19 60), oklch(0.62 0.19 120), oklch(0.62 0.19 180), oklch(0.62 0.19 240), oklch(0.62 0.19 300), oklch(0.62 0.19 360))",
              }}
            />
          </div>

          {/* Radius */}
          <div className="space-y-2">
            <p className="font-medium text-sm">Radius</p>
            <Segmented
              value={settings.radius}
              onChange={(v) => update({ ...settings, radius: v })}
              options={RADII.map((r) => ({ label: r.name, value: r.value }))}
            />
          </div>

          <Button variant="outline" size="sm" onClick={reset} className="w-full">
            <RotateCcw />
            Reset to defaults
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
