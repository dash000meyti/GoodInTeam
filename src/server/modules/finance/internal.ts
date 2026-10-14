import "server-only";
import { defaultLocale } from "@/i18n/config";
import { toLatinDigits } from "@/lib/format";
import { isCurrency, parseMoneyInput } from "@/lib/money";
import { addDays, calendarFor, fromDateInput, startOfDay, toDateInputValue } from "@/lib/tz";
import { appTimezone, getSettings } from "@/server/modules/settings/service";
import { normalizeDay } from "./calc";
import { FinanceError } from "./errors";

/** Base (reporting) currency from business settings. */
export function baseCurrency() {
  const c = getSettings("business").baseCurrency;
  return isCurrency(c) ? c : "IRT";
}

/** Calendar used for install-level things like invoice numbering years (fa → Jalali). */
export function installCalendar() {
  return calendarFor(defaultLocale);
}

/**
 * Parse a money string in MAJOR units into minor units of `currency`.
 * Throws a field error unless the amount is a valid number (> 0 unless allowed).
 */
export function parseAmount(
  input: string | number | undefined | null,
  currency: string,
  opts: { field?: string; allowNegative?: boolean; allowZero?: boolean } = {},
) {
  const field = opts.field ?? "amount";
  const text = toLatinDigits(String(input ?? "")).trim();
  const negative = /^[-−]/.test(text);
  const minor = parseMoneyInput(text.replace(/^[-−+]/, ""), isCurrency(currency) ? currency : "USD");
  if (minor == null || (negative && !opts.allowNegative)) {
    throw new FinanceError(field === "amount" ? "invalidAmount" : "invalidTransferAmount", field);
  }
  const value = negative ? -minor : minor;
  if (value === 0 && !opts.allowZero) throw new FinanceError("invalidAmount", field);
  return value;
}

/** "YYYY-MM-DD" (or Jalali) + optional "HH:mm" → instant in the app timezone. */
export function parseDay(day: string, time?: string, field = "date") {
  const d = normalizeDay(day);
  if (!d) throw new FinanceError("invalidDate", field);
  return fromDateInput(d, time, appTimezone());
}

/** Optional day → instant; undefined/empty → `fallback`. */
export function parseOptDay(day: string | null | undefined, time?: string, field = "date") {
  if (!day) return null;
  return parseDay(day, time, field);
}

/** Inclusive [from, to] day filter → [start, endExclusive) instants. */
export function dayRange(from?: string, to?: string) {
  const tz = appTimezone();
  const start = from ? parseDay(from, undefined, "from") : null;
  const endDay = to ? parseDay(to, undefined, "to") : null;
  return { start, end: endDay ? addDays(endDay, 1, tz) : null };
}

/** Start of today in the app timezone. */
export function todayStart(now: number = Date.now()) {
  return startOfDay(now, appTimezone()).getTime();
}

export function dateInputValue(d: Date | number | null | undefined) {
  return d == null ? null : toDateInputValue(d, appTimezone());
}
