import "server-only";
import { and, asc, desc, eq, inArray, like, ne, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/server/db/client";
import {
  posts,
  projects,
  series,
  syndications,
  testimonials,
  clients,
  type PostType,
} from "@/server/db/schema";
import { assertAdmin, type Actor } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { AppError, notFound } from "@/server/errors";
import { newId } from "@/lib/ids";
import { readingMinutes } from "@/lib/markdown";
import { slugGroup } from "@/lib/content";
import { slugify } from "@/lib/utils";
import type {
  checkSlugInput,
  listPostsInput,
  postInput,
  seriesInput,
  setStatusInput,
  syndicationInput,
  testimonialInput,
  updatePostInput,
  updateSeriesInput,
  updateTestimonialInput,
} from "./schemas";

/**
 * CMS (admin only). Public, cached reads live in ./queries.ts.
 * Callers invalidate the public cache: actions → updateTag("content"),
 * tools/route handlers → revalidateTag("content", "max").
 */

type PostIn = z.output<typeof postInput>;

// ─── Slugs ──────────────────────────────────────────────────────────────────

function slugTaken(type: PostType, locale: "fa" | "en", slug: string, excludeId?: string) {
  return !!db
    .select({ id: posts.id })
    .from(posts)
    .where(
      and(
        eq(posts.locale, locale),
        inArray(posts.type, [...slugGroup(type)]),
        eq(posts.slug, slug),
        excludeId ? ne(posts.id, excludeId) : undefined,
      ),
    )
    .get();
}

function uniqueSlug(type: PostType, locale: "fa" | "en", wanted: string, excludeId?: string) {
  const base = slugify(wanted) || `${type}-${newId(6)}`;
  let slug = base;
  for (let i = 2; slugTaken(type, locale, slug, excludeId); i++) slug = `${base}-${i}`;
  return slug;
}

export function checkSlug(actor: Actor, input: z.output<typeof checkSlugInput>) {
  assertAdmin(actor);
  const slug = slugify(input.slug);
  const taken = slug ? slugTaken(input.type, input.locale, slug, input.excludeId) : true;
  return {
    slug,
    available: !taken,
    suggestion: taken
      ? uniqueSlug(input.type, input.locale, slug || input.type, input.excludeId)
      : slug,
  };
}

// ─── Status rules ───────────────────────────────────────────────────────────

/**
 * Normalize status + publishedAt:
 * - published with a future date → scheduled
 * - scheduled with a past date → published
 * - published without a date → now
 * - scheduled without a date → validation error
 */
export function normalizeStatus(
  status: PostIn["status"],
  publishedAt: Date | null | undefined,
  now = Date.now(),
): { status: PostIn["status"]; publishedAt: Date | null | undefined } {
  if (status === "published" || status === "scheduled") {
    if (!publishedAt) {
      if (status === "scheduled") {
        throw new AppError("validation", "publishedAt required", {
          publishedAt: ["Set a publish date for scheduled posts"],
        });
      }
      return { status, publishedAt: new Date(now) };
    }
    return { status: publishedAt.getTime() > now ? "scheduled" : "published", publishedAt };
  }
  return { status, publishedAt };
}

function cleanMeta(meta: PostIn["meta"] | undefined, prev: Record<string, unknown> = {}) {
  if (!meta) return prev;
  const out: Record<string, unknown> = { ...prev };
  for (const [k, v] of Object.entries(meta)) {
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0))
      delete out[k];
    else out[k] = v;
  }
  return out;
}

function assertSeries(seriesId: string | null | undefined) {
  if (!seriesId) return;
  const s = db.select({ id: series.id }).from(series).where(eq(series.id, seriesId)).get();
  if (!s) throw new AppError("validation", "Unknown series", { seriesId: ["Unknown series"] });
}

// ─── Posts ──────────────────────────────────────────────────────────────────

export function listPosts(actor: Actor, input: z.output<typeof listPostsInput> = {}) {
  assertAdmin(actor);
  return db
    .select({
      id: posts.id,
      type: posts.type,
      locale: posts.locale,
      slug: posts.slug,
      title: posts.title,
      status: posts.status,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      featured: posts.featured,
      views: posts.views,
      tags: posts.tags,
      coverUrl: posts.coverUrl,
      translationKey: posts.translationKey,
      seriesSlug: series.slug,
    })
    .from(posts)
    .leftJoin(series, eq(series.id, posts.seriesId))
    .where(
      and(
        input.type ? eq(posts.type, input.type) : undefined,
        input.locale ? eq(posts.locale, input.locale) : undefined,
        input.status ? eq(posts.status, input.status) : undefined,
        input.q
          ? or(like(posts.title, `%${input.q}%`), like(posts.slug, `%${input.q}%`))
          : undefined,
      ),
    )
    .orderBy(desc(posts.updatedAt))
    .limit(input.limit ?? 300)
    .all();
}

