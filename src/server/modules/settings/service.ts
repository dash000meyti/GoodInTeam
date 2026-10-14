import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { settings } from "@/server/db/schema";
import { assertAdmin, type Actor } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { errors } from "@/server/modules/users/errors";
import { env } from "@/lib/env";
import { fromMinor, isCurrency, toMinor } from "@/lib/money";
import type { BusinessPatch, ProfilePatch } from "./schemas";
import {
  bpsToPercent,
  isValidTimeZone,
  mergeDeep,
  percentToBps,
  socialNetworks,
  socialUrl,
  type SocialNetwork,
} from "./utils";

/**
 * Typed application settings stored as JSON rows in `settings`.
 * Each key has a zod schema with defaults, so reads always return a full,
 * valid object even when nothing has been saved yet.
 */
export const settingsSchemas = {
  profile: z.object({
    brandName: z
      .object({ fa: z.string(), en: z.string() })
      .default({ fa: "گود تیم", en: "Good Team" }),
    ownerName: z.object({ fa: z.string(), en: z.string() }).default({ fa: "", en: "" }),
    headline: z.object({ fa: z.string(), en: z.string() }).default({ fa: "", en: "" }),
    bio: z.object({ fa: z.string(), en: z.string() }).default({ fa: "", en: "" }),
    avatarUrl: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    location: z
      .object({ fa: z.string(), en: z.string() })
      .default({ fa: "تهران، ایران", en: "Tehran, Iran" }),
    socials: z
      .object({
        x: z.string().default(""),
        linkedin: z.string().default(""),
        github: z.string().default(""),
        telegram: z.string().default(""),
        instagram: z.string().default(""),
        youtube: z.string().default(""),
      })
      .default({ x: "", linkedin: "", github: "", telegram: "", instagram: "", youtube: "" }),
    availableForWork: z.boolean().default(true),
  }),
  business: z.object({
    baseCurrency: z.string().default("IRT"),
    timezone: z.string().default(env.timezone),
    invoicePrefix: z.string().default("GT-"),
    defaultTaxBps: z.number().int().default(0),
    defaultHourlyRateMinor: z.number().int().default(0),
    paymentInstructions: z.object({ fa: z.string(), en: z.string() }).default({ fa: "", en: "" }),
  }),
} as const;

export type SettingsKey = keyof typeof settingsSchemas;
export type Settings<K extends SettingsKey> = z.output<(typeof settingsSchemas)[K]>;

export function getSettings<K extends SettingsKey>(key: K): Settings<K> {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  const parsed = settingsSchemas[key].safeParse(row?.value ?? {});
  return (parsed.success ? parsed.data : settingsSchemas[key].parse({})) as Settings<K>;
}

export function saveSettings<K extends SettingsKey>(key: K, value: Partial<Settings<K>>) {
  const merged = settingsSchemas[key].parse({ ...getSettings(key), ...value });
  db.insert(settings)
    .values({ key, value: merged })
    .onConflictDoUpdate({ target: settings.key, set: { value: merged, updatedAt: new Date() } })
    .run();
  return merged as Settings<K>;
}

/** Timezone used to render dates (business setting, falls back to APP_TIMEZONE). */
export function appTimezone() {
  return getSettings("business").timezone || env.timezone;
}

// ─── Typed, authorized reads/updates (Settings UI + REST/MCP tools) ──────────

/** Business settings plus human units (percent, major money units). */
export function businessView(b: Settings<"business">) {
  const currency = isCurrency(b.baseCurrency) ? b.baseCurrency : "IRT";
  return {
    ...b,
    defaultTaxPercent: bpsToPercent(b.defaultTaxBps),
    defaultHourlyRate: fromMinor(b.defaultHourlyRateMinor, currency),
  };
}

/** Site profile + business settings (owner/admin). */
export function getSiteSettings(actor: Actor) {
  assertAdmin(actor);
  return { profile: getSettings("profile"), business: businessView(getSettings("business")) };
}

/** Partial update of the public site profile. Social handles become full links. */
export function updateProfile(actor: Actor, patch: ProfilePatch) {
  assertAdmin(actor);
  const current = getSettings("profile");
  const socials = patch.socials
    ? Object.fromEntries(
        Object.entries(patch.socials)
          .filter(([k, v]) => v !== undefined && (socialNetworks as readonly string[]).includes(k))
          .map(([k, v]) => [k, socialUrl(k as SocialNetwork, v ?? "")]),
      )
    : undefined;
  const next = mergeDeep(current, { ...patch, socials });
  const saved = saveSettings("profile", next);
  logActivity(actor, "settings.update_profile", "settings", "profile", saved.brandName.en);
  return saved;
}

/** Partial update of business settings (currency, timezone, invoicing defaults). */
export function updateBusiness(actor: Actor, patch: BusinessPatch) {
  assertAdmin(actor);
  const current = getSettings("business");
  if (patch.timezone !== undefined && !isValidTimeZone(patch.timezone))
    throw errors.invalidTimezone();
  const oldCurrency = isCurrency(current.baseCurrency) ? current.baseCurrency : "IRT";
  const currency = patch.baseCurrency ?? oldCurrency;
  // Keep the hourly rate's *number* when only the currency changes (decimals differ).
  const rate = patch.defaultHourlyRate ?? fromMinor(current.defaultHourlyRateMinor, oldCurrency);
  const next: Settings<"business"> = {
    ...current,
    baseCurrency: currency,
    timezone: patch.timezone ?? current.timezone,
    invoicePrefix: patch.invoicePrefix ?? current.invoicePrefix,
    defaultTaxBps:
      patch.defaultTaxPercent !== undefined
        ? percentToBps(patch.defaultTaxPercent)
        : current.defaultTaxBps,
    defaultHourlyRateMinor: toMinor(rate, currency),
    paymentInstructions: mergeDeep(current.paymentInstructions, patch.paymentInstructions),
  };
  const saved = saveSettings("business", next);
  logActivity(actor, "settings.update_business", "settings", "business", undefined, {
    baseCurrency: saved.baseCurrency,
    timezone: saved.timezone,
  });
  return businessView(saved);
}
