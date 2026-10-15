"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeftIcon, ExternalLinkIcon } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { localePath, stripLocale } from "@/i18n/config";
import { useI18n, useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/server/db/schema/auth";
import { navForRole, type NavItem } from "./nav-config";
import { usePanelUI } from "./panel-ui";

function isActive(pathname: string, item: NavItem) {
  const { path } = stripLocale(pathname);
  return item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);
}

function NavList({
  role,
  collapsed,
  onNavigate,
}: {
  role: UserRole;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { locale, dir } = useI18n();
  const t = useT();
  return (
    <nav aria-label={t.panel.mainNav} className="flex flex-col gap-5 px-3 pb-6">
      {navForRole(role).map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          {!collapsed && (
            // Full muted-foreground: 4.9:1 (light) / 6.4:1 (dark) on the sidebar — WCAG AA.
            <p className="px-3 pt-1 pb-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              {t.nav[group.label]}
            </p>
          )}
          {group.items.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            const link = (
              <Link
                key={item.href + item.label}
                href={localePath(locale, item.href)}
                onClick={onNavigate}
                data-active={active || undefined}
                aria-current={active ? "page" : undefined}
                // Collapsed: icon only — the tooltip is not a name, so label the link itself.
                aria-label={collapsed ? t.nav[item.label] : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-accent hover:text-foreground",
                  "data-[active]:bg-sidebar-accent data-[active]:font-bold data-[active]:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0 py-2.5",
                )}
              >
                <Icon
                  className="size-[20px] shrink-0"
                  strokeWidth={active ? 2.2 : 1.8}
                  aria-hidden
                />
                {!collapsed && <span className="truncate">{t.nav[item.label]}</span>}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={item.href + item.label}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side={dir === "rtl" ? "left" : "right"}>
                  {t.nav[item.label]}
                </TooltipContent>
              </Tooltip>
            ) : (
              link
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  const t = useT();
  const locale = useLocale();
  return (
    <Link
      href={localePath(locale, "/panel")}
      className={cn("flex h-16 items-center gap-2 px-5", collapsed && "justify-center px-0")}
    >
      <LogoMark className="size-8" />
      {!collapsed && (
        <span className="text-[17px] font-extrabold tracking-tight text-foreground">
          {t.common.appName}
        </span>
      )}
    </Link>
  );
}

/**
 * Desktop sidebar (sticky) + mobile drawer. `defaultCollapsed` is the preference cookie read
 * on the server, so the first paint already has the right width (no expanded → collapsed flash).
 */
export function PanelSidebar({
  role,
  defaultCollapsed = false,
}: {
  role: UserRole;
  defaultCollapsed?: boolean;
}) {
  const { collapsedPref, setCollapsed, mobileOpen, setMobileOpen } = usePanelUI();
  const collapsed = collapsedPref ?? defaultCollapsed;
  const t = useT();
  const locale = useLocale();
  return (
    <>
      <aside
        data-collapsed={collapsed || undefined}
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-e border-dashed border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex",
          collapsed ? "w-[88px]" : "w-[280px]",
        )}
      >
        <Brand collapsed={collapsed} />
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? t.panel.expandSidebar : t.panel.collapseSidebar}
          aria-expanded={!collapsed}
          className="absolute -end-3.5 top-5 z-10 flex size-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-sidebar-border bg-background text-muted-foreground shadow-sm outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          <ChevronsLeftIcon
            className={cn(
              "size-4 transition-transform rtl:rotate-180",
              collapsed && "rotate-180 rtl:rotate-0",
            )}
          />
        </button>
        <div className="flex-1 scrollbar-thin overflow-y-auto pt-2">
          <NavList role={role} collapsed={collapsed} />
        </div>
        {!collapsed && (
          <div className="p-4">
            <Link
              href={localePath(locale, "/")}
              target="_blank"
              className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.panel.viewSite}
              <ExternalLinkIcon className="size-4" />
            </Link>
          </div>
        )}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="start" className="w-[280px] gap-0 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">{t.common.toggleMenu}</SheetTitle>
          <Brand collapsed={false} />
          <div className="flex-1 scrollbar-thin overflow-y-auto pt-2">
            <NavList role={role} collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * Streaming placeholder. Its width follows `<html data-sidebar-collapsed>`, set before
 * paint by `sidebarInitScript` (panel layout) from the same cookie.
 */
export function SidebarSkeleton() {
  return (
    <aside
      aria-hidden
      className="sticky top-0 hidden h-dvh w-[280px] shrink-0 flex-col gap-3 border-e border-dashed border-sidebar-border bg-sidebar p-5 in-data-sidebar-collapsed:w-[88px] lg:flex"
    >
      <div className="h-8 w-32 max-w-full animate-pulse rounded-lg bg-grey-500/12" />
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-lg bg-grey-500/8" />
      ))}
    </aside>
  );
}
