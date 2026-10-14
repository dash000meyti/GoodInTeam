"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRightIcon, EyeIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/server/db/schema/work";
import { createTaskAction } from "@/server/modules/tasks/actions";
import { PriorityFlag, TaskCheck } from "./task-bits";

export interface ProjectTaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  priority: number;
  dueLabel: string | null;
  overdue: boolean;
  visibleToClient: boolean;
  assignee: string | null;
  subtasks: string | null;
}

const statusVariant: Record<TaskStatus, "neutral" | "info" | "violet" | "success" | "warning"> = {
  inbox: "neutral",
  todo: "neutral",
  in_progress: "info",
  waiting: "violet",
  someday: "neutral",
  done: "success",
  canceled: "neutral",
};

/** Task rows for the project page. Staff can tick tasks off and add new ones. */
export function ProjectTaskList({
  projectId,
  items,
  readOnly,
}: {
  projectId: string;
  items: ProjectTaskItem[];
  readOnly: boolean;
}) {
  const t = useT();
  const tk = t.tasks;
  const locale = useLocale();
  const [title, setTitle] = useState("");
  const [pending, start] = useTransition();

  const add = () =>
    start(async () => {
      const res = await createTaskAction({ text: title, projectId, status: "todo" });
      if (res.ok) {
        toast.success(tk.created);
        setTitle("");
      } else toast.error(res.error.message);
    });

  return (
    <div className="space-y-3">
      {!readOnly && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) add();
          }}
          className="flex items-center gap-2 rounded-xl bg-muted/60 px-3"
        >
          {pending ? (
            <Loader2Icon className="size-4 animate-spin text-primary" />
          ) : (
            <PlusIcon className="size-4 text-primary" />
          )}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tk.quickAddPlaceholder}
            aria-label={tk.quickAddLabel}
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </form>
      )}
      <ul className="divide-y divide-dashed">
        {items.map((task) => (
          <li key={task.id} className="flex items-start gap-3 py-3">
            {readOnly ? (
              <Badge variant={statusVariant[task.status]} className="mt-0.5 shrink-0">
                {tk[`status_${task.status}`]}
              </Badge>
            ) : (
              <div className="pt-[3px]">
                <TaskCheck
                  id={task.id}
                  status={task.status}
                  priority={task.priority}
                  title={task.title}
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              {readOnly ? (
                <p
                  className={cn(
                    "text-sm font-semibold",
                    task.status === "done" && "text-muted-foreground line-through",
                  )}
                >
                  {task.title}
                </p>
              ) : (
                <Link
                  href={localePath(locale, `/panel/tasks?task=${task.id}`)}
                  className={cn(
                    "group inline-flex items-center gap-1 text-sm font-semibold hover:text-primary",
                    task.status === "done" && "text-muted-foreground line-through",
                  )}
                >
                  {task.title}
                  <ArrowUpRightIcon className="size-3 opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100" />
                </Link>
              )}
              {(task.dueLabel || task.assignee || task.subtasks) && (
                <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                  {task.dueLabel && (
                    <span className={cn(task.overdue && "font-semibold text-destructive")}>
                      {task.dueLabel}
                    </span>
                  )}
                  {task.subtasks && <span className="tabular-nums">{task.subtasks}</span>}
                  {task.assignee && <span>{task.assignee}</span>}
                </p>
              )}
            </div>
            {!readOnly && task.visibleToClient && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <EyeIcon className="mt-1 size-4 text-info" aria-label={tk.visibleToClient} />
                </TooltipTrigger>
                <TooltipContent>{tk.visibleToClient}</TooltipContent>
              </Tooltip>
            )}
            <PriorityFlag priority={task.priority} className="mt-1" />
          </li>
        ))}
      </ul>
    </div>
  );
}
