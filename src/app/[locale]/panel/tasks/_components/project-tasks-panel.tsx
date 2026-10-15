import "server-only";
import Link from "next/link";
import { CheckSquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/panel/empty-state";
import { format } from "@/i18n/format-message";
import { formatDayLabel } from "@/lib/day-label";
import { isOverdue } from "@/lib/due";
import { formatNumber, formatPercent, formatTime } from "@/lib/format";
import { isStaff } from "@/server/auth/actor";
import { AppError } from "@/server/errors";
import { projectTasks } from "@/server/modules/tasks/service";
import type { PanelContext } from "@/server/page-context";
import { ProjectTaskList, type ProjectTaskItem } from "./project-task-list";

/**
 * Tasks of one project for the project detail page. Staff can complete and
 * add tasks; `clientView` (client portal) shows only `visibleToClient` tasks,
 * read-only, and renders nothing unless the project shares tasks.
 */
export async function ProjectTasksPanel({
  projectId,
  ctx,
  clientView = false,
}: {
  projectId: string;
  ctx: PanelContext;
  clientView?: boolean;
}) {
  const { actor, t, locale, fmt, tz, now, href } = ctx;
  const tk = t.tasks;
  const list = await projectTasks(actor, projectId).catch((e) => {
    if (e instanceof AppError && (e.code === "forbidden" || e.code === "not_found")) return null;
    throw e;
  });
  if (!list) return null;
  const readOnly = clientView || !isStaff(actor);
  const visible = clientView ? list.filter((task) => task.visibleToClient) : list;
  const items: ProjectTaskItem[] = visible.map((task) => {
    const finished = task.status === "done" || task.status === "canceled";
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueLabel: task.dueAt
        ? `${formatDayLabel(task.dueAt, { ...fmt, short: true })}${task.dueAllDay ? "" : ` ${formatTime(task.dueAt, fmt)}`}`
        : null,
      overdue: !finished && isOverdue(task.dueAt, { allDay: task.dueAllDay, now, tz }),
      visibleToClient: task.visibleToClient,
      assignee: readOnly ? null : (task.assignee?.name ?? null),
      subtasks: task.subtasks.total
        ? format(tk.subtaskProgress, {
            done: formatNumber(task.subtasks.done, locale),
            total: formatNumber(task.subtasks.total, locale),
          })
        : null,
    };
  });
  const done = items.filter((i) => i.status === "done").length;
  const pct = items.length ? (done / items.length) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tk.projectTasks}</CardTitle>
        {items.length > 0 && (
          <CardDescription className="flex items-center gap-3 pt-1">
            <Progress value={pct} className="max-w-48 flex-1" />
            <span className="text-xs font-bold tabular-nums">
              {format(tk.subtaskProgress, {
                done: formatNumber(done, locale),
                total: formatNumber(items.length, locale),
              })}{" "}
              · {formatPercent(pct, locale)}
            </span>
          </CardDescription>
        )}
        {!readOnly && (
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link href={`${href("/panel/tasks")}?project=${projectId}&list=anytime`}>
                {tk.viewInTasks}
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 && readOnly ? (
          <EmptyState icon={CheckSquareIcon} title={tk.noProjectTasks} className="py-10" />
        ) : (
          <ProjectTaskList projectId={projectId} items={items} readOnly={readOnly} />
        )}
      </CardContent>
    </Card>
  );
}
