import { z } from "zod";
import { locales } from "@/i18n/config";
import { postTypes } from "@/server/db/enums";
import { AppError } from "@/server/errors";

/**
 * Argument schemas of the cached content queries (./queries.ts).
 *
 * A `'use cache'` function has a server reference id, exactly like a server
 * action. The proxy refuses such an id as an action, but a cached function
 * must be safe even without that rule: treat each one as a PUBLIC ENDPOINT.
 * Its arguments are therefore checked inside the function, first thing, with
 * the schemas below: enums for locale and type, row ids by shape, short
 * strings, small limits. A call with anything else throws before it does any
 * work, and a function that throws writes nothing to the cache.
 *
 * No cached function takes free-form content (a Markdown body, HTML). Content
 * is addressed by what identifies a published row and loaded inside.
 *
 * Pure module (zod only) so the rules are unit-tested without a database.
 */

/** Longest search text a list accepts. */
export const MAX_QUERY_TEXT = 200;
/** Longest slug a lookup accepts (the CMS stores at most 120 characters). */
export const MAX_SLUG = 200;
/** Longest tag / stack label a filter accepts. */
export const MAX_LABEL = 100;
/** Largest page size or item limit of any cached list. */
export const MAX_LIMIT = 100;
export const MIN_YEAR = 1900;
export const MAX_YEAR = 2200;
export const MAX_PAGE = 100_000;

const zLocale = z.enum(locales);
const zTypes = z.array(z.enum(postTypes)).min(1).max(postTypes.length);
/** Row ids and translation keys: the id alphabet, plus `-`/`_` for hand-written keys. */
const zRowId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const zSlug = z.string().min(1).max(MAX_SLUG);
const zLimit = z.number().int().min(1).max(MAX_LIMIT);
const zLabel = z.string().max(MAX_LABEL);

export const queryArgs = {
  locale: zLocale,
  localeAndTypes: z.tuple([zLocale, zTypes]),
  list: z.object({
    locale: zLocale,
    types: zTypes,
    tag: zLabel.optional(),
    q: z.string().max(MAX_QUERY_TEXT).optional(),
    stack: zLabel.optional(),
    year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).optional(),
    featured: z.boolean().optional(),
    standalone: z.boolean().optional(),
    page: z.number().int().min(1).max(MAX_PAGE).optional(),
    pageSize: zLimit.optional(),
    orderBy: z.enum(["date", "sort"]).optional(),
  }),
  postBySlug: z.tuple([zLocale, zTypes, zSlug]),
  seriesBySlug: z.tuple([zLocale, zSlug]),
  rowId: zRowId,
  optionalRowId: zRowId.nullable(),
  adjacent: z.object({
    id: zRowId,
    locale: zLocale,
    types: zTypes,
    publishedAt: z.date().nullable(),
    createdAt: z.date(),
  }),
  related: z.tuple([
    z.object({ id: zRowId, locale: zLocale, tags: z.array(zLabel).max(50) }),
    zTypes,
    zLimit,
  ]),
  localeAndLimit: z.tuple([zLocale, zLimit]),
  projectTestimonial: z.tuple([zRowId.nullable(), zLocale]),
  fullPosts: z.tuple([zLocale, zTypes, zLimit]),
  /** A post and the version (its `updatedAt`, epoch ms) the caller saw. */
  postVersion: z.tuple([zRowId, z.number().int().min(0).max(8_640_000_000_000_000)]),
} as const;

/** Parse the arguments of a cached function, or throw before any work is done. */
export function checkArgs<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AppError("validation", "Invalid arguments");
  return parsed.data;
}
