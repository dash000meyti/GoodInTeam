"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { addDaysKey, dayBounds, shiftAnchor } from "@/components/calendar/grid";
import { dateLabel, monthTitle, rangeLabel } from "@/components/calendar/format";
import { sourceMeta } from "@/components/calendar/kinds";
import {
  calendarSources,
  calendarViews,
  HIDDEN_SOURCES_COOKIE,
  type CalendarItem,
  type CalendarSource,
  type CalendarView as View,
} from "@/components/calendar/types";
import { localePath } from "@/i18n/config";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { AgendaRow, AgendaView, groupByDay } from "./agenda-view";
import { useCalendar } from "./calendar-context";
import { MiniMonth } from "./mini-month";
import { MonthView } from "./month-view";
import { TimeGridView } from "./time-grid";

/** Remember switched-off sources (read by the page on the server → no flash). */
function persistHidden(list: CalendarSource[]) {
  document.cookie = `${HIDDEN_SOURCES_COOKIE}=${list.join(",")}; path=/; max-age=31536000; samesite=lax`;
}

const viewKeys: Record<string, View> = { KeyM: "month", KeyW: "week", KeyD: "day", KeyA: "agenda" };

export function CalendarView({
  view,
  anchor,
  days,
  items,
  upcoming,
  initialHidden,
}: {
  view: View;
  anchor: string;
  days: string[];
  items: CalendarItem[];
  upcoming: CalendarItem[];
  initialHidden: CalendarSource[];
}) {
  const cal = useCalendar();
  const t = useT();
  const c = t.calendar;
  const router = useRouter();
  const [hidden, setHidden] = useState(() => new Set(initialHidden));
  const sources = calendarSources.filter((s) => s !== "invoices" || cal.isAdmin);
  const visible = useMemo(() => items.filter((i) => !hidden.has(i.source)), [items, hidden]);
  const visibleUpcoming = useMemo(
    () => upcoming.filter((i) => !hidden.has(i.source)),
    [upcoming, hidden],
  );

  const toggle = (s: CalendarSource) => {
    const next = new Set(hidden);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setHidden(next);
    persistHidden([...next]);
  };

  const href = useCallback(
    (v: View, d: string) => localePath(cal.locale, `/panel/calendar?view=${v}&date=${d}`),
    [cal.locale],
  );
  const dayHref = useCallback((d: string) => href("day", d), [href]);
  const cfg = { tz: cal.tz, calendar: cal.calendar, weekStartsOn: cal.weekStartsOn };
  const prev = shiftAnchor(view, anchor, -1, cfg);
  const next = shiftAnchor(view, anchor, 1, cfg);
  const title =
    view === "month"
      ? monthTitle(anchor, cal.locale)
      : view === "day"
        ? dateLabel(anchor, cal.locale)
        : rangeLabel(days[0]!, days.at(-1)!, cal.locale);

  // Keyboard shortcuts (layout-independent key codes; ignored while typing or in dialogs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (
        document.querySelector(
          '[role="dialog"],[role="alertdialog"],[data-radix-popper-content-wrapper]',
        )
      )
        return;
      const rtl = document.documentElement.dir === "rtl";
      let to: string | null = null;
      if (e.key === "ArrowLeft") to = href(view, rtl ? next : prev);
      else if (e.key === "ArrowRight") to = href(view, rtl ? prev : next);
      else if (e.code === "KeyT") to = href(view, cal.todayKey);
      else if (viewKeys[e.code]) to = href(viewKeys[e.code]!, anchor);
      else if (e.code === "KeyN") {
        e.preventDefault();
        cal.openCreate({ date: days.includes(cal.todayKey) ? cal.todayKey : days[0] });
        return;
      }
      if (!to) return;
      e.preventDefault();
      router.push(to);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [href, view, prev, next, anchor, days, cal, router]);

  const selected = useMemo(
    () => new Set(view === "month" ? [] : view === "agenda" ? [] : days),
    [view, days],
  );
  const marked = useMemo(() => {
    const set = new Set<string>();
    for (const d of dayBounds(days, cal.tz))
      if (visible.some((i) => i.start < d.end && Math.max(i.end, i.start + 1) > d.start))
        set.add(d.key);
    return set;
  }, [visible, days, cal.tz]);

  const upcomingDays = useMemo(
    () =>
      groupByDay(
        visibleUpcoming,
        Array.from({ length: 7 }, (_, i) => addDaysKey(cal.todayKey, i)),
        cal.tz,
      ),
    [visibleUpcoming, cal.todayKey, cal.tz],
  );

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <Card className="min-w-0 gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3 border-b border-dashed p-3 sm:p-4">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" asChild>
              <Link href={href(view, cal.todayKey)}>{c.today}</Link>
            </Button>
            <Button variant="ghost" size="icon-sm" asChild>
              <Link href={href(view, prev)} aria-label={c.prevPeriod} title={c.prevPeriod}>
                <ChevronLeftIcon className="rtl:rotate-180" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon-sm" asChild>
              <Link href={href(view, next)} aria-label={c.nextPeriod} title={c.nextPeriod}>
                <ChevronRightIcon className="rtl:rotate-180" />
              </Link>
            </Button>
          </div>
          <h2 className="min-w-0 truncate text-base font-extrabold sm:text-lg" aria-live="polite">
            {title}
          </h2>
          <nav
            aria-label={c.view}
            className="inline-flex h-9 w-full items-center gap-1 rounded-xl bg-muted p-1 sm:ms-auto sm:w-auto"
          >
            {calendarViews.map((v) => (
              <Link
                key={v}
                href={href(v, anchor)}
                aria-current={v === view ? "page" : undefined}
                className={cn(
                  "inline-flex h-full flex-1 items-center justify-center rounded-lg px-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground sm:flex-none",
                  v === view && "bg-background text-foreground shadow-card dark:bg-card",
                )}
              >
                {c[`view_${v}`]}
              </Link>
            ))}
          </nav>
        </div>

        <div
          role="group"
          aria-label={c.sources}
          className="flex flex-wrap items-center gap-1.5 border-b border-dashed px-3 py-2.5 sm:px-4"
        >
          {sources.map((s) => {
            const on = !hidden.has(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(s)}
                className={cn(
                  "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  on
                    ? "border-transparent bg-muted text-foreground hover:bg-muted/70"
                    : "border-dashed border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn("size-2 rounded-full transition-opacity", !on && "opacity-30")}
                  style={{ backgroundColor: sourceMeta[s].color }}
                />
                <span className={cn(!on && "line-through decoration-1")}>{c[`source_${s}`]}</span>
              </button>
            );
          })}
        </div>

        {view === "month" ? (
          <MonthView anchor={anchor} items={visible} dayHref={dayHref} />
        ) : view === "agenda" ? (
          <AgendaView days={days} items={visible} dayHref={dayHref} />
        ) : (
          <TimeGridView days={days} items={visible} dayHref={dayHref} />
        )}
      </Card>

      <aside className="hidden flex-col gap-6 xl:flex">
        <Card className="gap-0 p-4">
          <MiniMonth anchor={anchor} selected={selected} marked={marked} dayHref={dayHref} />
        </Card>
        <Card className="gap-3 py-4">
          <div className="flex items-center justify-between px-4">
            <h2 className="font-bold">{c.upcomingTitle}</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={c.newEvent}
              onClick={() => cal.openCreate()}
            >
              <PlusIcon />
            </Button>
          </div>
          {upcomingDays.length === 0 ? (
            <p className="px-4 pb-2 text-sm text-muted-foreground">{c.upcomingEmpty}</p>
          ) : (
            <div className="space-y-3 px-2">
              {upcomingDays.map((g) => (
                <section key={g.key} aria-label={dateLabel(g.key, cal.locale)}>
                  <h3 className="px-2 pb-1 text-xs font-bold text-muted-foreground">
                    {g.key === cal.todayKey
                      ? t.common.today
                      : g.key === addDaysKey(cal.todayKey, 1)
                        ? t.common.tomorrow
                        : dateLabel(g.key, cal.locale, { year: false })}
                  </h3>
                  <ul className="space-y-0.5">
                    {g.items.map((item) => (
                      <AgendaRow key={item.key} item={item} dayStart={g.start} compact />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Card>
        <p className="px-2 text-[11px] leading-5 text-muted-foreground">{c.shortcuts}</p>
      </aside>
    </div>
  );
}
