/**
 * Due-date semantics shared by tasks, projects and the dashboard.
 *
 * - All-day (calendar-day) due dates are overdue only once that day has
 *   ENDED in the app timezone — a task due today is not overdue at 00:01.
 * - Timed due dates are overdue once the instant has passed.
 */
import { DAY_MS, toDateInputValue } from "@/lib/tz";

type DueInput = Date | number | null | undefined;

const ms = (d: Date | number) => (typeof d === "number" ? d : d.getTime());

export function isOverdue(due: DueInput, opts: { allDay: boolean; now: number; tz: string }) {
  if (due == null) return false;
  if (!opts.allDay) return ms(due) < opts.now;
  return toDateInputValue(due, opts.tz) < toDateInputValue(opts.now, opts.tz);
}

/** True when the due date falls on today's calendar day (in `tz`). */
export function isDueToday(due: DueInput, now: number, tz: string) {
  return due != null && toDateInputValue(due, tz) === toDateInputValue(now, tz);
}

/**
 * Whole calendar days (in `tz`) from today to the due day:
 * 0 = due today, 1 = tomorrow, −2 = two days overdue. DST-safe.
 */
export function daysUntil(due: Date | number, now: number, tz: string) {
  const [y1, m1, d1] = toDateInputValue(now, tz).split("-").map(Number);
  const [y2, m2, d2] = toDateInputValue(due, tz).split("-").map(Number);
  return Math.round((Date.UTC(y2!, m2! - 1, d2!) - Date.UTC(y1!, m1! - 1, d1!)) / DAY_MS);
}