export function contentCounts(actor: Actor) {
  assertAdmin(actor);
  const rows = db
    .select({ status: posts.status, n: sql<number>`count(*)` })
    .from(posts)
    .groupBy(posts.status)
    .all();
  const by = Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
  const views =
    db
      .select({ v: sql<number>`coalesce(sum(${posts.views}), 0)` })
      .from(posts)
      .get()?.v ?? 0;
  return {
    published: by.published ?? 0,
    scheduled: by.scheduled ?? 0,
    draft: by.draft ?? 0,
    archived: by.archived ?? 0,
    views,
  };
}

export function getPost(actor: Actor, id: string) {
  assertAdmin(actor);
  const post = db.select().from(posts).where(eq(posts.id, id)).get();
  if (!post) throw notFound("Post");
  const translations = post.translationKey
    ? db
        .select({
          id: posts.id,
          locale: posts.locale,
          title: posts.title,
          status: posts.status,
          slug: posts.slug,
        })
        .from(posts)
        .where(and(eq(posts.translationKey, post.translationKey), ne(posts.id, post.id)))
        .all()
    : [];
  const synd = db
    .select()
    .from(syndications)
    .where(eq(syndications.postId, id))
    .orderBy(asc(syndications.createdAt))
    .all();
  const seriesRow = post.seriesId
    ? (db.select({ slug: series.slug }).from(series).where(eq(series.id, post.seriesId)).get() ??
      null)
    : null;
  return { post, translations, syndications: synd, seriesSlug: seriesRow?.slug ?? null };
}

export function createPost(actor: Actor, input: PostIn) {
  assertAdmin(actor);
  assertSeries(input.seriesId);
  const slug = input.slug ? input.slug : uniqueSlug(input.type, input.locale, input.title);
  if (slugTaken(input.type, input.locale, slug)) {
    throw new AppError("conflict", "Slug already used", { slug: ["slug_taken"] });
  }
  const { status, publishedAt } = normalizeStatus(input.status, input.publishedAt ?? null);
  const row = db
    .insert(posts)
    .values({
      type: input.type,
      locale: input.locale,
      title: input.title,
      slug,
      excerpt: input.excerpt ?? null,
      contentMd: input.contentMd,
      coverUrl: input.coverUrl ?? null,
      coverAlt: input.coverAlt ?? null,
      videoUrl: input.videoUrl ?? null,
      status,
      publishedAt: publishedAt ?? null,
      featured: input.featured ?? false,
      seriesId: input.type === "tutorial" ? (input.seriesId ?? null) : null,
      seriesOrder: input.type === "tutorial" ? (input.seriesOrder ?? null) : null,
      projectId: input.projectId ?? null,
      tags: input.tags ?? [],
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      readingMinutes: readingMinutes(input.contentMd),
      translationKey: input.translationKey ?? newId(),
      sort: input.sort ?? 0,
      meta: cleanMeta(input.meta),
      authorId: actor.user.id,
    })
    .returning()
    .get();
  logActivity(actor, "content.create", "post", row.id, row.title, { type: row.type });
  return row;
}

export function updatePost(actor: Actor, { id, ...input }: z.output<typeof updatePostInput>) {
  assertAdmin(actor);
  const prev = db.select().from(posts).where(eq(posts.id, id)).get();
  if (!prev) throw notFound("Post");
  if (input.seriesId !== undefined) assertSeries(input.seriesId);
  const type = input.type ?? prev.type;
  const locale = input.locale ?? prev.locale;
  let slug = prev.slug;
  if (input.slug !== undefined || input.type !== undefined || input.locale !== undefined) {
    slug = input.slug ?? prev.slug;
    if (slugTaken(type, locale, slug, id)) {
      throw new AppError("conflict", "Slug already used", { slug: ["slug_taken"] });
    }
  }
  let statusPatch: { status?: PostIn["status"]; publishedAt?: Date | null } = {};
  if (input.status !== undefined || input.publishedAt !== undefined) {
    const n = normalizeStatus(
      input.status ?? prev.status,
      input.publishedAt !== undefined ? input.publishedAt : prev.publishedAt,
    );
    statusPatch = { status: n.status, publishedAt: n.publishedAt ?? null };
  }
  const { meta, contentMd, slug: _slug, publishedAt: _p, status: _s, ...rest } = input;
  void _slug;
  void _p;
  void _s;
  const row = db
    .update(posts)
    .set({
      ...rest,
      type,
      locale,
      slug,
      ...statusPatch,
      ...(contentMd !== undefined && { contentMd, readingMinutes: readingMinutes(contentMd) }),
      ...(meta !== undefined && { meta: cleanMeta(meta, prev.meta) }),
      ...(type !== "tutorial" && { seriesId: null, seriesOrder: null }),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))
    .returning()
    .get();
  logActivity(actor, "content.update", "post", id, row.title);
  return row;
}

