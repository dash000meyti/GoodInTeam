import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { bool, createdAt, json, pk, timestamp, updatedAt } from "./_columns";
import { users } from "./auth";
import { clients } from "./crm";
import { projects } from "./projects";
import { postTypes, postStatuses, socialNetworks, leadStatuses } from "../enums";

// Enum lists live in the dependency-free `../enums` (safe for client bundles).
export { postTypes, postStatuses, socialNetworks, leadStatuses, type PostType } from "../enums";

export interface WorkMeta {
  client?: string;
  year?: number;
  role?: string;
  stack?: string[];
  liveUrl?: string;
  repoUrl?: string;
  gallery?: string[];
  metrics?: { label: string; value: string }[];
}

/**
 * Public content (CMS). One table for every publishable thing:
 * - article:  blog post
 * - tutorial: lesson (optionally part of a `series` = course)
 * - vlog:     video-first post (videoUrl)
 * - note:     short post / micro-blog (future: syndicated to X, etc.)
 * - work:     portfolio case study (`meta` holds client, year, stack, links…)
 * - service:  a service offering shown on the site
 * - page:     static page (about, uses, now…)
 * Translations of the same piece share `translationKey`.
 */
export const posts = sqliteTable(
  "posts",
  {
    id: pk(),
    type: text("type", { enum: postTypes }).notNull().default("article"),
    locale: text("locale", { enum: ["fa", "en"] })
      .notNull()
      .default("fa"),
    translationKey: text("translation_key"),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    contentMd: text("content_md").notNull().default(""),
    coverUrl: text("cover_url"),
    coverAlt: text("cover_alt"),
    videoUrl: text("video_url"),
    status: text("status", { enum: postStatuses }).notNull().default("draft"),
    publishedAt: timestamp("published_at"),
    featured: bool("featured").notNull().default(false),
    seriesId: text("series_id"),
    seriesOrder: real("series_order"),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    tags: json<string[]>("tags").notNull().default([]),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    readingMinutes: integer("reading_minutes"),
    meta: json<WorkMeta & Record<string, unknown>>("meta").notNull().default({}),
    sort: real("sort").notNull().default(0),
    views: integer("views").notNull().default(0),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("posts_locale_type_slug_uq").on(t.locale, t.type, t.slug),
    index("posts_status_published_idx").on(t.status, t.publishedAt),
    index("posts_translation_idx").on(t.translationKey),
  ],
);

/** A series groups tutorials into a course / learning path. */
export const series = sqliteTable(
  "series",
  {
    id: pk(),
    locale: text("locale", { enum: ["fa", "en"] })
      .notNull()
      .default("fa"),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    coverUrl: text("cover_url"),
    level: text("level", { enum: ["beginner", "intermediate", "advanced"] }),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    sort: real("sort").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("series_locale_slug_uq").on(t.locale, t.slug)],
);

/** Uploaded files, stored in DATA_DIR/uploads and served from /media/<id>/<name>. */
export const media = sqliteTable("media", {
  id: pk(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  width: integer("width"),
  height: integer("height"),
  alt: text("alt"),
  sha256: text("sha256").notNull(),
  /** Public files can be served without a session (site images). */
  isPublic: bool("is_public").notNull().default(true),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  uploadedBy: text("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/**
 * POSSE (Publish on Own Site, Syndicate Elsewhere) — one row per copy of a
 * post on a social network. Integrations fill this in (see docs/roadmap.md).
 */
export const syndications = sqliteTable(
  "syndications",
  {
    id: pk(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    network: text("network", { enum: socialNetworks }).notNull(),
    direction: text("direction", { enum: ["outbound", "inbound"] })
      .notNull()
      .default("outbound"),
    status: text("status", { enum: ["pending", "posted", "failed", "skipped"] })
      .notNull()
      .default("pending"),
    externalId: text("external_id"),
    externalUrl: text("external_url"),
    error: text("error"),
    postedAt: timestamp("posted_at"),
    createdAt: createdAt(),
  },
  (t) => [index("syndications_post_idx").on(t.postId)],
);

/** Contact-form submissions from the public site. */
export const leads = sqliteTable(
  "leads",
  {
    id: pk(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    company: text("company"),
    service: text("service"),
    budget: text("budget"),
    message: text("message").notNull(),
    locale: text("locale").notNull().default("fa"),
    source: text("source"),
    status: text("status", { enum: leadStatuses }).notNull().default("new"),
    clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("leads_status_idx").on(t.status, t.createdAt)],
);

export const testimonials = sqliteTable("testimonials", {
  id: pk(),
  locale: text("locale", { enum: ["fa", "en"] })
    .notNull()
    .default("fa"),
  author: text("author").notNull(),
  role: text("role"),
  company: text("company"),
  avatarUrl: text("avatar_url"),
  quote: text("quote").notNull(),
  rating: integer("rating"),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
  published: bool("published").notNull().default(true),
  sort: real("sort").notNull().default(0),
  createdAt: createdAt(),
});
