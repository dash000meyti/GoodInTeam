import Link from "next/link";
import { CalendarRangeIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/panel/page-header";
import { format } from "@/i18n/format-message";
import { formatDate, formatDuration, formatHours } from "@/lib/format";
import { addDays, fromDateInput, startOfWeek, toDateInputValue, weekStartFor } from "@/lib/tz";
import { isAdmin } from "@/server/auth/actor";
import { taskPickerOptions } from "@/server/modules/tasks/service";
import {
  resolveUserScope,
  timeProjectOptions,
  timesheet,
  timeUserOptions,
} from "@/server/modules/time/service";
import { panelContext } from "@/server/page-context";
import { ParamSelect } from "../_components/param-select";
import { AddTimeButton, TimeUIProvider } from "../_components/time-ui";
import { TimesheetGrid } from "../_components/timesheet-grid";
import { dayParts, param, withParams } from "../_lib/views";

export default async function TimesheetPage({
  searchParams,
}: PageProps<"/[locale]/panel/time/timesheet">) {
  const ctx = await panelContext({ roles: ["owner", "admin", "member"] });
  const { actor, t, href, locale, tz, now, fmt } = ctx;
  const tt = t.time;
  const sp = await searchParams;
  const userParam = param(sp, "user");
  const weekParam = param(sp, "week");
  const self = resolveUserScope(actor, userParam) === actor.user.id;

  const anchor =
    weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
      ? fromDateInput(weekParam, "12:00", tz)
      : new Date(now);
  const weekStart = startOfWeek(anchor, tz, weekStartFor(locale));
  const currentWeek = startOfWeek(now, tz, weekStartFor(locale));
  const isCurrent = weekStart.getTime() === currentWeek.getTime();
  const sheet = timesheet(actor, { weekStart, userId: userParam });
  const todayKey = toDateInputValue(now, tz);
  const users = timeUserOptions(actor);

  const link = (week: Date | null) =>
    withParams(href("/panel/time/timesheet"), {
      user: userParam,
      week: week ? toDateInputValue(week, tz) : undefined,
    });
  const Prev = locale === "fa" ? ChevronRightIcon : ChevronLeftIcon;
  const Next = locale === "fa" ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <TimeUIProvider
      projects={timeProjectOptions(actor)}
      tasks={taskPickerOptions(actor)}
      tz={tz}
      todayKey={todayKey}
    >
      <PageHeader
        title={tt.timesheet}
        description={format(tt.weekRange, {
          from: formatDate(sheet.days[0], fmt),
          to: formatDate(sheet.days[6], fmt),
        })}
        crumbs={[{ label: tt.title, href: href("/panel/time") }, { label: tt.timesheet }]}
        actions={
          <>
            {isAdmin(actor) && users.length > 1 && (
              <ParamSelect
                base={href("/panel/time/timesheet")}
                params={{ week: weekParam }}
                param="user"
                value={userParam ?? ""}
                noneLabel={tt.myTime}
                ariaLabel={tt.whose}
                className="w-40"
                options={[
                  { value: "all", label: tt.everyone },
                  ...users
                    .filter((u) => u.id !== actor.user.id)
                    .map((u) => ({ value: u.id, label: u.name })),
                ]}
              />
            )}
            <div className="flex items-center rounded-lg border border-input">
              <Button asChild variant="ghost" size="icon" className="rounded-e-none">
                <Link href={link(addDays(weekStart, -7, tz))} aria-label={tt.prevWeek}>
                  <Prev />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="rounded-none border-x border-input px-3 aria-[current=page]:text-primary"
              >
                <Link href={link(null)} aria-current={isCurrent ? "page" : undefined}>
                  {tt.currentWeek}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" className="rounded-s-none">
                <Link href={link(addDays(weekStart, 7, tz))} aria-label={tt.nextWeek}>
                  <Next />
                </Link>
              </Button>
            </div>
            {self && <AddTimeButton />}
          </>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-info/12 text-info">
              <CalendarRangeIcon className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">{tt.weekTotal}</p>
              <p className="font-mono text-xl font-black tabular-nums">
                {formatDuration(sheet.totalMs, locale)}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(tt.billableOf, { h: formatHours(sheet.billableMs, locale) })}
          </p>
        </div>
        <TimesheetGrid
          editable={self}
          days={sheet.days.map((d, i) => ({
            key: sheet.dayKeys[i]!,
            today: sheet.dayKeys[i] === todayKey,
            ...dayParts(d, ctx),
          }))}
          rows={sheet.rows.map((r) => ({
            projectId: r.projectId,
            name: r.name,
            color: r.color,
            cells: r.cells.map((ms) => ({ ms, label: ms ? formatDuration(ms, locale) : "" })),
            total: formatDuration(r.totalMs, locale),
          }))}
          dayTotals={sheet.dayTotals.map((ms) => (ms ? formatDuration(ms, locale) : "—"))}
          total={formatDuration(sheet.totalMs, locale)}
        />
        {sheet.rows.length === 0 && (
          <div className="border-t border-dashed px-6 py-8 text-center">
            <p className="font-bold">{tt.emptyWeek}</p>
            {self && <p className="mt-1 text-sm text-muted-foreground">{tt.emptyWeekHint}</p>}
          </div>
        )}
      </Card>
    </TimeUIProvider>
  );
}
