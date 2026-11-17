"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { CheckIcon, SlidersHorizontalIcon } from "lucide-react";
import { AppearanceModeToggle } from "@/components/shell/appearance";
import { presetScales } from "@/components/shared/design-tokens";
import { colorPresets, presetSwatches } from "@/components/shared/theme";
import { usePreset } from "@/components/shared/theme-controls";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useGuideTips } from "./panel-guide";
import { defaultShell, dockSizes, type DockSize } from "./panel-prefs";
import { usePanelUI } from "./panel-ui";

const noop = () => () => {};
const useMounted = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

function Tile({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl bg-muted/60 p-2.5", className)}>
      {label && <p className="mb-2 px-0.5 text-xs font-bold text-muted-foreground">{label}</p>}
      {children}
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 text-[13px] font-medium hover:bg-accent">
      <span className="min-w-0">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/** Dock size as a native segmented control (S/M/L = 40/48/56px). */
export function DockSizeToggle({ className }: { className?: string }) {
  const t = useT();
  const mounted = useMounted();
  const { shell, setShell } = usePanelUI();
  const current = (shell ?? defaultShell).dock;
  const labels: Record<DockSize, string> = {
    40: t.panel.dockSmall,
    48: t.panel.dockMedium,
    56: t.panel.dockLarge,
  };
  return (
    <div
      role="group"
      aria-label={t.panel.dockSize}
      className={cn("grid grid-cols-3 gap-0.5 rounded-lg bg-muted p-0.5", className)}
    >
      {dockSizes.map((size) => {
        const pressed = mounted && current === size;
        return (
          <button
            key={size}
            type="button"
            aria-pressed={pressed}
            onClick={() => setShell({ dock: size })}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              pressed && "bg-card text-foreground shadow-card",
            )}
          >
            <span
              aria-hidden
              className="rounded-[3px] border-[1.5px] border-current"
              style={{ width: size / 5, height: size / 5 }}
            />
            {labels[size]}
          </button>
        );
      })}
    </div>
  );
}

/** The 7 colour presets as round swatches with localized names. */
export function PresetSwatches({ className }: { className?: string }) {
  const t = useT();
  const mounted = useMounted();
  const { preset, setPreset } = usePreset();
  return (
    <div
      role="group"
      aria-label={t.common.colorPreset}
      className={cn("flex flex-wrap justify-between gap-1", className)}
    >
      {colorPresets.map((p) => {
        const on = mounted && preset === p;
        return (
          <button
            key={p}
            type="button"
            aria-pressed={on}
            aria-label={t.settings[`preset_${p}`]}
            title={t.settings[`preset_${p}`]}
            onClick={() => setPreset(p)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full transition-transform",
                on ? "ring-2 ring-foreground/70 ring-offset-2 ring-offset-muted" : "hover:scale-110",
              )}
              style={{ backgroundColor: presetSwatches[p] }}
            >
              {on && (
                <CheckIcon
                  className="size-3.5"
                  strokeWidth={3}
                  style={{ color: presetScales[p].contrast }}
                  aria-hidden
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Control Center (spec §11.2): a Radix Popover, closed by default (so no
 * always-mounted dialog). Mode, accent, dock size, magnification, auto-hide,
 * full-width windows and guide tips.
 */
export function ControlCenter() {
  const t = useT();
  const mounted = useMounted();
  const { shell, setShell } = usePanelUI();
  const prefs = shell ?? defaultShell;
  const [tipsOn, setTipsOn] = useGuideTips();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="os-mb-item os-mb-icon" aria-label={t.common.controlCenter}>
          <SlidersHorizontalIcon className="size-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={8}
        className="w-80 space-y-2 rounded-[14px] p-2"
      >
        <Tile label={t.common.appearance}>
          <AppearanceModeToggle className="bg-background/70" />
        </Tile>
        <Tile label={t.common.colorPreset}>
          <PresetSwatches />
        </Tile>
        <Tile label={t.panel.dockSize}>
          <DockSizeToggle className="bg-background/70" />
        </Tile>
        <Tile className="space-y-0.5 p-1.5">
          <SwitchRow
            label={t.panel.dockMagnify}
            checked={mounted && prefs.magnify}
            onChange={(v) => setShell({ magnify: v })}
          />
          <SwitchRow
            label={t.panel.dockAutohide}
            checked={mounted && prefs.autohide}
            onChange={(v) => setShell({ autohide: v })}
          />
          <SwitchRow
            label={t.panel.windowWide}
            checked={mounted && prefs.wide}
            onChange={(v) => setShell({ wide: v })}
          />
          <SwitchRow label={t.panel.guideTips} checked={mounted && tipsOn} onChange={setTipsOn} />
        </Tile>
      </PopoverContent>
    </Popover>
  );
}
