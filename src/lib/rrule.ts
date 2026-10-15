/**
 * Minimal RFC 5545 RRULE support (the subset the app needs), timezone-aware.
 *
 * Supported: FREQ=DAILY|WEEKLY|MONTHLY|YEARLY; INTERVAL; COUNT; UNTIL;
 * BYDAY (weekly: MO,TU…; monthly: with ordinal 1MO, -1FR); BYMONTHDAY (monthly);
 * WKST (week start for WEEKLY + INTERVAL, default MO).
 * Occurrences keep the wall-clock time (incl. seconds) of DTSTART in `tz` (DST-safe).
 * UNTIL: `…Z` is a UTC instant; a DATE (`20261231`) or floating local time
 * (`20261231T180000`) is read in `tz` — a DATE means "through the end of that day".
 */
import { zonedParts, zonedTimeToUtc } from "./tz";

export type Freq = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
type Day = (typeof DAYS)[number];

export interface RRule {
  freq: Freq;
  interval: number;
  count?: number;
  until?: Date;
  byDay?: { day: number; ordinal?: number }[]; // day: 0=Sunday
  byMonthDay?: number[];
  /** Week start for WEEKLY expansion (0 = Sunday … 6 = Saturday). Default 1 (MO). */
  wkst?: number;
}

/**
 * Parse an RRULE. Pass the app timezone so a DATE or floating UNTIL resolves
 * to the right instant (without it they're read as UTC).
 */
export function parseRRule(input: string, tz?: string): RRule | null {
  const s = input.trim().replace(/^RRULE:/i, "");
  if (!s) return null;
  const parts = Object.fromEntries(
    s.split(";").map((kv) => {
      const [k, v] = kv.split("=");
      return [k!.toUpperCase(), (v ?? "").toUpperCase()];
    }),
  );
  const freq = parts.FREQ as Freq;
  if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) return null;
  const rule: RRule = {
    freq,
    interval: Math.max(1, Number.parseInt(parts.INTERVAL ?? "1", 10) || 1),
  };
  if (parts.COUNT) rule.count = Math.max(1, Number.parseInt(parts.COUNT, 10));
  if (parts.UNTIL) {
    const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/.exec(parts.UNTIL);
    if (m) {
      const [y, mo, d] = [+m[1]!, +m[2]!, +m[3]!];
      if (m[4] && (m[7] || !tz)) {
        rule.until = new Date(Date.UTC(y, mo - 1, d, +m[4], +m[5]!, +m[6]!));
      } else if (m[4]) {
        // Floating local time → wall clock in tz.
        rule.until = new Date(
          zonedTimeToUtc(y, mo, d, +m[4], +m[5]!, tz!).getTime() + +m[6]! * 1000,
        );
      } else if (tz) {
        // DATE → through the end of that day in tz.
        const next = new Date(Date.UTC(y, mo - 1, d + 1));
        rule.until = new Date(
          zonedTimeToUtc(
            next.getUTCFullYear(),
            next.getUTCMonth() + 1,
            next.getUTCDate(),
            0,
            0,
            tz,
          ).getTime() - 1000,
        );
      } else {
        rule.until = new Date(Date.UTC(y, mo - 1, d, 23, 59, 59));
      }
    }
  }
  if (parts.WKST) {
    const w = DAYS.indexOf(parts.WKST as Day);
    if (w >= 0 && w !== 1) rule.wkst = w;
  }
  if (parts.BYDAY) {
    rule.byDay = parts.BYDAY.split(",")
      .map((d) => {
        const m = /^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/.exec(d);
        if (!m) return null;
        return {
          day: DAYS.indexOf(m[2] as Day),
          ordinal: m[1] ? Number.parseInt(m[1], 10) : undefined,
        };
      })
      .filter((x): x is { day: number; ordinal: number | undefined } => !!x);
  }
  if (parts.BYMONTHDAY) {
    rule.byMonthDay = parts.BYMONTHDAY.split(",")
      .map((n) => Number.parseInt(n, 10))
      .filter((n) => Number.isFinite(n) && n !== 0);
  }
  return rule;
}

export function formatRRule(r: RRule) {
  const out = [`FREQ=${r.freq}`];
  if (r.interval > 1) out.push(`INTERVAL=${r.interval}`);
  if (r.byDay?.length)
    out.push(`BYDAY=${r.byDay.map((d) => `${d.ordinal ?? ""}${DAYS[d.day]}`).join(",")}`);
  if (r.byMonthDay?.length) out.push(`BYMONTHDAY=${r.byMonthDay.join(",")}`);
  if (r.wkst != null && r.wkst !== 1) out.push(`WKST=${DAYS[r.wkst]}`);
  if (r.count) out.push(`COUNT=${r.count}`);
  if (r.until)
    out.push(
      `UNTIL=${r.until
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "")}`,
    );
  return out.join(";");
}

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const weekday = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();

