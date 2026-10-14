import type { CSSProperties } from "react";
import { dateLabel, timeRangeLabel } from "@/components/calendar/format";
import { dayKeyOf } from "@/components/calendar/grid";
import type { CalendarItem } from "@/components/calendar/types";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";

type C = Messages["calendar"];

/** Soft tinted surface + colored start border (works in light and dark mode). */
export function chipStyle(color: string): CSSProperties {
  return {
    backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
    borderInlineStartColor: color,
  };
}

/** Friday in Iran; Saturday + Sunday elsewhere. */
export function isWeekend(weekday: number, locale: Locale) {
  return locale === "fa" ? weekday === 5 : weekday === 0 || weekday === 6;
}

export function itemTitle(item: CalendarItem, c: C) {
  return item.type === "invoice" ? `${c.invoice} ${item.title}` : item.title;
}

/** Kind/type label of an item ("Meeting", "Task", "Invoice due"…). */
export function itemTypeLabel(item: CalendarItem, c: C) {
  if (item.type === "event" && item.event) return c[`kind_${item.event.kind}`];
  return c[`type_${item.type as "task" | "project" | "milestone" | "invoice"}`];
}

/** "Wed 22 Mehr · 10:00–11:00" style label for any item. */
export function itemWhenLabel(item: CalendarItem, ctx: { tz: string; locale: Locale }, c: C) {
  const firstKey = dayKeyOf(item.start, ctx.tz);
  if (item.allDay) {
    const lastKey = dayKeyOf(item.end - 1, ctx.tz);
    if (lastKey !== firstKey)
      return `${dateLabel(firstKey, ctx.locale, { year: false })} – ${dateLabel(lastKey, ctx.locale, { year: false })}`;
    return `${dateLabel(firstKey, ctx.locale, { year: false })} · ${c.allDay}`;
  }
  const lastKey = dayKeyOf(Math.max(item.start, item.end - 1), ctx.tz);
  if (lastKey !== firstKey) {
    const a = dateLabel(firstKey, ctx.locale, { year: false, short: true });
    const b = dateLabel(lastKey, ctx.locale, { year: false, short: true });
    return `${a} ${timeRangeLabel(item.start, item.start, ctx.tz, ctx.locale)} – ${b} ${timeRangeLabel(item.end, item.end, ctx.tz, ctx.locale)}`;
  }
  return `${dateLabel(firstKey, ctx.locale, { year: false })} · ${timeRangeLabel(item.start, item.end, ctx.tz, ctx.locale)}`;
}

export function itemAriaLabel(item: CalendarItem, ctx: { tz: string; locale: Locale }, c: C) {
  return `${itemTypeLabel(item, c)}: ${itemTitle(item, c)} — ${itemWhenLabel(item, ctx, c)}`;
}
