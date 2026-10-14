/**
 * Timezone + calendar aware date math using only Intl (no deps).
 * All app timestamps are UTC instants; "today", "this week", "this month"
 * are computed in the user's timezone and calendar (Jalali for fa).
 */
export const DAY_MS = 86_400_000;

type Calendar = "persian" | "gregory";

const partsFmt = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string, calendar: Calendar) {
  const key = `${tz}|${calendar}`;
  let f = partsFmt.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(`en-US-u-ca-${calendar}`, {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "short",
      hourCycle: "h23",
    });
    partsFmt.set(key, f);
  }
  return f;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Wall-clock parts of an instant in a timezone + calendar. weekday: 0=Sunday. */
export function zonedParts(date: Date | number, tz: string, calendar: Calendar = "gregory") {
  const p = fmt(tz, calendar).formatToParts(new Date(date));
  const get = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)?.value ?? "0";
  return {
    year: Number.parseInt(get("year"), 10),
    month: Number.parseInt(get("month"), 10),
    day: Number.parseInt(get("day"), 10),
    hour: Number.parseInt(get("hour"), 10) % 24,
    minute: Number.parseInt(get("minute"), 10),
    second: Number.parseInt(get("second"), 10),
    weekday: WEEKDAYS.indexOf(get("weekday")),
  };
}

/** Offset (ms) of `tz` from UTC at the given instant. */
export function tzOffset(date: Date | number, tz: string) {
  const d = new Date(date);
  const p = zonedParts(d, tz, "gregory");
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(d.getTime() / 1000) * 1000;
}

/** UTC instant for a wall-clock Gregorian date/time in `tz`. */
export function zonedTimeToUtc(
  y: number,
  m: number,
  d: number,
  h: number,
  min: number,
  tz: string,
) {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const first = guess - tzOffset(guess, tz);
  return new Date(guess - tzOffset(first, tz));
}

export function startOfDay(date: Date | number, tz: string) {
  const p = zonedParts(date, tz);
  return zonedTimeToUtc(p.year, p.month, p.day, 0, 0, tz);
}

export function addDays(date: Date | number, days: number, tz: string) {
  // Go through wall-clock to stay DST-safe.
  const d = new Date(date);
  const p = zonedParts(d, tz);
  return zonedTimeToUtc(p.year, p.month, p.day + days, p.hour, p.minute, tz);
}

/** weekStartsOn: 6 = Saturday (Iran), 1 = Monday, 0 = Sunday. */
export function startOfWeek(date: Date | number, tz: string, weekStartsOn: number) {
  const p = zonedParts(date, tz);
  const diff = (p.weekday - weekStartsOn + 7) % 7;
  return zonedTimeToUtc(p.year, p.month, p.day - diff, 0, 0, tz);
}

/** Start of the month in the given calendar (Jalali month for "persian"). */
export function startOfMonth(date: Date | number, tz: string, calendar: Calendar) {
  const p = zonedParts(date, tz, calendar);
  const g = zonedParts(date, tz, "gregory");
  return zonedTimeToUtc(g.year, g.month, g.day - (p.day - 1), 0, 0, tz);
}

/** Start of the next month in the given calendar. */
export function startOfNextMonth(date: Date | number, tz: string, calendar: Calendar) {
  const start = startOfMonth(date, tz, calendar);
  // Jump ~32 days ahead then snap to that month's start.
  return startOfMonth(start.getTime() + 32 * DAY_MS, tz, calendar);
}

export function weekStartFor(locale: "fa" | "en") {
  return locale === "fa" ? 6 : 1;
}

export function calendarFor(locale: "fa" | "en"): Calendar {
  return locale === "fa" ? "persian" : "gregory";
}

/** "YYYY-MM-DD" (Gregorian, in tz) — handy for <input type="date"> values. */
export function toDateInputValue(date: Date | number, tz: string) {
  const p = zonedParts(date, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** "HH:mm" in tz. */
export function toTimeInputValue(date: Date | number, tz: string) {
  const p = zonedParts(date, tz);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/** Parse "YYYY-MM-DD" + optional "HH:mm" as wall-clock time in tz. */
export function fromDateInput(date: string, time: string | undefined, tz: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = (time || "00:00").split(":").map(Number);
  return zonedTimeToUtc(y!, m!, d!, h ?? 0, min ?? 0, tz);
}
