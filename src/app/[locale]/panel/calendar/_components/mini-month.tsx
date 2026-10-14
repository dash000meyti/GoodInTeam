"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  monthStartKey,
  monthWeeks,
  nextMonthStartKey,
  prevMonthStartKey,
} from "@/components/calendar/grid";
import { dateLabel, dayNumber, monthTitle, weekdayName } from "@/components/calendar/format";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useCalendar } from "./calendar-context";

/** Compact month navigator for the side panel (Jalali for fa). */
export function MiniMonth({
  anchor,
  selected,
  marked,
  dayHref,
}: {
  anchor: string;
  /** Days of the visible range (highlighted). */
  selected: Set<string>;
  /** Days that have something scheduled (dot). */
  marked: Set<string>;
  dayHref: (key: string) => string;
}) {
  const cal = useCalendar();
  const t = useT();
  const cfg = { tz: cal.tz, calendar: cal.calendar, weekStartsOn: cal.weekStartsOn };
  const anchorMonth = monthStartKey(anchor, cal.calendar);
  const [month, setMonth] = useState(anchorMonth);
  const [synced, setSynced] = useState(anchorMonth);
  if (synced !== anchorMonth) {
    setSynced(anchorMonth);
    setMonth(anchorMonth);
  }
  const weeks = useMemo(
    () => monthWeeks(month, cfg),
    [month, cfg.tz, cfg.calendar, cfg.weekStartsOn], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.calendar.prevPeriod}
          onClick={() => setMonth(prevMonthStartKey(month, cal.calendar))}
        >
          <ChevronLeftIcon className="rtl:rotate-180" />
        </Button>
        <span className="text-sm font-bold">{monthTitle(month, cal.locale)}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.calendar.nextPeriod}
          onClick={() => setMonth(nextMonthStartKey(month, cal.calendar))}
        >
          <ChevronRightIcon className="rtl:rotate-180" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center" aria-label={t.calendar.miniMonth}>
        {weeks[0]!.map((d) => (
          <span key={d.weekday} className="py-1 text-[11px] font-semibold text-muted-foreground">
            {weekdayName(d.key, cal.locale, "narrow")}
          </span>
        ))}
        {weeks.flat().map((d) => {
          const isToday = d.key === cal.todayKey;
          const isSel = selected.has(d.key);
          return (
            <Link
              key={d.key}
              href={dayHref(d.key)}
              aria-label={dateLabel(d.key, cal.locale)}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "relative mx-auto flex size-8 items-center justify-center rounded-lg text-[13px] tabular-nums transition-colors hover:bg-accent",
                !d.inMonth && "text-muted-foreground/50",
                isSel && "bg-primary/10 font-semibold text-primary-dark dark:text-primary-light",
                isToday && "bg-primary font-bold text-primary-foreground hover:bg-primary-dark",
              )}
            >
              {dayNumber(d.key, cal.locale)}
              {marked.has(d.key) && !isToday && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1 mx-auto size-1 rounded-full bg-primary"
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
