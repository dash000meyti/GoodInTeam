import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { HandshakeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/panel/page-header";
import {
  addDaysKey,
  dayKeyOf,
  dayStartMs,
  isDayKey,
  parseView,
  viewRange,
} from "@/components/calendar/grid";
import {
  calendarSources,
  HIDDEN_SOURCES_COOKIE,
  type CalendarSource,
} from "@/components/calendar/types";
import { getT } from "@/i18n/server";
import { calendarFor, weekStartFor } from "@/lib/tz";
import { isAdmin } from "@/server/auth/actor";
import { listCalendarItems } from "@/server/modules/calendar/service";
import { clientOptions } from "@/server/modules/clients/service";
import { projectOptions } from "@/server/modules/projects/service";
import { panelContext } from "@/server/page-context";
import { CalendarProvider } from "./_components/calendar-context";
import { CalendarView } from "./_components/calendar-view";
import { NewEventButton, SubscribeDialog } from "./_components/header-actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).calendar.title };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function parseHidden(value: string | undefined): CalendarSource[] {
  if (!value) return [];
  const known = new Set<string>(calendarSources);
  return value.split(",").filter((s): s is CalendarSource => known.has(s));
}

export default async function CalendarPage({
  searchParams,
}: PageProps<"/[locale]/panel/calendar">) {
  const ctx = await panelContext({ roles: ["owner", "admin", "member"] });
  const { actor, t, tz, locale, now, href } = ctx;
  const c = t.calendar;
  const sp = await searchParams;
  const view = parseView(first(sp.view));
  const todayKey = dayKeyOf(now, tz);
  const date = first(sp.date);
  const anchor = isDayKey(date) ? date : todayKey;
  const calendar = calendarFor(locale);
  const weekStartsOn = weekStartFor(locale);
  const range = viewRange(view, anchor, { tz, calendar, weekStartsOn });

  const items = listCalendarItems(actor, {
    from: dayStartMs(range.startKey, tz),
    to: dayStartMs(range.endKey, tz),
  });
  const upcoming = listCalendarItems(actor, {
    from: now,
    to: dayStartMs(addDaysKey(todayKey, 7), tz),
  });
  const hidden = parseHidden((await cookies()).get(HIDDEN_SOURCES_COOKIE)?.value);
  const admin = isAdmin(actor);

  return (
    <CalendarProvider
      tz={tz}
      calendar={calendar}
      weekStartsOn={weekStartsOn}
      locale={locale}
      todayKey={todayKey}
      now={now}
      isAdmin={admin}
      projects={projectOptions(actor)}
      clients={admin ? clientOptions(actor) : []}
    >
      <PageHeader
        title={c.title}
        description={c.subtitle}
        crumbs={[{ label: t.nav.dashboard, href: href("/panel") }, { label: c.title }]}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={href("/panel/calendar/commitments")}>
                <HandshakeIcon /> {c.commitments}
              </Link>
            </Button>
            <SubscribeDialog />
            <NewEventButton
              label={c.newEvent}
              prefill={{ date: range.days.includes(todayKey) ? todayKey : anchor }}
            />
          </>
        }
      />
      <CalendarView
        view={view}
        anchor={anchor}
        days={range.days}
        items={items}
        upcoming={upcoming}
        initialHidden={hidden}
      />
    </CalendarProvider>
  );
}
