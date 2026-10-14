import Link from "next/link";
import {
  BotIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CpuIcon,
  GlobeIcon,
  HistoryIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/panel/empty-state";
import { format } from "@/i18n/format-message";
import { formatDate, formatDateTime, formatNumber, formatRelative, formatTime } from "@/lib/format";
import { toDateInputValue } from "@/lib/tz";
import { initials } from "@/lib/utils";
import { isAdmin } from "@/server/auth/actor";
import { activityFilterOptions, listActivity } from "@/server/modules/settings/activity";
import { activitySearchParams } from "@/server/modules/settings/schemas";
import { panelContext } from "@/server/page-context";
import { actionLabel, entityTypeLabel } from "../../_components/activity-labels";
import { ActivityFilters } from "../../_components/activity-filters";
import { SettingsCard, SettingsHeader } from "../../_components/section";
import { SecurityTabs } from "../../_components/security-tabs";

/**
 * Settings → Sessions & security → Activity log.
 * Everyone sees their own history; owner/admin see everything with filters.
 */
export default async function ActivityLogPage({
  searchParams,
}: PageProps<"/[locale]/panel/settings/security/activity">) {
  const { actor, t, fmt, href, now, tz } = await panelContext();
  const s = t.settings;
  const admin = isAdmin(actor);
  const q = activitySearchParams.parse(await searchParams);
  const filters = admin
    ? { actor: q.actor, type: q.type, action: q.action, from: q.from, to: q.to }
    : {};
  const res = listActivity(actor, { ...filters, page: q.page, pageSize: q.pageSize });
  const options = activityFilterOptions(actor);
  const basePath = href("/panel/settings/security/activity");

  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  // Group rows by calendar day (app timezone) for a readable timeline.
  const todayKey = toDateInputValue(now, tz);
  const yesterdayKey = toDateInputValue(now - 86_400_000, tz);
  const groups: { key: string; label: string; rows: typeof res.rows }[] = [];
  for (const row of res.rows) {
    const key = toDateInputValue(row.createdAt, tz);
    let g = groups.at(-1);
    if (!g || g.key !== key) {
      const label =
        key === todayKey
          ? t.common.today
          : key === yesterdayKey
            ? t.common.yesterday
            : formatDate(row.createdAt, fmt, "long");
      g = { key, label, rows: [] };
      groups.push(g);
    }
    g.rows.push(row);
  }

  return (
    <div className="space-y-6">
      <SettingsHeader
        title={s.securityTitle}
        description={s.securitySubtitle}
        actions={<SecurityTabs active="activity" href={href} t={s} />}
      />
      <SettingsCard
        icon={HistoryIcon}
        title={s.activityTitle}
        description={admin ? s.activityAllHint : s.activityOwnHint}
        action={
          <Badge variant="neutral" className="tabular-nums">
            {format(s.activityTotal, { n: formatNumber(res.total, fmt.locale) })}
          </Badge>
        }
      >
        {admin && options && (
          <div className="mb-6">
            <ActivityFilters action={basePath} values={filters} options={options} />
          </div>
        )}
        {res.rows.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title={s.activityEmpty}
            description={s.activityEmptyHint}
          />
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <section key={g.key} className="space-y-1">
                <h3 className="sticky top-16 z-10 -mx-2 bg-card/90 px-2 py-1.5 text-xs font-bold text-muted-foreground backdrop-blur lg:top-[72px]">
                  {g.label}
                </h3>
                <ol className="relative space-y-1 before:absolute before:inset-y-2 before:start-[17px] before:w-px before:bg-border">
                  {g.rows.map((row) => {
                    const viaMcp = row.action.startsWith("mcp.");
                    const viaApi = row.actorType === "api";
                    const name =
                      row.actorName ?? (row.actorType === "public" ? s.actorPublic : s.actorSystem);
                    return (
                      <li key={row.id} className="relative flex items-start gap-3 rounded-xl p-1.5">
                        {row.actorId ? (
                          <Avatar className="z-10 size-9 ring-4 ring-card">
                            {row.actorAvatar && <AvatarImage src={row.actorAvatar} alt="" />}
                            <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <span className="z-10 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-4 ring-card">
                            {row.actorType === "public" ? (
                              <GlobeIcon className="size-4" />
                            ) : (
                              <CpuIcon className="size-4" />
                            )}
                          </span>
                        )}
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="text-sm leading-6">
                            {admin && <span className="font-bold">{name} </span>}
                            <span className={admin ? "text-muted-foreground" : "font-semibold"}>
                              {actionLabel(row.action, s)}
                            </span>
                            {row.summary && (
                              <span className="font-semibold" dir="auto">
                                {" "}
                                · {row.summary}
                              </span>
                            )}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="neutral">{entityTypeLabel(row.entityType, s)}</Badge>
                            {(viaApi || viaMcp) && (
                              <Badge variant="violet">
                                <BotIcon /> {viaMcp ? s.viaMcp : s.viaApi}
                              </Badge>
                            )}
                            <span
                              className="font-mono text-[11px] text-muted-foreground/70"
                              dir="ltr"
                            >
                              {row.action}
                            </span>
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <time
                              dateTime={row.createdAt.toISOString()}
                              className="shrink-0 pt-1 text-xs text-muted-foreground tabular-nums"
                            >
                              {now - row.createdAt.getTime() < 6 * 3_600_000
                                ? formatRelative(row.createdAt, fmt, now)
                                : formatTime(row.createdAt, fmt)}
                            </time>
                          </TooltipTrigger>
                          <TooltipContent>{formatDateTime(row.createdAt, fmt)}</TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}
        {res.pageCount > 1 && (
          <nav className="mt-6 flex items-center justify-between gap-3 border-t border-dashed pt-5">
            <Button asChild variant="outline" size="sm" aria-disabled={res.page <= 1}>
              <Link
                href={pageHref(res.page - 1)}
                className={res.page <= 1 ? "pointer-events-none opacity-50" : undefined}
              >
                <ChevronRightIcon className="ltr:rotate-180" /> {t.common.previous}
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              {format(s.pageOf, {
                page: formatNumber(res.page, fmt.locale),
                total: formatNumber(res.pageCount, fmt.locale),
              })}
            </span>
            <Button asChild variant="outline" size="sm" aria-disabled={res.page >= res.pageCount}>
              <Link
                href={pageHref(res.page + 1)}
                className={res.page >= res.pageCount ? "pointer-events-none opacity-50" : undefined}
              >
                {t.common.next} <ChevronLeftIcon className="ltr:rotate-180" />
              </Link>
            </Button>
          </nav>
        )}
      </SettingsCard>
    </div>
  );
}
