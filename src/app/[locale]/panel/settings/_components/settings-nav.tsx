"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRightIcon, SwatchBookIcon } from "lucide-react";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { localePath, stripLocale } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/server/db/schema/auth";
import { settingsNavFor, type SettingsNavItem } from "./nav-items";

function isActive(path: string, item: SettingsNavItem) {
  return item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);
}

/** The site's filter chip (components/site/ui.tsx `Chip`): the phone/tablet section bar. */
const CHIP =
  "flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] border border-frame-line bg-background px-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground data-[active]:border-foreground data-[active]:bg-foreground data-[active]:text-background";

/**
 * Settings section navigation: a framed box beside the content on large
 * screens (one cell per group, rows of links, the active one with a yellow
 * icon tile and a square dot), a horizontally scrollable chip bar on
 * phones/tablets.
 */
export function SettingsNav({ role }: { role: UserRole }) {
  const t = useT();
  const locale = useLocale();
  const { path } = stripLocale(usePathname());
  const groups = settingsNavFor(role);
  const flat = groups.flatMap((g) => g.items);
  const isAdmin = role === "owner" || role === "admin";
  const barRef = useRef<HTMLDivElement>(null);

  // Keep the active chip visible on small screens.
  useEffect(() => {
    const el = barRef.current?.querySelector<HTMLElement>("[data-active]");
    el?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [path]);

  return (
    <>
      {/* Phones & tablets */}
      <div
        ref={barRef}
        className="-mx-4 flex scrollbar-none gap-1.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:hidden"
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
              className={CHIP}
            >
              <Icon className="size-4" />
              {t.settings[`nav_${item.key}`]}
            </Link>
          );
        })}
      </div>

      {/* Desktop */}
      <nav aria-label={t.settings.title} className="hidden lg:block">
        <FrameBox as="div" density="compact" className="sticky below-chrome">
          {groups.map((g) => (
            <FrameGrid key={g.group} cols={1}>
              <FrameCell pad="none" className="py-2">
                <p className="px-(--cell-pad) pt-1.5 pb-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  {t.settings[g.group]}
                </p>
                <ul>
                  {g.items.map((item) => {
                    const active = isActive(path, item);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={localePath(locale, item.href)}
                          data-active={active || undefined}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group flex items-center gap-3 px-(--cell-pad) py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
                            "data-[active]:bg-card data-[active]:font-bold data-[active]:text-foreground",
                          )}
                        >
                          <span className="flex size-7 shrink-0 items-center justify-center border border-frame-line bg-background transition-colors group-data-[active]:border-[var(--primary-dark)] group-data-[active]:bg-primary group-data-[active]:text-primary-foreground">
                            <Icon className="size-4" />
                          </span>
                          <span className="truncate">{t.settings[`nav_${item.key}`]}</span>
                          {active && (
                            <span aria-hidden className="ms-auto size-1.5 shrink-0 bg-foreground" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </FrameCell>
            </FrameGrid>
          ))}
          {isAdmin && (
            <FrameGrid cols={1}>
              <FrameCell pad="none">
                <Link
                  href={localePath(locale, "/panel/design-system")}
                  className="flex items-center gap-3 px-(--cell-pad) py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                >
                  <SwatchBookIcon className="size-4" />
                  <span className="flex-1">{t.settings.nav_designSystem}</span>
                  <ArrowUpRightIcon className="size-4 rtl:-scale-x-100" />
                </Link>
              </FrameCell>
            </FrameGrid>
          )}
        </FrameBox>
      </nav>
    </>
  );
}
