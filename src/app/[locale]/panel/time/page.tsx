import Link from "next/link";
import {
  BarChart3Icon,
  CalendarCheckIcon,
  CalendarRangeIcon,
  ChevronDownIcon,
  ClockIcon,
  CoinsIcon,
  TimerIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { StatCard } from "@/components/panel/stat-card";
import { format } from "@/i18n/format-message";
import { formatDuration, formatHours, formatNumber, formatPercent, formatTime } from "@/lib/format";
import { addDays, startOfDay, startOfWeek, toDateInputValue, weekStartFor } from "@/lib/tz";
import { isAdmin } from "@/server/auth/actor";
import { taskPickerOptions } from "@/server/modules/tasks/service";
import { LONG_RUNNING_MS } from "@/server/modules/time/calc";
import {
  hasEntriesBefore,
  listEntries,
  listRunning,
  resolveUserScope,
  timeProjectOptions,
  timeReport,
  timeUserOptions,
  trackedMs,
} from "@/server/modules/time/service";
import { panelContext } from "@/server/page-context";
import { EntryRow } from "./_components/entry-row";
import { ParamSelect } from "./_components/param-select";
import { RunningTimers, type RunningView } from "./_components/running-timers";
import { StartTimerBar } from "./_components/start-timer-bar";
import { AddTimeButton, TimeUIProvider } from "./_components/time-ui";
import { dayLabel, entryValues, moneyText, param, toRowView, withParams } from "./_lib/views";

export default async function TimePage({ searchParams }: PageProps<"/[locale]/panel/time">) {
  const ctx = await panelContext({ roles: ["owner", "admin", "member"] });
  const { actor, t, href, locale, tz, now, fmt } = ctx;
  const tt = t.time;
  const sp = await searchParams;
  const userParam = param(sp, "user");
  const weeks = Math.min(Math.max(Number(param(sp, "weeks") ?? 1) || 1, 1), 26);
  const scope = resolveUserScope(actor, userParam);
  const self = scope === actor.user.id;
  const admin = isAdmin(actor);

  const weekStart = startOfWeek(now, tz, weekStartFor(locale));
  const weekEnd = addDays(weekStart, 7, tz);
  const from = addDays(weekStart, -7 * (weeks - 1), tz);
  const today = startOfDay(now, tz);
  const todayKey = toDateInputValue(now, tz);

  const [entries, running] = await Promise.all([
    listEntries(actor, { fromDate: from, userId: userParam, limit: 2000 }),
    self ? listRunning(actor) : Promise.resolve([]),
  ]);
  const hasMore = hasEntriesBefore(actor, from, userParam);
  const week = timeReport(actor, { from: weekStart, to: weekEnd, userId: userParam });
  const todayMs = trackedMs(actor, today, addDays(today, 1, tz), userParam).ms;
  const projects = timeProjectOptions(actor);
  const tasks = taskPickerOptions(actor);
  const users = timeUserOptions(actor);

  const runningViews: RunningView[] = running.map((e) => ({
    id: e.id,
    description: e.description,
    projectId: e.projectId,
    project: e.project ? { name: e.project.name, color: e.project.color } : null,
    task: e.task ? { title: e.task.title } : null,
    billable: e.billable,
    startedAt: e.startedAt.getTime(),
    startLabel: formatTime(e.startedAt, fmt),
    long: now - e.startedAt.getTime() > LONG_RUNNING_MS,
    values: entryValues(e, tz),
  }));

  // Timeline: running timers of the viewer are shown as cards above instead.
  const timeline = entries.filter((e) => !(self && !e.endedAt));
  const days = new Map<string, typeof timeline>();
  for (const e of timeline) {
    const key = toDateInputValue(e.startedAt, tz);
    days.set(key, [...(days.get(key) ?? []), e]);
  }

  const entryParam = param(sp, "entry");
  const focus = entryParam
    ? (running.find((e) => e.id === entryParam) ?? entries.find((e) => e.id === entryParam))
    : undefined;

  const baseParams = { user: userParam, weeks: weeks > 1 ? String(weeks) : undefined };
  const billablePct = week.totalMs ? (week.billableMs / week.totalMs) * 100 : 0;

  return (
    <TimeUIProvider
      projects={projects}
      tasks={tasks}
      tz={tz}
      todayKey={todayKey}
      initialEdit={focus ? entryValues(focus, tz) : null}
    >
      <PageHeader
        title={tt.title}
        description={tt.subtitle}
        crumbs={[{ label: t.nav.dashboard, href: href("/panel") }, { label: tt.title }]}
        actions={
          <>
            {admin && users.length > 1 && (
              <ParamSelect
                base={href("/panel/time")}
                params={baseParams}
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
            <Button asChild variant="outline">
              <Link href={href("/panel/time/timesheet")}>
                <CalendarRangeIcon /> {tt.timesheet}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={href("/panel/time/reports")}>
                <BarChart3Icon /> {tt.reports}
              </Link>
            </Button>
            {self && <AddTimeButton />}
          </>
        }
      />

      <div className="space-y-6">
        {self && <StartTimerBar projects={projects} tasks={tasks} />}
        {self && <RunningTimers timers={runningViews} projects={projects} serverNow={now} />}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={tt.todayTotal}
            value={<span className="font-mono">{formatDuration(todayMs, locale)}</span>}
            hint={`${formatHours(todayMs, locale)} ${tt.hoursUnit}`}
            icon={ClockIcon}
          />
          <StatCard
            label={tt.weekTotal}
            value={<span className="font-mono">{formatDuration(week.totalMs, locale)}</span>}
            hint={`${formatHours(week.totalMs, locale)} ${tt.hoursUnit}`}
            icon={CalendarCheckIcon}
            tone="info"
          />
          <StatCard
            label={tt.billableWeek}
            value={formatPercent(billablePct, locale)}
            hint={format(tt.billableOf, { h: formatHours(week.billableMs, locale) })}
            icon={CoinsIcon}
            tone="success"
          />
          {admin ? (
            <StatCard
              label={tt.earnedWeek}
              value={<span className="text-xl">{moneyText(week.earned, locale)}</span>}
              icon={TimerIcon}
              tone="violet"
            />
          ) : (
            <StatCard
              label={tt.avgPerDay}
              value={
                <span className="font-mono">
                  {formatDuration(week.activeDays ? week.totalMs / week.activeDays : 0, locale)}
                </span>
              }
              hint={format(tt.avgPerDayHint, { n: formatNumber(week.activeDays, locale) })}
              icon={TimerIcon}
              tone="violet"
            />
          )}
        </div>

        {days.size === 0 ? (
          <EmptyState
            icon={TimerIcon}
            title={tt.noEntries}
            description={tt.noEntriesHint}
            action={self ? <AddTimeButton variant="soft" /> : undefined}
          />
        ) : (
          <div className="space-y-5">
            {[...days.entries()].map(([key, list]) => {
              const label = dayLabel(key, ctx);
              const total = list.reduce((s, e) => s + e.durationMs, 0);
              return (
                <Card key={key} className="gap-0 overflow-hidden py-0">
                  <div className="flex items-center justify-between gap-3 border-b border-dashed bg-muted/30 px-4 py-3 sm:px-6">
                    <div className="min-w-0">
                      <h2 className="truncate font-bold">{label.title}</h2>
                      {label.subtitle && (
                        <p className="text-xs text-muted-foreground">{label.subtitle}</p>
                      )}
                    </div>
                    <div className="text-end">
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        {tt.dayTotal}
                      </p>
                      <p className="font-mono text-base font-black tabular-nums">
                        {formatDuration(total, locale)}
                      </p>
                    </div>
                  </div>
                  <ul className="divide-y divide-dashed">
                    {list.map((e) => (
                      <EntryRow key={e.id} entry={toRowView(e, ctx, !self)} serverNow={now} />
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center">
            <Button asChild variant="outline">
              <Link
                href={withParams(href("/panel/time"), {
                  ...baseParams,
                  weeks: String(weeks + 1),
                })}
                scroll={false}
              >
                <ChevronDownIcon /> {tt.loadMore}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </TimeUIProvider>
  );
}
