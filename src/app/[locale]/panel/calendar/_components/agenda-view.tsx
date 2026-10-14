"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarDaysIcon, PlusIcon, RepeatIcon, VideoIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/panel/empty-state";
import { dayBounds } from "@/components/calendar/grid";
import {
  dateLabel,
  dayNumber,
  monthName,
  timeLabel,
  weekdayName,
} from "@/components/calendar/format";
import { ItemIcon } from "@/components/calendar/kinds";
import type { CalendarItem } from "@/components/calendar/types";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useCalendar } from "./calendar-context";
import { statusLabel } from "./labels";
import { ItemPopover } from "./item-popover";
import { itemAriaLabel, itemTitle, itemTypeLabel } from "./item-style";

/** Items grouped by the days they touch (multi-day items repeat on each day). */
export function groupByDay(items: CalendarItem[], days: string[], tz: string) {
  return dayBounds(days, tz)
    .map((d) => ({
      key: d.key,
      start: d.start,
      items: items.filter((i) => i.start < d.end && Math.max(i.end, i.start + 1) > d.start),
    }))
    .filter((g) => g.items.length > 0);
}

export function AgendaView({
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
  const groups = useMemo(() => groupByDay(items, days, cal.tz), [items, days, cal.tz]);

  if (!groups.length)
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={CalendarDaysIcon}
          title={c.agendaEmpty}
          description={c.agendaEmptyHint}
          action={
            <Button onClick={() => cal.openCreate({ date: days[0] })}>
              <PlusIcon /> {c.newEvent}
            </Button>
          }
        />
      </div>
    );

  return (
    <div className="divide-y divide-dashed">
      {groups.map((g) => {
        const today = g.key === cal.todayKey;
        return (
          <section
            key={g.key}
            aria-label={dateLabel(g.key, cal.locale)}
            className="flex gap-3 px-3 py-4 sm:gap-6 sm:px-6"
          >
            <Link
              href={dayHref(g.key)}
              className="flex w-12 shrink-0 flex-col items-center rounded-xl py-1 text-center transition-colors hover:bg-accent sm:w-14"
            >
              <span className={cn("text-xs font-semibold", today ? "text-primary" : "text-muted-foreground")}>
                {weekdayName(g.key, cal.locale, "short")}
              </span>
              <span
                className={cn(
                  "my-0.5 flex size-10 items-center justify-center rounded-full text-xl font-extrabold tabular-nums",
                  today && "bg-primary text-primary-foreground",
                )}
              >
                {dayNumber(g.key, cal.locale)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {monthName(g.key, cal.locale, "short")}
              </span>
            </Link>
            <ul className="min-w-0 flex-1 space-y-1.5">
              {g.items.map((item) => (
                <AgendaRow key={item.key} item={item} dayStart={g.start} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function AgendaRow({
  item,
  dayStart,
  compact = false,
}: {
  item: CalendarItem;
  dayStart?: number;
  compact?: boolean;
}) {
  const cal = useCalendar();
  const t = useT();
  const c = t.calendar;
  const muted = item.done || item.status === "canceled";
  const continued = dayStart != null && item.start < dayStart;
  const startText = item.allDay
    ? c.allDay
    : continued
      ? "…"
      : timeLabel(item.start, cal.tz, cal.locale);
  const endText = !item.allDay && item.end > item.start ? timeLabel(item.end, cal.tz, cal.locale) : null;
  const meta = [itemTypeLabel(item, c), item.project?.name, item.client?.name, item.event?.location]
    .filter(Boolean)
    .join(" · ");
  const ev = item.event;
  const showStatus = ev && (ev.kind === "commitment" || ev.status !== "confirmed");

  return (
    <li className="flex items-center gap-2">
      <ItemPopover item={item}>
        <button
          type="button"
          aria-label={itemAriaLabel(item, cal, c)}
          className={cn(
            "flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl text-start transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary/40",
            compact ? "p-1.5" : "p-2",
          )}
        >
          <span
            className={cn(
              "flex shrink-0 flex-col text-xs leading-5 tabular-nums",
              compact ? "w-14" : "w-14 sm:w-16",
            )}
          >
            <span className="font-semibold">{startText}</span>
            {endText && <span className="text-muted-foreground">{endText}</span>}
          </span>
          <span
            aria-hidden
            className={cn("w-1 shrink-0 self-stretch rounded-full", compact ? "min-h-7" : "min-h-9")}
            style={{ backgroundColor: item.color }}
          />
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate font-semibold",
                compact ? "text-[13px]" : "text-sm",
                muted && "text-muted-foreground line-through",
              )}
            >
              {itemTitle(item, c)}
            </span>
            <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <ItemIcon item={item} className="size-3 shrink-0" style={{ color: item.color }} />
              <span className="truncate">{meta}</span>
              {ev?.recurrence && <RepeatIcon className="size-3 shrink-0" />}
            </span>
          </span>
          {showStatus && !compact && (
            <Badge
              variant={
                ev.status === "done"
                  ? "success"
                  : ev.status === "missed"
                    ? "destructive"
                    : ev.status === "canceled"
                      ? "neutral"
                      : ev.kind === "commitment"
                        ? "warning"
                        : "info"
              }
              className="hidden sm:inline-flex"
            >
              {statusLabel(ev.kind, ev.status, c)}
            </Badge>
          )}
        </button>
      </ItemPopover>
      {ev?.meetingUrl && !compact && (
        <Button asChild size="sm" variant="soft" className="shrink-0">
          <a href={ev.meetingUrl} target="_blank" rel="noopener noreferrer" aria-label={`${c.join}: ${item.title}`}>
            <VideoIcon /> <span className="hidden sm:inline">{c.join}</span>
          </a>
        </Button>
      )}
    </li>
  );
}
