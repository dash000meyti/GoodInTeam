"use client";

import { useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { useTheme } from "next-themes";
import {
  CheckIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  PanelLeftIcon,
  SunIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePanelUI } from "@/components/panel/panel-ui";
import { presetStyle } from "@/components/shared/design-tokens";
import { colorPresets, type ColorPreset } from "@/components/shared/theme";
import { usePreset } from "@/components/shared/theme-controls";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { SettingsCard } from "./section";

const noop = () => () => {};
/** false during SSR/hydration, true after mount (theme comes from localStorage). */
const useMounted = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

function Choice({
  selected,
  onSelect,
  label,
  hint,
  icon,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  hint?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex cursor-pointer flex-col gap-3 rounded-2xl border-2 p-2 text-start transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
        selected
          ? "border-primary shadow-primary"
          : "border-transparent bg-muted/40 hover:border-foreground/15",
      )}
    >
      {children}
      <span className="flex items-center gap-2 px-2 pb-1">
        {icon}
        <span className="flex-1">
          <span className="block text-sm font-bold">{label}</span>
          {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
        </span>
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full border-2 transition-colors",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-grey-400",
          )}
        >
          {selected && <CheckIcon className="size-3" strokeWidth={3} />}
        </span>
      </span>
    </button>
  );
}

/** A tiny panel mock-up drawn with grey tokens (independent of the active theme). */
function PanelMock({ mode, collapsed = false }: { mode: "light" | "dark"; collapsed?: boolean }) {
  const d = mode === "dark";
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-28 w-full overflow-hidden rounded-xl border",
        d ? "border-grey-700 bg-grey-900" : "border-grey-300 bg-white",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 flex-col gap-1.5 border-e border-dashed p-2",
          collapsed ? "w-7 items-center" : "w-16",
          d ? "border-grey-700" : "border-grey-300",
        )}
      >
        <span className="size-3 rounded bg-primary" />
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full",
              collapsed ? "w-2.5" : i === 1 ? "w-10" : "w-8",
              i === 1 ? "bg-primary/60" : d ? "bg-grey-700" : "bg-grey-300",
            )}
          />
        ))}
      </span>
      <span className="flex flex-1 flex-col gap-2 p-2.5">
        <span className={cn("h-2 w-1/2 rounded-full", d ? "bg-grey-600" : "bg-grey-400")} />
        <span className="grid flex-1 grid-cols-2 gap-1.5">
          {[0, 1].map((i) => (
            <span
              key={i}
              className={cn(
                "flex flex-col justify-end gap-1 rounded-md p-1.5",
                d ? "bg-grey-800" : "bg-grey-100 shadow-sm",
              )}
            >
              <span className={cn("h-1 w-3/4 rounded-full", d ? "bg-grey-700" : "bg-grey-300")} />
              <span
                className={cn("h-1 rounded-full", i ? "w-1/2 bg-primary" : "w-2/3 bg-primary/50")}
              />
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

/** Settings → Appearance: theme mode, primary color preset and sidebar layout. */
export function AppearanceSettings() {
  const t = useT();
  const s = t.settings;
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();
  const { preset, setPreset } = usePreset();
  const { collapsed, toggleCollapsed } = usePanelUI();
  const current = mounted ? (theme ?? "system") : null;

  return (
    <div className="space-y-6">
      <SettingsCard icon={SunIcon} title={s.mode}>
        <div role="radiogroup" aria-label={s.mode} className="grid gap-4 sm:grid-cols-3">
          <Choice
            selected={current === "light"}
            onSelect={() => setTheme("light")}
            label={s.mode_light}
            icon={<SunIcon className="size-4 text-muted-foreground" />}
          >
            <PanelMock mode="light" />
          </Choice>
          <Choice
            selected={current === "dark"}
            onSelect={() => setTheme("dark")}
            label={s.mode_dark}
            icon={<MoonIcon className="size-4 text-muted-foreground" />}
          >
            <PanelMock mode="dark" />
          </Choice>
          <Choice
            selected={current === "system"}
            onSelect={() => setTheme("system")}
            label={s.mode_system}
            hint={s.mode_systemHint}
            icon={<MonitorIcon className="size-4 text-muted-foreground" />}
          >
            <span className="relative block h-28 w-full" aria-hidden>
              <span className="absolute inset-0 [clip-path:polygon(0_0,100%_0,0_100%)]">
                <PanelMock mode="light" />
              </span>
              <span className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]">
                <PanelMock mode="dark" />
              </span>
            </span>
          </Choice>
        </div>
      </SettingsCard>

      <SettingsCard icon={PaletteIcon} title={s.preset} description={s.presetHint}>
        <div
          role="radiogroup"
          aria-label={s.preset}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3"
        >
          {colorPresets.map((p: ColorPreset) => (
            <Choice
              key={p}
              selected={mounted && preset === p}
              onSelect={() => setPreset(p)}
              label={s[`preset_${p}`]}
            >
              <span
                style={presetStyle(p) as CSSProperties}
                className="flex flex-col gap-3 rounded-xl bg-card p-3 shadow-card dark:border"
              >
                <span className="flex items-center gap-2">
                  <span className="flex -space-x-1.5 rtl:space-x-reverse">
                    {["bg-primary-light", "bg-primary", "bg-primary-dark"].map((c) => (
                      <span key={c} className={cn("size-5 rounded-full ring-2 ring-card", c)} />
                    ))}
                  </span>
                  <Badge className="ms-auto">{s.sampleBadge}</Badge>
                </span>
                <span className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-primary">
                  {s.sampleButton}
                </span>
                <Progress value={64} />
              </span>
            </Choice>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard icon={PanelLeftIcon} title={s.sidebar} description={s.sidebarHint}>
        <div role="radiogroup" aria-label={s.sidebar} className="grid gap-4 sm:grid-cols-2">
          <Choice
            selected={mounted && !collapsed}
            onSelect={() => collapsed && toggleCollapsed()}
            label={s.sidebar_expanded}
          >
            <PanelMock mode="light" />
          </Choice>
          <Choice
            selected={mounted && collapsed}
            onSelect={() => !collapsed && toggleCollapsed()}
            label={s.sidebar_collapsed}
          >
            <PanelMock mode="light" collapsed />
          </Choice>
        </div>
      </SettingsCard>
    </div>
  );
}
