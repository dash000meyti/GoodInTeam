/**
 * iCalendar (RFC 5545) serializer — pure, no dependencies.
 *
 * - Timed events use UTC (`DTSTART:20261014T063000Z`), no VTIMEZONE needed.
 * - All-day events use `VALUE=DATE` with an exclusive DTEND.
 * - TEXT values are escaped; lines are folded at 75 octets (UTF-8 safe).
 * - RRULEs are passed through. Because DTSTART is in UTC, clients expand the
 *   rule in UTC: when the local start falls on a different calendar day than
 *   the UTC start (e.g. 01:00 in Tehran = 21:30 UTC the day before),
 *   BYDAY/BYMONTHDAY are shifted by that day difference (`shiftRRuleDays`).
 */
import { formatRRule, parseRRule, type RRule } from "@/lib/rrule";

export interface IcsEvent {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  allDay: boolean;
  /** Timed events: UTC instants. */
  start?: Date;
  end?: Date | null;
  /** All-day events: Gregorian "YYYY-MM-DD" (first day, and the day AFTER the last day). */
  startDate?: string;
  endDateExclusive?: string;
  status?: "TENTATIVE" | "CONFIRMED" | "CANCELLED";
  /** Already adapted to the DTSTART value type (see `rruleForIcs`). */
  rrule?: string | null;
  categories?: string[];
  /** VALARM: minutes before start (0 = at start). */
  alarmMinutesBefore?: number | null;
  stamp: Date;
  created?: Date | null;
  lastModified?: Date | null;
}

export interface IcsCalendar {
  name: string;
  description?: string;
  /** Informational X-WR-TIMEZONE (times are UTC anyway). */
  timezone?: string;
  prodId?: string;
  /** Suggested refresh interval in minutes (REFRESH-INTERVAL / X-PUBLISHED-TTL). */
  refreshMinutes?: number;
}

const CRLF = "\r\n";

/** Escape a TEXT value (RFC 5545 §3.3.11). */
export function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

function utf8Length(cp: number) {
  return cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
}

/**
 * Fold a content line to at most 75 octets per physical line (§3.1).
 * Continuation lines start with a single space. Never splits a UTF-8 sequence.
 */
export function foldLine(line: string) {
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = utf8Length(ch.codePointAt(0)!);
    if (bytes + n > limit) {
      out.push(current);
      current = " ";
      bytes = 1;
      limit = 75;
    }
    current += ch;
    bytes += n;
  }
  out.push(current);
  return out.join(CRLF);
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** 2026-10-14T06:30:00.000Z → "20261014T063000Z" */
export function formatUtc(d: Date) {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** "2026-10-14" → "20261014" */
export function formatDateValue(key: string) {
  return key.replace(/-/g, "");
}

/**
 * Shift BYDAY / BYMONTHDAY by `days` (−1 or +1) so a rule written for local
 * wall-clock dates matches a UTC DTSTART that falls on a neighbouring date.
 * Limitation: positive BYMONTHDAY ≥ 28 shifted forward is left unchanged.
 */
export function shiftRRuleDays(rule: RRule, days: number): RRule {
  if (!days) return rule;
  const next: RRule = { ...rule };
  if (rule.byDay?.length)
    next.byDay = rule.byDay.map((b) => ({ ...b, day: (((b.day + days) % 7) + 7) % 7 }));
  if (rule.byMonthDay?.length)
    next.byMonthDay = rule.byMonthDay.map((n) => {
      if (days < 0) return n === 1 ? -1 : n - 1; // 1st → last day of the previous month
      if (n < 0) return n === -1 ? 1 : n + 1; // last day → 1st of next month
      return n < 28 ? n + 1 : n;
    });
  return next;
}

/**
 * Normalize a stored RRULE for the feed: parsed with the app's RRULE subset
 * (unknown parts dropped, so clients expand exactly what the app shows),
 * shifted for UTC DTSTARTs, and UNTIL rendered as a DATE for all-day events.
 */
export function rruleForIcs(
  rrule: string | null | undefined,
  opts: { allDay: boolean; dayShift?: number },
) {
  if (!rrule) return null;
  const parsed = parseRRule(rrule);
  if (!parsed) return null;
  let text = formatRRule(opts.allDay ? parsed : shiftRRuleDays(parsed, opts.dayShift ?? 0));
  if (opts.allDay) text = text.replace(/UNTIL=(\d{8})T\d{6}Z/, "UNTIL=$1");
  return text;
}

function prop(name: string, value: string) {
  return foldLine(`${name}:${value}`);
}

function eventLines(ev: IcsEvent) {
  const lines = ["BEGIN:VEVENT", prop("UID", ev.uid), prop("DTSTAMP", formatUtc(ev.stamp))];
  if (ev.allDay && ev.startDate) {
    lines.push(prop("DTSTART;VALUE=DATE", formatDateValue(ev.startDate)));
    if (ev.endDateExclusive)
      lines.push(prop("DTEND;VALUE=DATE", formatDateValue(ev.endDateExclusive)));
  } else if (ev.start) {
    lines.push(prop("DTSTART", formatUtc(ev.start)));
    if (ev.end && ev.end.getTime() > ev.start.getTime())
      lines.push(prop("DTEND", formatUtc(ev.end)));
  }
  lines.push(prop("SUMMARY", escapeText(ev.title)));
  if (ev.description) lines.push(prop("DESCRIPTION", escapeText(ev.description)));
  if (ev.location) lines.push(prop("LOCATION", escapeText(ev.location)));
  if (ev.url) lines.push(prop("URL", ev.url.replace(/[\r\n]/g, "")));
  if (ev.status) lines.push(prop("STATUS", ev.status));
  if (ev.categories?.length)
    lines.push(prop("CATEGORIES", ev.categories.map((c) => escapeText(c)).join(",")));
  if (ev.rrule) lines.push(prop("RRULE", ev.rrule));
  if (ev.created) lines.push(prop("CREATED", formatUtc(ev.created)));
  if (ev.lastModified) lines.push(prop("LAST-MODIFIED", formatUtc(ev.lastModified)));
  if (ev.alarmMinutesBefore != null && ev.alarmMinutesBefore >= 0 && ev.status !== "CANCELLED") {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      prop("DESCRIPTION", escapeText(ev.title)),
      prop("TRIGGER", ev.alarmMinutesBefore === 0 ? "PT0M" : `-PT${ev.alarmMinutesBefore}M`),
      "END:VALARM",
    );
  }
  lines.push("END:VEVENT");
  return lines;
}

/** Serialize a full VCALENDAR document (CRLF line endings, trailing CRLF). */
export function buildCalendar(events: IcsEvent[], cal: IcsCalendar) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    prop("PRODID", cal.prodId ?? "-//Good Team//Calendar//EN"),
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    prop("X-WR-CALNAME", escapeText(cal.name)),
  ];
  if (cal.description) lines.push(prop("X-WR-CALDESC", escapeText(cal.description)));
  if (cal.timezone) lines.push(prop("X-WR-TIMEZONE", cal.timezone));
  if (cal.refreshMinutes) {
    lines.push(`REFRESH-INTERVAL;VALUE=DURATION:PT${cal.refreshMinutes}M`);
    lines.push(`X-PUBLISHED-TTL:PT${cal.refreshMinutes}M`);
  }
  for (const ev of events) lines.push(...eventLines(ev));
  lines.push("END:VCALENDAR");
  return lines.join(CRLF) + CRLF;
}
