import Link from "next/link";
import { ArrowUpLeftIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shared/theme-controls";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { HeaderShell, LanguageMenu, MobileMenu, NavLinks, type NavItem } from "./header-client";

export const siteSections = [
  { path: "/work", key: "work" },
  { path: "/services", key: "services" },
  { path: "/blog", key: "blog" },
  { path: "/learn", key: "learn" },
  { path: "/about", key: "about" },
] as const;

/** Paths that exist in every locale (language toggle keeps them as-is). */
export const staticSitePaths = ["/", ...siteSections.map((s) => s.path), "/contact"];

/**
 * Public header — a server component; only the scroll state, active link,
 * language menu and mobile menu are client islands.
 */
export function SiteHeader({ locale, t }: { locale: Locale; t: Messages }) {
  const items: NavItem[] = siteSections.map((s) => ({
    href: localePath(locale, s.path),
    section: s.path,
    label: t.nav[s.key],
  }));
  return (
    <HeaderShell>
      <div className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link
          href={localePath(locale, "/")}
          aria-label={t.common.appName}
          className="shrink-0 rounded-lg"
        >
          <Logo label={t.common.appName} />
        </Link>
        <nav
          aria-label={t.nav.home}
          className="mx-auto hidden items-center gap-0.5 rounded-full border border-border/70 bg-muted/60 p-1 md:flex dark:bg-muted/40"
        >
          <NavLinks items={items} />
        </nav>
        <div className="ms-auto flex items-center gap-1 md:ms-0">
          <LanguageMenu current={locale} label={t.common.language} staticPaths={staticSitePaths} />
          <ThemeToggle />
          <Link
            href={localePath(locale, "/contact")}
            className="group ms-1 hidden h-9 items-center gap-1.5 rounded-full bg-grey-800 ps-4 pe-3 text-sm font-semibold text-white transition-colors hover:bg-grey-700 sm:inline-flex dark:bg-white dark:text-grey-800 dark:hover:bg-grey-300"
          >
            {t.site.heroPrimaryCta}
            <ArrowUpLeftIcon className="size-4 transition-transform group-hover:-translate-y-0.5 ltr:rotate-90 ltr:group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
          </Link>
          <MobileMenu label={t.common.toggleMenu} closeLabel={t.common.close}>
            <nav className="flex flex-col gap-1" aria-label={t.nav.home}>
              {[...siteSections, { path: "/contact", key: "contact" } as const].map((s, i) => (
                <Link
                  key={s.path}
                  href={localePath(locale, s.path)}
                  className="gt-menu-item flex items-center justify-between rounded-2xl px-4 py-3.5 text-2xl font-extrabold tracking-tight hover:bg-accent"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {t.nav[s.key]}
                </Link>
              ))}
            </nav>
            <div className="mt-8 flex items-center gap-2 border-t border-dashed pt-6">
              <Link
                href={localePath(locale, "/contact")}
                className="ms-auto inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
              >
                {t.site.heroPrimaryCta}
              </Link>
            </div>
          </MobileMenu>
        </div>
      </div>
    </HeaderShell>
  );
}
