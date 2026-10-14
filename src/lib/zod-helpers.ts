import { z } from "zod";

/**
 * Zod helpers that accept both JSON (from client code / API) and FormData
 * strings (from <form action>). Use them in module `schemas.ts` files.
 */
const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

/** Optional trimmed string; "" → undefined. */
export const zOptString = (max = 5000) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

/** Nullable trimmed string; "" → null (use for "clear this field" updates). */
export const zNullString = (max = 5000) =>
  z.preprocess((v) => (v === "" ? null : v), z.string().trim().max(max).nullable().optional());

/** Checkbox/switch: "on" | "true" | true → true; missing → false. */
export const zBool = z.preprocess(
  (v) => v === true || v === "on" || v === "true" || v === "1",
  z.boolean(),
);

/** Optional number from string input. */
export const zOptNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().finite().optional(),
);

/** Optional integer from string input. */
export const zOptInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().int().optional(),
);

/** Date: accepts Date, epoch ms, ISO string; "" → undefined. */
export const zOptDate = z.preprocess(
  (v) =>
    v === "" || v === null || v === undefined
      ? undefined
      : v instanceof Date
        ? v
        : new Date(v as string),
  z.date().optional(),
);

export const zDate = z.preprocess((v) => (v instanceof Date ? v : new Date(v as string)), z.date());

/** Comma-separated or array of tags → string[]. */
export const zTags = z.preprocess(
  (v) =>
    Array.isArray(v)
      ? v
      : typeof v === "string"
        ? v
            .split(/[,،]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
  z.array(z.string().max(50)).max(30),
);

/** Hex color like #00A76F. */
export const zColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** Optional URL; "" → undefined. */
export const zOptUrl = z.preprocess(emptyToUndefined, z.url().max(2000).optional());

/** id string */
export const zId = z.string().min(1).max(64);
