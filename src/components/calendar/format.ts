/**
 * Deterministic date labels for the calendar UI (server + client).
 *
 * Labels are composed from "atomic" Intl parts (month and weekday names) and
 * our own digit conversion, so server-rendered HTML and client hydration
 * always produce the same strings (Intl range formatting differs slightly
 * between ICU builds). Day keys are civil dates: they are formatted at noon
 * UTC with timeZone "UTC", independent of the app timezone.
 */
import { localeMeta, type Locale } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import type { Messages } from "@/i18n/messages";
import { toPersianDigits } from "@/lib/format";
import { parseRRule } from "@/lib/rrule";
import { zonedParts } from "@/lib/tz";
import { calendarParts } from "./grid";

const cache = new Map<string, Intl.DateTimeFormat>();
function dtf(locale: Locale, o: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(o)}`;
  let f = cache.get(key);
  if (!f) {
    const meta = localeMeta[locale];
    f = new Intl.DateTimeFormat(`${meta.intl}-u-ca-${meta.calendar}`, { timeZone: "UTC", ...o });
    cache.set(key, f);
  }
  return f;
}

function civil(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 12));
}

export function digits(value: string | number, locale: Locale) {
  return locale === "fa" ? toPersianDigits(value) : String(value);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "14:30" (Persian digits for fa) of an instant in tz. */
export function timeLabel(ms: number, tz: string, locale: Locale) {
  const p = zonedParts(ms, tz);
  return digits(`${pad(p.hour)}:${pad(p.minute)}`, locale);
}

/** "14:30–15:30" or just the start for point items. */
export function timeRangeLabel(start: number, end: number, tz: string, locale: Locale) {
  if (end <= start) return timeLabel(start, tz, locale);
  return `${timeLabel(start, tz, locale)}–${timeLabel(end, tz, locale)}`;
}

/** Hour label for the time grid gutter ("09:00"). */
export function hourLabel(hour: number, locale: Locale) {
  return digits(`${pad(hour)}:00`, locale);
}

export function monthName(key: string, locale: Locale, style: "long" | "short" = "long") {
  return dtf(locale, { month: style }).format(civil(key));
}

export function weekdayName(key: string, locale: Locale, style: "long" | "short" | "narrow" = "long") {
  return dtf(locale, { weekday: style }).format(civil(key));
}

/** Day of month in the display calendar (Jalali for fa), localized digits. */
export function dayNumber(key: string, locale: Locale) {
  return digits(calendarParts(key, localeMeta[locale].calendar).day, locale);
}

/** Gregorian day of month (secondary label in fa month cells). */
export function gregorianDayNumber(key: string) {
  return String(Number(key.slice(8, 10)));
}

/** "مهر ۱۴۰۵" / "October 2026" */
export function monthTitle(key: string, locale: Locale) {
  const p = calendarParts(key, localeMeta[locale].calendar);
  return `${monthName(key, locale)} ${digits(p.year, locale)}`;
}

/**
 * "چهارشنبه ۲۲ مهر ۱۴۰۵" / "Wednesday, October 14, 2026".
 * Options drop the weekday or the year, or use short names.
 */
export function dateLabel(
  key: string,
  locale: Locale,
  opts: { weekday?: boolean; year?: boolean; short?: boolean } = {},
) {
  const { weekday = true, year = true, short = false } = opts;
  const p = calendarParts(key, localeMeta[locale].calendar);
  const month = monthName(key, locale, short && locale === "en" ? "short" : "long");
  const wd = weekday ? weekdayName(key, locale, short ? "short" : "long") : null;
  if (locale === "fa") {
    return [wd, digits(p.day, locale), month, year ? digits(p.year, locale) : null]
      .filter(Boolean)
      .join(" ");
  }
  const md = `${month} ${p.day}`;
  return [wd, year ? `${md}, ${p.year}` : md].filter(Boolean).join(", ");
}

/** Range title for week/agenda views: "۱۹ تا ۲۵ مهر ۱۴۰۵" / "Oct 12 – 18, 2026". */
export function rangeLabel(startKey: string, lastKey: string, locale: Locale) {
  const cal = localeMeta[locale].calendar;
  const a = calendarParts(startKey, cal);
  const b = calendarParts(lastKey, cal);
  if (locale === "fa") {
    const d = (n: number) => digits(n, locale);
    if (a.year === b.year && a.month === b.month)
      return `${d(a.day)} تا ${d(b.day)} ${monthName(startKey, locale)} ${d(a.year)}`;
    if (a.year === b.year)
      return `${d(a.day)} ${monthName(startKey, locale)} تا ${d(b.day)} ${monthName(lastKey, locale)} ${d(a.year)}`;
    return `${d(a.day)} ${monthName(startKey, locale)} ${d(a.year)} تا ${d(b.day)} ${monthName(lastKey, locale)} ${d(b.year)}`;
  }
  const ma = monthName(startKey, locale, "short");
  const mb = monthName(lastKey, locale, "short");
  if (a.year === b.year && a.month === b.month) return `${ma} ${a.day} – ${b.day}, ${a.year}`;
  if (a.year === b.year) return `${ma} ${a.day} – ${mb} ${b.day}, ${a.year}`;
  return `${ma} ${a.day}, ${a.year} – ${mb} ${b.day}, ${b.year}`;
}

/** Weekday name by index (0 = Sunday). */
export function weekdayByIndex(day: number, locale: Locale, style: "long" | "short" = "long") {
  // 2026-10-11 is a Sunday.
  return weekdayName(`2026-10-${String(11 + day).padStart(2, "0")}`, locale, style);
}

type RRuleMessages = Pick<
  Messages["calendar"],
  | "rr_daily"
  | "rr_everyNDays"
  | "rr_weekly"
  | "rr_everyNWeeks"
  | "rr_monthly"
  | "rr_everyNMonths"
  | "rr_yearly"
  | "rr_everyNYears"
  | "rr_on"
  | "rr_times"
  | "rr_until"
>;

/** Human summary of an RRULE ("Weekly on Saturday", "هر ماه، ۵ بار"). */
export function rruleSummary(rule: string, t: RRuleMessages, locale: Locale, tz: string) {
  const r = parseRRule(rule);
  if (!r) return rule;
  const n = digits(r.interval, locale);
  const one = r.interval === 1;
  const base = {
    DAILY: one ? t.rr_daily : format(t.rr_everyNDays, { n }),
    WEEKLY: one ? t.rr_weekly : format(t.rr_everyNWeeks, { n }),
    MONTHLY: one ? t.rr_monthly : format(t.rr_everyNMonths, { n }),
    YEARLY: one ? t.rr_yearly : format(t.rr_everyNYears, { n }),
  };
  let text = base[r.freq];
  const sep = locale === "fa" ? "، " : ", ";
  if (r.byDay?.length) {
    const days = r.byDay
      .map((b) => (b.ordinal ? `${digits(b.ordinal, locale)} ` : "") + weekdayByIndex(b.day, locale))
      .join(sep);
    text = format(t.rr_on, { rule: text, days });
  } else if (r.byMonthDay?.length) {
    const days = r.byMonthDay.map((d) => digits(d, locale)).join(sep);
    text = format(t.rr_on, { rule: text, days });
  }
  if (r.count) text = format(t.rr_times, { rule: text, n: digits(r.count, locale) });
  else if (r.until) {
    const p = zonedParts(r.until, tz);
    const key = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
    text = format(t.rr_until, { rule: text, date: dateLabel(key, locale, { weekday: false }) });
  }
  return text;
}
