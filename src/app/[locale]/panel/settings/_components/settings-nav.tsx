"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRightIcon, SwatchBookIcon } from "lucide-react";
import { localePath, stripLocale } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/server/db/schema/auth";
import { settingsNavFor, type SettingsNavItem } from "./nav-items";

function isActive(path: string, item: SettingsNavItem) {
  return item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);
}

/**
 * Settings section navigation: a vertical list beside the content on large
 * screens, a horizontally scrollable pill bar on phones/tablets.
 */
export function SettingsNav({ role }: { role: UserRole }) {
  const t = useT();
  const locale = useLocale();
  const { path } = stripLocale(usePathname());
  const groups = settingsNavFor(role);
  const flat = groups.flatMap((g) => g.items);
  const isAdmin = role === "owner" || role === "admin";
  const barRef = useRef<HTMLDivElement>(null);

  // Keep the active pill visible on small screens.
  useEffect(() => {
    const el = barRef.current?.querySelector<HTMLElement>("[data-active]");
    el?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [path]);

  return (
    <>
      {/* Phones & tablets */}
      <div
        ref={barRef}
        className="-mx-4 flex scrollbar-none gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:hidden"
      >
        {flat.map((item) => {
          const active = isActive(path, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={localePath(locale, item.href)}
              data-active={active || undefined}
              aria-current={active ? "page" : undefined}
              className="flex shrink-0 items-center gap-2 rounded-full border border-dashed px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground data-[active]:border-solid data-[active]:border-primary/30 data-[active]:bg-primary/8 data-[active]:text-primary-dark dark:data-[active]:text-primary-light"
            >
              <Icon className="size-4" />
              {t.settings[`nav_${item.key}`]}
            </Link>
          );
        })}
      </div>

      {/* Desktop */}
      <nav aria-label={t.settings.title} className="hidden lg:block">
        <div className="sticky top-24 space-y-6">
          {groups.map((g) => (
            <div key={g.group} className="space-y-1">
              <p className="px-3 pb-1 text-[11px] font-bold tracking-wide text-muted-foreground/80 uppercase">
                {t.settings[g.group]}
              </p>
              {g.items.map((item) => {
                const active = isActive(path, item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={localePath(locale, item.href)}
                    data-active={active || undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                      "data-[active]:bg-sidebar-accent data-[active]:font-bold data-[active]:text-sidebar-accent-foreground",
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-data-[active]:bg-primary group-data-[active]:text-primary-foreground">
                      <Icon className="size-4" />
                    </span>
                    <span className="truncate">{t.settings[`nav_${item.key}`]}</span>
                  </Link>
                );
              })}
            </div>
          ))}
          {isAdmin && (
            <Link
              href={localePath(locale, "/panel/design-system")}
              className="flex items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <SwatchBookIcon className="size-4" />
              <span className="flex-1">{t.settings.nav_designSystem}</span>
              <ArrowUpRightIcon className="size-4 rtl:-scale-x-100" />
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
