import Link from "next/link";
import {
  AlertTriangleIcon,
  CalendarClockIcon,
  CheckSquareIcon,
  ClockIcon,
  FileSignatureIcon,
  InboxIcon,
  PlayIcon,
  ReceiptIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ColorDot } from "@/components/shared/color-dot";
import { LiveDuration } from "@/components/shared/live-duration";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { StatCard } from "@/components/panel/stat-card";
import {
  formatDate,
  formatDateTime,
  formatHours,
  formatNumber,
  formatPercent,
  formatTime,
} from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { zonedParts } from "@/lib/tz";
import { isAdmin } from "@/server/auth/actor";
import { panelContext, type PanelContext } from "@/server/page-context";
import { staffDashboard } from "@/server/modules/dashboard/service";
import { ClientPortalHome } from "./portal-home";

export default async function DashboardPage() {
  const ctx = await panelContext();
  if (ctx.actor.user.role === "client") return <ClientPortalHome ctx={ctx} />;
  return <StaffDashboard ctx={ctx} />;
}

function greeting(ctx: PanelContext) {
  const h = zonedParts(ctx.now, ctx.tz).hour;
  if (h < 5) return ctx.t.panel.greetingNight;
  if (h < 12) return ctx.t.panel.greetingMorning;
  if (h < 17) return ctx.t.panel.greetingAfternoon;
  if (h < 21) return ctx.t.panel.greetingEvening;
  return ctx.t.panel.greetingNight;
}

async function StaffDashboard({ ctx }: { ctx: PanelContext }) {
  const { t, fmt, locale, actor, href } = ctx;
  const d = await staffDashboard(actor, { tz: ctx.tz, locale, now: ctx.now });
  const firstName = actor.user.name.split(" ")[0];
  const income = d.money.filter((m) => m.kind === "income");
  const expense = d.money.filter((m) => m.kind === "expense");
  const moneyText = (rows: { currency: string; total: number }[]) =>
    rows.length
      ? rows.map((r) => formatMoney(r.total, r.currency, locale, { compact: true })).join(" · ")
      : "—";

  return (
    <>
      <PageHeader
        title={`${greeting(ctx)}${locale === "fa" ? "،" : ","} ${firstName} 👋`}
        description={`${formatDate(ctx.now, fmt, "long")} — ${t.panel.dashboardSubtitle}`}
        actions={
          <Button asChild>
            <Link href={href("/panel/time")}>
              <PlayIcon /> {t.panel.startTimer}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.panel.todayHours}
          value={formatHours(d.todayMs, locale)}
          icon={ClockIcon}
        />
        <StatCard
          label={t.panel.weekHours}
          value={formatHours(d.weekMs, locale)}
          icon={CalendarClockIcon}
          tone="info"
        />
        <StatCard
          label={t.panel.openTasks}
          value={formatNumber(d.openTasks, locale)}
          hint={d.overdue ? `${formatNumber(d.overdue, locale)} ${t.panel.overdue}` : undefined}
          icon={CheckSquareIcon}
          tone="violet"
        />
        {isAdmin(actor) ? (
          <StatCard
            label={t.panel.monthIncome}
            value={moneyText(income)}
            hint={`${t.panel.monthExpense}: ${moneyText(expense)}`}
            icon={TrendingUpIcon}
            tone="success"
          />
        ) : (
          <StatCard
            label={t.panel.activeProjects}
            value={formatNumber(d.activeProjectCount, locale)}
            icon={TrendingDownIcon}
            tone="warning"
          />
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t.panel.runningTimers}</CardTitle>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href={href("/panel/time")}>{t.common.viewAll}</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {d.running.length === 0 ? (
              <EmptyState icon={ClockIcon} title={t.panel.noRunningTimers} className="py-10" />
            ) : (
              <ul className="divide-y divide-dashed">
                {d.running.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-3">
                    <span className="relative flex size-2.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {e.description || e.project?.name || t.common.noProject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.project?.name ?? t.common.noProject} · {formatTime(e.startedAt, fmt)}
                      </p>
                    </div>
                    <LiveDuration
                      since={e.startedAt.getTime()}
                      serverNow={ctx.now}
                      className="font-mono text-lg font-bold"
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.panel.dueToday}</CardTitle>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href={href("/panel/tasks")}>{t.common.viewAll}</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {d.dueToday.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.common.empty}</p>
            ) : (
              <ul className="space-y-3">
                {d.dueToday.map((task) => {
                  // All-day tasks become overdue after their day ends, timed ones after the time.
                  const late = task.overdue;
                  return (
                    <li key={task.id} className="flex items-start gap-3">
                      <ColorDot color={task.project?.color} className="mt-1.5" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.project?.name ?? t.common.noProject}
                        </p>
                      </div>
                      {late && (
                        <Badge variant="destructive">
                          <AlertTriangleIcon /> {t.panel.overdue}
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t.panel.activeProjects}</CardTitle>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href={href("/panel/projects")}>{t.common.viewAll}</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {d.activeProjects.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.common.empty}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {d.activeProjects.map((p) => (
                  <Link
                    key={p.id}
                    href={href(`/panel/projects/${p.id}`)}
                    className="group rounded-xl border border-dashed p-4 transition-colors hover:border-primary/40 hover:bg-primary/4"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <ColorDot color={p.color} />
                      <span className="truncate font-bold group-hover:text-primary">{p.name}</span>
                    </div>
                    <p className="mb-3 truncate text-xs text-muted-foreground">
                      {p.client?.name ?? "—"}
                    </p>
                    <div className="flex items-center gap-3">
                      <Progress value={p.progress} className="flex-1" />
                      <span className="text-xs font-bold tabular-nums">
                        {formatPercent(p.progress, locale)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.panel.upcomingEvents}</CardTitle>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href={href("/panel/calendar")}>{t.common.viewAll}</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {d.upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.common.empty}</p>
            ) : (
              <ul className="space-y-4">
                {d.upcoming.map((ev) => (
                  <li key={ev.key} className="flex gap-3">
                    <div
                      className="w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: ev.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {ev.allDay ? formatDate(ev.start, fmt) : formatDateTime(ev.start, fmt)}
                        {ev.client?.name ? ` · ${ev.client.name}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {isAdmin(actor) && (
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <StatCard
            label={t.panel.unpaidInvoices}
            value={
              d.unpaidInvoices.length
                ? d.unpaidInvoices
                    .map((u) => formatMoney(u.total, u.currency, locale, { compact: true }))
                    .join(" · ")
                : "—"
            }
            icon={ReceiptIcon}
            tone="warning"
          />
          <StatCard
            label={t.panel.pendingContracts}
            value={formatNumber(d.pendingContracts, locale)}
            icon={FileSignatureIcon}
            tone="violet"
          />
          <StatCard
            label={t.panel.newLeads}
            value={formatNumber(d.newLeads, locale)}
            icon={InboxIcon}
            tone="info"
          />
        </div>
      )}
    </>
  );
}
