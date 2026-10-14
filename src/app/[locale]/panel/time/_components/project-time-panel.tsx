import "server-only";
import Link from "next/link";
import { ClockIcon, CoinsIcon, TimerIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/panel/empty-state";
import { StatCard } from "@/components/panel/stat-card";
import { PulseDot } from "@/components/time/pulse-dot";
import { format } from "@/i18n/format-message";
import { formatDuration, formatHours, formatPercent, formatTime } from "@/lib/format";
import { formatDayLabel } from "@/lib/day-label";
import { formatMoney } from "@/lib/money";
import { weekStartFor } from "@/lib/tz";
import { isAdmin, isStaff } from "@/server/auth/actor";
import { AppError } from "@/server/errors";
import { projectTimeSummary } from "@/server/modules/time/service";
import type { PanelContext } from "@/server/page-context";
import { dayParts } from "../_lib/views";
import { WeeklyHoursChart } from "./report-charts";

const H = 3_600_000;

/**
 * Time on one project: KPIs, hours per week (last 12 weeks) and recent entries.
 * For the project detail page (staff) and the client portal (`clientView`:
 * no rates/earnings/user names; renders nothing unless the project shares time).
 */
export async function ProjectTimePanel({
  projectId,
  ctx,
  clientView = false,
}: {
  projectId: string;
  ctx: PanelContext;
  clientView?: boolean;
}) {
  const { actor, t, locale, fmt, href } = ctx;
  const tt = t.time;
  const data = await projectTimeSummary(actor, projectId, {
    weeks: 12,
    weekStartsOn: weekStartFor(locale),
  }).catch((e) => {
    if (e instanceof AppError && (e.code === "forbidden" || e.code === "not_found")) return null;
    throw e;
  });
  if (!data) return null;
  const showMoney = !clientView && isAdmin(actor);
  const showUsers = !clientView && isStaff(actor);
  const billablePct = data.totalMs ? (data.billableMs / data.totalMs) * 100 : 0;
  const thisWeek = data.weeks.at(-1)?.ms ?? 0;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={tt.trackedTotal}
          value={<span className="font-mono">{formatDuration(data.totalMs, locale)}</span>}
          hint={`${formatHours(data.totalMs, locale)} ${tt.hoursUnit}`}
          icon={ClockIcon}
          tone="info"
        />
        <StatCard
          label={tt.weekTotal}
          value={<span className="font-mono">{formatDuration(thisWeek, locale)}</span>}
          icon={TimerIcon}
        />
        <StatCard
          label={tt.billablePct}
          value={formatPercent(billablePct, locale)}
          hint={format(tt.billableOf, { h: formatHours(data.billableMs, locale) })}
          icon={CoinsIcon}
          tone="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{tt.weeklyHours}</CardTitle>
            <CardDescription>
              {format(tt.weekRange, {
                from: formatDayLabel(data.weeks[0]!.weekStart, { ...fmt, withYear: true }),
                to: formatDayLabel(data.weeks.at(-1)!.weekStart, { ...fmt, withYear: true }),
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WeeklyHoursChart
              label={tt.hoursCol}
              data={data.weeks.map((w) => ({
                label: dayParts(w.weekStart, ctx).label,
                hours: Math.round((w.ms / H) * 100) / 100,
                billable: Math.round((w.billableMs / H) * 100) / 100,
              }))}
            />
          </CardContent>
        </Card>

        <Card className="gap-0 lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle>{tt.recentEntries}</CardTitle>
            {!clientView && isStaff(actor) && (
              <CardAction>
                <Button asChild variant="ghost" size="sm">
                  <Link href={href("/panel/time")}>{t.common.viewAll}</Link>
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            {data.recent.length === 0 ? (
              <EmptyState icon={TimerIcon} title={tt.noEntries} className="py-8" />
            ) : (
              <ul className="divide-y divide-dashed">
                {data.recent.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        <bdi>{e.description || e.task?.title || tt.noDescription}</bdi>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDayLabel(e.startedAt, { ...fmt, short: true })} ·{" "}
                        {formatTime(e.startedAt, fmt)}
                        {showUsers && e.user ? ` · ${e.user.name}` : ""}
                      </p>
                    </div>
                    {showMoney && e.earnedMinor && e.currency ? (
                      <Badge variant="success" className="hidden sm:inline-flex">
                        {formatMoney(e.earnedMinor, e.currency, locale, { compact: true })}
                      </Badge>
                    ) : null}
                    <span className="flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums">
                      {!e.endedAt && <PulseDot className="size-2" />}
                      {formatDuration(e.durationMs, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