/**
 * All occurrences of `rule` (starting at `dtstart`) that fall within [from, to].
 * `dtstart` itself is the first occurrence.
 */
export function expandRRule(
  ruleOrString: RRule | string,
  dtstart: Date,
  from: Date,
  to: Date,
  tz: string,
  max = 1000,
): Date[] {
  const rule = typeof ruleOrString === "string" ? parseRRule(ruleOrString, tz) : ruleOrString;
  if (!rule) return dtstart >= from && dtstart <= to ? [dtstart] : [];
  const start = zonedParts(dtstart, tz);
  // Seconds/ms of DTSTART (UTC offsets are whole minutes), so DTSTART itself matches.
  const subMinute = ((dtstart.getTime() % 60_000) + 60_000) % 60_000;
  const wkst = rule.wkst ?? 1;
  const out: Date[] = [];
  let produced = 0;
  const emit = (y: number, m: number, d: number) => {
    const at = new Date(
      zonedTimeToUtc(y, m, d, start.hour, start.minute, tz).getTime() + subMinute,
    );
    if (at < dtstart) return true;
    if (rule.until && at > rule.until) return false;
    if (rule.count && produced >= rule.count) return false;
    produced++;
    if (at > to) return false;
    if (at >= from) out.push(at);
    return out.length < max;
  };

  // Iterate periods; inside each period, emit candidate days in order.
  for (let i = 0; i < 5000; i++) {
    let days: [number, number, number][] = [];
    if (rule.freq === "DAILY") {
      const d = new Date(Date.UTC(start.year, start.month - 1, start.day + i * rule.interval));
      days = [[d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]];
    } else if (rule.freq === "WEEKLY") {
      // First day (WKST) of dtstart's week, then step by interval weeks.
      const offset = (weekday(start.year, start.month, start.day) - wkst + 7) % 7;
      const weekStart = new Date(
        Date.UTC(start.year, start.month - 1, start.day - offset + i * 7 * rule.interval),
      );
      const wanted = rule.byDay?.length
        ? rule.byDay.map((b) => b.day)
        : [weekday(start.year, start.month, start.day)];
      days = [...new Set(wanted)]
        .map((wd) => (wd - wkst + 7) % 7) // index within the WKST-based week
        .sort((a, b) => a - b)
        .map((idx) => {
          const d = new Date(weekStart.getTime() + idx * 86_400_000);
          return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()] as [
            number,
            number,
            number,
          ];
        });
    } else if (rule.freq === "MONTHLY") {
      const total = start.month - 1 + i * rule.interval;
      const y = start.year + Math.floor(total / 12);
      const m = (total % 12) + 1;
      const dim = daysInMonth(y, m);
      let list: number[] = [];
      if (rule.byMonthDay?.length) {
        list = rule.byMonthDay
          .map((n) => (n > 0 ? n : dim + n + 1))
          .filter((n) => n >= 1 && n <= dim);
      } else if (rule.byDay?.length) {
        for (const b of rule.byDay) {
          const matches: number[] = [];
          for (let d = 1; d <= dim; d++) if (weekday(y, m, d) === b.day) matches.push(d);
          if (b.ordinal == null) list.push(...matches);
          else {
            const pick =
              b.ordinal > 0 ? matches[b.ordinal - 1] : matches[matches.length + b.ordinal];
            if (pick) list.push(pick);
          }
        }
      } else if (start.day <= dim) list = [start.day];
      days = [...new Set(list)]
        .sort((a, b) => a - b)
        .map((d) => [y, m, d] as [number, number, number]);
    } else {
      const y = start.year + i * rule.interval;
      if (start.day <= daysInMonth(y, start.month)) days = [[y, start.month, start.day]];
    }
    for (const [y, m, d] of days) if (!emit(y, m, d)) return out;
    // Stop once the period start is beyond the range end.
    const first = days[0];
    if (first && zonedTimeToUtc(first[0], first[1], first[2], 0, 0, tz) > to) break;
  }
  return out;
}

/** First occurrence strictly after `after` (or null when the series ended). */
export function nextOccurrence(
  rule: RRule | string,
  dtstart: Date,
  after: Date,
  tz: string,
): Date | null {
  const horizon = new Date(after.getTime() + 400 * 86_400_000 * 5);
  const list = expandRRule(rule, dtstart, new Date(after.getTime() + 1), horizon, tz, 1);
  return list[0] ?? null;
}

/** Common presets for pickers. */
export const rrulePresets = {
  daily: "FREQ=DAILY",
  weekdaysIran: "FREQ=WEEKLY;BYDAY=SA,SU,MO,TU,WE",
  weekdays: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
  weekly: "FREQ=WEEKLY",
  biweekly: "FREQ=WEEKLY;INTERVAL=2",
  monthly: "FREQ=MONTHLY",
  yearly: "FREQ=YEARLY",
} as const;
