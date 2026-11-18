import type { ReactNode } from "react";
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
import { CardAction, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ColorDot } from "@/components/shared/color-dot";
import { LiveDuration } from "@/components/shared/live-duration";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { StatCard, StatGrid, StatRow } from "@/components/panel/stat-card";
import {
  FrameBox,
  FrameCell,
  FrameFiller,
  FrameGrid,
  HEADING_CLASS,
} from "@/components/shell/frame";
import { packRows } from "@/components/site/frame-plan";
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

/**
 * The staff Desktop, framed like a site page: the page box (strip, greeting,
 * Start timer, the DESKTOP.APP decor) carries the four KPIs as its second
 * row; one box holds the four widgets as cells sharing hairlines (2fr | 1fr
 * from lg); the admin counters close the page as one stat grid.
 */
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
  const projectSpans = d.activeProjects.map(() => undefined);

  return (
    <>
      <PageHeader
        title={`${greeting(ctx)}${locale === "fa" ? "،" : ","} ${firstName} 👋`}
        description={`${formatDate(ctx.now, fmt, "long")} — ${t.panel.dashboardSubtitle}`}
        path={["DESKTOP"]}
        app="DESKTOP"
        actions={
          <Button asChild>
            <Link href={href("/panel/time")}>
              <PlayIcon /> {t.panel.startTimer}
            </Link>
          </Button>
        }
      >
        <StatRow>
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
        </StatRow>
      </PageHeader>

      <div className="flex flex-col gap-6 lg:gap-8">
        <FrameBox as="div" density="compact">
          <FrameGrid cols="2-1">
            <WidgetCell
              title={t.panel.runningTimers}
              titleId="w-timers"
              action={<ViewAll href={href("/panel/time")} label={t.common.viewAll} />}
            >
              {d.running.length === 0 ? (
                <EmptyState icon={ClockIcon} title={t.panel.noRunningTimers} className="py-8" />
              ) : (
                <ul className="divide-y divide-dashed divide-frame-line">
                  {d.running.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="relative flex size-2.5 shrink-0">
                        <span className="absolute inline-flex size-full animate-ping bg-primary opacity-60" />
                        <span className="relative inline-flex size-2.5 bg-primary shadow-[0_0_0_1px_var(--brand-ink)]" />
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
            </WidgetCell>

            <WidgetCell
              title={t.panel.dueToday}
              titleId="w-due"
              action={<ViewAll href={href("/panel/tasks")} label={t.common.viewAll} />}
            >
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
            </WidgetCell>

            <WidgetCell
              title={t.panel.activeProjects}
              titleId="w-projects"
              action={<ViewAll href={href("/panel/projects")} label={t.common.viewAll} />}
              flush={d.activeProjects.length > 0}
            >
              {d.activeProjects.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t.common.empty}</p>
              ) : (
                // Project tiles are cells of a nested grid: they share the box's hairlines.
                <FrameGrid cols={2}>
                  {d.activeProjects.map((p) => (
                    <FrameCell key={p.id} hover className="group">
                      <div className="mb-3 flex items-center gap-2">
                        <ColorDot color={p.color} />
                        <Link
                          href={href(`/panel/projects/${p.id}`)}
                          className="truncate font-bold group-hover:text-primary-ink after:absolute after:inset-0"
                        >
                          {p.name}
                        </Link>
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
                    </FrameCell>
                  ))}
                  <FrameFiller
                    units={{
                      md: packRows(projectSpans, 2, "md").trailing,
                      lg: packRows(projectSpans, 2, "lg").trailing,
                    }}
                  />
                </FrameGrid>
              )}
            </WidgetCell>

            <WidgetCell
              title={t.panel.upcomingEvents}
              titleId="w-events"
              action={<ViewAll href={href("/panel/calendar")} label={t.common.viewAll} />}
            >
              {d.upcoming.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t.common.empty}</p>
              ) : (
                <ul className="space-y-4">
                  {d.upcoming.map((ev) => (
                    <li key={ev.key} className="flex gap-3">
                      <div className="w-1 shrink-0" style={{ backgroundColor: ev.color }} />
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
            </WidgetCell>
          </FrameGrid>
        </FrameBox>

        {isAdmin(actor) && (
          <StatGrid>
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
          </StatGrid>
        )}
      </div>
    </>
  );
}

/** A Desktop widget: a cell with a header row (h2 + action) over its body; `flush` = edge to edge. */
function WidgetCell({
  title,
  titleId,
  action,
  flush,
  children,
}: {
  title: string;
  titleId: string;
  action: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <FrameCell as="section" pad="none" aria-labelledby={titleId} className="flex flex-col">
      <CardHeader>
        <h2 id={titleId} className={HEADING_CLASS.box}>
          {title}
        </h2>
        <CardAction>{action}</CardAction>
      </CardHeader>
      {flush ? (
        <div className="flex flex-1 flex-col">
          {children}
          {/* the rest of a taller row is desktop texture, like the site's filler cells */}
          <div
            aria-hidden
            className="min-h-0 flex-1 bg-[radial-gradient(var(--dots)_1px,transparent_1.5px)] [background-size:12px_12px]"
          />
        </div>
      ) : (
        <div className="flex-1 p-(--cell-pad)">{children}</div>
      )}
    </FrameCell>
  );
}

function ViewAll({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="ghost" size="sm">
      <Link href={href}>{label}</Link>
    </Button>
  );
}
