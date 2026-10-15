import "server-only";
import type { Metadata } from "next";
import { defaultLocale, localeMeta, localePath, locales, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";
import { env } from "@/lib/env";
import { postPath, type ContentType } from "@/lib/content";

/**
 * Metadata builders for public pages: canonical, hreflang alternates
 * (fa, en, x-default), Open Graph / Twitter, article times and the
 * Markdown/RSS alternates used by AEO/GEO crawlers.
 */
export const absoluteUrl = (path: string) =>
  path.startsWith("http") ? path : `${env.siteUrl}${path.startsWith("/") ? path : `/${path}`}`;

/** Same path in every locale (static pages: /work, /blog…). */
export function samePathAlternates(path: string): Partial<Record<Locale, string>> {
  return Object.fromEntries(locales.map((l) => [l, localePath(l, path)]));
}

/** Alternates for a translated post: only locales that have a visible translation. */
export function postAlternates(
  translations: { locale: Locale; type: ContentType; slug: string; seriesSlug: string | null }[],
): Partial<Record<Locale, string>> {
  const out: Partial<Record<Locale, string>> = {};
  for (const tr of translations) out[tr.locale] = localePath(tr.locale, postPath(tr));
  return out;
}

export interface PageMetaInput {
  locale: Locale;
  /** Path without locale prefix, e.g. "/blog/my-post". */
  path: string;
  title: string;
  description?: string | null;
  /** hreflang targets per locale (defaults to the same path in every locale). */
  languages?: Partial<Record<Locale, string>>;
  type?: "website" | "article" | "profile";
  /** Absolute or site-relative image URL (OG). Omit to use the file-based opengraph-image. */
  image?: string | null;
  imageAlt?: string | null;
  publishedTime?: Date | null;
  modifiedTime?: Date | null;
  authors?: string[];
  tags?: string[];
  section?: string;
  /** Path of the Markdown mirror (`/blog/x.md`) for GEO crawlers. */
  markdownPath?: string | null;
  noindex?: boolean;
  /** Use `title` as the full <title> (skip the "| Brand" template). */
  absoluteTitle?: boolean;
}

export function pageMetadata(input: PageMetaInput): Metadata {
  const t = getMessages(input.locale);
  const self = localePath(input.locale, input.path);
  const languages = { ...(input.languages ?? samePathAlternates(input.path)) };
  languages[input.locale] = self;
  const xDefault = languages[defaultLocale] ?? self;
  const description = input.description ?? t.site.metaDescription;
  const images = input.image
    ? [{ url: absoluteUrl(input.image), alt: input.imageAlt ?? input.title }]
    : undefined;
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description,
    alternates: {
      canonical: self,
      languages: { ...languages, "x-default": xDefault },
      types: {
        "application/rss+xml": localePath(input.locale, "/feed.xml"),
        ...(input.markdownPath && {
          "text/markdown": localePath(input.locale, input.markdownPath),
        }),
      },
    },
    openGraph: {
      type: input.type ?? "website",
      url: self,
      title: input.title,
      description,
      siteName: t.common.appName,
      locale: localeMeta[input.locale].ogLocale,
      alternateLocale: locales
        .filter((l) => l !== input.locale && languages[l])
        .map((l) => localeMeta[l].ogLocale),
      ...(images && { images }),
      ...(input.type === "article" && {
        publishedTime: input.publishedTime?.toISOString(),
        modifiedTime: (input.modifiedTime ?? input.publishedTime)?.toISOString(),
        authors: input.authors,
        tags: input.tags,
        section: input.section,
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      ...(images && { images: images.map((i) => i.url) }),
    },
    ...(input.authors?.length && { authors: input.authors.map((name) => ({ name })) }),
    ...(input.noindex && { robots: { index: false, follow: true } }),
  };
}