export function setPostStatus(actor: Actor, input: z.output<typeof setStatusInput>) {
  assertAdmin(actor);
  const prev = db.select().from(posts).where(eq(posts.id, input.id)).get();
  if (!prev) throw notFound("Post");
  const wantsDate = input.status === "published" || input.status === "scheduled";
  const n = normalizeStatus(
    input.status,
    input.publishedAt ??
      (wantsDate && prev.publishedAt && input.status === "scheduled" ? prev.publishedAt : null),
  );
  const row = db
    .update(posts)
    .set({
      status: n.status,
      publishedAt: n.publishedAt ?? prev.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, input.id))
    .returning()
    .get();
  logActivity(actor, `content.${n.status}`, "post", input.id, row.title);
  return row;
}

export function deletePost(actor: Actor, id: string) {
  assertAdmin(actor);
  const prev = db.select({ title: posts.title }).from(posts).where(eq(posts.id, id)).get();
  if (!prev) throw notFound("Post");
  db.delete(posts).where(eq(posts.id, id)).run();
  logActivity(actor, "content.delete", "post", id, prev.title);
}

/** Copy a post into the other locale as a draft, linked by translationKey. */
export function createTranslation(actor: Actor, id: string) {
  assertAdmin(actor);
  const src = db.select().from(posts).where(eq(posts.id, id)).get();
  if (!src) throw notFound("Post");
  const locale = src.locale === "fa" ? "en" : "fa";
  const key = src.translationKey ?? newId();
  if (!src.translationKey)
    db.update(posts).set({ translationKey: key }).where(eq(posts.id, id)).run();
  const existing = db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.translationKey, key), eq(posts.locale, locale)))
    .get();
  if (existing) return existing;
  // Series are per-locale: keep the series only if the target locale has one with the same slug.
  let seriesId: string | null = null;
  if (src.seriesId) {
    const s = db.select().from(series).where(eq(series.id, src.seriesId)).get();
    seriesId = s
      ? (db
          .select({ id: series.id })
          .from(series)
          .where(and(eq(series.locale, locale), eq(series.slug, s.slug)))
          .get()?.id ?? null)
      : null;
  }
  const row = db
    .insert(posts)
    .values({
      ...src,
      id: undefined,
      locale,
      slug: uniqueSlug(src.type, locale, src.slug),
      status: "draft",
      publishedAt: null,
      views: 0,
      seriesId,
      translationKey: key,
      authorId: actor.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: posts.id })
    .get();
  logActivity(actor, "content.translate", "post", row.id, src.title, { from: id, locale });
  return row;
}

/** Public: count a view (fired by a client island after load, not during render). */
export function recordView(id: string) {
  db.update(posts)
    .set({ views: sql`${posts.views} + 1` })
    .where(and(eq(posts.id, id), inArray(posts.status, ["published", "scheduled"])))
    .run();
}

// ─── Syndication (POSSE) ────────────────────────────────────────────────────

export function upsertSyndication(actor: Actor, input: z.output<typeof syndicationInput>) {
  assertAdmin(actor);
  const post = db.select({ id: posts.id }).from(posts).where(eq(posts.id, input.postId)).get();
  if (!post) throw notFound("Post");
  const existing = db
    .select({ id: syndications.id })
    .from(syndications)
    .where(
      and(
        eq(syndications.postId, input.postId),
        eq(syndications.network, input.network),
        eq(syndications.direction, "outbound"),
      ),
    )
    .get();
  if (!input.externalUrl && input.status === "posted") {
    if (existing) db.delete(syndications).where(eq(syndications.id, existing.id)).run();
    return null;
  }
  const values = {
    externalUrl: input.externalUrl ?? null,
    status: input.status,
    postedAt: input.status === "posted" ? new Date() : null,
    error: null,
  };
  const row = existing
    ? db.update(syndications).set(values).where(eq(syndications.id, existing.id)).returning().get()
    : db
        .insert(syndications)
        .values({ postId: input.postId, network: input.network, direction: "outbound", ...values })
        .returning()
        .get();
  logActivity(actor, "content.syndicate", "post", input.postId, input.network);
  return row;
}

export function deleteSyndication(actor: Actor, id: string) {
  assertAdmin(actor);
  db.delete(syndications).where(eq(syndications.id, id)).run();
}

// ─── Series ─────────────────────────────────────────────────────────────────

