import { z } from "zod";
import { currencyCodes, parseDecimalInput } from "@/lib/money";

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

/**
 * Number from JSON or a typed string. Strings accept only plain decimals,
 * with Persian/Arabic digits and thousands separators normalized
 * ("۱۲٬۵۰۰", "12,500" → 12500); hex, exponents, "Infinity" or junk become NaN
 * so the schema rejects them. Empty (blank string / null / undefined) → `empty`.
 */
const numberInput = (empty: null | undefined) => (v: unknown) => {
  if (v === undefined) return undefined;
  if (v === null) return empty;
  if (typeof v === "string") {
    if (v.trim() === "") return empty;
    return parseDecimalInput(v) ?? Number.NaN;
  }
  return v;
};

/** Optional number from JSON or string input; "" / null → undefined. `base` may add bounds. */
export const zOptNumberOf = (base: z.ZodNumber = z.number()) =>
  z.preprocess(numberInput(undefined), base.optional());

/**
 * Number for updates: absent → undefined (untouched), "" / null → null (clear).
 * `base` may add bounds.
 */
export const zNullNumberOf = (base: z.ZodNumber = z.number()) =>
  z.preprocess(numberInput(null), base.nullable().optional());

/** Optional number from string input. */
export const zOptNumber = zOptNumberOf();

/** Optional integer from string input. */
export const zOptInt = zOptNumberOf(z.number().int());

/** Nullable number for updates ("" / null → null = clear). */
export const zNullNumber = zNullNumberOf();

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

/** Supported currency code (see `src/lib/money.ts`); trimmed + upper-cased first. */
export const zCurrency = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
  z.enum(currencyCodes),
);

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "YYYY-MM-DD" that is a real calendar day, or any string `Date` can parse. */
export function isDayOrDateString(v: string) {
  const m = DAY_RE.exec(v);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const t = new Date(Date.UTC(y, mo - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
  }
  return /^\d{4}-\d{2}-\d{2}T/.test(v) && !Number.isNaN(Date.parse(v));
}

const dayString = z.string().trim().max(40).refine(isDayOrDateString);
const isBlank = (v: unknown) => v === null || (typeof v === "string" && v.trim() === "");

/** Calendar day ("YYYY-MM-DD" or ISO date-time) for creates; "" / null → undefined. */
export const zOptDay = z.preprocess((v) => (isBlank(v) ? undefined : v), dayString.optional());

/** Calendar day for updates: absent → undefined (untouched), "" / null → null (clear). */
export const zNullDay = z.preprocess(
  (v) => (isBlank(v) ? null : v),
  dayString.nullable().optional(),
);
