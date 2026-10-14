/**
 * Pure time-tracking math (no DB, no server-only) so it can be unit-tested:
 * clipping entries to ranges, splitting across days, earnings, report
 * aggregation and resolving the many ways a user can type an entry's times.
 */
import { normalizeClock, parseDuration } from "@/lib/duration";
import { addDays, fromDateInput, startOfDay, toDateInputValue, toTimeInputValue } from "@/lib/tz";

export const HOUR_MS = 3_600_000;
/** Manual entries this long (or longer) are almost always typos. */
export const MAX_ENTRY_MS = 24 * HOUR_MS;
/** Running timers older than this are flagged ("forgot to stop?"). */
export const LONG_RUNNING_MS = 10 * HOUR_MS;

export interface EntryLike {
  startedAt: Date;
  endedAt: Date | null;
  billable: boolean;
  hourlyRateMinor: number | null;
  currency: string | null;
  projectId: string | null;
  taskId: string | null;
}

export const NO_PROJECT = "_none";
export const NO_TASK = "_none";

export function entryDurationMs(e: Pick<EntryLike, "startedAt" | "endedAt">, now: number) {
  return Math.max(0, (e.endedAt?.getTime() ?? now) - e.startedAt.getTime());
}

/** Overlap (ms) of [start, end) with [from, to). */
export function overlapMs(start: number, end: number, from: number, to: number) {
  return Math.max(0, Math.min(end, to) - Math.max(start, from));
}

/** Earned amount in minor units for `ms` at `rateMinor` per hour. */
export function earnedMinor(ms: number, rateMinor: number | null | undefined) {
  if (!rateMinor) return 0;
  return Math.round((ms / HOUR_MS) * rateMinor);
}

export function dayKey(d: Date | number, tz: string) {
  return toDateInputValue(d, tz);
}

/** Day starts (in tz) covering [from, to). */
export function daysInRange(from: Date, to: Date, tz: string) {
  const out: Date[] = [];
  for (let d = startOfDay(from, tz); d < to; d = addDays(d, 1, tz)) {
    out.push(d);
    if (out.length > 1000) break;
  }
  return out;
}

/** Split [start, end) into per-day chunks keyed by "YYYY-MM-DD" (tz). */
export function splitByDay(start: number, end: number, tz: string): [string, number][] {
  const out: [string, number][] = [];
  let cursor = start;
  while (cursor < end) {
    const next = Math.min(end, addDays(startOfDay(cursor, tz), 1, tz).getTime());
    out.push([dayKey(cursor, tz), next - cursor]);
    if (next <= cursor) break;
    cursor = next;
  }
  return out;
}

export interface ReportBucket {
  ms: number;
  billableMs: number;
  /** currency → minor units */
  earned: Record<string, number>;
}

export interface Report {
  totalMs: number;
  billableMs: number;
  earned: Record<string, number>;
  /** Days (keys) with any tracked time. */
  activeDays: number;
  /** dayKey → projectKey → ms */
  byDay: Map<string, Map<string, number>>;
  byProject: Map<string, ReportBucket & { tasks: Map<string, ReportBucket> }>;
}

const emptyBucket = (): ReportBucket => ({ ms: 0, billableMs: 0, earned: {} });

function addTo(b: ReportBucket, ms: number, billable: boolean, earned: number, cur: string | null) {
  b.ms += ms;
  if (billable) b.billableMs += ms;
  if (earned && cur) b.earned[cur] = (b.earned[cur] ?? 0) + earned;
}

/** Aggregate entries clipped to [from, to). Running entries count up to `now`. */
export function summarize(
  entries: EntryLike[],
  opts: { from: Date; to: Date; tz: string; now: number },
): Report {
  const from = opts.from.getTime();
  const to = opts.to.getTime();
  const total = emptyBucket();
  const byDay = new Map<string, Map<string, number>>();
  const byProject = new Map<string, ReportBucket & { tasks: Map<string, ReportBucket> }>();

  for (const e of entries) {
    const start = Math.max(e.startedAt.getTime(), from);
    const end = Math.min(e.endedAt?.getTime() ?? opts.now, to);
    if (end <= start) continue;
    const ms = end - start;
    const earned = e.billable ? earnedMinor(ms, e.hourlyRateMinor) : 0;
    const pKey = e.projectId ?? NO_PROJECT;
    const tKey = e.taskId ?? NO_TASK;

    addTo(total, ms, e.billable, earned, e.currency);
    let p = byProject.get(pKey);
    if (!p) byProject.set(pKey, (p = { ...emptyBucket(), tasks: new Map() }));
    addTo(p, ms, e.billable, earned, e.currency);
    let task = p.tasks.get(tKey);
    if (!task) p.tasks.set(tKey, (task = emptyBucket()));
    addTo(task, ms, e.billable, earned, e.currency);

    for (const [day, dayMs] of splitByDay(start, end, opts.tz)) {
      let d = byDay.get(day);
      if (!d) byDay.set(day, (d = new Map()));
      d.set(pKey, (d.get(pKey) ?? 0) + dayMs);
    }
  }

  return {
    totalMs: total.ms,
    billableMs: total.billableMs,
    earned: total.earned,
    activeDays: byDay.size,
    byDay,
    byProject,
  };
}

