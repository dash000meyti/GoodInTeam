"use client";

import { useSyncExternalStore } from "react";
import {
  AppWindowIcon,
  GlobeIcon,
  LightbulbIcon,
  MagnetIcon,
  Maximize2Icon,
  PanelBottomCloseIcon,
} from "lucide-react";
import { PixelIcon } from "@/components/brand/pixel-art";
import { PixelMark } from "@/components/brand/pixel-logo";
import { Dock, DockTile, type DockEntry } from "@/components/shell/dock";
import { DockLinks } from "@/components/shell/dock-links";
import { localePath } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import type { UserRole } from "@/server/db/schema/auth";
import { getRunning, subscribe } from "./chrome-store";
import { CommandPalette, type PaletteCommand } from "./command-palette";
import { Launchpad } from "./launchpad";
import { mobilePins, navForRole, type NavItem } from "./nav-config";
import { NavIcon } from "./nav-icon";
import { MeTile, PanelGuideBubble, useGuideTips, usePanelGuide } from "./panel-guide";
import type { ShellPrefs } from "./panel-prefs";
import { usePanelUI } from "./panel-ui";

const APP = { "data-dock-app": "" } as const;

/**
 * The panel dock (spec §11.3), rendered by `SessionDock` with the role and the
 * server-read `gt-shell` prefs. Desktop (≥1024px): Me tile · Desktop/Portal
 * mark · one group per `navForRole` group except groupOverview · View site.
 * Below 1024px it is a tab bar of the role's `mobilePins` (+ More → Launchpad
 * for staff). Module tiles show their pixel icon (`NavItem.pixel`); View site
 * is `globe` and More is `more`, as on the site. Also mounts the ⌘K palette,
 * the Launchpad (only while open) and the panel guide bubble.
 */
export function PanelDock({ role, prefs }: { role: UserRole; prefs: ShellPrefs }) {
  const t = useT();
  const locale = useLocale();
  const { shell, setShell, setLaunchpadOpen } = usePanelUI();
  const p = shell ?? prefs;
  const running = useSyncExternalStore(subscribe, getRunning, () => 0);
  const guide = usePanelGuide(role);
  const [tipsOn, setTipsOn] = useGuideTips();

  const [overview, ...groups] = navForRole(role);
  const pins = new Set<string>(mobilePins[role]);
  const staff = role !== "client";
  const runningSr =
    running > 0
      ? `${locale === "fa" ? "، " : ", "}${format(t.time.runningCount, { n: formatNumber(running, locale) })}`
      : undefined;

  // Tab-bar labels for module names too long for a 5-tab bar (the desktop tile keeps the full name).
  const tabLabel: Partial<Record<NavItem["label"], string>> = {
    time: t.panel.tabTime,
    tasks: t.panel.tabTasks,
  };

  const link = (item: NavItem, mark = false): DockEntry[] => {
    const entry: DockEntry & { kind: "link" } = {
      kind: "link",
      key: item.label,
      href: localePath(locale, item.href),
      section: item.href,
      exact: item.exact,
      label: t.nav[item.label],
      variant: mark ? "mark" : "brand",
      icon: mark ? (
        <PixelMark cell={2} className="lg:[--cell:3px]" />
      ) : (
        <NavIcon item={item} lucideClassName="pm-dock-icon" />
      ),
      show: pins.has(item.label) ? "both" : "desktop",
      srExtra: item.label === "time" ? runningSr : undefined,
      attrs: APP,
    };
    const short = pins.has(item.label) ? tabLabel[item.label] : undefined;
    if (!short) return [entry];
    // The tab is a mobile-only twin (not a dock app: the [data-dock-app] count stays per role).
    return [
      { ...entry, show: "desktop" },
      { ...entry, key: `${item.label}-tab`, label: short, show: "mobile", attrs: undefined },
    ];
  };

  const entries: DockEntry[] = [
    { kind: "slot", key: "me", show: "desktop", node: <MeTile guide={guide} /> },
    { kind: "sep", key: "sep-me", show: "desktop" },
  ];
  if (overview?.items[0]) entries.push(...link(overview.items[0], true));
  for (const g of groups) {
    entries.push({ kind: "sep", key: `sep-${g.label}`, show: "desktop" });
    for (const item of g.items) entries.push(...link(item));
  }
  entries.push({ kind: "sep", key: "sep-site", show: "desktop" });
  entries.push({
    kind: "link",
    key: "site",
    href: localePath(locale, "/"),
    label: t.panel.viewSite,
    icon: <PixelIcon name="globe" cell={2} />,
    variant: "paper",
    external: true,
    show: "desktop",
  });
  if (staff)
    entries.push({
      kind: "slot",
      key: "more",
      show: "mobile",
      node: (
        <button
          type="button"
          className="os-dock-item"
          aria-haspopup="dialog"
          onClick={() => setLaunchpadOpen(true)}
        >
          <DockTile>
            <PixelIcon name="more" cell={2} />
          </DockTile>
          <span className="os-dock-label">{t.common.more}</span>
        </button>
      ),
    });

  // Desktop tiles (Me + mark + groups + View site) and separators feed the tile-size clamp.
  const n = 3 + groups.reduce((s, g) => s + g.items.length, 0);
  const seps = groups.length + 2;

  const group = t.panel.windowCommands;
  const commands: PaletteCommand[] = [
    {
      id: "zoom-window",
      label: t.panel.zoomWindow,
      group,
      icon: <Maximize2Icon />,
      run: () => setShell({ wide: !p.wide }),
    },
    {
      id: "dock-magnify",
      label: t.panel.toggleMagnify,
      group,
      icon: <MagnetIcon />,
      run: () => setShell({ magnify: !p.magnify }),
    },
    {
      id: "dock-autohide",
      label: t.panel.toggleAutohide,
      group,
      icon: <PanelBottomCloseIcon />,
      run: () => setShell({ autohide: !p.autohide }),
    },
    {
      id: "guide-tips",
      label: t.panel.guideTips,
      group,
      icon: <LightbulbIcon />,
      run: () => setTipsOn(!tipsOn),
    },
    {
      id: "all-apps",
      label: t.common.launchpad,
      group,
      icon: <AppWindowIcon />,
      run: () => setLaunchpadOpen(true),
    },
    {
      id: "view-site",
      label: t.panel.viewSite,
      group,
      icon: <GlobeIcon />,
      run: () => window.open(localePath(locale, "/"), "_blank", "noopener"),
    },
  ];

  return (
    <>
      {/* 8px hot strip that reveals an auto-hidden dock (≥1024px only, panel-shell.css). */}
      <div className="os-dock-zone" aria-hidden />
      <Dock label={t.panel.mainNav} tabbar="lg" magnify={p.magnify} n={n} seps={seps}>
        <DockLinks entries={entries} running={running > 0 ? ["time", "time-tab"] : []} />
      </Dock>
      <PanelGuideBubble guide={guide} />
      <CommandPalette role={role} extraCommands={commands} />
      <Launchpad role={role} />
    </>
  );
}
