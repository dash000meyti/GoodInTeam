import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangleIcon,
  BanIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  CheckIcon,
  HandshakeIcon,
  HourglassIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ColorDot } from "@/components/shared/color-dot";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { StatCard } from "@/components/panel/stat-card";
import { dayKeyOf } from "@/components/calendar/grid";
import { dateLabel, timeLabel } from "@/components/calendar/format";
import type { CalendarRef } from "@/components/calendar/types";
import { getT } from "@/i18n/server";
import { format } from "@/i18n/format-message";
import { formatNumber, formatPercent, formatRelative } from "@/lib/format";
import { DAY_MS, calendarFor, weekStartFor } from "@/lib/tz";
import { cn } from "@/lib/utils";
import { isAdmin } from "@/server/auth/actor";
import { listCommitments, type CommitmentGroup } from "@/server/modules/calendar/service";
import { clientOptions } from "@/server/modules/clients/service";
import { projectOptions } from "@/server/modules/projects/service";
import { panelContext, type PanelContext } from "@/server/page-context";
import { CalendarProvider } from "../_components/calendar-context";
import { CommitmentActions } from "../_components/commitment-actions";
import { CommitmentFilters } from "../_components/commitment-filters";
import { CommitmentQuickAdd } from "../_components/commitment-quick-add";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).calendar.commitments };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

type Item = ReturnType<typeof listCommitments>["items"][number];

const groupOrder = ["overdue", "upcoming", "kept", "missed"] as const;

