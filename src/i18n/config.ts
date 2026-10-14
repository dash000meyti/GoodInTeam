/**
 * Locale configuration. `fa` is the default locale and is served WITHOUT a
 * URL prefix (`/blog`), other locales are prefixed (`/en/blog`).
 * The proxy (src/proxy.ts) rewrites unprefixed paths to `/fa/...` internally.
 */
export const locales = ["fa", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fa";

export const localeMeta: Record<
  Locale,
  {
    label: string;
    dir: "rtl" | "ltr";
    intl: string;
    calendar: "persian" | "gregory";
    ogLocale: string;
  }
> = {
  fa: { label: "فارسی", dir: "rtl", intl: "fa-IR", calendar: "persian", ogLocale: "fa_IR" },
  en: { label: "English", dir: "ltr", intl: "en-US", calendar: "gregory", ogLocale: "en_US" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/** Build a public href for a locale: localePath("fa", "/blog") → "/blog", ("en") → "/en/blog". */
export function localePath(locale: Locale, path = "/") {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/** Strip a leading locale segment from a pathname. */
export function stripLocale(pathname: string): { locale: Locale | null; path: string } {
  const seg = pathname.split("/")[1];
  if (isLocale(seg)) {
    const rest = pathname.slice(seg.length + 1) || "/";
    return { locale: seg, path: rest };
  }
  return { locale: null, path: pathname };
}
