"use client";

import { usePathname, useRouter } from "next/navigation";
import { MonitorIcon } from "lucide-react";
import { localePath, stripLocale } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { matchNav } from "./nav-config";
import { defaultShell } from "./panel-prefs";
import { usePanelUI } from "./panel-ui";

/**
 * Window title bar (spec §11.4): 40px, not sticky. 12px octagon lights at
 * inline-start are pointer-only (tabIndex -1, aria-hidden, 20px hit areas):
 * red → /panel (greyed there), yellow decorative, green → toggle wide. Every
 * command is mirrored in the App menu (WCAG 2.5.8 equivalent control). The
 * centred title is aria-hidden: the page's PageHeader <h1> is the heading.
 */
export function WindowTitleBar() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { shell, setShell } = usePanelUI();
  const path = stripLocale(usePathname()).path;
  const item = matchNav(path);
  const atDesktop = !item && (path === "/panel" || path === "/panel/");
  const Icon = item?.icon ?? MonitorIcon;
  const title = item ? t.nav[item.label] : t.panel.desktop;
  const wide = (shell ?? defaultShell).wide;
  return (
    <div className="os-titlebar">
      <span className="pm-lights" aria-hidden>
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          data-light="close"
          disabled={atDesktop}
          onClick={() => router.push(localePath(locale, "/panel"))}
        />
        <button type="button" tabIndex={-1} aria-hidden data-light="min" disabled />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          data-light="zoom"
          data-on={wide ? "" : undefined}
          onClick={() => setShell({ wide: !wide })}
        />
      </span>
      <span className="pm-title" aria-hidden>
        <Icon className="size-4 shrink-0" strokeWidth={1.75} />
        <span className="truncate">{title}</span>
      </span>
      <span />
    </div>
  );
}

/** Same 40px bar without the path-dependent title (Suspense fallback). */
export function WindowTitleFallback() {
  return (
    <div className="os-titlebar" aria-hidden>
      <span className="pm-lights">
        <span data-light="close" />
        <span data-light="min" />
        <span data-light="zoom" />
      </span>
      <span />
      <span />
    </div>
  );
}
