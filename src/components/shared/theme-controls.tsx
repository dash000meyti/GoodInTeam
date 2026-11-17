"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { CheckIcon, MonitorIcon, MoonIcon, PaletteIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

// Shared with the site (no Radix): re-exported for existing panel imports.
export { AppearanceModeToggle, ThemeToggle, useMotionPref } from "@/components/shell/appearance";
import { presetScales } from "./design-tokens";
import {
  colorPresets,
  DEFAULT_PRESET,
  presetSwatches,
  PRESET_STORAGE_KEY,
  type ColorPreset,
} from "./theme";

// The preset lives on <html data-preset>; every hook instance (header menu,
// Settings → Appearance) observes the attribute so they stay in sync.
function subscribePreset(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-preset"] });
  return () => mo.disconnect();
}
const readPreset = () =>
  (document.documentElement.getAttribute("data-preset") as ColorPreset | null) ?? DEFAULT_PRESET;

/** Current color preset + setter (persists to localStorage). */
export function usePreset() {
  const preset = useSyncExternalStore(subscribePreset, readPreset, () => DEFAULT_PRESET);
  const setPreset = (p: ColorPreset) => {
    if (p === DEFAULT_PRESET) document.documentElement.removeAttribute("data-preset");
    else document.documentElement.setAttribute("data-preset", p);
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, p);
    } catch {}
  };
  return { preset, setPreset };
}

/** Minimals-like settings popover: mode + primary color preset. */
export function AppearanceMenu({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { preset, setPreset } = usePreset();
  const t = useT();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("rounded-full", className)}
          aria-label={t.common.theme}
        >
          <PaletteIcon className="size-[18px]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground">{t.common.theme}</p>
          <ToggleGroup
            type="single"
            value={theme}
            onValueChange={(v) => v && setTheme(v)}
            className="w-full"
          >
            <ToggleGroupItem value="light" className="flex-1">
              <SunIcon /> {t.common.light}
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" className="flex-1">
              <MoonIcon /> {t.common.dark}
            </ToggleGroupItem>
            <ToggleGroupItem value="system" className="flex-1" aria-label={t.common.system}>
              <MonitorIcon />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground">{t.common.colorPreset}</p>
          <div className="grid grid-cols-7 gap-2">
            {colorPresets.map((p) => (
              <button
                key={p}
                type="button"
                aria-label={t.settings[`preset_${p}`]}
                onClick={() => setPreset(p)}
                className={cn(
                  "flex aspect-square cursor-pointer items-center justify-center rounded-lg border transition-transform hover:scale-105",
                  preset === p ? "border-foreground/40" : "border-transparent",
                )}
                style={{ backgroundColor: `${presetSwatches[p]}22` }}
              >
                <span
                  className="flex size-5 items-center justify-center rounded-full"
                  style={{ backgroundColor: presetSwatches[p] }}
                >
                  {preset === p && (
                    <CheckIcon
                      className="size-3"
                      style={{ color: presetScales[p].contrast }}
                      strokeWidth={3}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
