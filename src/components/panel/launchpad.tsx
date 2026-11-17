"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRightIcon, GlobeIcon, LogOutIcon, SearchIcon } from "lucide-react";
import { AppearanceModeToggle } from "@/components/shell/appearance";
import { DockTile } from "@/components/shell/dock";
import { matchesQuery } from "@/components/shell/normalize";
import { localeGlyph } from "@/components/shared/locale-switcher";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { localeMeta, localePath, locales, stripLocale, type Locale } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/server/db/schema/auth";
import { logout } from "@/server/modules/auth/actions";
import { navForRole } from "./nav-config";
import { NavIcon } from "./nav-icon";
import { useGuideTips } from "./panel-guide";
import { usePanelUI } from "./panel-ui";

/**
 * Every app of the role, grouped like the nav (folded in from the old sidebar
 * NavList). 72px tiles with the dock's icons (the Desktop/Portal mark, pixel
 * module icons); `query` filters with Persian-aware matching.
 */
export function AppGrid({
  role,
  query = "",
  onNavigate,
  className,
}: {
  role: UserRole;
  query?: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const groups = navForRole(role)
    .map((g) => ({ ...g, items: g.items.filter((i) => matchesQuery(t.nav[i.label], query)) }))
    .filter((g) => g.items.length > 0);
  if (!groups.length)
    return <p className="py-10 text-center text-sm text-muted-foreground">{t.common.noMatches}</p>;
  return (
    <div className={cn("space-y-5", className)}>
      {groups.map((g) => (
        <section key={g.label} aria-labelledby={`lp-${g.label}`}>
          <h3 id={`lp-${g.label}`} className="mb-2 px-1 text-xs font-bold text-muted-foreground">
            {t.nav[g.label]}
          </h3>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-x-2 gap-y-3">
            {g.items.map((item) => {
              const mark = g.label === "groupOverview";
              return (
                <li key={item.href + item.label} className="flex justify-center">
                  <Link
                    href={localePath(locale, item.href)}
                    onClick={onNavigate}
                    className="group flex w-[72px] flex-col items-center gap-1.5 rounded-xl p-1 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="pm-lp-tile transition-transform group-hover:-translate-y-0.5 group-active:scale-95">
                      <DockTile variant={mark ? "mark" : "brand"}>
                        <NavIcon item={item} lucideClassName="size-6" />
                      </DockTile>
                    </span>
                    <span className="line-clamp-2 text-xs leading-4 font-medium">
                      {t.nav[item.label]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function LangLinks({ path, current }: { path: string; current: Locale }) {
  return locales.map((l) => (
    <a
      key={l}
      href={localePath(l, path)}
      hrefLang={l}
      lang={l}
      aria-current={l === current ? "true" : undefined}
      className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=true]:bg-card aria-[current=true]:text-foreground aria-[current=true]:shadow-card"
    >
      <span aria-hidden>{localeGlyph[l]}</span>
      {localeMeta[l].label}
    </a>
  ));
}

function PathLangLinks({ current }: { current: Locale }) {
  return <LangLinks path={stripLocale(usePathname()).path} current={current} />;
}

/**
 * Launchpad (spec §11.3): a Radix Dialog mounted ONLY while open (no
 * always-mounted dialog in the chrome). Full screen below 1024px (the tab
 * bar's More), 880px centred on desktop. Closes on navigation.
 */
export function Launchpad({ role }: { role: UserRole }) {
  const { launchpadOpen, setLaunchpadOpen } = usePanelUI();
  if (!launchpadOpen) return null;
  return <LaunchpadDialog role={role} onClose={() => setLaunchpadOpen(false)} />;
}

function LaunchpadDialog({ role, onClose }: { role: UserRole; onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [tipsOn, setTipsOn] = useGuideTips();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="pm-launchpad flex flex-col gap-0 overflow-hidden p-0 max-lg:inset-0 max-lg:top-0 max-lg:left-0 max-lg:h-dvh max-lg:max-h-none max-lg:w-full max-lg:max-w-none max-lg:translate-x-0 max-lg:translate-y-0 max-lg:rounded-none lg:max-h-[min(760px,calc(100dvh-6rem))] lg:max-w-[880px]"
      >
        <DialogTitle className="sr-only">{t.common.launchpad}</DialogTitle>
        <div className="border-b border-dashed px-4 pe-12 pt-4 pb-3 sm:px-6">
          <label className="relative block max-w-md">
            <SearchIcon
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.panel.launchpadFilter}
              aria-label={t.panel.launchpadFilter}
              className="h-10 w-full rounded-lg border border-input bg-background ps-9 pe-3 text-base outline-none placeholder:text-muted-foreground hover:border-foreground/40 focus-visible:border-foreground md:text-sm"
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <AppGrid role={role} query={query} onNavigate={onClose} />
        </div>
        <div className="grid gap-3 border-t border-dashed bg-muted/40 px-4 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[auto_auto_1fr_auto]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">{t.common.language}</span>
            <div className="flex rounded-lg bg-muted p-0.5">
              <Suspense fallback={<LangLinks path="/panel" current={locale} />}>
                <PathLangLinks current={locale} />
              </Suspense>
            </div>
          </div>
          <AppearanceModeToggle className="min-w-60" />
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Switch checked={tipsOn} onCheckedChange={setTipsOn} />
            {t.panel.guideTips}
          </label>
          <div className="flex items-center gap-1">
            <a
              href={localePath(locale, "/")}
              target="_blank"
              rel="noopener"
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <GlobeIcon className="size-3.5" aria-hidden />
              {t.panel.viewSite}
              <span className="sr-only"> {t.common.opensNewTab}</span>
              <ArrowUpRightIcon className="size-3 rtl:-scale-x-100" aria-hidden />
            </a>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-destructive transition-colors outline-none hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOutIcon className="size-3.5" aria-hidden />
              {t.common.signOut}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
