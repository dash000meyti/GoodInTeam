import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { defaultLocale, localePath, locales, type Locale } from "@/i18n/config";
import { env } from "@/lib/env";
import { postPath } from "@/lib/content";
import { listAllPublished, listAllSeries } from "@/server/modules/content/queries";

/**
 * sitemap.xml — static sections × locales + every published post and course,
 * with hreflang alternates (translations share `translationKey`) and images.
 * Request-time (DB) and cached via the content queries.
 */
const abs = (p: string) => `${env.siteUrl}${p}`;

const sections = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/work", priority: 0.9, changeFrequency: "weekly" },
  { path: "/services", priority: 0.9, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.8, changeFrequency: "daily" },
  { path: "/learn", priority: 0.8, changeFrequency: "weekly" },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [posts, series] = await Promise.all([listAllPublished(), listAllSeries()]);
  const latest = posts.reduce((m, p) => Math.max(m, p.updatedAt.getTime()), 0);

  const out: MetadataRoute.Sitemap = [];
  for (const s of sections) {
    for (const l of locales) {
      out.push({
        url: abs(localePath(l, s.path)),
        lastModified: latest ? new Date(latest) : undefined,
        changeFrequency: s.changeFrequency,
        priority: l === defaultLocale ? s.priority : Math.max(0.1, s.priority - 0.1),
        alternates: {
          languages: Object.fromEntries([
            ...locales.map((x) => [x, abs(localePath(x, s.path))]),
            ["x-default", abs(localePath(defaultLocale, s.path))],
          ]),
        },
      });
    }
  }

  // Translations grouped by translationKey → hreflang alternates.
  const groups = new Map<string, Partial<Record<Locale, string>>>();
  for (const p of posts) {
    if (!p.translationKey) continue;
    const g = groups.get(p.translationKey) ?? {};
    g[p.locale] = abs(localePath(p.locale, postPath(p)));
    groups.set(p.translationKey, g);
  }

  for (const p of posts) {
    if (p.type === "page") continue; // /about is listed with the sections
    const url = abs(localePath(p.locale, postPath(p)));
    const langs = (p.translationKey && groups.get(p.translationKey)) || { [p.locale]: url };
    out.push({
      url,
      lastModified: p.updatedAt,
      changeFrequency: p.type === "note" ? "yearly" : "monthly",
      priority: p.type === "work" || p.type === "service" ? 0.8 : p.type === "note" ? 0.4 : 0.7,
      alternates: Object.keys(langs).length > 1 ? { languages: langs } : undefined,
      images: p.coverUrl
        ? [p.coverUrl.startsWith("http") ? p.coverUrl : abs(p.coverUrl)]
        : undefined,
    });
  }

  for (const s of series) {
    out.push({
      url: abs(localePath(s.locale, `/learn/${encodeURIComponent(s.slug)}`)),
      lastModified: s.updatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }
  return out;
}
