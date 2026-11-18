"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FrameBox, FrameCell, FrameGrid, HEADING_CLASS } from "@/components/shell/frame";
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
import { DotsFiller } from "./dots-filler";
import { ItemDetails } from "./item-popover";
import { MiniMonth } from "./mini-month";
import { MonthView } from "./month-view";
import { TimeGridView } from "./time-grid";

/** Remember switched-off sources (read by the page on the server → no flash). */
function persistHidden(list: CalendarSource[]) {
  document.cookie = `${HIDDEN_SOURCES_COOKIE}=${list.join(",")}; path=/; max-age=31536000; samesite=lax`;
}

const viewKeys: Record<string, View> = { KeyM: "month", KeyW: "week", KeyD: "day", KeyA: "agenda" };

/** The site's filter chip (components/site/ui.tsx `Chip`): 32px, 6px corners, hairline. */
const CHIP =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[6px] border px-3 text-[13px] font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * The calendar app as one framed box: the main cell (toolbar row, source
 * chips row, the month / week / day / agenda view) and, from xl, the side
 * cell (mini month, the next 7 days, shortcuts) sharing its hairline.
 */

export function CalendarView({
  view,
  anchor,
  days,
  items,
  upcoming,
  initialHidden,
  focusEventId = null,
}: {
  view: View;
  anchor: string;
  days: string[];
  items: CalendarItem[];
  upcoming: CalendarItem[];
  initialHidden: CalendarSource[];
  /** Event to open on load (`?event=<id>` deep link). */
  focusEventId?: string | null;
}) {
  const cal = useCalendar();
  const t = useT();
  const c = t.calendar;
  const router = useRouter();
  const pathname = usePathname();
  const [hidden, setHidden] = useState(() => new Set(initialHidden));
  const [focusDismissed, setFocusDismissed] = useState<string | null>(null);
  const focusItem = useMemo(
    () =>
      focusEventId && focusDismissed !== focusEventId
        ? (items.find((i) => i.type === "event" && i.id === focusEventId) ?? null)
        : null,
    [items, focusEventId, focusDismissed],
  );
  const closeFocus = () => {
    setFocusDismissed(focusEventId);
    // Drop ?event= so a refresh doesn't reopen it.
    router.replace(`${pathname}?view=${view}&date=${anchor}`, { scroll: false });
  };
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
    <FrameBox as="section" density="compact" ariaLabel={c.title}>
      <FrameGrid cols={1} className="xl:grid-cols-[minmax(0,1fr)_19rem]">
        <FrameCell pad="none" className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-3 border-b border-frame-line px-(--cell-pad) py-3">
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
            <h2 className={cn(HEADING_CLASS.box, "min-w-0 truncate")} aria-live="polite">
              {title}
            </h2>
            <nav
              aria-label={c.view}
              className="grid w-full grid-cols-4 gap-1.5 sm:ms-auto sm:flex sm:w-auto"
            >
              {calendarViews.map((v) => (
                <Link
                  key={v}
                  href={href(v, anchor)}
                  aria-current={v === view ? "page" : undefined}
                  className={cn(
                    CHIP,
                    v === view
                      ? "border-foreground bg-foreground text-background"
                      : "border-frame-line bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
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
            className="flex flex-wrap items-center gap-1.5 border-b border-frame-line px-(--cell-pad) py-2.5"
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
                    CHIP,
                    "h-7 cursor-pointer px-2.5 text-xs",
                    on
                      ? "border-frame-line bg-card text-foreground hover:border-foreground/40"
                      : "border-dashed border-frame-line bg-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn("size-2 transition-opacity", !on && "opacity-30")}
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
          <DotsFiller />
        </FrameCell>

        <FrameCell as="aside" pad="none" className="hidden flex-col xl:flex">
          <div className="border-b border-frame-line p-(--cell-pad)">
            <MiniMonth anchor={anchor} selected={selected} marked={marked} dayHref={dayHref} />
          </div>
          <section aria-labelledby="cal-upcoming">
            <div className="flex min-h-13 items-center justify-between gap-3 border-b border-frame-line ps-(--cell-pad) pe-3">
              <h2 id="cal-upcoming" className={HEADING_CLASS.box}>
                {c.upcomingTitle}
              </h2>
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
              <p className="p-(--cell-pad) text-sm text-muted-foreground">{c.upcomingEmpty}</p>
            ) : (
              <div className="max-h-[30rem] scrollbar-thin space-y-3 overflow-y-auto px-2 py-3">
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
          </section>
          <p className="border-t border-frame-line px-(--cell-pad) py-3 text-[11px] leading-5 text-muted-foreground">
            {c.shortcuts}
          </p>
          <DotsFiller />
        </FrameCell>
      </FrameGrid>

      <Dialog open={!!focusItem} onOpenChange={(o) => !o && closeFocus()}>
        <DialogContent className="max-w-[min(24rem,calc(100vw-1.5rem))] gap-0 p-0">
          <DialogTitle className="sr-only">{focusItem?.title}</DialogTitle>
          {focusItem && (
            <div className="pe-8">
              <ItemDetails item={focusItem} onClose={closeFocus} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </FrameBox>
  );
}
