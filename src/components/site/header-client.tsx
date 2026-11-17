"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { CheckIcon } from "lucide-react";
import { localeMeta, localePath, locales, stripLocale, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { useAlternates } from "./alternates";

/**
 * Language-switch helpers shared by the menu bar, Control Center and
 * Launchpad. Switching locale is always a plain `<a href hrefLang lang>` (a
 * full page load): it swaps `<html lang/dir>` and fonts, and a `<Link>`
 * prefetch across root params 404s in Next 16.4's segment cache.
 */

/**
 * Target of the language toggle: translation (if registered with
 * `SetAlternates`) → same static path → section index. Reads the pathname,
 * so callers render inside <Suspense>. Frozen export (spec §16 rule 4).
 */
export function useSwitchHref(target: Locale, staticPaths: string[]) {
  const alternates = useAlternates();
  const { path } = stripLocale(usePathname());
  if (alternates?.[target]) return alternates[target]!;
  if (staticPaths.includes(path)) return localePath(target, path);
  const section = `/${path.split("/")[1] ?? ""}`;
  return localePath(target, staticPaths.includes(section) ? section : "/");
}

type LanguageVariant = "menu" | "chip";

const ITEM_CLASS: Record<LanguageVariant, string> = {
  menu: "os-menu-item justify-between gap-6",
  chip: "os-chip",
};

function LanguageItem({
  locale,
  current,
  staticPaths,
  variant,
}: {
  locale: Locale;
  current: Locale;
  staticPaths: string[];
  variant: LanguageVariant;
}) {
  const href = useSwitchHref(locale, staticPaths);
  return <LanguageLink locale={locale} current={current} href={href} variant={variant} />;
}

function LanguageLink({
  locale,
  current,
  href,
  variant,
}: {
  locale: Locale;
  current: Locale;
  href: string;
  variant: LanguageVariant;
}) {
  const active = locale === current;
  return (
    <a
      href={href}
      hrefLang={locale}
      lang={locale}
      aria-current={active ? "true" : undefined}
      className={cn(ITEM_CLASS[variant], active && "font-bold")}
    >
      {localeMeta[locale].label}
      {variant === "menu" && active && <CheckIcon aria-hidden className="size-4" />}
    </a>
  );
}

/**
 * One plain link per locale (menu rows or Control Center chips). The pathname
 * is URL data, so the real targets render inside <Suspense>; the fallback
 * links go to each locale's home.
 */
export function LanguageItems({
  current,
  staticPaths,
  variant = "menu",
}: {
  current: Locale;
  staticPaths: string[];
  variant?: LanguageVariant;
}) {
  return (
    <Suspense
      fallback={locales.map((l) => (
        <LanguageLink
          key={l}
          locale={l}
          current={current}
          href={localePath(l, "/")}
          variant={variant}
        />
      ))}
    >
      {locales.map((l) => (
        <LanguageItem
          key={l}
          locale={l}
          current={current}
          staticPaths={staticPaths}
          variant={variant}
        />
      ))}
    </Suspense>
  );
}
