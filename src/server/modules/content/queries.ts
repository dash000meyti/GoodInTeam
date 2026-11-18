import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/server/db/client";
import { textMatch } from "@/server/db/search";
import {
  clients,
  posts,
  postTypes,
  projects,
  series,
  syndications,
  testimonials,
  timeEntries,
  users,
  type PostType,
} from "@/server/db/schema";
import { appTimezone, getSettings } from "@/server/modules/settings/service";
import type { BrandId } from "@/components/brand/brands";
import { renderMarkdown } from "@/lib/markdown";
import type { Locale } from "@/i18n/config";
import {
  MAX_LABEL,
  MAX_LIMIT,
  MAX_PAGE,
  MAX_QUERY_TEXT,
  MAX_SLUG,
  MAX_YEAR,
  MIN_YEAR,
  checkArgs,
  queryArgs,
} from "./query-args";

/**
 * PUBLIC, CACHED content reads for the website, feeds, sitemap and GEO files.
 *
 * Rules (see docs/modules/content.md):
 * - Every function is `'use cache'` + `cacheTag("content")`, so mutations
 *   invalidate them with `updateTag("content")` (server actions) or
 *   `revalidateTag("content", "max")` (route handlers / tools).
 * - Callers MUST be request-time (`await connection()` first) — there is no
 *   database at build time.
 * - Visibility: status published|scheduled AND publishedAt <= now. The cache
 *   lifetime shrinks automatically when a scheduled post is about to go live.
 * - Every cached function is a PUBLIC ENDPOINT (it has a server reference id,
 *   like an action): it checks its arguments first (`checkArgs`, schemas in
 *   ./query-args.ts), returns public data only, and never takes free-form
 *   content as an argument. Functions fed from the URL (search text, tag,
 *   slug, page) have a plain wrapper that answers impossible values itself, so
 *   an odd URL is an empty list or a 404, never an error.
 */
export const CONTENT_TAG = "content";

// ─── Helpers ────────────────────────────────────────────────────────────────

const publishedAtExpr = sql<number>`coalesce(${posts.publishedAt}, ${posts.createdAt})`;

function visible(now: number): SQL {
  return and(
    inArray(posts.status, ["published", "scheduled"]),
    sql`coalesce(${posts.publishedAt}, ${posts.createdAt}) <= ${now}`,
  )!;
}

/** Lifetime of a content cache entry: "hours", or until the next scheduled post goes live. */
function contentLife(now: number) {
  const row = db
    .select({ at: sql<number | null>`min(${posts.publishedAt})` })
    .from(posts)
    .where(
      and(inArray(posts.status, ["published", "scheduled"]), sql`${posts.publishedAt} > ${now}`),
    )
    .get();
  const next = row?.at ?? null;
  if (next && next - now < 3_600_000) {
    const s = Math.max(1, Math.ceil((next - now) / 1000));
    cacheLife({ stale: Math.min(60, s), revalidate: s, expire: s + 1 });
  } else {
    cacheLife("hours");
  }
}

const hasTag = (tag: string) =>
  sql`exists (select 1 from json_each(${posts.tags}) where json_each.value = ${tag})`;
const hasStack = (stack: string) =>
  sql`exists (select 1 from json_each(${posts.meta}, '$.stack') where json_each.value = ${stack})`;

const cardColumns = {
  id: posts.id,
  type: posts.type,
  locale: posts.locale,
  slug: posts.slug,
  title: posts.title,
  excerpt: posts.excerpt,
  coverUrl: posts.coverUrl,
  coverAlt: posts.coverAlt,
  videoUrl: posts.videoUrl,
  publishedAt: posts.publishedAt,
  updatedAt: posts.updatedAt,
  createdAt: posts.createdAt,
  featured: posts.featured,
  tags: posts.tags,
  readingMinutes: posts.readingMinutes,
  meta: posts.meta,
  views: posts.views,
  seriesId: posts.seriesId,
  seriesOrder: posts.seriesOrder,
  translationKey: posts.translationKey,
  seriesSlug: series.slug,
  seriesTitle: series.title,
};

