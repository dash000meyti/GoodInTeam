import type { Locale } from "@/i18n/config";

/**
 * Menu-bar clock formatting (pure, unit-tested). Studio time in `tz`.
 * The text is assembled from the typed parts only —
 * `${weekday} ${day} ${month} ${hour}:${minute}` — so every `literal` part
 * (the en comma, fa «ساعت») is dropped and the text is stable across ICU
 * versions: «چهارشنبه ۳۰ اردیبهشت ۱۱:۳۰», "Wed 20 May 11:30".
 */
const OPTIONS: Record<Locale, { tag: string; opts: Intl.DateTimeFormatOptions }> = {
  fa: {
    tag: "fa-IR-u-ca-persian",
    opts: { weekday: "long", day: "numeric", month: "long" },
  },
  en: {
    tag: "en-GB",
    opts: { weekday: "short", day: "numeric", month: "short" },
  },
};

const cache = new Map<string, Intl.DateTimeFormat>();
function formatter(locale: Locale, tz: string) {
  const key = `${locale}|${tz}`;
  let f = cache.get(key);
  if (!f) {
    const { tag, opts } = OPTIONS[locale];
    f = new Intl.DateTimeFormat(tag, {
      ...opts,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: tz,
    });
    cache.set(key, f);
  }
  return f;
}

export function formatClock(date: Date, locale: Locale, tz: string): { text: string; iso: string } {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const p of formatter(locale, tz).formatToParts(date))
    if (p.type !== "literal") parts[p.type] = p.value;
  const text = `${parts.weekday} ${parts.day} ${parts.month} ${parts.hour}:${parts.minute}`;
  const minute = new Date(Math.floor(date.getTime() / 60_000) * 60_000);
  return { text, iso: minute.toISOString() };
}

/** Milliseconds until the next minute boundary (1…60000). */
export function msToNextMinute(now: number): number {
  return 60_000 - (((now % 60_000) + 60_000) % 60_000);
}

/**
 * One instant per locale whose clock text is the longest of the year (every
 * day at 23:59 Tehran): fa Wed 30 Ordibehesht 1405, en Wed 30 Sept. The fixed
 * `.os-clock` width (`--clock-w`, os-shell.css) is measured on these.
 */
export const CLOCK_LONGEST: Record<Locale, Date> = {
  fa: new Date("2026-05-20T20:29:00Z"),
  en: new Date("2026-09-30T20:29:00Z"),
};
