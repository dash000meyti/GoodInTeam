import Link from "next/link";
import { CalendarDaysIcon, MapPinIcon, RepeatIcon, VideoIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dayKeyOf } from "@/components/calendar/grid";
import {
  dayNumber,
  monthName,
  rruleSummary,
  timeRangeLabel,
  weekdayName,
} from "@/components/calendar/format";
import { ItemIcon } from "@/components/calendar/kinds";
import type { CalendarItem } from "@/components/calendar/types";
import { cn } from "@/lib/utils";
import { isStaff } from "@/server/auth/actor";
import { listProjectEvents } from "@/server/modules/calendar/service";
import type { PanelContext } from "@/server/page-context";
import { statusLabel } from "./labels";

/**
 * Upcoming and recent events of a project (meetings, commitments, deadlines…).
 * Server component — drop it into the project page:
 *
 *   <ProjectEventsPanel projectId={project.id} ctx={ctx} clientView={isClient} />
 *
 * `clientView` (forced for client users) lists only `visibleToClient` events and
 * hides private fields (description, attendees, reminders).
 */
export async function ProjectEventsPanel({
  projectId,
  ctx,
  clientView = false,
  limit = 6,
}: {
  projectId: string;
  ctx: PanelContext;
  clientView?: boolean;
  limit?: number;
}) {
  const { t, href, actor } = ctx;
  const c = t.calendar;
  const asClient = clientView || !isStaff(actor);
  const { upcoming, past } = listProjectEvents(actor, projectId, {
    clientView: asClient,
    now: ctx.now,
    limit,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDaysIcon className="size-5 text-primary" /> {c.projectEvents}
        </CardTitle>
        {!asClient && (
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link href={href("/panel/calendar?view=agenda")}>{c.openCalendar}</Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {upcoming.length === 0 && past.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{c.noProjectEvents}</p>
        ) : (
          <>
            <EventList title={c.upcomingEvents} items={upcoming} ctx={ctx} showJoin />
            <EventList title={c.pastEvents} items={past} ctx={ctx} muted />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EventList({
  title,
  items,
  ctx,
  showJoin,
  muted,
}: {
  title: string;
  items: CalendarItem[];
  ctx: PanelContext;
  showJoin?: boolean;
  muted?: boolean;
}) {
  const { t, locale, tz } = ctx;
  const c = t.calendar;
  if (!items.length) return null;
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <ul className="divide-y divide-dashed">
        {items.map((item) => {
          const ev = item.event!;
          const key = dayKeyOf(item.start, tz);
          const isCommitment = ev.kind === "commitment";
          return (
            <li
              key={item.key}
              className={cn("flex items-center gap-3 py-3", muted && "opacity-75")}
            >
              <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-muted/60 py-1.5 text-center">
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {weekdayName(key, locale, "short")}
                </span>
                <span className="text-lg leading-6 font-extrabold tabular-nums">
                  {dayNumber(key, locale)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {monthName(key, locale, "short")}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-semibold">
                  <ItemIcon
                    item={item}
                    className="size-3.5 shrink-0"
                    style={{ color: item.color }}
                  />
                  <span dir="auto" className="truncate">
                    {item.title}
                  </span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {item.allDay ? c.allDay : timeRangeLabel(item.start, item.end, tz, locale)}
                  </span>
                  <span>· {c[`kind_${ev.kind}`]}</span>
                  {ev.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon className="size-3" /> {ev.location}
                    </span>
                  )}
                  {ev.recurrence && (
                    <span className="inline-flex items-center gap-1">
                      <RepeatIcon className="size-3" /> {rruleSummary(ev.recurrence, c, locale, tz)}
                    </span>
                  )}
                </p>
              </div>
              {(isCommitment || ev.status !== "confirmed") && (
                <Badge
                  variant={
                    ev.status === "done"
                      ? "success"
                      : ev.status === "missed"
                        ? "destructive"
                        : ev.status === "canceled"
                          ? "neutral"
                          : "warning"
                  }
                >
                  {statusLabel(ev.kind, ev.status, c)}
                </Badge>
              )}
              {showJoin && ev.meetingUrl && (
                <Button asChild size="sm" variant="soft">
                  <a href={ev.meetingUrl} target="_blank" rel="noopener noreferrer">
                    <VideoIcon /> <span className="hidden sm:inline">{c.join}</span>
                  </a>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
