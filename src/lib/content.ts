/**
 * Pure helpers for public content (CMS) shared by server code, the panel
 * editor (client) and route handlers: URL building, URL namespaces, SEO limits.
 * No server imports here.
 */
import { localePath, type Locale } from "@/i18n/config";

export const contentTypes = [
  "article",
  "tutorial",
  "vlog",
  "note",
  "work",
  "service",
  "page",
] as const;
export type ContentType = (typeof contentTypes)[number];

/** Types listed under /blog (they share one URL namespace). */
export const blogTypes = ["article", "vlog", "note"] as const satisfies readonly ContentType[];
export type BlogType = (typeof blogTypes)[number];

export const isBlogType = (t: string): t is BlogType =>
  (blogTypes as readonly string[]).includes(t);

/** Types whose slugs share the same URL space (slug must be unique inside a group + locale). */
export function slugGroup(type: ContentType): readonly ContentType[] {
  return isBlogType(type) ? blogTypes : [type];
}

/** Section index for a type (fallback target of the language switcher, breadcrumbs). */
export function sectionPath(type: ContentType) {
  switch (type) {
    case "article":
    case "vlog":
    case "note":
      return "/blog";
    case "work":
      return "/work";
    case "tutorial":
      return "/learn";
    case "service":
      return "/services";
    case "page":
      return "/";
  }
}

/**
 * Public path of a post (without locale prefix):
 * blog types → /blog/<slug>, work → /work/<slug>, service → /services/<slug>,
 * tutorial → /learn/<series>/<slug> (or /learn/<slug> when standalone),
 * page → /<slug>.
 */
export function postPath(p: { type: ContentType; slug: string; seriesSlug?: string | null }) {
  const slug = encodeURIComponent(p.slug);
  switch (p.type) {
    case "tutorial":
      return p.seriesSlug ? `/learn/${encodeURIComponent(p.seriesSlug)}/${slug}` : `/learn/${slug}`;
    case "page":
      return `/${slug}`;
    default:
      return `${sectionPath(p.type)}/${slug}`;
  }
}

export function postHref(
  locale: Locale,
  p: { type: ContentType; slug: string; seriesSlug?: string | null },
) {
  return localePath(locale, postPath(p));
}

/** Recommended lengths for search snippets. */
export const SEO_LIMITS = { title: 60, description: 160 } as const;

/** Lead budget ranges offered on the contact form (stored as the key). */
export const budgetRanges = ["lt5", "5to15", "15to50", "gt50", "unknown"] as const;
export type BudgetRange = (typeof budgetRanges)[number];

/** YouTube / Aparat-ish video URL → YouTube id (for lite embeds). */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.endsWith("youtube.com") || u.hostname.endsWith("youtube-nocookie.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/);
      if (m) return m[1]!;
    }
  } catch {
    return null;
  }
  return null;
}
