import "server-only";
import { localePath, type Locale } from "@/i18n/config";
import { absoluteUrl } from "./seo";

/**
 * Typed schema.org JSON-LD for SEO/AEO/GEO. Render with <JsonLd data={…} />.
 * `<` is escaped so content can never break out of the <script> tag.
 */
type Json = string | number | boolean | null | undefined | Json[] | { [k: string]: Json };
export type Thing = { "@type": string | string[]; "@id"?: string } & { [k: string]: Json };

export function JsonLd({ data }: { data: Thing | Thing[] }) {
  const payload = Array.isArray(data)
    ? { "@context": "https://schema.org", "@graph": data }
    : { "@context": "https://schema.org", ...data };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload).replace(/</g, "\\u003c") }}
    />
  );
}

export const ids = {
  organization: () => absoluteUrl("/#organization"),
  person: () => absoluteUrl("/#person"),
  website: (locale: Locale) => absoluteUrl(`${localePath(locale, "/")}#website`),
};

export interface ProfileLike {
  brandName: { fa: string; en: string };
  ownerName: { fa: string; en: string };
  headline: { fa: string; en: string };
  bio: { fa: string; en: string };
  avatarUrl: string;
  email: string;
  location: { fa: string; en: string };
  socials: Record<string, string>;
}

const sameAs = (p: ProfileLike) =>
  Object.values(p.socials).filter((u) => /^https?:\/\/.+\/.+/.test(u));

export function organizationLd(p: ProfileLike, locale: Locale): Thing {
  return {
    "@type": "Organization",
    "@id": ids.organization(),
    name: p.brandName[locale] || p.brandName.en,
    alternateName: p.brandName[locale === "fa" ? "en" : "fa"],
    url: absoluteUrl(localePath(locale, "/")),
    logo: absoluteUrl("/icon.svg"),
    description: p.bio[locale] || undefined,
    email: p.email || undefined,
    founder: p.ownerName[locale] ? { "@id": ids.person() } : undefined,
    address: p.location[locale]
      ? { "@type": "PostalAddress", addressLocality: p.location[locale] }
      : undefined,
    sameAs: sameAs(p),
  };
}

export function personLd(p: ProfileLike, locale: Locale): Thing | null {
  if (!p.ownerName[locale] && !p.ownerName.en) return null;
  return {
    "@type": "Person",
    "@id": ids.person(),
    name: p.ownerName[locale] || p.ownerName.en,
    alternateName: p.ownerName[locale === "fa" ? "en" : "fa"] || undefined,
    jobTitle: p.headline[locale] || undefined,
    description: p.bio[locale] || undefined,
    image: p.avatarUrl ? absoluteUrl(p.avatarUrl) : undefined,
    url: absoluteUrl(localePath(locale, "/about")),
    worksFor: { "@id": ids.organization() },
    sameAs: sameAs(p),
  };
}

export function websiteLd(p: ProfileLike, locale: Locale): Thing {
  return {
    "@type": "WebSite",
    "@id": ids.website(locale),
    url: absoluteUrl(localePath(locale, "/")),
    name: p.brandName[locale] || p.brandName.en,
    inLanguage: locale === "fa" ? "fa-IR" : "en-US",
    publisher: { "@id": ids.organization() },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl(localePath(locale, "/blog"))}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]): Thing {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function faqLd(items: { q: string; a: string }[]): Thing {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export interface ArticleLdInput {
  type: "BlogPosting" | "LearningResource" | "CreativeWork" | "Article";
  url: string;
  title: string;
  description?: string | null;
  image?: string | null;
  published?: Date | null;
  modified?: Date | null;
  locale: Locale;
  authorName?: string | null;
  keywords?: string[];
  wordCount?: number;
  extra?: Record<string, Json>;
}

export function articleLd(a: ArticleLdInput): Thing {
  return {
    "@type": a.type,
    "@id": `${absoluteUrl(a.url)}#main`,
    mainEntityOfPage: absoluteUrl(a.url),
    url: absoluteUrl(a.url),
    headline: a.title,
    name: a.title,
    description: a.description ?? undefined,
    image: a.image ? absoluteUrl(a.image) : undefined,
    datePublished: a.published?.toISOString(),
    dateModified: (a.modified ?? a.published)?.toISOString(),
    inLanguage: a.locale === "fa" ? "fa-IR" : "en-US",
    author: a.authorName
      ? { "@type": "Person", name: a.authorName, "@id": ids.person() }
      : { "@id": ids.organization() },
    publisher: { "@id": ids.organization() },
    keywords: a.keywords?.length ? a.keywords.join(", ") : undefined,
    wordCount: a.wordCount,
    isPartOf: { "@id": ids.website(a.locale) },
    ...a.extra,
  };
}

export function videoLd(v: {
  url: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  uploadDate?: Date | null;
  embedUrl?: string | null;
  contentUrl?: string | null;
}): Thing {
  return {
    "@type": "VideoObject",
    name: v.title,
    description: v.description || v.title,
    thumbnailUrl: v.thumbnail ? absoluteUrl(v.thumbnail) : undefined,
    uploadDate: v.uploadDate?.toISOString(),
    embedUrl: v.embedUrl ?? undefined,
    contentUrl: v.contentUrl ?? undefined,
    url: absoluteUrl(v.url),
    publisher: { "@id": ids.organization() },
  };
}
