import Link from "next/link";
import {
  CalendarDaysIcon,
  CalendarRangeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CoinsIcon,
  PieChartIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { StatCard, StatRow } from "@/components/panel/stat-card";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { format } from "@/i18n/format-message";
import { formatDate, formatDuration, formatHours, formatNumber, formatPercent } from "@/lib/format";
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

/**
 * Timesheet (framed): the page box carries the week's KPIs as its second row;
 * the project × day grid sits edge to edge in its own box, its cells square
 * and sharing hairlines.
 */
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
  const activeDays = sheet.dayTotals.filter((ms) => ms > 0).length;
  const billablePct = sheet.totalMs ? (sheet.billableMs / sheet.totalMs) * 100 : 0;
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
            <div className="flex items-center rounded-lg border border-frame-line bg-card">
              <Button asChild variant="ghost" size="icon" className="rounded-e-none">
                <Link href={link(addDays(weekStart, -7, tz))} aria-label={tt.prevWeek}>
                  <Prev />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="rounded-none border-x border-frame-line px-3 aria-[current=page]:text-primary-ink"
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
      >
        <StatRow>
          <StatCard
            label={tt.totalHours}
            value={<span className="font-mono">{formatDuration(sheet.totalMs, locale)}</span>}
            hint={`${formatHours(sheet.totalMs, locale)} ${tt.hoursUnit}`}
            icon={ClockIcon}
          />
          <StatCard
            label={tt.billablePct}
            value={formatPercent(billablePct, locale)}
            hint={format(tt.billableOf, { h: formatHours(sheet.billableMs, locale) })}
            icon={CoinsIcon}
            tone="success"
          />
          <StatCard
            label={tt.avgPerDay}
            value={
              <span className="font-mono">
                {formatDuration(activeDays ? sheet.totalMs / activeDays : 0, locale)}
              </span>
            }
            hint={format(tt.avgPerDayHint, { n: formatNumber(activeDays, locale) })}
            icon={CalendarDaysIcon}
            tone="info"
          />
          <StatCard
            label={tt.byProject}
            value={formatNumber(sheet.rows.length, locale)}
            icon={PieChartIcon}
            tone="violet"
          />
        </StatRow>
      </PageHeader>

      <FrameBox as="section" density="compact" ariaLabel={tt.timesheet}>
        <FrameGrid cols={1}>
          <FrameCell pad="none">
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
          </FrameCell>
        </FrameGrid>
        {sheet.rows.length === 0 && (
          <FrameGrid cols={1}>
            <FrameCell>
              <EmptyState
                icon={CalendarRangeIcon}
                title={tt.emptyWeek}
                description={self ? tt.emptyWeekHint : undefined}
                className="py-8"
              />
            </FrameCell>
          </FrameGrid>
        )}
      </FrameBox>
    </TimeUIProvider>
  );
}