export interface PostCard {
  id: string;
  type: PostType;
  locale: Locale;
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  coverAlt: string | null;
  videoUrl: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
  featured: boolean;
  tags: string[];
  readingMinutes: number | null;
  meta: Record<string, unknown> & {
    client?: string;
    year?: number;
    role?: string;
    stack?: string[];
    liveUrl?: string;
    repoUrl?: string;
    gallery?: string[];
    metrics?: { label: string; value: string }[];
    icon?: string;
    /** Services: the Good In brand (read with `brandOf(meta)`, which falls back to team). */
    brand?: BrandId;
  };
  views: number;
  seriesId: string | null;
  seriesOrder: number | null;
  translationKey: string | null;
  seriesSlug: string | null;
  seriesTitle: string | null;
}

export interface PostDetail extends PostCard {
  contentMd: string;
  seoTitle: string | null;
  seoDescription: string | null;
  projectId: string | null;
  authorName: string | null;
}

// ─── Lists ──────────────────────────────────────────────────────────────────

export interface ListOptions {
  locale: Locale;
  types: PostType[];
  tag?: string;
  q?: string;
  stack?: string;
  year?: number;
  featured?: boolean;
  /** Only tutorials without a series. */
  standalone?: boolean;
  page?: number;
  pageSize?: number;
  orderBy?: "date" | "sort";
}

const int = (v: number | undefined, fallback: number) =>
  Number.isFinite(v) ? Math.trunc(v as number) : fallback;

/**
 * Published posts, filtered and paged. Filters come from the URL, so values
 * no post can have (an over-long tag, a year outside the calendar) answer
 * with an empty page here instead of reaching the cached query.
 */
export async function listPublished(opts: ListOptions) {
  const pageSize = Math.min(Math.max(int(opts.pageSize, 12), 1), MAX_LIMIT);
  const year = opts.year === undefined ? undefined : int(opts.year, NaN);
  if (
    (opts.tag?.length ?? 0) > MAX_LABEL ||
    (opts.stack?.length ?? 0) > MAX_LABEL ||
    (year !== undefined && !(year >= MIN_YEAR && year <= MAX_YEAR))
  ) {
    return { items: [] as PostCard[], total: 0, page: 1, pages: 1, pageSize };
  }
  return listPublishedCached({
    locale: opts.locale,
    types: opts.types,
    tag: opts.tag || undefined,
    q: opts.q?.slice(0, MAX_QUERY_TEXT) || undefined,
    stack: opts.stack || undefined,
    year,
    featured: opts.featured || undefined,
    standalone: opts.standalone || undefined,
    page: Math.min(Math.max(int(opts.page, 1), 1), MAX_PAGE),
    pageSize,
    orderBy: opts.orderBy === "sort" ? "sort" : undefined,
  });
}

async function listPublishedCached(input: ListOptions) {
  "use cache";
  const opts = checkArgs(queryArgs.list, input);
  cacheTag(CONTENT_TAG);
  const now = Date.now();
  contentLife(now);

  const pageSize = opts.pageSize ?? 12;
  const where = and(
    visible(now),
    eq(posts.locale, opts.locale),
    inArray(posts.type, opts.types),
    opts.tag ? hasTag(opts.tag) : undefined,
    opts.stack ? hasStack(opts.stack) : undefined,
    opts.year ? sql`json_extract(${posts.meta}, '$.year') = ${opts.year}` : undefined,
    opts.featured ? eq(posts.featured, true) : undefined,
    opts.standalone ? isNull(posts.seriesId) : undefined,
    textMatch(opts.q, posts.title, posts.excerpt, posts.contentMd),
  );
  const total = db.select({ n: count() }).from(posts).where(where).get()?.n ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(opts.page ?? 1, 1), pages);
  const items = db
    .select(cardColumns)
    .from(posts)
    .leftJoin(series, eq(series.id, posts.seriesId))
    .where(where)
    .orderBy(
      ...(opts.orderBy === "sort"
        ? [asc(posts.sort), desc(publishedAtExpr)]
        : [desc(publishedAtExpr), asc(posts.sort)]),
    )
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all() as PostCard[];
  return { items, total, page, pages, pageSize };
}

