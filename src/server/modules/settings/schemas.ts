import { z } from "zod";
import { currencyCodes, type CurrencyCode } from "@/lib/money";
import { toLatinDigits } from "@/lib/format";
import { zBool } from "@/lib/zod-helpers";
import { socialNetworks } from "./utils";

/** Form text: missing → "", trimmed, bounded. */
const text = (max: number) => z.preprocess((v) => v ?? "", z.string().trim().max(max));
const required = (max: number) => z.preprocess((v) => v ?? "", z.string().trim().min(1).max(max));
const emailOrEmpty = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : (v ?? "")),
  z.union([z.literal(""), z.email().max(200)]),
);
/** "" | https URL | site-relative path (/media/…). */
const imageUrlOrEmpty = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : (v ?? "")),
  z.union([
    z.literal(""),
    z.url({ protocol: /^https?$/ }).max(1000),
    z.string().regex(/^\/[^\s]{0,999}$/),
  ]),
);
/** Social link or @handle as typed (normalised to a URL by the service). No spaces. */
const link = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : (v ?? "")),
  z.string().max(300).regex(/^\S*$/),
);
/** Numbers typed by humans: accepts Persian/Arabic digits and thousands separators. */
const humanNumber = (schema: z.ZodNumber) =>
  z.preprocess((v) => {
    if (typeof v !== "string") return v ?? 0;
    const s = toLatinDigits(v)
      .replace(/[,\s٬_%]/g, "")
      .replace("٫", ".");
    return s === "" ? 0 : Number(s);
  }, schema);

const currencyEnum = z.enum(currencyCodes as [CurrencyCode, ...CurrencyCode[]]);

// ─── Site profile ───────────────────────────────────────────────────────────

/**
 * Site profile form. Flat dotted keys (`brandName.fa`) so every input gets its
 * own field error; the service expands them with `unflatten()`.
 */
export const profileFormInput = z.object({
  "brandName.fa": required(80),
  "brandName.en": required(80),
  "ownerName.fa": text(100),
  "ownerName.en": text(100),
  "headline.fa": text(200),
  "headline.en": text(200),
  "bio.fa": text(5000),
  "bio.en": text(5000),
  "location.fa": text(100),
  "location.en": text(100),
  avatarUrl: imageUrlOrEmpty,
  email: emailOrEmpty,
  phone: text(50),
  "socials.x": link,
  "socials.linkedin": link,
  "socials.github": link,
  "socials.telegram": link,
  "socials.instagram": link,
  "socials.youtube": link,
  availableForWork: zBool,
});

const biPatch = (max: number) =>
  z
    .object({
      fa: z.string().trim().max(max).optional(),
      en: z.string().trim().max(max).optional(),
    })
    .optional();

/** Partial, nested profile update (REST/MCP). Only the given fields change. */
export const profilePatchInput = z.object({
  brandName: biPatch(80).describe("Brand name shown in the site header { fa, en }"),
  ownerName: biPatch(100),
  headline: biPatch(200).describe("One-line tagline { fa, en }"),
  bio: biPatch(5000).describe("About text (markdown allowed) { fa, en }"),
  location: biPatch(100),
  avatarUrl: z.string().trim().max(1000).optional().describe("https URL or /media/… path"),
  email: z
    .union([z.literal(""), z.email().max(200)])
    .optional()
    .describe("Public contact email"),
  phone: z.string().trim().max(50).optional(),
  socials: z
    .object(
      Object.fromEntries(socialNetworks.map((n) => [n, z.string().trim().max(300).optional()])),
    )
    .partial()
    .optional()
    .describe("Links or handles: x, linkedin, github, telegram, instagram, youtube"),
  availableForWork: z.boolean().optional(),
});
export type ProfilePatch = z.output<typeof profilePatchInput>;

// ─── Business ───────────────────────────────────────────────────────────────

export const businessFormInput = z.object({
  baseCurrency: currencyEnum,
  timezone: z.string().trim().min(1).max(64),
  invoicePrefix: text(20),
  /** Percent, e.g. "9" or "۹٫۵". Stored as basis points. */
  defaultTaxPercent: humanNumber(z.number().min(0).max(100)),
  /** Major units of the base currency. Stored as minor units. */
  defaultHourlyRate: humanNumber(z.number().min(0).max(1e13)),
  "paymentInstructions.fa": text(2000),
  "paymentInstructions.en": text(2000),
});

/** Partial business update (REST/MCP). */
export const businessPatchInput = z.object({
  baseCurrency: currencyEnum.optional().describe("Base/reporting currency code (IRT = Toman)"),
  timezone: z.string().trim().max(64).optional().describe("IANA timezone, e.g. Asia/Tehran"),
  invoicePrefix: z.string().trim().max(20).optional().describe("e.g. 'GT-' → GT-0042"),
  defaultTaxPercent: z.number().min(0).max(100).optional().describe("Percent, e.g. 10 for 10%"),
  defaultHourlyRate: z
    .number()
    .min(0)
    .optional()
    .describe("MAJOR units of the base currency (e.g. 450000 Toman, or 45.5 USD)"),
  paymentInstructions: biPatch(2000).describe("Shown on invoices { fa, en }"),
});
export type BusinessPatch = z.output<typeof businessPatchInput>;

// ─── Activity log ───────────────────────────────────────────────────────────

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Activity filters for REST/MCP (clean JSON Schema for agents). */
export const activityToolInput = z.object({
  actor: z.string().max(64).optional().describe("User id (owner/admin only)"),
  type: z.string().max(64).optional().describe("Entity type, e.g. project, user, api_token"),
  action: z.string().max(120).optional().describe("Exact action, e.g. project.create"),
  from: z.string().regex(DAY_RE).optional().describe("YYYY-MM-DD (app timezone), inclusive"),
  to: z.string().regex(DAY_RE).optional().describe("YYYY-MM-DD (app timezone), inclusive"),
  page: z.number().int().min(1).max(100_000).default(1),
  pageSize: z.number().int().min(5).max(100).default(25),
});
export type ActivityQuery = z.output<typeof activityToolInput>;

/**
 * Same filters parsed leniently from URL search params (strings, "" = unset,
 * malformed values are dropped instead of failing the page).
 */
const param = (schema: z.ZodType<string | undefined>) =>
  z.preprocess((v) => (Array.isArray(v) ? v[0] : v || undefined), schema.catch(undefined));
export const activitySearchParams = z.object({
  actor: param(z.string().max(64).optional()),
  type: param(z.string().max(64).optional()),
  action: param(z.string().max(120).optional()),
  from: param(z.string().regex(DAY_RE).optional()),
  to: param(z.string().regex(DAY_RE).optional()),
  page: z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.coerce.number().int().min(1).catch(1)),
  pageSize: z.literal(25).catch(25),
});
