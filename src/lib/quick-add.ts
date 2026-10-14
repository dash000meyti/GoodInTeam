/**
 * Light natural-language parser for the task quick-add box. Pure; runs on the
 * client (live preview chips) and on the server (`tasks_create` with `text`).
 *
 *   "تمدید دامنه فردا ۱۰:۳۰ #شخصی +good-team-site !3"
 *     → title "تمدید دامنه", dueDate tomorrow, dueTime "10:30",
 *       tags ["شخصی"], project "good-team-site", priority 3
 *
 * Syntax (documented in docs/modules/time-tasks.md):
 *   !1 … !4           priority (1 low … 4 urgent)
 *   #tag              tag (repeatable)
 *   +project-slug     project by slug (prefix match is resolved by the caller)
 *   today/tomorrow/امروز/فردا/پس‌فردا, weekday names (en + fa) → due date
 *   HH:mm (optionally after "at" / "ساعت" / "@") → due time
 */
import { toLatinDigits } from "./format";
import { addDays, startOfDay, toDateInputValue, zonedParts } from "./tz";

export type QuickAddTokenKind = "priority" | "tag" | "project" | "date" | "time";

export interface QuickAddToken {
  kind: QuickAddTokenKind;
  /** The text as typed (one or more words). */
  raw: string;
  value: string;
}

export interface QuickAddResult {
  title: string;
  priority?: number;
  tags: string[];
  /** Project slug (lower-case) as typed after "+". */
  project?: string;
  /** Gregorian "YYYY-MM-DD" in the given timezone. */
  dueDate?: string;
  /** "HH:mm" 24h. */
  dueTime?: string;
  tokens: QuickAddToken[];
}

/** Lower-case, Latin digits, unified Persian letters, no ZWNJ/kashida. */
function norm(word: string) {
  return toLatinDigits(word)
    .toLowerCase()
    .replace(/[‌‏‎ـ]/g, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[.,،؛;:!?؟]+$/u, (m) => (/^\d/.test(word) ? m : ""));
}

/** Relative day offsets. */
const DAY_WORDS: Record<string, number> = {
  today: 0,
  tod: 0,
  امروز: 0,
  tomorrow: 1,
  tmr: 1,
  tom: 1,
  فردا: 1,
  پسفردا: 2,
  dayaftertomorrow: 2,
};

/** Weekday names → JS weekday (0 = Sunday). */
const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
  یکشنبه: 0,
  دوشنبه: 1,
  سهشنبه: 2,
  چهارشنبه: 3,
  پنجشنبه: 4,
  جمعه: 5,
  شنبه: 6,
};

const TIME_PREFIX = new Set(["at", "ساعت", "@"]);
const TAG_RE = /^#([\p{L}\p{N}_\-‌]+)$/u;
const PROJECT_RE = /^\+([\p{L}\p{N}][\p{L}\p{N}_\-‌]*)$/u;

function clock(word: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(word);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Day offset for a 1–3 word phrase, or null. */
function dayOffset(words: string[], todayWeekday: number): number | null {
  const joined = words.join("");
  if (joined in DAY_WORDS) return DAY_WORDS[joined]!;
  if (joined in WEEKDAYS) {
    // The next such weekday, strictly after today ("شنبه" on a Saturday = next week).
    const diff = (WEEKDAYS[joined]! - todayWeekday + 7) % 7;
    return diff === 0 ? 7 : diff;
  }
  return null;
}

export function parseQuickAdd(text: string, opts: { now: number; tz: string }): QuickAddResult {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const normalized = words.map(norm);
  const today = startOfDay(opts.now, opts.tz);
  const todayWeekday = zonedParts(today, opts.tz).weekday;

  const keep: string[] = [];
  const tokens: QuickAddToken[] = [];
  const out: QuickAddResult = { title: "", tags: [], tokens };

  for (let i = 0; i < words.length; i++) {
    const raw = words[i]!;
    const w = normalized[i]!;

    const pr = /^!([1-4])$/.exec(w);
    if (pr) {
      out.priority = Number(pr[1]);
      tokens.push({ kind: "priority", raw, value: pr[1]! });
      continue;
    }
    const tag = TAG_RE.exec(toLatinDigits(raw).replace(/[.,،؛;!?؟]+$/u, ""));
    if (tag) {
      const value = tag[1]!.replace(/‌$/, "");
      if (!out.tags.includes(value)) out.tags.push(value);
      tokens.push({ kind: "tag", raw, value });
      continue;
    }
    const proj = PROJECT_RE.exec(toLatinDigits(raw).replace(/[.,،؛;!?؟]+$/u, ""));
    if (proj && !/^\d+$/.test(proj[1]!)) {
      out.project = proj[1]!.toLowerCase();
      tokens.push({ kind: "project", raw, value: out.project });
      continue;
    }

    // Time, optionally preceded by "at" / "ساعت" / "@".
    if (TIME_PREFIX.has(w) && i + 1 < words.length && clock(normalized[i + 1]!)) {
      out.dueTime = clock(normalized[i + 1]!)!;
      tokens.push({ kind: "time", raw: `${raw} ${words[i + 1]}`, value: out.dueTime });
      i++;
      continue;
    }
    const c = clock(w);
    if (c) {
      out.dueTime = c;
      tokens.push({ kind: "time", raw, value: c });
      continue;
    }

    // Dates: try the longest phrase first ("day after tomorrow", "پس فردا", "سه شنبه").
    let matched = false;
    for (const len of [3, 2, 1]) {
      if (i + len > words.length) continue;
      const offset = dayOffset(normalized.slice(i, i + len), todayWeekday);
      if (offset == null) continue;
      out.dueDate = toDateInputValue(addDays(today, offset, opts.tz), opts.tz);
      tokens.push({
        kind: "date",
        raw: words.slice(i, i + len).join(" "),
        value: out.dueDate,
      });
      i += len - 1;
      matched = true;
      break;
    }
    if (matched) continue;

    keep.push(raw);
  }

  out.title = keep.join(" ").trim();
  return out;
}