export function listSeriesAdmin(actor: Actor) {
  assertAdmin(actor);
  const list = db.select().from(series).orderBy(asc(series.locale), asc(series.sort)).all();
  const counts = new Map(
    db
      .select({ id: posts.seriesId, n: sql<number>`count(*)` })
      .from(posts)
      .where(eq(posts.type, "tutorial"))
      .groupBy(posts.seriesId)
      .all()
      .map((r) => [r.id, r.n]),
  );
  return list.map((s) => ({ ...s, lessons: counts.get(s.id) ?? 0 }));
}

function uniqueSeriesSlug(locale: "fa" | "en", wanted: string, excludeId?: string) {
  const base = slugify(wanted) || `series-${newId(6)}`;
  let slug = base;
  for (let i = 2; ; i++) {
    const hit = db
      .select({ id: series.id })
      .from(series)
      .where(
        and(
          eq(series.locale, locale),
          eq(series.slug, slug),
          excludeId ? ne(series.id, excludeId) : undefined,
        ),
      )
      .get();
    if (!hit) return slug;
    slug = `${base}-${i}`;
  }
}

export function createSeries(actor: Actor, input: z.output<typeof seriesInput>) {
  assertAdmin(actor);
  const row = db
    .insert(series)
    .values({
      ...input,
      level: input.level ?? null,
      sort: input.sort ?? 0,
      slug: input.slug ?? uniqueSeriesSlug(input.locale, input.title),
    })
    .returning()
    .get();
  logActivity(actor, "content.series_create", "series", row.id, row.title);
  return row;
}

export function updateSeries(actor: Actor, { id, ...input }: z.output<typeof updateSeriesInput>) {
  assertAdmin(actor);
  const prev = db.select().from(series).where(eq(series.id, id)).get();
  if (!prev) throw notFound("Series");
  if (input.slug) {
    const hit = db
      .select({ id: series.id })
      .from(series)
      .where(
        and(
          eq(series.locale, input.locale ?? prev.locale),
          eq(series.slug, input.slug),
          ne(series.id, id),
        ),
      )
      .get();
    if (hit) throw new AppError("conflict", "Slug already used", { slug: ["slug_taken"] });
  }
  const row = db
    .update(series)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(series.id, id))
    .returning()
    .get();
  logActivity(actor, "content.series_update", "series", id, row.title);
  return row;
}

export function deleteSeries(actor: Actor, id: string) {
  assertAdmin(actor);
  db.update(posts).set({ seriesId: null, seriesOrder: null }).where(eq(posts.seriesId, id)).run();
  db.delete(series).where(eq(series.id, id)).run();
  logActivity(actor, "content.series_delete", "series", id);
}

export function seriesOptions(actor: Actor) {
  assertAdmin(actor);
  return db
    .select({ id: series.id, title: series.title, locale: series.locale })
    .from(series)
    .orderBy(asc(series.sort))
    .all();
}

// ─── Testimonials ───────────────────────────────────────────────────────────

export function listTestimonialsAdmin(actor: Actor) {
  assertAdmin(actor);
  return db
    .select({
      t: testimonials,
      projectName: projects.name,
      clientName: clients.name,
    })
    .from(testimonials)
    .leftJoin(projects, eq(projects.id, testimonials.projectId))
    .leftJoin(clients, eq(clients.id, testimonials.clientId))
    .orderBy(asc(testimonials.locale), asc(testimonials.sort), desc(testimonials.createdAt))
    .all()
    .map((r) => ({ ...r.t, projectName: r.projectName, clientName: r.clientName }));
}

export function createTestimonial(actor: Actor, input: z.output<typeof testimonialInput>) {
  assertAdmin(actor);
  const row = db
    .insert(testimonials)
    .values({ ...input, published: input.published ?? true, sort: input.sort ?? 0 })
    .returning()
    .get();
  logActivity(actor, "content.testimonial_create", "testimonial", row.id, row.author);
  return row;
}

export function updateTestimonial(
  actor: Actor,
  { id, ...input }: z.output<typeof updateTestimonialInput>,
) {
  assertAdmin(actor);
  const row = db.update(testimonials).set(input).where(eq(testimonials.id, id)).returning().get();
  if (!row) throw notFound("Testimonial");
  logActivity(actor, "content.testimonial_update", "testimonial", id, row.author);
  return row;
}

export function deleteTestimonial(actor: Actor, id: string) {
  assertAdmin(actor);
  db.delete(testimonials).where(eq(testimonials.id, id)).run();
  logActivity(actor, "content.testimonial_delete", "testimonial", id);
}

/** Pickers for the editor (projects to link case studies / testimonials). */
export function projectOptions(actor: Actor) {
  assertAdmin(actor);
  return db
    .select({ id: projects.id, name: projects.name, clientId: projects.clientId })
    .from(projects)
    .orderBy(desc(projects.updatedAt))
    .all();
}
