import "server-only";
import { localeMeta } from "@/i18n/config";
import { formatDayLabel } from "@/lib/day-label";
import { formatDuration, formatTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { addDays, toDateInputValue, toTimeInputValue } from "@/lib/tz";
import type { PanelContext } from "@/server/page-context";
import type { TimeEntryView } from "@/server/modules/time/service";
import type { EntryFormValues } from "../_components/entry-dialog";
import type { EntryRowView } from "../_components/entry-row";

/** Read a single string search param. */
export function param(sp: Record<string, string | string[] | undefined>, key: string) {
  const v = sp[key];
  return typeof v === "string" && v ? v : undefined;
}

type EntryCore = Pick<
  TimeEntryView,
  "id" | "description" | "projectId" | "taskId" | "billable" | "startedAt" | "endedAt"
>;

export function entryValues(e: EntryCore, tz: string): EntryFormValues {
  return {
    id: e.id,
    description: e.description ?? "",
    projectId: e.projectId ?? "",
    taskId: e.taskId ?? "",
    billable: e.billable,
    date: toDateInputValue(e.startedAt, tz),
    startTime: toTimeInputValue(e.startedAt, tz),
    endTime: e.endedAt ? toTimeInputValue(e.endedAt, tz) : "",
    running: !e.endedAt,
  };
}

export function toRowView(e: TimeEntryView, ctx: PanelContext, showUser: boolean): EntryRowView {
  const { fmt, locale, tz } = ctx;
  return {
    id: e.id,
    description: e.description,
    project: e.project ? { name: e.project.name, color: e.project.color } : null,
    task: e.task ? { title: e.task.title } : null,
    userName: showUser ? (e.user?.name ?? null) : null,
    billable: e.billable,
    running: !e.endedAt,
    startedAt: e.startedAt.getTime(),
    durationLabel: formatDuration(e.durationMs, locale),
    timeRange: `${formatTime(e.startedAt, fmt)} – ${e.endedAt ? formatTime(e.endedAt, fmt) : "…"}`,
    earned:
      e.earnedMinor && e.currency
        ? formatMoney(e.earnedMinor, e.currency, locale, { compact: true })
        : null,
    values: entryValues(e, tz),
  };
}

/** "Today" / "Yesterday" / "Saturday, 19 Mehr" for a day key. */
export function dayLabel(key: string, ctx: PanelContext) {
  const todayKey = toDateInputValue(ctx.now, ctx.tz);
  const yesterdayKey = toDateInputValue(addDays(ctx.now, -1, ctx.tz), ctx.tz);
  const date = new Date(`${key}T12:00:00Z`);
  const sameYear = key.slice(0, 4) === todayKey.slice(0, 4);
  const long = formatDayLabel(date, { ...ctx.fmt, timeZone: "UTC" });
  if (key === todayKey) return { title: ctx.t.common.today, subtitle: long };
  if (key === yesterdayKey) return { title: ctx.t.common.yesterday, subtitle: long };
  if (sameYear) return { title: long, subtitle: null };
  return {
    title: long,
    subtitle: formatDayLabel(date, { ...ctx.fmt, timeZone: "UTC", withYear: true }),
  };
}

/** Weekday + short date label for a day start (Jalali for fa). */
export function dayParts(d: Date, ctx: PanelContext) {
  const intl = `${localeMeta[ctx.locale].intl}-u-ca-${localeMeta[ctx.locale].calendar}`;
  return {
    weekday: new Intl.DateTimeFormat(intl, { weekday: "short", timeZone: ctx.tz }).format(d),
    label: new Intl.DateTimeFormat(intl, {
      day: "numeric",
      month: "short",
      timeZone: ctx.tz,
    }).format(d),
  };
}

/** Build "/panel/…?a=b" keeping only non-empty params. */
export function withParams(path: string, params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Money per currency → "۱٫۲ میلیون تومان · $ 90". */
export function moneyText(earned: Record<string, number>, locale: PanelContext["locale"]) {
  const parts = Object.entries(earned)
    .filter(([, v]) => v > 0)
    .map(([cur, v]) => formatMoney(v, cur, locale, { compact: true }));
  return parts.length ? parts.join(" · ") : "—";
}
