"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguagesIcon, MenuIcon, XIcon } from "lucide-react";
import { localePath, locales, stripLocale, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { useAlternates } from "./alternates";

/** Sticky header frame: becomes glassy once the page scrolls (one passive listener). */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      data-scrolled={scrolled || undefined}
      className="group/header data-scrolled:glass sticky top-0 z-50 h-16 border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-300 data-scrolled:border-border"
    >
      {children}
    </header>
  );
}

export interface NavItem {
  href: string;
  /** Unprefixed section path used for the active state. */
  section: string;
  label: string;
}

function ActiveLinks({
  items,
  className,
}: {
  items: NavItem[];
  className: (active: boolean) => string;
}) {
  // usePathname() is URL data → rendered inside <Suspense> (Cache Components).
  const { path } = stripLocale(usePathname());
  return items.map((it) => {
    const active = path === it.section || path.startsWith(`${it.section}/`);
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={active ? "page" : undefined}
        className={className(active)}
      >
        {it.label}
      </Link>
    );
  });
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const cls = (active: boolean) =>
    cn(
      "relative rounded-full px-3.5 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground",
      active && "bg-background text-foreground shadow-card dark:bg-card",
    );
  return (
    <Suspense
      fallback={items.map((it) => (
        <Link key={it.href} href={it.href} className={cls(false)}>
          {it.label}
        </Link>
      ))}
    >
      <ActiveLinks items={items} className={cls} />
    </Suspense>
  );
}

/** Target of the language toggle: translation (if registered) → same static path → section index. */
function useSwitchHref(target: Locale, staticPaths: string[]) {
  const alternates = useAlternates();
  const { path } = stripLocale(usePathname());
  if (alternates?.[target]) return alternates[target]!;
  if (staticPaths.includes(path)) return localePath(target, path);
  const section = `/${path.split("/")[1] ?? ""}`;
  return localePath(target, staticPaths.includes(section) ? section : "/");
}

function SwitchLink({
  current,
  label,
  ariaLabel,
  staticPaths,
  className,
}: {
  current: Locale;
  label: string;
  ariaLabel: string;
  staticPaths: string[];
  className?: string;
}) {
  const target = locales.find((l) => l !== current)!;
  const href = useSwitchHref(target, staticPaths);
  return (
    <Link href={href} hrefLang={target} lang={target} aria-label={ariaLabel} className={className}>
      <LanguagesIcon className="size-4" />
      <span>{label}</span>
    </Link>
  );
}

export function LanguageToggle(props: {
  current: Locale;
  label: string;
  ariaLabel: string;
  staticPaths: string[];
  className?: string;
}) {
  const target = locales.find((l) => l !== props.current)!;
  return (
    <Suspense
      fallback={
        <Link
          href={localePath(target, "/")}
          hrefLang={target}
          lang={target}
          aria-label={props.ariaLabel}
          className={props.className}
        >
          <LanguagesIcon className="size-4" />
          <span>{props.label}</span>
        </Link>
      }
    >
      <SwitchLink {...props} />
    </Suspense>
  );
}

function CloseOnNavigate({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onNavigate();
  }, [pathname, onNavigate]);
  return null;
}

/**
 * Mobile menu on the native Popover API (no dialog library): light dismiss,
 * Esc to close, top layer. Closes itself after a client-side navigation.
 */
export function MobileMenu({
  label,
  closeLabel,
  children,
}: {
  label: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => ref.current?.hidePopover?.(), []);
  return (
    <>
      <button
        type="button"
        popoverTarget="site-mobile-menu"
        aria-label={label}
        className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent md:hidden"
      >
        <MenuIcon className="size-5" />
      </button>
      <div
        id="site-mobile-menu"
        ref={ref}
        popover="auto"
        className="gt-mobile-menu m-0 h-dvh max-h-none w-full max-w-none bg-background/95 p-0 text-foreground backdrop-blur-xl"
      >
        <div className="flex h-16 items-center justify-end px-4">
          <button
            type="button"
            popoverTarget="site-mobile-menu"
            popoverTargetAction="hide"
            aria-label={closeLabel}
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-accent"
          >
            <XIcon className="size-5" />
          </button>
        </div>
        <div className="px-6 pb-10">{children}</div>
        <Suspense>
          <CloseOnNavigate onNavigate={close} />
        </Suspense>
      </div>
    </>
  );
}
