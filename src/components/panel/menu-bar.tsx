import type { ReactNode } from "react";
import { MenuBarShell } from "@/components/shell/menubar-shell";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { getT } from "@/i18n/server";
import { ControlCenter } from "./control-center";
import { PanelMenus, Spotlight } from "./menu-bar-menus";

/**
 * The panel menu bar (spec §11.2), server frame over foundation's MenuBarShell.
 * Start: one Radix Menubar root (Brand · App · `menus` slot). End, DOM start →
 * end: `status` (timer, bell) · Spotlight · language · Control Center ·
 * `avatar` · `clock` (≥1280px). Each slot is its own Suspense hole with a
 * fixed-size fallback, so streaming never shifts the bar.
 */
export async function PanelMenuBar({
  menus,
  status,
  avatar,
  clock,
}: {
  menus: ReactNode;
  status: ReactNode;
  avatar: ReactNode;
  clock: ReactNode;
}) {
  const t = await getT();
  return (
    <MenuBarShell
      label={t.common.menuBar}
      className="pm-menubar"
      start={<PanelMenus>{menus}</PanelMenus>}
      end={
        <>
          <span className="pm-status">{status}</span>
          <Spotlight />
          <span className="pm-desktop-only">
            <LocaleSwitcher variant="text" />
          </span>
          <span className="pm-desktop-only">
            <ControlCenter />
          </span>
          <span className="pm-avatar">{avatar}</span>
          <span className="pm-clock">{clock}</span>
        </>
      }
    />
  );
}
