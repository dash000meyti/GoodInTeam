/**
 * Natural day labels for headings and chips (pure; server + client):
 *   fa → "پنجشنبه ۲۳ مهر"   en → "Thursday, October 15"
 * With `withYear` the weekday is dropped ("۲۳ مهر ۱۴۰۵" / "October 15, 2026"),
 * because Intl's fa pattern for weekday + year reads awkwardly.
 */
import { localeMeta } from "@/i18n/config";
import type { FormatOptions } from "./format";

const cache = new Map<string, Intl.DateTimeFormat>();

export function formatDayLabel(
  d: Date | number,
  opts: FormatOptions & { withYear?: boolean; short?: boolean },
) {
  const cal = opts.calendar ?? localeMeta[opts.locale].calendar;
  const o: Intl.DateTimeFormatOptions = opts.withYear
    ? { day: "numeric", month: opts.short ? "short" : "long", year: "numeric" }
    : {
        weekday: opts.short ? "short" : "long",
        day: "numeric",
        month: opts.short ? "short" : "long",
      };
  const key = `${opts.locale}|${cal}|${opts.timeZone}|${JSON.stringify(o)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(`${localeMeta[opts.locale].intl}-u-ca-${cal}`, {
      ...o,
      timeZone: opts.timeZone ?? "Asia/Tehran",
    });
    cache.set(key, f);
  }
  return f.format(d);
}
