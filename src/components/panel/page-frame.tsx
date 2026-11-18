"use client";

import { usePathname } from "next/navigation";
import { PixelIcon } from "@/components/brand/pixel-art";
import type { PixelIconName } from "@/components/brand/pixel-icons";
import { FrameCell, FrameStripBar, framePath } from "@/components/shell/frame";
import { Window } from "@/components/shell/window";
import { stripLocale } from "@/i18n/config";
import { useLocale } from "@/i18n/client";
import { matchNav } from "./nav-config";
import { panelAppName, panelPathSegments } from "./panel-path";

/**
 * The panel's half of the frame chrome that depends on the route (client:
 * PageHeader renders in server and client trees). Pages render inside
 * panel/loading.tsx's Suspense boundary, so reading the pathname is allowed.
 */

/**
 * The page box's strip: idle lights and `GOOD-IN-TEAM/PANEL/<route>` in
 * pixel type (Persian digits on fa). `path` replaces the route segments
 * (e.g. `["INVOICES", "GT-1405-002"]` on a detail page).
 */
export function PanelStrip({ path }: { path?: readonly string[] }) {
  const locale = useLocale();
  const pathname = usePathname();
  const segments = path ?? panelPathSegments(pathname);
  return <FrameStripBar locale={locale} path={framePath("GOOD-IN-TEAM", "PANEL", ...segments)} />;
}

/**
 * The decorative end cell of a page box (the site's first-box rule, at panel
 * density): a dots cell, shown from lg, holding a small `<APP>.APP` window
 * with the module's pixel icon. Decoration only (aria-hidden, no text).
 */
export function PanelDecorCell({ icon, app }: { icon?: PixelIconName; app?: string }) {
  const pathname = usePathname();
  const item = matchNav(stripLocale(pathname).path);
  const name = icon ?? item?.pixel ?? "dashboard";
  return (
    <FrameCell tone="dots" aria-hidden className="hidden items-center justify-center lg:flex">
      <Window
        path={app ? `${app}.APP` : panelAppName(pathname, "desktop")}
        className="w-full max-w-56"
      >
        <div className="grid h-[60px] place-items-center bg-[radial-gradient(var(--dots)_1px,transparent_1.5px)] [background-size:12px_12px]">
          <PixelIcon name={name} cell={4} />
        </div>
      </Window>
    </FrameCell>
  );
}
