"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { CheckIcon, MonitorIcon, MoonIcon, PaletteIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { colorPresets, presetSwatches, PRESET_STORAGE_KEY, type ColorPreset } from "./theme";

function usePreset() {
  const [preset, setPresetState] = useState<ColorPreset>("green");
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-preset") as ColorPreset | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with pre-paint script
    setPresetState(current ?? "green");
  }, []);
  const setPreset = (p: ColorPreset) => {
    setPresetState(p);
    if (p === "green") document.documentElement.removeAttribute("data-preset");
    else document.documentElement.setAttribute("data-preset", p);
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, p);
    } catch {}
  };
  return { preset, setPreset };
}

/** Light/dark toggle button (cycles light → dark). */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useT();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("rounded-full", className)}
      aria-label={t.common.toggleTheme}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunIcon className="size-[18px] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <MoonIcon className="absolute size-[18px] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    </Button>
  );
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
          <div className="grid grid-cols-6 gap-2">
            {colorPresets.map((p) => (
              <button
                key={p}
                type="button"
                aria-label={p}
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
                  {preset === p && <CheckIcon className="size-3 text-white" strokeWidth={3} />}
                </span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