// ─── Resolving entry times from user input ─────────────────────────────────

export interface EntryTimeInput {
  /** ISO instants (API). */
  startedAt?: string | null;
  endedAt?: string | null;
  /** Calendar day "YYYY-MM-DD" (app tz) + wall-clock "HH:mm". */
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  /** "1:30", "90m", "1.5"… */
  duration?: string | null;
}

export type EntryTimeErrorKey =
  "invalidTime" | "invalidDuration" | "endBeforeStart" | "tooLong" | "missingTimes";

export type EntryTimeResult =
  | { ok: true; startedAt: Date; endedAt: Date | null }
  | { ok: false; field: string; key: EntryTimeErrorKey };

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isoDate(v: string) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Turn the flexible entry-time input into concrete instants.
 *
 * Supported combinations (first match wins):
 *  1. startedAt (+ endedAt | duration)                        — ISO, API style
 *  2. date + startTime + endTime                               — end ≤ start means "past midnight"
 *  3. date + startTime + duration
 *  4. date + duration                                          — placed at `anchor(date)`
 * With `existing`, missing parts default to the entry's current values
 * (so an API caller can patch just `endTime`). `endedAt: null` stays running.
 */
export function resolveEntryTimes(
  input: EntryTimeInput,
  opts: {
    tz: string;
    existing?: { startedAt: Date; endedAt: Date | null };
    /** Where to place a duration-only entry on `date` (e.g. after that day's last entry). */
    anchor?: (date: string, durationMs: number) => Date;
  },
): EntryTimeResult {
  const { tz, existing } = opts;
  const durationMs = input.duration ? parseDuration(input.duration) : null;
  if (input.duration && durationMs == null)
    return { ok: false, field: "duration", key: "invalidDuration" };

  let start: Date | null = null;
  let end: Date | null | undefined; // undefined = not specified

  if (input.startedAt) {
    start = isoDate(input.startedAt);
    if (!start) return { ok: false, field: "startedAt", key: "invalidTime" };
  }
  if (input.endedAt) {
    end = isoDate(input.endedAt);
    if (!end) return { ok: false, field: "endedAt", key: "invalidTime" };
  }

  if (!start) {
    const date =
      input.date && DAY_RE.test(input.date)
        ? input.date
        : existing
          ? dayKey(existing.startedAt, tz)
          : null;
    if (input.date && !DAY_RE.test(input.date))
      return { ok: false, field: "date", key: "invalidTime" };
    const startTime = input.startTime ? normalizeClock(input.startTime) : null;
    if (input.startTime && !startTime) return { ok: false, field: "startTime", key: "invalidTime" };
    const endTime = input.endTime ? normalizeClock(input.endTime) : null;
    if (input.endTime && !endTime) return { ok: false, field: "endTime", key: "invalidTime" };

    if (date && startTime) start = fromDateInput(date, startTime, tz);
    else if (date && existing && !durationMs) {
      // Keep the existing wall-clock start time, move to the new date.
      start = fromDateInput(date, toTimeInputValue(existing.startedAt, tz), tz);
    } else if (date && durationMs && !endTime) {
      start = opts.anchor ? opts.anchor(date, durationMs) : fromDateInput(date, "09:00", tz);
    }

    if (start && endTime && end === undefined) {
      end = fromDateInput(dayKey(start, tz), endTime, tz);
      if (end < start) end = addDays(end, 1, tz); // crossed midnight (equal = invalid)
    }
  }

  if (!start) {
    if (existing) start = existing.startedAt;
    else return { ok: false, field: "date", key: "missingTimes" };
  }
  if (end === undefined && durationMs) end = new Date(start.getTime() + durationMs);
  if (end === undefined) {
    if (existing) {
      // Moving a stopped entry keeps its length.
      end = existing.endedAt
        ? new Date(start.getTime() + (existing.endedAt.getTime() - existing.startedAt.getTime()))
        : null;
    } else return { ok: false, field: "endTime", key: "missingTimes" };
  }

  if (end && end.getTime() <= start.getTime())
    return { ok: false, field: "endTime", key: "endBeforeStart" };
  if (end && end.getTime() - start.getTime() >= MAX_ENTRY_MS)
    return { ok: false, field: input.duration ? "duration" : "endTime", key: "tooLong" };
  return { ok: true, startedAt: start, endedAt: end ?? null };
}
