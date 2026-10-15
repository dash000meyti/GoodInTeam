import "server-only";
import { localePath } from "@/i18n/config";
import { env } from "@/lib/env";
import { postPath, type ContentType } from "@/lib/content";
import { toDateInputValue, toTimeInputValue } from "@/lib/tz";
import type { Post } from "@/server/db/schema";
import type { Actor } from "@/server/auth/actor";
import { projectOptions, seriesOptions } from "@/server/modules/content/service";
import { serviceIconNames } from "@/components/site/service-icon";
import type { EditorContext, EditorPost } from "./editor-types";

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

export function emptyPost(type: ContentType, locale: "fa" | "en"): EditorPost {
  return {
    type,
    locale,
    title: "",
    slug: "",
    excerpt: "",
    contentMd: "",
    coverUrl: "",
    coverAlt: "",
    videoUrl: "",
    status: "draft",
    publishedDate: "",
    publishedTime: "",
    featured: false,
    seriesId: "",
    seriesOrder: "",
    projectId: "",
    tags: [],
    seoTitle: "",
    seoDescription: "",
    sort: "",
    meta: {
      client: "",
      year: "",
      role: "",
      stack: [],
      liveUrl: "",
      repoUrl: "",
      gallery: [],
      metrics: [],
      icon: type === "service" ? "sparkles" : "",
      faq: [],
    },
    readingMinutes: null,
    views: 0,
    publicPath: null,
  };
}

export function toEditorPost(p: Post, tz: string, seriesSlug: string | null): EditorPost {
  const m = p.meta as Record<string, unknown>;
  const visible =
    (p.status === "published" || p.status === "scheduled") &&
    (p.publishedAt ?? p.createdAt).getTime() <= Date.now();
  return {
    id: p.id,
    type: p.type,
    locale: p.locale,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt ?? "",
    contentMd: p.contentMd,
    coverUrl: p.coverUrl ?? "",
    coverAlt: p.coverAlt ?? "",
    videoUrl: p.videoUrl ?? "",
    status: p.status,
    publishedDate: p.publishedAt ? toDateInputValue(p.publishedAt, tz) : "",
    publishedTime: p.publishedAt ? toTimeInputValue(p.publishedAt, tz) : "",
    featured: p.featured,
    seriesId: p.seriesId ?? "",
    seriesOrder: p.seriesOrder != null ? String(p.seriesOrder) : "",
    projectId: p.projectId ?? "",
    tags: p.tags,
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
    sort: p.sort ? String(p.sort) : "",
    meta: {
      client: str(m.client),
      year: str(m.year),
      role: str(m.role),
      stack: Array.isArray(m.stack) ? (m.stack as string[]) : [],
      liveUrl: str(m.liveUrl),
      repoUrl: str(m.repoUrl),
      gallery: Array.isArray(m.gallery) ? (m.gallery as string[]) : [],
      metrics: Array.isArray(m.metrics) ? (m.metrics as { label: string; value: string }[]) : [],
      icon: str(m.icon),
      faq: Array.isArray(m.faq) ? (m.faq as { q: string; a: string }[]) : [],
    },
    readingMinutes: p.readingMinutes,
    views: p.views,
    publicPath:
      visible && p.type !== "page"
        ? localePath(p.locale, postPath({ type: p.type, slug: p.slug, seriesSlug }))
        : visible && p.slug === "about"
          ? localePath(p.locale, "/about")
          : null,
  };
}

export function editorContext(
  actor: Actor,
  extra: Partial<Pick<EditorContext, "translations" | "syndications">> = {},
): EditorContext {
  return {
    siteUrl: env.siteUrl,
    now: Date.now(),
    series: seriesOptions(actor),
    projects: projectOptions(actor).map((p) => ({ id: p.id, name: p.name })),
    serviceIcons: serviceIconNames,
    translations: extra.translations ?? [],
    syndications: extra.syndications ?? [],
  };
}
