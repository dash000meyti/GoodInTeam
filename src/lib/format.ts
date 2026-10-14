/**
 * Locale-aware formatting helpers. Pure functions — safe on server and client.
 * Always pass an explicit timeZone so server and client output match
 * (no hydration mismatch). Persian locale uses the Solar Hijri (Jalali)
 * calendar and Persian digits via Intl — no extra libraries needed.
 */
import { localeMeta, type Locale } from "@/i18n/config";

export type CalendarSystem = "persian" | "gregory";

export interface FormatOptions {
  locale: Locale;
  timeZone?: string;
  calendar?: CalendarSystem;
}

const DEFAULT_TZ = "Asia/Tehran";

function intlLocale({ locale, calendar }: FormatOptions) {
  const meta = localeMeta[locale];
  const cal = calendar ?? meta.calendar;
  // e.g. "fa-IR-u-ca-persian-nu-arabext" / "en-US-u-ca-persian"
  return `${meta.intl}-u-ca-${cal}`;
}

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function dtf(opts: FormatOptions, o: Intl.DateTimeFormatOptions) {
  const key = `${intlLocale(opts)}|${opts.timeZone ?? DEFAULT_TZ}|${JSON.stringify(o)}`;
  let f = dtfCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(intlLocale(opts), { timeZone: opts.timeZone ?? DEFAULT_TZ, ...o });
    dtfCache.set(key, f);
  }
  return f;
}

type DateInput = Date | number | string | null | undefined;
function toDate(d: DateInput) {
  if (d == null) return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(
  d: DateInput,
  opts: FormatOptions,
  style: "short" | "medium" | "long" = "medium",
) {
  const date = toDate(d);
  if (!date) return "—";
  const o: Intl.DateTimeFormatOptions =
    style === "short"
      ? { year: "2-digit", month: "2-digit", day: "2-digit" }
      : style === "long"
        ? { weekday: "long", year: "numeric", month: "long", day: "numeric" }
        : { year: "numeric", month: "short", day: "numeric" };
  return dtf(opts, o).format(date);
}

export function formatDateTime(d: DateInput, opts: FormatOptions) {
  const date = toDate(d);
  if (!date) return "—";
  return dtf(opts, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatTime(d: DateInput, opts: FormatOptions) {
  const date = toDate(d);
  if (!date) return "—";
  return dtf(opts, { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

export function formatMonthYear(d: DateInput, opts: FormatOptions) {
  const date = toDate(d);
  if (!date) return "—";
  return dtf(opts, { year: "numeric", month: "long" }).format(date);
}

/** Calendar parts (year/month/day/weekday) of a date in the given calendar + tz. */
export function dateParts(d: Date, opts: FormatOptions) {
  const parts = new Intl.DateTimeFormat(
    `en-US-u-ca-${opts.calendar ?? localeMeta[opts.locale].calendar}`,
    {
      timeZone: opts.timeZone ?? DEFAULT_TZ,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    },
  ).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    year: Number.parseInt(get("year"), 10),
    month: Number.parseInt(get("month"), 10),
    day: Number.parseInt(get("day"), 10),
    hour: Number.parseInt(get("hour"), 10),
    minute: Number.parseInt(get("minute"), 10),
    weekday: weekdays.indexOf(get("weekday")), // 0 = Sunday
  };
}

const rtfCache = new Map<string, Intl.RelativeTimeFormat>();
export function formatRelative(d: DateInput, opts: FormatOptions, now: number) {
  const date = toDate(d);
  if (!date) return "—";
  const key = localeMeta[opts.locale].intl;
  let rtf = rtfCache.get(key);
  if (!rtf) {
    rtf = new Intl.RelativeTimeFormat(key, { numeric: "auto" });
    rtfCache.set(key, rtf);
  }
  const diff = (date.getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}

const nfCache = new Map<string, Intl.NumberFormat>();
export function formatNumber(n: number, locale: Locale, o: Intl.NumberFormatOptions = {}) {
  const key = `${locale}|${JSON.stringify(o)}`;
  let nf = nfCache.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat(localeMeta[locale].intl, o);
    nfCache.set(key, nf);
  }
  return nf.format(n);
}

export function formatPercent(n: number, locale: Locale) {
  return formatNumber(n / 100, locale, { style: "percent", maximumFractionDigits: 0 });
}

/** 5400000 ms → "1:30" (h:mm) or "1:30:00" with seconds. */
export function formatDuration(ms: number, locale: Locale, withSeconds = false) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (v: number) => v.toString().padStart(2, "0");
  const raw = withSeconds ? `${h}:${pad(m)}:${pad(s)}` : `${h}:${pad(m)}`;
  return locale === "fa" ? toPersianDigits(raw) : raw;
}

/** 5400000 ms → "1.5" hours (decimal), localized digits. */
export function formatHours(ms: number, locale: Locale) {
  return formatNumber(ms / 3_600_000, locale, { maximumFractionDigits: 1 });
}

export function toPersianDigits(input: string | number) {
  return String(input).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

export function toLatinDigits(input: string) {
  return input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}
