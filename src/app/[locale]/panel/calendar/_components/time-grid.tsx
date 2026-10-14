"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { dayBounds, weekdayOfKey } from "@/components/calendar/grid";
import {
  dateLabel,
  dayNumber,
  hourLabel,
  timeLabel,
  timeRangeLabel,
  weekdayName,
} from "@/components/calendar/format";
import { layoutSpans, layoutTimed } from "@/components/calendar/layout";
import type { CalendarItem } from "@/components/calendar/types";
import { useT } from "@/i18n/client";
import { format } from "@/i18n/format-message";
import { DAY_MS, zonedParts } from "@/lib/tz";
import { cn } from "@/lib/utils";
import { useCalendar } from "./calendar-context";
import { ItemPopover } from "./item-popover";
import { chipStyle, isWeekend, itemAriaLabel, itemTitle } from "./item-style";

/** Pixel height of one hour in the grid. */
const HOUR = 48;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const pad = (n: number) => String(n).padStart(2, "0");

/** Items drawn in the all-day row rather than the time grid. */
const isBar = (i: CalendarItem) => i.allDay || i.end - i.start >= DAY_MS;

export function TimeGridView({
  days,
  items,
  dayHref,
}: {
  days: string[];
  items: CalendarItem[];
  dayHref: (key: string) => string;
}) {
  const cal = useCalendar();
  const t = useT();
  const c = t.calendar;
  const scrollRef = useRef<HTMLDivElement>(null);
  const bounds = useMemo(() => dayBounds(days, cal.tz), [days, cal.tz]);
  const single = days.length === 1;
  const cols = `3.5rem repeat(${days.length}, minmax(0, 1fr))`;

  const { bars, laneCount, timed } = useMemo(() => {
    const barItems = items.filter(isBar);
    const { segments, laneCount } = layoutSpans(barItems, bounds);
    return { bars: segments, laneCount, timed: items.filter((i) => !isBar(i)) };
  }, [items, bounds]);

  // Scroll to the first event / current time / 08:00 on mount and when the range changes.
  const showsToday = days.includes(cal.todayKey);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const first = timed.reduce(
      (min, i) => Math.min(min, zonedParts(Math.max(i.start, bounds[0]!.start), cal.tz).hour),
      24,
    );
    const nowHour = zonedParts(Date.now(), cal.tz).hour;
    const target = Math.min(first, showsToday ? Math.max(0, nowHour - 1) : 8, 8);
    el.scrollTop = Math.max(0, target * HOUR - 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on range change
  }, [days.join()]);

  return (
    <div className={cn(!single && "overflow-x-auto")}>
      <div className={cn(!single && "min-w-[42rem]")}>
        {/* Day headers */}
        <div className="grid border-b border-dashed" style={{ gridTemplateColumns: cols }}>
          <div aria-hidden />
          {days.map((key) => {
            const today = key === cal.todayKey;
            return (
              <Link
                key={key}
                href={dayHref(key)}
                aria-label={format(c.openDay, { date: dateLabel(key, cal.locale) })}
                className={cn(
                  "group flex flex-col items-center gap-0.5 py-2 transition-colors hover:bg-accent/60",
                  single && "flex-row justify-center gap-2",
                )}
              >
                <span
                  className={cn(
                    "text-xs font-semibold",
                    today ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {weekdayName(key, cal.locale, single ? "long" : "short")}
                </span>
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-base font-extrabold tabular-nums",
                    today && "bg-primary text-primary-foreground",
                  )}
                >
                  {dayNumber(key, cal.locale)}
                </span>
              </Link>
            );
          })}
        </div>

        {/* All-day row */}
        <div
          className="grid border-b border-dashed"
          style={{
            gridTemplateColumns: cols,
            gridTemplateRows: `repeat(${Math.max(1, laneCount)}, 1.5rem) 0.375rem`,
          }}
        >
          <div
            className="flex items-start justify-end px-2 pt-1 text-[11px] font-semibold text-muted-foreground"
            style={{ gridColumn: 1, gridRow: "1 / -1" }}
          >
            {c.allDay}
          </div>
          {days.map((key, i) => (
            <button
              key={key}
              type="button"
              aria-label={format(c.createOn, { date: dateLabel(key, cal.locale) })}
              onClick={() => cal.openCreate({ date: key, allDay: true })}
              className={cn(
                "cursor-pointer border-s border-dashed transition-colors outline-none hover:bg-primary/4 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset",
                isWeekend(weekdayOfKey(key), cal.locale) && "bg-muted/25 dark:bg-muted/15",
              )}
              style={{ gridColumn: i + 2, gridRow: "1 / -1" }}
            />
          ))}
          {bars.map((seg) => {
            const item = seg.item;
            const muted = item.done || item.status === "canceled";
            return (
              <ItemPopover key={item.key} item={item}>
                <button
                  type="button"
                  aria-label={itemAriaLabel(item, cal, c)}
                  className={cn(
                    "relative z-[1] my-0.5 flex min-w-0 cursor-pointer items-center overflow-hidden rounded-md border-s-[3px] px-1.5 text-start text-xs leading-5 font-semibold outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-primary/50 dark:hover:brightness-125",
                    seg.continuesBefore ? "ms-0 rounded-s-none" : "ms-1",
                    seg.continuesAfter ? "me-0 rounded-e-none" : "me-1",
                    muted && "opacity-60",
                  )}
                  style={{
                    gridColumn: `${seg.startCol + 2} / ${seg.endCol + 3}`,
                    gridRow: seg.lane + 1,
                    ...chipStyle(item.color),
                  }}
                >
                  <span className={cn("truncate", muted && "line-through")}>{itemTitle(item, c)}</span>
                </button>
              </ItemPopover>
            );
          })}
        </div>

        {/* Hours */}
        <div ref={scrollRef} className="relative max-h-[min(68vh,46rem)] overflow-y-auto">
          <div className="grid" style={{ gridTemplateColumns: cols, height: 24 * HOUR }}>
            <div className="relative" aria-hidden>
              {HOURS.slice(1).map((h) => (
                <span
                  key={h}
                  className="absolute end-2 -translate-y-1/2 text-[11px] font-medium text-muted-foreground tabular-nums"
                  style={{ top: h * HOUR }}
                >
                  {hourLabel(h, cal.locale)}
                </span>
              ))}
            </div>
            {days.map((key, i) => (
              <DayColumn
                key={key}
                dayKey={key}
                start={bounds[i]!.start}
                end={bounds[i]!.end}
                items={timed}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  dayKey,
  start,
  end,
  items,
}: {
  dayKey: string;
  start: number;
  end: number;
  items: CalendarItem[];
}) {
  const cal = useCalendar();
  const t = useT();
  const c = t.calendar;
  const boxes = useMemo(() => layoutTimed(items, start, end), [items, start, end]);
  const dayText = dateLabel(dayKey, cal.locale, { year: false });
  const weekend = isWeekend(weekdayOfKey(dayKey), cal.locale);

  return (
    <div className={cn("relative border-s border-dashed", weekend && "bg-muted/25 dark:bg-muted/15")}>
      {HOURS.map((h) => (
        <button
          key={h}
          type="button"
          aria-label={format(c.createAt, { time: `${dayText} ${hourLabel(h, cal.locale)}` })}
          onClick={(e) => {
            const half = e.nativeEvent.offsetY >= HOUR / 2 ? 30 : 0;
            const startTime = `${pad(h)}:${pad(half)}`;
            cal.openCreate({ date: dayKey, startTime, endTime: `${pad((h + 1) % 24)}:${pad(half)}` });
          }}
          className="absolute inset-x-0 cursor-pointer border-t border-dashed border-border/80 outline-none after:pointer-events-none after:absolute after:inset-x-0 after:top-1/2 after:border-t after:border-dotted after:border-border/50 first:border-t-0 hover:bg-primary/4 focus-visible:bg-primary/8 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
          style={{ top: h * HOUR, height: HOUR }}
        />
      ))}

      {boxes.map((b) => {
        const item = b.item;
        const px = b.height * 24 * HOUR;
        const compact = px < 40;
        const muted = item.done || item.status === "canceled";
        return (
          <ItemPopover key={item.key} item={item}>
            <button
              type="button"
              aria-label={itemAriaLabel(item, cal, c)}
              className={cn(
                "@container absolute z-[1] flex cursor-pointer overflow-hidden rounded-md border-s-[3px] px-1.5 text-start text-xs leading-tight shadow-[0_0_0_1px_var(--background)] outline-none hover:z-[3] hover:brightness-95 focus-visible:z-[3] focus-visible:ring-2 focus-visible:ring-primary/50 dark:hover:brightness-125",
                compact ? "items-center gap-1.5 py-0" : "flex-col gap-0.5 py-1",
                muted && "opacity-60",
              )}
              style={{
                top: `${b.top * 100}%`,
                height: `${b.height * 100}%`,
                insetInlineStart: `calc(${(b.col / b.cols) * 100}% + 2px)`,
                width: `calc(${(b.span / b.cols) * 100}% - 4px)`,
                ...chipStyle(item.color),
                backgroundColor: `color-mix(in oklab, ${item.color} 18%, var(--card))`,
              }}
            >
              <span className={cn("min-w-0 truncate font-bold", muted && "line-through")}>
                {itemTitle(item, c)}
              </span>
              <span
                className={cn(
                  "truncate text-[11px] text-muted-foreground tabular-nums",
                  compact && "hidden shrink-0 @[7rem]:inline",
                )}
              >
                {compact
                  ? timeLabel(item.start, cal.tz, cal.locale)
                  : timeRangeLabel(item.start, item.end, cal.tz, cal.locale)}
              </span>
              {!compact && px > 72 && (item.event?.location || item.project) && (
                <span className="truncate text-[11px] text-muted-foreground">
                  {item.event?.location ?? item.project?.name}
                </span>
              )}
            </button>
          </ItemPopover>
        );
      })}

      {cal.todayKey === dayKey && <NowLine start={start} end={end} />}
    </div>
  );
}

function NowLine({ start, end }: { start: number; end: number }) {
  const cal = useCalendar();
  const [now, setNow] = useState(cal.now);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  if (now < start || now >= end) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-[4]"
      style={{ top: `${((now - start) / (end - start)) * 100}%` }}
    >
      <div className="relative h-0.5 bg-destructive">
        <span className="absolute -start-1.5 -top-[5px] size-3 rounded-full bg-destructive ring-2 ring-background" />
      </div>
    </div>
  );
}
