"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { MOTION_STORAGE_KEY } from "@/components/shared/theme";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Appearance controls shared by the site and the panel (spec §5.6). Imports
 * NO Radix overlay (Popover, ToggleGroup…), so public pages never pull them in
 * through here. Labels come from `common` (shipped to the site client).
 */

const noop = () => () => {};
/** false on the server and during hydration, true after mount. */
const useMounted = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

/** Light/dark toggle button (cycles light ↔ dark). */
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

const MODES = [
  { value: "light", Icon: SunIcon },
  { value: "dark", Icon: MoonIcon },
  { value: "system", Icon: MonitorIcon },
] as const;

/** Light / Dark / System as a native segmented control (three `aria-pressed` buttons). */
export function AppearanceModeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const t = useT();
  return (
    <div
      role="group"
      aria-label={t.common.appearance}
      className={cn("grid grid-cols-3 gap-0.5 rounded-lg bg-muted p-0.5", className)}
    >
      {MODES.map(({ value, Icon }) => {
        const pressed = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={pressed}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              pressed && "bg-card text-foreground shadow-card",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {t.common[value]}
          </button>
        );
      })}
    </div>
  );
}

function subscribeMotion(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  return () => mo.disconnect();
}
const readMotion = () => document.documentElement.getAttribute("data-motion") === "reduce";

/**
 * The site's "Reduce motion" switch: `html[data-motion=reduce]` (mirrors the
 * OS setting in CSS) persisted in `localStorage gt-motion`; bootInitScript
 * re-applies it before paint.
 */
export function useMotionPref() {
  const reduced = useSyncExternalStore(subscribeMotion, readMotion, () => false);
  const setReduced = (on: boolean) => {
    if (on) document.documentElement.setAttribute("data-motion", "reduce");
    else document.documentElement.removeAttribute("data-motion");
    try {
      if (on) localStorage.setItem(MOTION_STORAGE_KEY, "reduce");
      else localStorage.removeItem(MOTION_STORAGE_KEY);
    } catch {}
  };
  return { reduced, setReduced };
}
