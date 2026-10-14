/**
 * Pure helpers for the settings module (no DB, no "server-only") — unit tested.
 */

type Plain = Record<string, unknown>;

const isPlainObject = (v: unknown): v is Plain =>
  typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date);

/**
 * Expand dotted keys into nested objects:
 * `{ "brandName.fa": "x", "socials.x": "y", email: "z" }` →
 * `{ brandName: { fa: "x" }, socials: { x: "y" }, email: "z" }`.
 * Used so flat form fields (with precise per-field errors) map onto nested settings.
 */
export function unflatten(input: Plain): Plain {
  const out: Plain = {};
  for (const [key, value] of Object.entries(input)) {
    const parts = key.split(".");
    let node = out;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        node[part] = value;
        return;
      }
      if (!isPlainObject(node[part])) node[part] = {};
      node = node[part] as Plain;
    });
  }
  return out;
}

/**
 * Deep-merge `patch` into `base` (plain objects only). `undefined` values in
 * the patch are ignored; arrays and primitives replace.
 */
export function mergeDeep<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch))
    return (patch === undefined ? base : patch) as T;
  const out: Plain = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? mergeDeep(out[k], v) : v;
  }
  return out as T;
}

/** "9" / "9.5" / 9.5 (percent) → basis points (950). Rounds to the nearest bp. */
export function percentToBps(percent: number) {
  return Math.round(percent * 100);
}

/** Basis points → percent number (950 → 9.5). */
export function bpsToPercent(bps: number) {
  return bps / 100;
}

/**
 * Normalise a profile link: trims, and adds `https://` when the user typed a
 * bare domain such as `t.me/goodteam` or `github.com/me`. "" stays "".
 */
export function normalizeUrl(value: string) {
  const v = value.trim();
  if (!v) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v; // has a scheme (https:, mailto:, tg:)
  if (v.startsWith("//")) return `https:${v}`;
  if (v.startsWith("/")) return v; // site-relative
  return `https://${v}`;
}

/** True when `tz` is an IANA timezone the runtime understands. */
export function isValidTimeZone(tz: string) {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** 12_345_678 → "11.8 MB" (binary units, 1 decimal, localized digits). */
export function formatBytes(bytes: number, locale: string = "en-US") {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = Math.max(0, bytes);
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: i === 0 ? 0 : 1 }).format(n);
  return `${num} ${units[i]}`;
}

export const socialNetworks = [
  "x",
  "linkedin",
  "github",
  "telegram",
  "instagram",
  "youtube",
] as const;
export type SocialNetwork = (typeof socialNetworks)[number];

const socialBase: Record<SocialNetwork, (handle: string) => string> = {
  x: (h) => `https://x.com/${h}`,
  linkedin: (h) => `https://www.linkedin.com/in/${h}`,
  github: (h) => `https://github.com/${h}`,
  telegram: (h) => `https://t.me/${h}`,
  instagram: (h) => `https://www.instagram.com/${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
};

/**
 * Social profile link from whatever the owner typed: a full URL, a bare
 * domain path (`t.me/me`) or just a handle (`@me` / `me`).
 */
export function socialUrl(network: SocialNetwork, value: string) {
  const v = value.trim();
  if (!v) return "";
  const handle = /^@?([\w.-]{1,64})$/.exec(v);
  // A bare word without a dot is a handle; "example.com" alone is a domain.
  if (handle && (v.startsWith("@") || !v.includes("."))) return socialBase[network](handle[1]!);
  return normalizeUrl(v);
}
