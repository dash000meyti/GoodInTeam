import { Fragment } from "react";
import {
  BarChart3Icon,
  CalendarDaysIcon,
  ClockIcon,
  CoinsIcon,
  DownloadIcon,
  PieChartIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ColorDot } from "@/components/shared/color-dot";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { StatCard } from "@/components/panel/stat-card";
import { format } from "@/i18n/format-message";
import { formatDate, formatDuration, formatHours, formatNumber, formatPercent } from "@/lib/format";
import { startOfWeek, toDateInputValue, weekStartFor } from "@/lib/tz";
import { isAdmin } from "@/server/auth/actor";
import { resolveRange } from "@/server/modules/time/ranges";
import { timeProjectOptions, timeReport, timeUserOptions } from "@/server/modules/time/service";
import { panelContext } from "@/server/page-context";
import { ParamSelect } from "../_components/param-select";
import { ProjectDonut, StackedHoursChart, type ChartBucket } from "../_components/report-charts";
import { ReportFilters } from "../_components/report-filters";
import { dayParts, moneyText, param, withParams } from "../_lib/views";

const H = 3_600_000;
const NONE_COLOR = "#919EAB";

export default async function TimeReportsPage({
  searchParams,
}: PageProps<"/[locale]/panel/time/reports">) {
  const ctx = await panelContext({ roles: ["owner", "admin", "member"] });
  const { actor, t, href, locale, tz, now, fmt } = ctx;
  const tt = t.time;
  const sp = await searchParams;
  const userParam = param(sp, "user");
  const projectParam = param(sp, "project");
  const range = resolveRange(
    { preset: param(sp, "range"), from: param(sp, "from"), to: param(sp, "to") },
    { now, tz, locale },
  );
  const admin = isAdmin(actor);
  const report = timeReport(actor, {
    from: range.from,
    to: range.to,
    userId: userParam,
    projectId: projectParam,
  });
  const projects = timeProjectOptions(actor);
  const users = timeUserOptions(actor);

  // ── Chart data ──
  const series = report.projects.map((p) => ({
    key: `p_${p.projectId ?? "none"}`,
    id: p.projectId ?? "_none",
    name: p.name ?? t.common.noProject,
    color: p.color ?? NONE_COLOR,
  }));
  const daily = report.days.length <= 62;
  const buckets = new Map<string, ChartBucket>();
  for (const d of report.days) {
    const bucketDate = daily ? d.date : startOfWeek(d.date, tz, weekStartFor(locale));
    const key = toDateInputValue(bucketDate, tz);
    let b = buckets.get(key);
    if (!b) {
      const parts = dayParts(bucketDate, ctx);
      b = { label: daily && report.days.length <= 7 ? parts.weekday : parts.label };
      for (const s of series) b[s.key] = 0;
      buckets.set(key, b);
    }
    for (const s of series) b[s.key] = (b[s.key] as number) + (d.byProject[s.id] ?? 0) / H;
  }
  const chartData = [...buckets.values()].map((b) => {
    const out: ChartBucket = { label: b.label };
    for (const s of series) out[s.key] = Math.round((b[s.key] as number) * 100) / 100;
    return out;
  });

  const billablePct = report.totalMs ? (report.billableMs / report.totalMs) * 100 : 0;
  const avg = report.activeDays ? report.totalMs / report.activeDays : 0;
  const keep = { user: userParam, project: projectParam };
  const rangeParams = {
    range: range.preset === "this_week" ? undefined : range.preset,
    from: range.preset === "custom" ? range.fromKey : undefined,
    to: range.preset === "custom" ? range.toKey : undefined,
  };
  const exportHref = withParams("/api/time/export", {
    from: range.fromKey,
    to: range.toKey,
    user: userParam,
    project: projectParam,
  });

  return (
    <>
      <PageHeader
        title={tt.reports}
        description={format(tt.weekRange, {
          from: formatDate(range.from, fmt),
          to: formatDate(new Date(range.to.getTime() - 1), fmt),
        })}
        crumbs={[{ label: tt.title, href: href("/panel/time") }, { label: tt.reports }]}
        actions={
          <Button asChild variant="outline">
            <a href={exportHref} download>
              <DownloadIcon /> {tt.exportCsv}
            </a>
          </Button>
        }
      />

      <Card className="mb-6 gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <ReportFilters
            base={href("/panel/time/reports")}
            params={keep}
            preset={range.preset}
            fromKey={range.fromKey}
            toKey={range.toKey}
          />
          <div className="flex flex-wrap gap-3">
            <ParamSelect
              base={href("/panel/time/reports")}
              params={{ ...rangeParams, ...keep }}
              param="project"
              value={projectParam ?? ""}
              noneLabel={tt.allProjects}
              placeholder={tt.allProjects}
              className="w-48"
              options={projects.map((p) => ({
                value: p.id,
                label: p.name,
                icon: <ColorDot color={p.color} />,
              }))}
            />
            {admin && users.length > 1 && (
              <ParamSelect
                base={href("/panel/time/reports")}
                params={{ ...rangeParams, ...keep }}
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
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={tt.totalHours}
          value={<span className="font-mono">{formatDuration(report.totalMs, locale)}</span>}
          hint={`${formatHours(report.totalMs, locale)} ${tt.hoursUnit}`}
          icon={ClockIcon}
        />
        <StatCard
          label={tt.billablePct}
          value={formatPercent(billablePct, locale)}
          hint={format(tt.billableOf, { h: formatHours(report.billableMs, locale) })}
          icon={CoinsIcon}
          tone="success"
        />
        {admin ? (
          <StatCard
            label={tt.earned}
            value={<span className="text-xl">{moneyText(report.earned, locale)}</span>}
            icon={TrendingUpIcon}
            tone="violet"
          />
        ) : (
          <StatCard
            label={tt.byProject}
            value={formatNumber(report.projects.length, locale)}
            icon={PieChartIcon}
            tone="violet"
          />
        )}
        <StatCard
          label={tt.avgPerDay}
          value={<span className="font-mono">{formatDuration(avg, locale)}</span>}
          hint={format(tt.avgPerDayHint, { n: formatNumber(report.activeDays, locale) })}
          icon={CalendarDaysIcon}
          tone="info"
        />
      </div>

      {report.totalMs === 0 ? (
        <EmptyState
          className="mt-6"
          icon={BarChart3Icon}
          title={tt.noData}
          description={tt.noDataHint}
        />
      ) : (
        <>
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>{daily ? tt.dailyHours : tt.weeklyBuckets}</CardTitle>
                <CardDescription>
                  {formatHours(report.totalMs, locale)} {tt.hoursUnit}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StackedHoursChart data={chartData} series={series} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{tt.byProject}</CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectDonut
                  totalLabel={formatDuration(report.totalMs, locale)}
                  items={series.map((s, i) => ({
                    key: s.key,
                    name: s.name,
                    color: s.color,
                    hours: report.projects[i]!.ms / H,
                  }))}
                />
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 gap-0 overflow-hidden py-0">
            <CardHeader className="border-b border-dashed py-5">
              <CardTitle>{tt.breakdown}</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">
                    {t.common.project} / {tt.task}
                  </TableHead>
                  <TableHead className="text-end">{tt.hoursCol}</TableHead>
                  <TableHead className="hidden text-end sm:table-cell">{tt.billableCol}</TableHead>
                  {admin && <TableHead className="text-end">{tt.earned}</TableHead>}
                  <TableHead className="hidden w-40 pe-6 md:table-cell" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.projects.map((p) => {
                  const pct = (p.ms / report.totalMs) * 100;
                  return (
                    <Fragment key={p.projectId ?? "_none"}>
                      <TableRow className="bg-muted/30 font-semibold">
                        <TableCell className="ps-6">
                          <span className="flex items-center gap-2">
                            <ColorDot color={p.color ?? NONE_COLOR} />
                            <span className="truncate">{p.name ?? t.common.noProject}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-end font-mono tabular-nums">
                          {formatDuration(p.ms, locale)}
                        </TableCell>
                        <TableCell className="hidden text-end font-mono tabular-nums sm:table-cell">
                          {formatDuration(p.billableMs, locale)}
                        </TableCell>
                        {admin && (
                          <TableCell className="text-end text-xs">
                            {moneyText(p.earned, locale)}
                          </TableCell>
                        )}
                        <TableCell className="hidden pe-6 md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: p.color ?? NONE_COLOR,
                                }}
                              />
                            </div>
                            <span className="w-9 text-end text-xs tabular-nums">
                              {formatPercent(pct, locale)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {p.tasks.map((task) => (
                        <TableRow
                          key={`${p.projectId ?? "_none"}-${task.taskId ?? "_none"}`}
                          className="text-muted-foreground"
                        >
                          <TableCell className="ps-12">
                            <span className="block max-w-[16rem] truncate sm:max-w-md">
                              {task.title ?? tt.noTask}
                            </span>
                          </TableCell>
                          <TableCell className="text-end font-mono tabular-nums">
                            {formatDuration(task.ms, locale)}
                          </TableCell>
                          <TableCell className="hidden text-end font-mono tabular-nums sm:table-cell">
                            {formatDuration(task.billableMs, locale)}
                          </TableCell>
                          {admin && (
                            <TableCell className="text-end text-xs">
                              {moneyText(task.earned, locale)}
                            </TableCell>
                          )}
                          <TableCell className="hidden md:table-cell" />
                        </TableRow>
                      ))}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
