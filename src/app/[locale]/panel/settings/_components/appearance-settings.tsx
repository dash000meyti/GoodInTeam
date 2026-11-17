"use client";

import { useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { useTheme } from "next-themes";
import {
  AppWindowIcon,
  CheckIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  SunIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { DockSizeToggle } from "@/components/panel/control-center";
import { useGuideTips } from "@/components/panel/panel-guide";
import { defaultShell, type ShellPrefs } from "@/components/panel/panel-prefs";
import { usePanelUI } from "@/components/panel/panel-ui";
import { PRESET_SCOPE_CLASS, presetStyle } from "@/components/shared/design-tokens";
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
        "group relative flex cursor-pointer flex-col gap-3 rounded-2xl border-2 p-2 text-start transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary-ink shadow-primary"
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
            selected ? "border-primary-ink bg-primary text-primary-foreground" : "border-grey-400",
          )}
        >
          {selected && <CheckIcon className="size-3" strokeWidth={3} />}
        </span>
      </span>
    </button>
  );
}

/**
 * A tiny OS desktop drawn with grey tokens (independent of the active theme):
 * menu bar, a window with lights and the dock. Reflects the dock size, the
 * full-width window, auto-hide and magnification when given `prefs`.
 */
export function DesktopMock({
  mode,
  prefs = defaultShell,
  className,
}: {
  mode: "light" | "dark";
  prefs?: ShellPrefs;
  className?: string;
}) {
  const d = mode === "dark";
  const tile = prefs.dock === 40 ? 8 : prefs.dock === 56 ? 12 : 10;
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex h-28 w-full flex-col overflow-hidden rounded-xl border",
        d ? "border-grey-700 bg-[#0e0e10]" : "border-grey-300 bg-[#e6e6e9]",
        className,
      )}
      style={{
        backgroundImage: `radial-gradient(${d ? "rgb(255 255 255/.08)" : "rgb(106 106 108/.3)"} 0.6px, transparent 1px)`,
        backgroundSize: "6px 6px",
      }}
    >
      <span
        className={cn(
          "flex h-2.5 shrink-0 items-center gap-1 px-1.5",
          d ? "bg-grey-900/80" : "bg-white/80",
        )}
      >
        <span className="size-1.5 bg-primary" />
        <span className={cn("h-1 w-4 rounded-full", d ? "bg-grey-600" : "bg-grey-400")} />
        <span className={cn("h-1 w-3 rounded-full", d ? "bg-grey-700" : "bg-grey-300")} />
        <span className={cn("ms-auto h-1 w-5 rounded-full", d ? "bg-grey-700" : "bg-grey-300")} />
      </span>
      <span
        className={cn(
          "mt-1.5 flex flex-1 flex-col overflow-hidden rounded-t-md border border-b-0 transition-[margin] duration-200",
          prefs.wide ? "mx-1" : "mx-5",
          d ? "border-grey-700 bg-[#161618]" : "border-grey-300 bg-[#f3f3f3]",
        )}
      >
        <span
          className={cn(
            "flex h-2.5 shrink-0 items-center gap-0.5 border-b px-1",
            d ? "border-grey-700" : "border-grey-300",
          )}
        >
          <span className="size-1 bg-[#ff5f57]" />
          <span className="size-1 bg-[#febc2e]" />
          <span className="size-1 bg-[#28c840]" />
        </span>
        <span className="flex flex-1 flex-col gap-1.5 p-2">
          <span className={cn("h-1.5 w-1/3 rounded-full", d ? "bg-grey-600" : "bg-grey-400")} />
          <span className="grid flex-1 grid-cols-3 gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  "flex flex-col justify-end gap-0.5 rounded-sm p-1",
                  d ? "bg-grey-800" : "bg-white shadow-sm",
                )}
              >
                <span
                  className={cn("h-0.5 w-3/4 rounded-full", d ? "bg-grey-700" : "bg-grey-300")}
                />
                <span className={cn("h-0.5 rounded-full bg-primary", i ? "w-1/2" : "w-2/3")} />
              </span>
            ))}
          </span>
        </span>
      </span>
      <span
        className={cn(
          "absolute inset-x-0 bottom-1 mx-auto flex w-fit items-end gap-0.5 rounded-[4px] border p-0.5 transition-transform duration-200",
          d ? "border-grey-700 bg-grey-800/90" : "border-grey-300 bg-white/90",
          prefs.autohide && "translate-y-[calc(100%+4px)]",
        )}
      >
        {Array.from({ length: 7 }).map((_, i) => {
          const big = prefs.magnify && i === 3;
          const near = prefs.magnify && (i === 2 || i === 4);
          return (
            <span
              key={i}
              className={cn(
                "rounded-[2px]",
                i === 0 ? "bg-primary" : d ? "bg-grey-600" : "bg-grey-300",
              )}
              style={{
                width: big ? tile * 1.5 : near ? tile * 1.2 : tile,
                height: big ? tile * 1.5 : near ? tile * 1.2 : tile,
              }}
            />
          );
        })}
      </span>
    </span>
  );
}

function SwitchField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60">
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/** Settings → Appearance: theme mode, primary color preset and Desktop & Dock. */
export function AppearanceSettings() {
  const t = useT();
  const s = t.settings;
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();
  const { preset, setPreset } = usePreset();
  const { shell, setShell } = usePanelUI();
  const [tipsOn, setTipsOn] = useGuideTips();
  const current = mounted ? (theme ?? "system") : null;
  const prefs = shell ?? defaultShell;

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
            <DesktopMock mode="light" />
          </Choice>
          <Choice
            selected={current === "dark"}
            onSelect={() => setTheme("dark")}
            label={s.mode_dark}
            icon={<MoonIcon className="size-4 text-muted-foreground" />}
          >
            <DesktopMock mode="dark" />
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
                <DesktopMock mode="light" />
              </span>
              <span className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]">
                <DesktopMock mode="dark" />
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
              {/* PRESET_SCOPE_CLASS re-derives the preset's ink, hover and ring (spec §3.1). */}
              <span
                style={presetStyle(p) as CSSProperties}
                className={cn(
                  PRESET_SCOPE_CLASS,
                  "flex flex-col gap-3 rounded-xl bg-card p-3 shadow-card dark:border",
                )}
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

      <SettingsCard icon={AppWindowIcon} title={s.desktopDock} description={s.desktopDockHint}>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-start">
          <div className="space-y-2 md:order-2">
            <DesktopMock
              mode="light"
              prefs={mounted ? prefs : defaultShell}
              className="h-44 dark:hidden"
            />
            <DesktopMock
              mode="dark"
              prefs={mounted ? prefs : defaultShell}
              className="hidden h-44 dark:flex"
            />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold">{t.panel.dockSize}</p>
              <DockSizeToggle className="max-w-sm" />
            </div>
            <div className="-mx-3 space-y-0.5">
              <SwitchField
                label={t.panel.dockMagnify}
                checked={mounted && prefs.magnify}
                onChange={(v) => setShell({ magnify: v })}
              />
              <SwitchField
                label={t.panel.dockAutohide}
                checked={mounted && prefs.autohide}
                onChange={(v) => setShell({ autohide: v })}
              />
              <SwitchField
                label={t.panel.windowWide}
                checked={mounted && prefs.wide}
                onChange={(v) => setShell({ wide: v })}
              />
              <SwitchField
                label={t.panel.guideTips}
                hint={t.guide.tipsAuto}
                checked={mounted && tipsOn}
                onChange={setTipsOn}
              />
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
