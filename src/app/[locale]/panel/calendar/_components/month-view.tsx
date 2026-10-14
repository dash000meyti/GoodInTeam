"use client";

import { useMemo } from "react";
import Link from "next/link";
import { dayBounds, monthWeeks, type MonthCell } from "@/components/calendar/grid";
import {
  dateLabel,
  dayNumber,
  digits,
  gregorianDayNumber,
  timeLabel,
  weekdayName,
} from "@/components/calendar/format";
import { layoutSpans, visibleSpans, type SpanSegment } from "@/components/calendar/layout";
import type { CalendarItem } from "@/components/calendar/types";
import { useT } from "@/i18n/client";
import { format } from "@/i18n/format-message";
import { cn } from "@/lib/utils";
import { useCalendar } from "./calendar-context";
import { ItemPopover } from "./item-popover";
import { chipStyle, isWeekend, itemAriaLabel, itemTitle } from "./item-style";

const MAX_LANES = 3;

export function MonthView({
  anchor,
  items,
  dayHref,
}: {
  anchor: string;
  items: CalendarItem[];
  dayHref: (key: string) => string;
}) {
  const cal = useCalendar();
  const weeks = useMemo(
    () => monthWeeks(anchor, { tz: cal.tz, calendar: cal.calendar, weekStartsOn: cal.weekStartsOn }),
    [anchor, cal.tz, cal.calendar, cal.weekStartsOn],
  );
  return (
    <div role="grid" aria-readonly className="select-none">
      <div role="row" className="grid grid-cols-7 border-b border-dashed">
        {weeks[0]!.map((cell) => (
          <div
            key={cell.weekday}
            role="columnheader"
            className="truncate px-1 py-2.5 text-center text-xs font-semibold text-muted-foreground"
          >
            <span className="hidden md:inline">{weekdayName(cell.key, cal.locale, "long")}</span>
            <span className="md:hidden">{weekdayName(cell.key, cal.locale, "narrow")}</span>
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <WeekRow key={week[0]!.key} week={week} items={items} dayHref={dayHref} />
      ))}
    </div>
  );
}

function WeekRow({
  week,
  items,
  dayHref,
}: {
  week: MonthCell[];
  items: CalendarItem[];
  dayHref: (key: string) => string;
}) {
  const cal = useCalendar();
  const t = useT();
  const c = t.calendar;
  const weekKey = week.map((d) => d.key).join(",");
  const bounds = useMemo(() => dayBounds(weekKey.split(","), cal.tz), [weekKey, cal.tz]);
  const { shown, more } = useMemo(() => {
    const first = bounds[0]!.start;
    const last = bounds.at(-1)!.end;
    const inRow = items.filter((i) => i.start < last && Math.max(i.end, i.start + 1) > first);
    const { segments } = layoutSpans(inRow, bounds);
    return visibleSpans(segments, 7, MAX_LANES);
  }, [items, bounds]);

  return (
    <div
      role="row"
      className="relative grid grid-cols-7 border-b border-dashed last:border-b-0"
      style={{ gridTemplateRows: `2.25rem repeat(${MAX_LANES}, 1.375rem) minmax(0.375rem, 1fr)` }}
    >
      {week.map((cell, i) => {
        const today = cell.key === cal.todayKey;
        const label = dateLabel(cell.key, cal.locale);
        return (
          <div
            key={cell.key}
            role="gridcell"
            aria-label={label}
            className={cn(
              "relative min-h-24 border-e border-dashed last:border-e-0 sm:min-h-[7.25rem]",
              !cell.inMonth
                ? "bg-muted/50 dark:bg-muted/30"
                : isWeekend(cell.weekday, cal.locale) && "bg-muted/25 dark:bg-muted/15",
            )}
            style={{ gridColumn: i + 1, gridRow: "1 / -1" }}
          >
            <button
              type="button"
              className="absolute inset-0 cursor-pointer transition-colors outline-none hover:bg-primary/4 focus-visible:bg-primary/8 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
              aria-label={format(c.createOn, { date: label })}
              onClick={() => cal.openCreate({ date: cell.key })}
            />
            <div className="pointer-events-none relative flex items-center justify-between gap-1 px-1 pt-1 sm:px-1.5">
              <Link
                href={dayHref(cell.key)}
                aria-label={format(c.openDay, { date: label })}
                className={cn(
                  "pointer-events-auto flex size-7 items-center justify-center rounded-full text-[13px] font-bold tabular-nums transition-colors",
                  today
                    ? "bg-primary text-primary-foreground hover:bg-primary-dark"
                    : cell.inMonth
                      ? "hover:bg-accent"
                      : "text-muted-foreground hover:bg-accent",
                )}
              >
                {dayNumber(cell.key, cal.locale)}
              </Link>
              {cal.locale === "fa" && (
                <span
                  className="hidden font-sans text-[10px] font-medium text-muted-foreground/80 tabular-nums sm:inline"
                  dir="ltr"
                >
                  {gregorianDayNumber(cell.key)}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {shown.map((seg) => (
        <SegmentChip key={seg.item.key} seg={seg} />
      ))}

      {more.map((n, i) =>
        n > 0 ? (
          <Link
            key={i}
            href={dayHref(week[i]!.key)}
            aria-label={format(c.moreLabel, { n: digits(n, cal.locale) })}
            className="relative z-[1] mx-1 truncate rounded-md px-1.5 text-[11px] leading-[1.375rem] font-bold text-muted-foreground hover:bg-accent hover:text-foreground"
            style={{ gridColumn: i + 1, gridRow: MAX_LANES + 1 }}
          >
            {format(c.more, { n: digits(n, cal.locale) })}
          </Link>
        ) : null,
      )}
    </div>
  );
}

function SegmentChip({ seg }: { seg: SpanSegment<CalendarItem> }) {
  const cal = useCalendar();
  const t = useT();
  const item = seg.item;
  const bar = item.allDay || seg.endCol > seg.startCol;
  const muted = item.done || item.status === "canceled";
  return (
    <ItemPopover item={item}>
      <button
        type="button"
        aria-label={itemAriaLabel(item, cal, t.calendar)}
        className={cn(
          "relative z-[1] my-px flex min-w-0 cursor-pointer items-center gap-1 overflow-hidden rounded-md px-1.5 text-start text-[10.5px] leading-5 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:text-xs",
          seg.continuesBefore ? "ms-0 rounded-s-none" : "ms-1",
          seg.continuesAfter ? "me-0 rounded-e-none" : "me-1",
          bar ? "border-s-[3px] hover:brightness-95 dark:hover:brightness-125" : "hover:bg-accent",
          muted && "opacity-60",
        )}
        style={{
          gridColumn: `${seg.startCol + 1} / ${seg.endCol + 2}`,
          gridRow: seg.lane + 2,
          ...(bar ? chipStyle(item.color) : undefined),
        }}
      >
        {!bar && (
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
        )}
        {!bar && (
          <span className="hidden shrink-0 font-medium text-muted-foreground tabular-nums lg:inline">
            {timeLabel(item.start, cal.tz, cal.locale)}
          </span>
        )}
        <span className={cn("truncate", muted && "line-through")}>{itemTitle(item, t.calendar)}</span>
      </button>
    </ItemPopover>
  );
}