/** First bullet-list items of a Markdown body (plain text) — used as highlight chips. */
function bullets(md: string, max = 5) {
  return md
    .split("\n")
    .map((l) => l.match(/^\s*(?:[-*+]|\d+\.)\s+(.+)$/)?.[1])
    .filter((v): v is string => !!v)
    .map((v) =>
      v
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[*_`]/g, "")
        .trim(),
    )
    .filter(Boolean)
    .slice(0, max);
}

/** Services (sorted) with highlight bullets extracted from their body. */
export async function listServices(locale: Locale) {
  "use cache";
  checkArgs(queryArgs.locale, locale);
  cacheTag(CONTENT_TAG);
  const now = Date.now();
  contentLife(now);
  const rows = db
    .select({ ...cardColumns, contentMd: posts.contentMd })
    .from(posts)
    .leftJoin(series, eq(series.id, posts.seriesId))
    .where(and(visible(now), eq(posts.locale, locale), eq(posts.type, "service")))
    .orderBy(asc(posts.sort), desc(publishedAtExpr))
    .all() as (PostCard & { contentMd: string })[];
  return rows.map(({ contentMd, ...r }) => ({ ...r, highlights: bullets(contentMd) }));
}

/** Tag cloud for a set of types (count desc). */
export async function listTags(locale: Locale, types: PostType[]) {
  "use cache";
  checkArgs(queryArgs.localeAndTypes, [locale, types]);
  cacheTag(CONTENT_TAG);
  const now = Date.now();
  contentLife(now);
  const rows = db
    .select({ tag: sql<string>`json_each.value`, n: sql<number>`count(*)` })
    .from(sql`${posts}, json_each(${posts.tags})`)
    .where(and(visible(now), eq(posts.locale, locale), inArray(posts.type, types)))
    .groupBy(sql`json_each.value`)
    .orderBy(sql`count(*) desc`, sql`json_each.value`)
    .all();
  return rows;
}

/** Stacks and years used by published case studies (for /work filter chips). */
export async function listWorkFacets(locale: Locale) {
  "use cache";
  checkArgs(queryArgs.locale, locale);
  cacheTag(CONTENT_TAG);
  const now = Date.now();
  contentLife(now);
  const base = and(visible(now), eq(posts.locale, locale), eq(posts.type, "work"));
  const stacks = db
    .select({ value: sql<string>`json_each.value`, n: sql<number>`count(*)` })
    .from(sql`${posts}, json_each(${posts.meta}, '$.stack')`)
    .where(base)
    .groupBy(sql`json_each.value`)
    .orderBy(sql`count(*) desc`, sql`json_each.value`)
    .all();
  const years = db
    .select({ value: sql<number>`json_extract(${posts.meta}, '$.year')` })
    .from(posts)
    .where(and(base, sql`json_extract(${posts.meta}, '$.year') is not null`))
    .groupBy(sql`json_extract(${posts.meta}, '$.year')`)
    .orderBy(sql`json_extract(${posts.meta}, '$.year') desc`)
    .all()
    .map((r) => Number(r.value));
  return { stacks, years };
}

// ─── Single posts ───────────────────────────────────────────────────────────

/** A published post by slug. `types` lets /blog resolve article | vlog | note. */
export async function getPublishedPost(
  locale: Locale,
  types: PostType[],
  slug: string,
): Promise<PostDetail | null> {
  // The slug comes from the URL: one that no post can have is simply not found.
  if (typeof slug !== "string" || !slug || slug.length > MAX_SLUG) return null;
  return getPublishedPostCached(locale, types, slug);
}

async function getPublishedPostCached(
  locale: Locale,
  types: PostType[],
  slug: string,
): Promise<PostDetail | null> {
  "use cache";
  checkArgs(queryArgs.postBySlug, [locale, types, slug]);
  cacheTag(CONTENT_TAG);
  const now = Date.now();
  contentLife(now);
  const rows = db
    .select({
      ...cardColumns,
      contentMd: posts.contentMd,
      seoTitle: posts.seoTitle,
      seoDescription: posts.seoDescription,
      projectId: posts.projectId,
      authorName: users.name,
      authorRole: users.role,
    })
    .from(posts)
    .leftJoin(series, eq(series.id, posts.seriesId))
    .leftJoin(users, eq(users.id, posts.authorId))
    .where(
      and(visible(now), eq(posts.locale, locale), inArray(posts.type, types), eq(posts.slug, slug)),
    )
    .all() as (PostDetail & AuthorRole)[];
  if (!rows.length) return null;
  // Same slug in several blog types: article > vlog > note > others (stable).
  rows.sort((a, b) => types.indexOf(a.type) - types.indexOf(b.type));
  return localizeAuthors(rows)[0]!;
}

/** Visible translations of a piece (same translationKey), including itself. */
export async function getTranslations(translationKey: string | null) {
  "use cache";
  checkArgs(queryArgs.optionalRowId, translationKey);
  cacheTag(CONTENT_TAG);
  const now = Date.now();
  contentLife(now);
  if (!translationKey) return [];
  return db
    .select({
      id: posts.id,
      locale: posts.locale,
      type: posts.type,
      slug: posts.slug,
      seriesSlug: series.slug,
    })
    .from(posts)
    .leftJoin(series, eq(series.id, posts.seriesId))
    .where(and(visible(now), eq(posts.translationKey, translationKey)))
    .all();
}

/** Previous (older) and next (newer) published post of the same kinds. */
export async function getAdjacent(post: {
  id: string;
  locale: Locale;
  types: PostType[];
  publishedAt: Date | null;
  createdAt: Date;
}) {
  "use cache";
  checkArgs(queryArgs.adjacent, post);
  cacheTag(CONTENT_TAG);
  const now = Date.now();
  contentLife(now);
  const at = (post.publishedAt ?? post.createdAt).getTime();
  const base = and(
    visible(now),
    eq(posts.locale, post.locale),
    inArray(posts.type, post.types),
    ne(posts.id, post.id),
  );
  const prev = db
    .select(cardColumns)
    .from(posts)
    .leftJoin(series, eq(series.id, posts.seriesId))
    .where(and(base, sql`${publishedAtExpr} <= ${at}`))
    .orderBy(desc(publishedAtExpr))
    .limit(1)
    .get() as PostCard | undefined;
  const next = db
    .select(cardColumns)
    .from(posts)
    .leftJoin(series, eq(series.id, posts.seriesId))
    .where(and(base, sql`${publishedAtExpr} > ${at}`))
    .orderBy(asc(publishedAtExpr))
    .limit(1)
    .get() as PostCard | undefined;
  return { prev: prev ?? null, next: next ?? null };
}

/** Posts sharing tags with `post` (score = shared tags, then recency). */
export async function getRelated(
  post: { id: string; locale: Locale; tags: string[] },
  types: PostType[],
  limit = 3,
) {
  "use cache";
  checkArgs(queryArgs.related, [post, types, limit]);
  cacheTag(CONTENT_TAG);
  const now = Date.now();
  contentLife(now);
  const candidates = db
    .select(cardColumns)
    .from(posts)
    .leftJoin(series, eq(series.id, posts.seriesId))
    .where(
      and(
        visible(now),
        eq(posts.locale, post.locale),
        inArray(posts.type, types),
        ne(posts.id, post.id),
      ),
    )
    .orderBy(desc(publishedAtExpr))
    .limit(60)
    .all() as PostCard[];
  const tags = new Set(post.tags.map((t) => t.toLowerCase()));
  return candidates
    .map((c, i) => ({
      c,
      score: c.tags.filter((t) => tags.has(t.toLowerCase())).length * 100 - i,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c);
}

/** Outbound copies of a post on social networks (POSSE), only posted ones with a URL. */
export async function getSyndicationLinks(postId: string) {
  "use cache";
  checkArgs(queryArgs.rowId, postId);
  cacheTag(CONTENT_TAG);
  const now = Date.now();
  contentLife(now);
  // Only for a post that is visible now: where a draft was shared is not public.
  return db
    .select({ network: syndications.network, url: syndications.externalUrl })
    .from(syndications)
    .innerJoin(posts, eq(posts.id, syndications.postId))
    .where(
      and(
        visible(now),
        eq(syndications.postId, postId),
        eq(syndications.status, "posted"),
        isNotNull(syndications.externalUrl),
      ),
    )
    .all() as { network: string; url: string }[];
}

// ─── Series (courses) ───────────────────────────────────────────────────────

export interface SeriesCard {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  level: "beginner" | "intermediate" | "advanced" | null;
  lessons: number;
  minutes: number;
  firstLessonSlug: string | null;
  updatedAt: Date;
}

export async function listSeries(locale: Locale): Promise<SeriesCard[]> {
  "use cache";
  checkArgs(queryArgs.locale, locale);
  cacheTag(CONTENT_TAG);
  const now = Date.now();
  contentLife(now);
  const list = db
    .select()
    .from(series)
    .where(and(eq(series.locale, locale), eq(series.status, "published")))
    .orderBy(asc(series.sort), desc(series.createdAt))
    .all();
  if (!list.length) return [];
  const lessons = db
    .select({
      seriesId: posts.seriesId,
      slug: posts.slug,
      minutes: posts.readingMinutes,
      order: posts.seriesOrder,
    })
    .from(posts)
    .where(
      and(
        visible(now),
        eq(posts.type, "tutorial"),
        inArray(
          posts.seriesId,
          list.map((s) => s.id),
        ),
      ),
    )
    .orderBy(asc(posts.seriesOrder), asc(publishedAtExpr))
    .all();
  return list.map((s) => {
    const own = lessons.filter((l) => l.seriesId === s.id);
    return {
      id: s.id,
      slug: s.slug,
      title: s.title,
      description: s.description,
      coverUrl: s.coverUrl,
      level: s.level,
      lessons: own.length,
      minutes: own.reduce((sum, l) => sum + (l.minutes ?? 0), 0),
      firstLessonSlug: own[0]?.slug ?? null,
      updatedAt: s.updatedAt,
    };
  });
}

export async function getSeriesWithLessons(locale: Locale, slug: string) {
  // The slug comes from the URL: one that no course can have is simply not found.
  if (typeof slug !== "string" || !slug || slug.length > MAX_SLUG) return null;
  return getSeriesWithLessonsCached(locale, slug);
}

async function getSeriesWithLessonsCached(locale: Locale, slug: string) {
  "use cache";
  checkArgs(queryArgs.seriesBySlug, [locale, slug]);
  cacheTag(CONTENT_TAG);
  const now = Date.now();
  contentLife(now);
  const s = db
    .select()
    .from(series)
    .where(and(eq(series.locale, locale), eq(series.slug, slug), eq(series.status, "published")))
    .get();
  if (!s) return null;
  const lessons = db
    .select(cardColumns)
    .from(posts)
    .leftJoin(series, eq(series.id, posts.seriesId))
    .where(and(visible(now), eq(posts.type, "tutorial"), eq(posts.seriesId, s.id)))
    .orderBy(asc(posts.seriesOrder), asc(publishedAtExpr))
    .all() as PostCard[];
  return {
    series: s,
    lessons,
    minutes: lessons.reduce((sum, l) => sum + (l.readingMinutes ?? 0), 0),
  };
}

// ─── Testimonials, stats, profile ───────────────────────────────────────────

export async function listTestimonials(locale: Locale, limit = 12) {
  "use cache";
  checkArgs(queryArgs.localeAndLimit, [locale, limit]);
  cacheTag(CONTENT_TAG);
  cacheLife("hours");
  return db
    .select({
      id: testimonials.id,
      author: testimonials.author,
      role: testimonials.role,
      company: testimonials.company,
      avatarUrl: testimonials.avatarUrl,
      quote: testimonials.quote,
      rating: testimonials.rating,
      locale: testimonials.locale,
    })
    .from(testimonials)
    .where(eq(testimonials.published, true))
    .orderBy(
      sql`case when ${testimonials.locale} = ${locale} then 0 else 1 end`,
      asc(testimonials.sort),
      desc(testimonials.createdAt),
    )
    .limit(limit)
    .all();
}

/** Testimonial linked to a case study's project (directly, or via the project's client). */
export async function getTestimonialForProject(projectId: string | null, locale: Locale) {
  "use cache";
  checkArgs(queryArgs.projectTestimonial, [projectId, locale]);
  cacheTag(CONTENT_TAG);
  cacheLife("hours");
  if (!projectId) return null;
  const clientId =
    db.select({ c: projects.clientId }).from(projects).where(eq(projects.id, projectId)).get()?.c ??
    null;
  const row = db
    .select({
      author: testimonials.author,
      role: testimonials.role,
      company: testimonials.company,
      avatarUrl: testimonials.avatarUrl,
      quote: testimonials.quote,
      rating: testimonials.rating,
    })
    .from(testimonials)
    .where(
      and(
        eq(testimonials.published, true),
        or(
          eq(testimonials.projectId, projectId),
          clientId ? eq(testimonials.clientId, clientId) : undefined,
        ),
      ),
    )
    .orderBy(
      sql`case when ${testimonials.projectId} = ${projectId} then 0 else 1 end`,
      sql`case when ${testimonials.locale} = ${locale} then 0 else 1 end`,
      asc(testimonials.sort),
    )
    .get();
  return row ?? null;
}

/** Public, aggregate studio numbers for the home page / about page. */
export async function getSiteStats() {
  "use cache";
  cacheTag(CONTENT_TAG, "stats");
  cacheLife("days");
  const delivered =
    db.select({ n: count() }).from(projects).where(eq(projects.status, "completed")).get()?.n ?? 0;
  const ms =
    db
      .select({
        ms: sql<number>`coalesce(sum(${timeEntries.endedAt} - ${timeEntries.startedAt}), 0)`,
      })
      .from(timeEntries)
      .where(isNotNull(timeEntries.endedAt))
      .get()?.ms ?? 0;
  const clientCount =
    db.select({ n: count() }).from(clients).where(isNull(clients.archivedAt)).get()?.n ?? 0;
  const now = Date.now();
  const published =
    db
      .select({ n: count() })
      .from(posts)
      .where(and(visible(now), inArray(posts.type, ["article", "tutorial", "vlog", "note"])))
      .get()?.n ?? 0;
  return {
    projectsDelivered: delivered,
    hoursTracked: Math.round(ms / 3_600_000),
    clients: clientCount,
    postsPublished: published,
  };
}

/** Public profile settings (brand, owner, socials, availability). */
export async function getPublicProfile() {
  "use cache";
  cacheTag(CONTENT_TAG, "settings");
  cacheLife("hours");
  return getSettings("profile");
}

/**
 * Studio time zone for the public clocks (menu bar and panel, D19): the
 * business setting, cached like the profile. Read inside <Suspense> after
 * `await connection()`.
 */
export async function getPublicTimezone() {
  "use cache";
  cacheTag(CONTENT_TAG, "settings");
  cacheLife("hours");
  return appTimezone();
}

/** Names shown in the trust marquee: clients of published case studies + testimonial companies. */
export async function listPublicClientNames(locale: Locale) {
  "use cache";
  checkArgs(queryArgs.locale, locale);
  cacheTag(CONTENT_TAG);
  const now = Date.now();
  contentLife(now);
  const fromWork = db
    .select({ name: sql<string | null>`json_extract(${posts.meta}, '$.client')` })
    .from(posts)
    .where(and(visible(now), eq(posts.type, "work"), eq(posts.locale, locale)))
    .all()
    .map((r) => r.name);
  const fromTestimonials = db
    .select({ name: testimonials.company })
    .from(testimonials)
    .where(eq(testimonials.published, true))
    .all()
    .map((r) => r.name);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of [...fromWork, ...fromTestimonials]) {
    const v = n?.trim();
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      out.push(v);
    }
  }
  return out;
}

// ─── Rendering ──────────────────────────────────────────────────────────────

/**
 * The body of a published post as HTML (+ headings for the TOC), with the
 * safe subset of raw HTML (see `renderMarkdown`).
 *
 * The cache key is what identifies published content: the post id and the
 * version the caller saw (`updatedAt`, epoch ms). The body itself is loaded
 * here, from the row that is visible NOW, so the function can only ever
 * render (and cache) text that is already public, and an edit gets a new
 * entry. Returns null when the post is not visible.
 */
export async function renderPost(postId: string, version: number) {
  "use cache";
  checkArgs(queryArgs.postVersion, [postId, version]);
  cacheTag(CONTENT_TAG);
  const now = Date.now();
  const row = db
    .select({ contentMd: posts.contentMd, updatedAt: posts.updatedAt })
    .from(posts)
    .where(and(visible(now), eq(posts.id, postId)))
    .get();
  if (row && row.updatedAt.getTime() === version) {
    contentLife(now);
  } else {
    // Not public, or not the version that is public now (the caller read the
    // post a moment before an edit): such an entry is never kept for long.
    cacheLife("seconds");
  }
  return row ? renderMarkdown(row.contentMd, { allowHtml: true }) : null;
}

/**
 * `renderPost` for a post the caller already holds. A post that stopped being
 * public between the two reads renders as an empty body.
 */
export async function renderPostBody(post: { id: string; updatedAt: Date }) {
  return (await renderPost(post.id, post.updatedAt.getTime())) ?? { html: "", headings: [] };
}

// ─── Sitemap / feeds / GEO ──────────────────────────────────────────────────

/** Every visible post (both locales) — for sitemap.xml and llms.txt. */
export async function listAllPublished() {
  "use cache";
  cacheTag(CONTENT_TAG);
  const now = Date.now();
  contentLife(now);
  return db
    .select(cardColumns)
    .from(posts)
    .leftJoin(series, eq(series.id, posts.seriesId))
    .where(visible(now))
    .orderBy(asc(posts.type), desc(publishedAtExpr))
    .all() as PostCard[];
}

/** Published series (both locales) — for sitemap.xml. */
export async function listAllSeries() {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("hours");
  return db
    .select({
      locale: series.locale,
      slug: series.slug,
      title: series.title,
      updatedAt: series.updatedAt,
      description: series.description,
    })
    .from(series)
    .where(eq(series.status, "published"))
    .all();
}

/** Full posts of one locale with Markdown, newest first (feeds). */
export async function listFullPosts(locale: Locale, types: PostType[], limit = 50) {
  "use cache";
  checkArgs(queryArgs.fullPosts, [locale, types, limit]);
  cacheTag(CONTENT_TAG);
  const now = Date.now();
  contentLife(now);
  return fullPosts(now, locale, types, limit);
}

/** Upper bound of llms-full.txt (a site of this kind has a few hundred posts at most). */
const ALL_POSTS_CAP = 1000;

/** Every visible post of every locale with Markdown (llms-full.txt). Takes no arguments. */
export async function listAllFullPosts() {
  "use cache";
  cacheTag(CONTENT_TAG);
  const now = Date.now();
  contentLife(now);
  return fullPosts(now, null, [...postTypes], ALL_POSTS_CAP);
}

function fullPosts(now: number, locale: Locale | null, types: PostType[], limit: number) {
  const rows = db
    .select({
      ...cardColumns,
      contentMd: posts.contentMd,
      authorName: users.name,
      authorRole: users.role,
    })
    .from(posts)
    .leftJoin(series, eq(series.id, posts.seriesId))
    .leftJoin(users, eq(users.id, posts.authorId))
    .where(
      and(visible(now), locale ? eq(posts.locale, locale) : undefined, inArray(posts.type, types)),
    )
    .orderBy(desc(publishedAtExpr))
    .limit(limit)
    .all() as (PostCard & { contentMd: string; authorName: string | null } & AuthorRole)[];
  return localizeAuthors(rows);
}

type AuthorRole = { authorRole: string | null };

/**
 * `users.name` is one language, so the owner's posts take the profile's
 * bilingual owner name for the post's locale (falling back to the account
 * name). Settings saves already revalidate the `content` tag.
 */
function localizeAuthors<T extends { locale: Locale; authorName: string | null } & AuthorRole>(
  rows: T[],
): Omit<T, "authorRole">[] {
  const ownerName = rows.some((r) => r.authorRole === "owner")
    ? getSettings("profile").ownerName
    : null;
  return rows.map(({ authorRole, ...r }) => ({
    ...r,
    authorName: (authorRole === "owner" && ownerName?.[r.locale]?.trim()) || r.authorName,
  }));
}