export default async function CommitmentsPage({
  searchParams,
}: PageProps<"/[locale]/panel/calendar/commitments">) {
  const ctx = await panelContext({ roles: ["owner", "admin", "member"] });
  const { actor, t, tz, locale, now, href } = ctx;
  const c = t.calendar;
  const sp = await searchParams;
  const clientId = first(sp.client) || null;
  const projectId = first(sp.project) || null;
  const admin = isAdmin(actor);

  const all = listCommitments(actor, {}, now);
  const filtered =
    clientId || projectId
      ? listCommitments(
          actor,
          { clientId: clientId ?? undefined, projectId: projectId ?? undefined },
          now,
        )
      : all;
  const { items, stats } = filtered;

  const uniq = (refs: (CalendarRef | null)[]) =>
    [...new Map(refs.filter((r): r is CalendarRef => !!r).map((r) => [r.id, r])).values()].sort(
      (a, b) => a.name.localeCompare(b.name, locale),
    );
  const clientRefs = uniq(all.items.map((i) => i.client));
  const projectRefs = uniq(all.items.map((i) => i.project));

  const groups: Record<(typeof groupOrder)[number], Item[]> = {
    overdue: items.filter((i) => i.group === "overdue"),
    upcoming: items.filter((i) => i.group === "upcoming"),
    kept: items.filter((i) => i.group === "kept").reverse(),
    missed: items.filter((i) => i.group === "missed" || i.group === "canceled").reverse(),
  };
  const resolved = stats.kept + stats.missed;

  return (
    <CalendarProvider
      tz={tz}
      calendar={calendarFor(locale)}
      weekStartsOn={weekStartFor(locale)}
      locale={locale}
      todayKey={dayKeyOf(now, tz)}
      now={now}
      isAdmin={admin}
      projects={projectOptions(actor)}
      clients={admin ? clientOptions(actor) : []}
    >
      <PageHeader
        title={c.commitments}
        description={c.commitmentsSubtitle}
        crumbs={[
          { label: t.nav.dashboard, href: href("/panel") },
          { label: c.title, href: href("/panel/calendar") },
          { label: c.commitments },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href={href("/panel/calendar?view=agenda")}>
              <CalendarDaysIcon /> {c.openCalendar}
            </Link>
          </Button>
        }
      />

      <Card className="mb-6 p-4 sm:p-6">
        <CommitmentQuickAdd />
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={c.keepRate}
          value={stats.keepRate != null ? formatPercent(stats.keepRate * 100, locale) : "—"}
          hint={
            resolved
              ? format(c.keepRateHint, {
                  kept: formatNumber(stats.kept, locale),
                  total: formatNumber(resolved, locale),
                })
              : c.keepRateEmpty
          }
          icon={HandshakeIcon}
          tone="success"
        />
        <StatCard
          label={c.overdueStat}
          value={formatNumber(stats.overdue, locale)}
          icon={AlertTriangleIcon}
          tone={stats.overdue ? "destructive" : "primary"}
        />
        <StatCard
          label={c.dueSoonStat}
          value={formatNumber(stats.dueSoon, locale)}
          icon={CalendarClockIcon}
          tone="warning"
        />
        <StatCard
          label={c.avgLead}
          value={
            stats.avgLeadMs != null
              ? format(c.avgLeadValue, {
                  n: formatNumber(stats.avgLeadMs / DAY_MS, locale, { maximumFractionDigits: 1 }),
                })
              : "—"
          }
          icon={HourglassIcon}
          tone="info"
        />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {(clientRefs.length > 0 || projectRefs.length > 0) && (
            <CommitmentFilters
              clients={clientRefs}
              projects={projectRefs}
              clientId={clientId}
              projectId={projectId}
            />
          )}
          {all.items.length === 0 ? (
            <EmptyState
              icon={HandshakeIcon}
              title={c.noCommitments}
              description={c.noCommitmentsHint}
            />
          ) : (
            groupOrder.map((g) => <GroupCard key={g} group={g} items={groups[g]} ctx={ctx} />)
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{c.byClient}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byClient.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">{c.byClientEmpty}</p>
            ) : (
              <ul className="space-y-4">
                {stats.byClient.map((row) => (
                  <li key={row.client?.id ?? "internal"} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2 font-semibold">
                        <ColorDot color={row.client?.color} />
                        <span className="truncate">{row.client?.name ?? c.internal}</span>
                      </span>
                      <span className="shrink-0 font-bold tabular-nums">
                        {row.keepRate != null ? formatPercent(row.keepRate * 100, locale) : "—"}
                      </span>
                    </div>
                    {row.keepRate != null && (
                      <Progress
                        value={row.keepRate * 100}
                        aria-label={row.client?.name ?? c.internal}
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(c.keepRateHint, {
                        kept: formatNumber(row.kept, locale),
                        total: formatNumber(row.kept + row.missed, locale),
                      })}
                      {row.pending > 0 &&
                        ` · ${format(c.pendingCount, { n: formatNumber(row.pending, locale) })}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </CalendarProvider>
  );
}

const groupMeta: Record<
  (typeof groupOrder)[number],
  { icon: typeof CheckIcon; tone: string; badge: "destructive" | "warning" | "success" | "neutral" }
> = {
  overdue: {
    icon: AlertTriangleIcon,
    tone: "bg-destructive/12 text-destructive",
    badge: "destructive",
  },
  upcoming: {
    icon: HourglassIcon,
    tone: "bg-warning/16 text-[#b76e00] dark:text-warning",
    badge: "warning",
  },
  kept: { icon: CheckIcon, tone: "bg-success/12 text-success", badge: "success" },
  missed: { icon: XIcon, tone: "bg-grey-500/12 text-muted-foreground", badge: "neutral" },
};

function GroupCard({
  group,
  items,
  ctx,
}: {
  group: (typeof groupOrder)[number];
  items: Item[];
  ctx: PanelContext;
}) {
  const { t, locale } = ctx;
  const c = t.calendar;
  const meta = groupMeta[group];
  const Icon = meta.icon;
  if (group === "overdue" && items.length === 0) return null;
  return (
    <Card className={cn("gap-0 py-0", group === "overdue" && "ring-1 ring-destructive/30")}>
      <div className="flex items-center gap-3 border-b border-dashed px-4 py-3 sm:px-6">
        <span className={cn("flex size-8 items-center justify-center rounded-lg", meta.tone)}>
          <Icon className="size-4" />
        </span>
        <h2 className="font-bold">{c[`group_${group}`]}</h2>
        <Badge variant={meta.badge} className="ms-auto">
          {formatNumber(items.length, locale)}
        </Badge>
      </div>
      {items.length === 0 ? (
        <p className="px-6 py-6 text-center text-sm text-muted-foreground">
          {c[`groupEmpty_${group}`]}
        </p>
      ) : (
        <ul className="divide-y divide-dashed">
          {items.map((item) => (
            <CommitmentRow key={item.id} item={item} ctx={ctx} />
          ))}
        </ul>
      )}
    </Card>
  );
}

const stateIcon: Record<CommitmentGroup, typeof CheckIcon> = {
  overdue: AlertTriangleIcon,
  upcoming: HourglassIcon,
  kept: CheckIcon,
  missed: XIcon,
  canceled: BanIcon,
};

function CommitmentRow({ item, ctx }: { item: Item; ctx: PanelContext }) {
  const { t, locale, tz, now, href, fmt } = ctx;
  const c = t.calendar;
  const Icon = stateIcon[item.group];
  const dueKey = dayKeyOf(item.due, tz);
  const dueText = `${dateLabel(dueKey, locale, { year: false })}${item.allDay ? "" : ` · ${timeLabel(item.due, tz, locale)}`}`;
  const overdue = item.group === "overdue";
  const resolved = item.group !== "overdue" && item.group !== "upcoming";
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-6">
      <span
        className={cn(
          "row-span-3 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full sm:row-span-2",
          overdue && "bg-destructive/12 text-destructive",
          item.group === "upcoming" && "bg-warning/16 text-[#b76e00] dark:text-warning",
          item.group === "kept" && "bg-success/12 text-success",
          (item.group === "missed" || item.group === "canceled") &&
            "bg-grey-500/12 text-muted-foreground",
        )}
        title={c[`commitment_${item.state}`]}
      >
        <Icon className="size-3.5" />
      </span>
      <p
        className={cn(
          "self-center font-semibold break-words",
          item.group === "canceled" && "text-muted-foreground line-through",
        )}
      >
        {item.title}
      </p>
      <div className="col-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/80">
          <ColorDot color={item.client?.color} />
          {item.client?.name ?? c.internal}
        </span>
        {item.project && (
          <Link
            href={href(`/panel/projects/${item.project.id}`)}
            className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline"
          >
            <ColorDot color={item.project.color} className="size-2" />
            {item.project.name}
          </Link>
        )}
        {item.promisedAt && (
          <span title={dateLabel(dayKeyOf(item.promisedAt, tz), locale)}>
            {c.promised}: {formatRelative(item.promisedAt, fmt, now)}
          </span>
        )}
        {(item.group === "missed" || item.group === "canceled") && (
          <Badge variant={item.group === "missed" ? "destructive" : "neutral"}>
            {c[`commitment_${item.state}`]}
          </Badge>
        )}
      </div>
      <div className="col-start-2 flex items-center justify-between gap-3 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:flex-col sm:items-end sm:justify-center sm:gap-2">
        <div className="text-start sm:text-end">
          <p className={cn("text-sm font-semibold", overdue && "text-destructive")}>{dueText}</p>
          {!resolved && (
            <p className={cn("text-xs", overdue ? "text-destructive/80" : "text-muted-foreground")}>
              {formatRelative(item.due, fmt, now)}
            </p>
          )}
        </div>
        <CommitmentActions event={item.event} state={item.state} />
      </div>
    </li>
  );
}
