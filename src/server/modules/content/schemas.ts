import { z } from "zod";
import { postStatuses, postTypes, socialNetworks } from "@/server/db/schema";
import { zBool, zId, zNullString, zOptInt, zOptNumber, zOptString, zTags } from "@/lib/zod-helpers";

const zLocale = z.enum(["fa", "en"]);

/** Slug: letters (incl. Persian), digits and dashes. Empty → generated from the title. */
export const zSlug = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z
    .string()
    .trim()
    .max(120)
    .regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u)
    .optional(),
);

const metric = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(40),
});

/** Accepts an array or a JSON string (FormData) for list fields. */
const jsonArray = <T extends z.ZodType>(item: T, max: number) =>
  z.preprocess((v) => {
    if (typeof v === "string") {
      if (!v.trim()) return [];
      try {
        return JSON.parse(v);
      } catch {
        return v
          .split(/\n/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    return v ?? [];
  }, z.array(item).max(max));

/** Type-specific fields stored in `posts.meta`. */
export const postMetaInput = z.object({
  client: zOptString(120),
  year: zOptInt,
  role: zOptString(200),
  stack: zTags.optional(),
  liveUrl: zOptString(500),
  repoUrl: zOptString(500),
  gallery: jsonArray(z.string().trim().min(1).max(1000), 24).optional(),
  metrics: jsonArray(metric, 8).optional(),
  /** lucide icon name for services (globe, smartphone, bot, compass…). */
  icon: zOptString(40),
  /** FAQ for services / pillar articles → FAQPage JSON-LD. */
  faq: jsonArray(
    z.object({ q: z.string().trim().min(1).max(300), a: z.string().trim().min(1).max(3000) }),
    20,
  ).optional(),
});

export const postInput = z.object({
  type: z.enum(postTypes).default("article"),
  locale: zLocale.default("fa"),
  title: z.string().trim().min(1).max(200),
  slug: zSlug,
  excerpt: zNullString(600),
  contentMd: z.string().max(400_000).default(""),
  coverUrl: zNullString(1000),
  coverAlt: zNullString(300),
  videoUrl: zNullString(1000),
  status: z.enum(postStatuses).default("draft"),
  /** ISO datetime / epoch ms. Future + published → scheduled. */
  publishedAt: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v === null ? null : new Date(v as string)),
    z.date().nullable().optional(),
  ),
  featured: zBool.optional(),
  seriesId: zNullString(64),
  seriesOrder: zOptNumber,
  projectId: zNullString(64),
  tags: zTags.optional(),
  seoTitle: zNullString(200),
  seoDescription: zNullString(400),
  translationKey: zNullString(64),
  sort: zOptNumber,
  meta: postMetaInput.optional(),
});
export type PostInput = z.input<typeof postInput>;

export const updatePostInput = postInput.partial().extend({ id: zId });

export const listPostsInput = z.object({
  type: z.enum(postTypes).optional(),
  locale: zLocale.optional(),
  status: z.enum(postStatuses).optional(),
  q: zOptString(200),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const setStatusInput = z.object({
  id: zId,
  status: z.enum(postStatuses),
  publishedAt: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : new Date(v as string)),
    z.date().optional(),
  ),
});

export const checkSlugInput = z.object({
  type: z.enum(postTypes),
  locale: zLocale,
  slug: z.string().trim().max(120),
  excludeId: zOptString(64),
});

export const seriesInput = z.object({
  locale: zLocale.default("fa"),
  title: z.string().trim().min(1).max(200),
  slug: zSlug,
  description: zNullString(2000),
  coverUrl: zNullString(1000),
  level: z.preprocess(
    (v) => (v === "" ? null : v),
    z.enum(["beginner", "intermediate", "advanced"]).nullable().optional(),
  ),
  status: z.enum(["draft", "published"]).default("draft"),
  sort: zOptNumber,
});
export const updateSeriesInput = seriesInput.partial().extend({ id: zId });

export const testimonialInput = z.object({
  locale: zLocale.default("fa"),
  author: z.string().trim().min(1).max(120),
  role: zNullString(120),
  company: zNullString(120),
  avatarUrl: zNullString(1000),
  quote: z.string().trim().min(1).max(2000),
  rating: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z.number().int().min(1).max(5).nullable().optional(),
  ),
  projectId: zNullString(64),
  clientId: zNullString(64),
  published: zBool.optional(),
  sort: zOptNumber,
});
export const updateTestimonialInput = testimonialInput.partial().extend({ id: zId });

export const syndicationInput = z.object({
  postId: zId,
  network: z.enum(socialNetworks),
  externalUrl: zNullString(1000),
  status: z.enum(["pending", "posted", "failed", "skipped"]).default("posted"),
});
