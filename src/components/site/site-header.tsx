"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-controls";
import { localePath, stripLocale } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

export const siteNav = [
  { href: "/work", key: "work" },
  { href: "/services", key: "services" },
  { href: "/blog", key: "blog" },
  { href: "/learn", key: "learn" },
  { href: "/about", key: "about" },
] as const;

function NavLinks({ withActive }: { withActive: boolean }) {
  const t = useT();
  const locale = useLocale();
  return siteNav.map((item) => (
    <NavLink
      key={item.href}
      href={localePath(locale, item.href)}
      itemHref={item.href}
      withActive={withActive}
    >
      {t.nav[item.key]}
    </NavLink>
  ));
}

function ActiveAware({
  itemHref,
  children,
}: {
  itemHref: string;
  children: (active: boolean) => React.ReactNode;
}) {
  // usePathname() is URL data → only used inside <Suspense>.
  const { path } = stripLocale(usePathname());
  return children(path === itemHref || path.startsWith(`${itemHref}/`));
}

function NavLink({
  href,
  itemHref,
  withActive,
  children,
}: {
  href: string;
  itemHref: string;
  withActive: boolean;
  children: React.ReactNode;
}) {
  const cls = (active: boolean) =>
    cn(
      "rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground",
      active && "text-foreground",
    );
  if (!withActive)
    return (
      <Link href={href} className={cls(false)}>
        {children}
      </Link>
    );
  return (
    <ActiveAware itemHref={itemHref}>
      {(active) => (
        <Link href={href} className={cls(active)} aria-current={active ? "page" : undefined}>
          {children}
        </Link>
      )}
    </ActiveAware>
  );
}

export function SiteHeader() {
  const t = useT();
  const locale = useLocale();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,box-shadow,height] duration-300",
        scrolled ? "glass h-16 shadow-[0_1px_0_0_var(--border)]" : "h-20 bg-transparent",
      )}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href={localePath(locale, "/")} aria-label={t.common.appName} className="shrink-0">
          <Logo label={t.common.appName} />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="main">
          <Suspense fallback={<NavLinks withActive={false} />}>
            <NavLinks withActive />
          </Suspense>
        </nav>
        <div className="ms-auto flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
          <Button asChild variant="inherit" size="sm" className="ms-2 hidden sm:inline-flex">
            <Link href={localePath(locale, "/contact")}>{t.nav.contact}</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label={t.common.toggleMenu}
              >
                <MenuIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="end" className="p-6">
              <SheetTitle className="sr-only">{t.common.toggleMenu}</SheetTitle>
              <Logo label={t.common.appName} />
              <nav className="mt-6 flex flex-col gap-1">
                {[...siteNav, { href: "/contact", key: "contact" } as const].map((item) => (
                  <Link
                    key={item.href}
                    href={localePath(locale, item.href)}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-base font-semibold hover:bg-accent"
                  >
                    {t.nav[item.key]}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
