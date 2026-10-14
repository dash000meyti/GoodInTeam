import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { settings } from "@/server/db/schema";
import { env } from "@/lib/env";

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
