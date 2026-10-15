import "server-only";
import type { Metadata } from "next";
import { localePath, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";

/** Route params may arrive percent-encoded (Persian slugs) — normalize. */
export function decodeParam(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/** First value of a search param. */
export function sp(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

/** Positive integer search param (pagination). */
export function pageParam(v: string | string[] | undefined) {
  const n = Number.parseInt(sp(v) ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Build `path?query` without empty values. */
export function withQuery(path: string, q: Record<string, string | number | undefined | null>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q))
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  const s = params.toString();
  return s ? `${path}?${s}` : path;
}

/** Metadata for a slug that doesn't resolve (soft 404 inside a streamed page). */
export function notFoundMetadata(locale: Locale): Metadata {
  const t = getMessages(locale);
  return { title: t.common.notFoundTitle, robots: { index: false, follow: true } };
}

export const homeCrumb = (locale: Locale) => ({
  name: getMessages(locale).site.breadcrumbHome,
  path: localePath(locale, "/"),
});
