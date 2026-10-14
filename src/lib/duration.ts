/**
 * Human duration input ⇄ milliseconds. Pure; safe on server and client.
 *
 *   parseDuration("1:30")      → 5_400_000   (h:mm)
 *   parseDuration("1.5")       → 5_400_000   (bare number = hours)
 *   parseDuration("90m")       → 5_400_000
 *   parseDuration("1h 30m")    → 5_400_000
 *   parseDuration("۱ ساعت و ۳۰ دقیقه") → 5_400_000
 */
import { toLatinDigits } from "./format";

const MINUTE = 60_000;
const HOUR = 3_600_000;

const UNIT_MS: Record<string, number> = {
  h: HOUR,
  hr: HOUR,
  hrs: HOUR,
  hour: HOUR,
  hours: HOUR,
  ساعت: HOUR,
  m: MINUTE,
  min: MINUTE,
  mins: MINUTE,
  minute: MINUTE,
  minutes: MINUTE,
  دقیقه: MINUTE,
  د: MINUTE,
  س: HOUR,
};

const UNIT_RE =
  /(\d+(?:\.\d+)?)\s*(hours|hour|hrs|hr|h|minutes|minute|mins|min|m|ساعت|دقیقه|س|د)/gu;

/** Parse a human duration. Returns ms (> 0) or null when it can't be understood. */
export function parseDuration(input: string | null | undefined): number | null {
  if (!input) return null;
  const s = toLatinDigits(input).trim().toLowerCase().replace(/[٫,]/g, ".").replace(/\s+/g, " ");
  if (!s) return null;

  const clock = /^(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?$/.exec(s);
  if (clock) {
    const h = Number(clock[1]);
    const m = Number(clock[2]);
    const sec = clock[3] ? Number(clock[3]) : 0;
    if (m >= 60 || sec >= 60) return null;
    const ms = h * HOUR + m * MINUTE + sec * 1000;
    return ms > 0 ? ms : null;
  }

  if (/^\d+(?:\.\d+)?$/.test(s)) {
    const ms = Math.round(Number(s) * HOUR);
    return ms > 0 ? ms : null;
  }

  let total = 0;
  let matched = false;
  const rest = s.replace(UNIT_RE, (_, n: string, unit: string) => {
    matched = true;
    total += Number(n) * (UNIT_MS[unit] ?? 0);
    return " ";
  });
  // Only separators may remain ("1h 30m", "1 ساعت و 30 دقیقه", "1h and 30m").
  if (!matched || rest.replace(/\b(and)\b|و|\s/g, "") !== "") return null;
  const ms = Math.round(total);
  return ms > 0 ? ms : null;
}

/** 5_400_000 → "1:30" (for duration inputs; always Latin digits). */
export function formatDurationInput(ms: number) {
  const totalMin = Math.max(0, Math.round(ms / MINUTE));
  return `${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, "0")}`;
}

/** Validate "HH:mm" (24h). Accepts Persian digits. Returns normalized "HH:mm" or null. */
export function normalizeClock(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(toLatinDigits(input).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
