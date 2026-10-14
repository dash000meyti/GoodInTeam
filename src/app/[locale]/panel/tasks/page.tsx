import { localeMeta } from "@/i18n/config";
import { formatDayLabel } from "@/lib/day-label";
import { formatTime } from "@/lib/format";
import { addDays, startOfDay, toDateInputValue } from "@/lib/tz";
import {
  assigneeOptions,
  listTasks,
  listTaskTags,
  UPCOMING_DAYS,
  type TaskListItem,
} from "@/server/modules/tasks/service";
import { timeProjectOptions } from "@/server/modules/time/service";
import { panelContext, type PanelContext } from "@/server/page-context";
import { SMART_LISTS, type SmartListKey, type TaskView } from "./_components/lists";
import { TasksApp } from "./_components/tasks-app";

function param(sp: Record<string, string | string[] | undefined>, key: string) {
  const v = sp[key];
  return typeof v === "string" ? v : "";
}

/** Relative, human due label: "Today 14:30", "Tomorrow", "Sat", "12 Aban". */
function dueLabel(task: TaskListItem, ctx: PanelContext, keys: Record<string, number>) {
  if (!task.dueAt) return null;
  const key = toDateInputValue(task.dueAt, ctx.tz);
  const offset = keys[key];
  const time = task.dueAllDay ? "" : ` ${formatTime(task.dueAt, ctx.fmt)}`;
  const { t } = ctx;
  if (offset === 0) return `${t.common.today}${time}`;
  if (offset === 1) return `${t.common.tomorrow}${time}`;
  if (offset === -1) return `${t.common.yesterday}${time}`;
  if (offset != null && offset > 1 && offset < 7) {
    const weekday = new Intl.DateTimeFormat(
      `${localeMeta[ctx.locale].intl}-u-ca-${localeMeta[ctx.locale].calendar}`,
      { weekday: "long", timeZone: ctx.tz },
    ).format(task.dueAt);
    return `${weekday}${time}`;
  }
  const short = new Intl.DateTimeFormat(
    `${localeMeta[ctx.locale].intl}-u-ca-${localeMeta[ctx.locale].calendar}`,
    { day: "numeric", month: "short", timeZone: ctx.tz },
  ).format(task.dueAt);
  return `${short}${time}`;
}

export default async function TasksPage({ searchParams }: PageProps<"/[locale]/panel/tasks">) {
  const ctx = await panelContext({ roles: ["owner", "admin", "member"] });
  const { actor, t, href, tz, now } = ctx;
  const sp = await searchParams;

  const [open, done] = await Promise.all([
    listTasks(actor, { limit: 1000 }, now),
    listTasks(actor, { list: "done", limit: 50 }, now),
  ]);

  const today = startOfDay(now, tz);
  const todayKey = toDateInputValue(today, tz);
  // Day offsets −1 … +14 for labels and Upcoming grouping.
  const offsets: Record<string, number> = {};
  const dayLabels: Record<string, string> = {};
  for (let i = -1; i <= UPCOMING_DAYS; i++) {
    const d = addDays(today, i, tz);
    const key = toDateInputValue(d, tz);
    offsets[key] = i;
    const long = formatDayLabel(d, ctx.fmt);
    dayLabels[key] = i === 1 ? `${t.common.tomorrow} — ${long}` : long;
  }
  const upcomingEndKey = toDateInputValue(addDays(today, UPCOMING_DAYS, tz), tz);

  const toView = (task: TaskListItem): TaskView => {
    const dueKey = task.dueAt ? toDateInputValue(task.dueAt, tz) : null;
    const finished = task.status === "done" || task.status === "canceled";
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      projectId: task.projectId,
      project: task.project,
      tags: task.tags ?? [],
      dueKey,
      dueLabel: dueLabel(task, ctx, offsets),
      overdue:
        !finished &&
        !!task.dueAt &&
        (task.dueAllDay ? dueKey! < todayKey : task.dueAt.getTime() < now),
      dueToday: !finished && dueKey === todayKey,
      hasReminder: !!task.remindAt && !task.remindedAt,
      recurring: !!task.recurrence,
      subtasks: task.subtasks,
      hasNotes: !!task.notes,
      assignee: task.assignee && task.assignee.id !== actor.user.id ? task.assignee.name : null,
      sort: task.sort,
      createdAt: task.createdAt.getTime(),
      completedAt: task.completedAt?.getTime() ?? null,
    };
  };

  const listParam = param(sp, "list");
  const list: SmartListKey = (SMART_LISTS as readonly string[]).includes(listParam)
    ? (listParam as SmartListKey)
    : "today";

  return (
    <TasksApp
      tasks={[...open, ...done].map(toView)}
      projects={timeProjectOptions(actor)}
      tags={listTaskTags(actor)}
      assignees={assigneeOptions(actor)}
      tz={tz}
      now={now}
      todayKey={todayKey}
      upcomingEndKey={upcomingEndKey}
      dayLabels={dayLabels}
      crumbs={[{ label: t.nav.dashboard, href: href("/panel") }, { label: t.tasks.title }]}
      initial={{
        list,
        view: param(sp, "view") === "board" ? "board" : "list",
        filters: {
          projectId: param(sp, "project"),
          priority: param(sp, "priority"),
          tag: param(sp, "tag"),
          q: param(sp, "q"),
        },
        taskId: param(sp, "task") || null,
      }}
    />
  );
}
