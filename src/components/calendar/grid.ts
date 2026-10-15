/**
 * Calendar grid math (pure, server + client).
 *
 * Days are identified by a Gregorian "YYYY-MM-DD" key (a civil date in the
 * app timezone). Day-key arithmetic is timezone-free; only converting a key
 * to an instant needs the timezone. Month boundaries follow the display
 * calendar: Jalali (Solar Hijri) for fa, Gregorian for en.
 */
import { zonedParts, zonedTimeToUtc } from "@/lib/tz";
import type { CalendarView } from "./types";

export type CalendarSystem = "persian" | "gregory";

export interface CalendarConfig {
  tz: string;
  calendar: CalendarSystem;
  /** 6 = Saturday (fa), 1 = Monday (en), 0 = Sunday. */
  weekStartsOn: number;
}

/** Number of days the agenda view lists (and steps by). */
export const AGENDA_DAYS = 30;

const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, "0");

function splitKey(key: string): [number, number, number] {
  const m = KEY_RE.exec(key);
  if (!m) throw new Error(`Invalid day key: ${key}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** True for a real Gregorian date "YYYY-MM-DD". */
export function isDayKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = KEY_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return (
    d.getUTCFullYear() === Number(m[1]) &&
    d.getUTCMonth() + 1 === Number(m[2]) &&
    d.getUTCDate() === Number(m[3])
  );
}

/** Day key of an instant in `tz`. */
export function dayKeyOf(ms: number | Date, tz: string) {
  const p = zonedParts(ms, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Instant (ms) of 00:00 of a day key in `tz`. */
export function dayStartMs(key: string, tz: string) {
  const [y, m, d] = splitKey(key);
  return zonedTimeToUtc(y, m, d, 0, 0, tz).getTime();
}

/** Instant (ms) of a wall-clock time ("HH:mm") on a day key in `tz`. */
export function wallTimeMs(key: string, time: string, tz: string) {
  const [y, m, d] = splitKey(key);
  const [h, min] = time.split(":").map(Number);
  return zonedTimeToUtc(y, m, d, h ?? 0, min ?? 0, tz).getTime();
}

export function addDaysKey(key: string, days: number) {
  const [y, m, d] = splitKey(key);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Whole days from `a` to `b` (b − a). */
export function diffDaysKey(a: string, b: string) {
  const [y1, m1, d1] = splitKey(a);
  const [y2, m2, d2] = splitKey(b);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOfKey(key: string) {
  const [y, m, d] = splitKey(key);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Year/month/day of a civil date in the display calendar (Jalali for "persian"). */
export function calendarParts(key: string, calendar: CalendarSystem) {
  const [y, m, d] = splitKey(key);
  // Noon UTC of the civil date, read back in UTC: timezone-independent.
  const p = zonedParts(Date.UTC(y, m - 1, d, 12), "UTC", calendar);
  return { year: p.year, month: p.month, day: p.day };
}

export function startOfWeekKey(key: string, weekStartsOn: number) {
  return addDaysKey(key, -((weekdayOfKey(key) - weekStartsOn + 7) % 7));
}

/** First day of the (Jalali or Gregorian) month containing `key`. */
export function monthStartKey(key: string, calendar: CalendarSystem) {
  return addDaysKey(key, -(calendarParts(key, calendar).day - 1));
}

export function nextMonthStartKey(key: string, calendar: CalendarSystem) {
  return monthStartKey(addDaysKey(monthStartKey(key, calendar), 32), calendar);
}

export function prevMonthStartKey(key: string, calendar: CalendarSystem) {
  return monthStartKey(addDaysKey(monthStartKey(key, calendar), -1), calendar);
}

export function parseView(value: unknown): CalendarView {
  return value === "week" || value === "day" || value === "agenda" ? value : "month";
}

export interface ViewRange {
  view: CalendarView;
  anchor: string;
  /** First visible day (inclusive). */
  startKey: string;
  /** Day after the last visible day (exclusive). */
  endKey: string;
  days: string[];
}

/** Visible days for a view around an anchor date. */
export function viewRange(view: CalendarView, anchor: string, cfg: CalendarConfig): ViewRange {
  let startKey: string;
  let endKey: string;
  if (view === "month") {
    const first = monthStartKey(anchor, cfg.calendar);
    const next = nextMonthStartKey(anchor, cfg.calendar);
    startKey = startOfWeekKey(first, cfg.weekStartsOn);
    const lastWeek = startOfWeekKey(next, cfg.weekStartsOn);
    endKey = lastWeek === next ? next : addDaysKey(lastWeek, 7);
  } else if (view === "week") {
    startKey = startOfWeekKey(anchor, cfg.weekStartsOn);
    endKey = addDaysKey(startKey, 7);
  } else if (view === "day") {
    startKey = anchor;
    endKey = addDaysKey(anchor, 1);
  } else {
    startKey = anchor;
    endKey = addDaysKey(anchor, AGENDA_DAYS);
  }
  const days: string[] = [];
  for (let k = startKey; k !== endKey; k = addDaysKey(k, 1)) days.push(k);
  return { view, anchor, startKey, endKey, days };
}

/** The anchor date one step back (dir = -1) or forward (dir = 1). */
export function shiftAnchor(
  view: CalendarView,
  anchor: string,
  dir: -1 | 1,
  cfg: CalendarConfig,
): string {
  if (view === "month")
    return dir > 0
      ? nextMonthStartKey(anchor, cfg.calendar)
      : prevMonthStartKey(anchor, cfg.calendar);
  if (view === "week") return addDaysKey(anchor, 7 * dir);
  if (view === "day") return addDaysKey(anchor, dir);
  return addDaysKey(anchor, AGENDA_DAYS * dir);
}

export interface MonthCell {
  key: string;
  /** Day number in the display calendar (Jalali day for fa). */
  day: number;
  /** Gregorian day-of-month (shown small as secondary in fa). */
  gregorianDay: number;
  /** 0 = Sunday. */
  weekday: number;
  /** Belongs to the displayed month (false for leading/trailing days). */
  inMonth: boolean;
}

/** Month grid as rows of 7 cells (4–6 rows), starting on the configured weekday. */
export function monthWeeks(anchor: string, cfg: CalendarConfig): MonthCell[][] {
  const range = viewRange("month", anchor, cfg);
  const month = calendarParts(monthStartKey(anchor, cfg.calendar), cfg.calendar).month;
  const cells = range.days.map((key): MonthCell => {
    const p = calendarParts(key, cfg.calendar);
    return {
      key,
      day: p.day,
      gregorianDay: splitKey(key)[2],
      weekday: weekdayOfKey(key),
      inMonth: p.month === month,
    };
  });
  const weeks: MonthCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Start/end instants of each day (end = next day's start; DST-safe). */
export function dayBounds(days: string[], tz: string) {
  return days.map((key) => ({
    key,
    start: dayStartMs(key, tz),
    end: dayStartMs(addDaysKey(key, 1), tz),
  }));
}
