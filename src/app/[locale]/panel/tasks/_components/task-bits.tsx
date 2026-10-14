"use client";

import { useState, useTransition } from "react";
import {
  AlarmClockIcon,
  CalendarIcon,
  CheckIcon,
  FlagIcon,
  ListChecksIcon,
  RepeatIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ColorDot } from "@/components/shared/color-dot";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/server/db/schema/work";
import { completeTaskAction, reopenTaskAction } from "@/server/modules/tasks/actions";
import type { TaskView } from "./lists";

export const priorityTone: Record<number, string> = {
  4: "text-destructive",
  3: "text-[#b76e00] dark:text-warning",
  2: "text-info",
  1: "text-muted-foreground",
  0: "text-muted-foreground/50",
};

const ringTone: Record<number, string> = {
  4: "border-destructive bg-destructive/8",
  3: "border-warning bg-warning/10",
  2: "border-info bg-info/8",
  1: "border-grey-500",
  0: "border-grey-500",
};

export function PriorityFlag({ priority, className }: { priority: number; className?: string }) {
  const t = useT();
  if (!priority) return null;
  const label = t.tasks[`priority_${priority}` as "priority_1"];
  return (
    <FlagIcon
      aria-label={`${t.tasks.priority}: ${label}`}
      className={cn(
        "size-4 shrink-0",
        priority >= 3 && "fill-current",
        priorityTone[priority],
        className,
      )}
    />
  );
}

/**
 * Round "complete" checkbox with a satisfying pop. Completion is delayed a
 * beat so the animation is visible, then offers Undo (which also removes
 * the next occurrence of a recurring task).
 */
export function TaskCheck({
  id,
  status,
  priority,
  title,
  onDone,
}: {
  id: string;
  status: TaskStatus;
  priority: number;
  title: string;
  onDone?: (done: boolean) => void;
}) {
  const t = useT();
  const tk = t.tasks;
  const [checking, setChecking] = useState(false);
  const [seenStatus, setSeenStatus] = useState(status);
  if (seenStatus !== status) {
    // Fresh server data arrived (completed / reopened): drop the optimistic state.
    setSeenStatus(status);
    setChecking(false);
  }
  const [, start] = useTransition();
  const done = status === "done" || checking;

  const toggle = () => {
    if (status === "done") {
      start(async () => {
        const res = await reopenTaskAction({ id, status: "todo" });
        if (res.ok) toast.success(tk.reopened);
        else toast.error(res.error.message);
      });
      return;
    }
    setChecking(true);
    onDone?.(true);
    start(async () => {
      await new Promise((r) => setTimeout(r, 420));
      const res = await completeTaskAction({ id });
      if (!res.ok) {
        setChecking(false);
        onDone?.(false);
        toast.error(res.error.message);
        return;
      }
      const nextId = res.data.nextId;
      toast.success(tk.completed, {
        description: title,
        action: {
          label: tk.undo,
          onClick: () =>
            void reopenTaskAction({ id, status, spawnedId: nextId ?? undefined }).then((r) =>
              r.ok ? toast.success(tk.reopened) : toast.error(r.error.message),
            ),
        },
      });
    });
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={status === "done" ? tk.markUndone : tk.markDone}
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      className={cn(
        "relative flex size-[22px] shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-200 outline-none hover:scale-110 focus-visible:ring-[3px] focus-visible:ring-ring/40",
        done ? "scale-110 border-primary bg-primary text-primary-foreground" : ringTone[priority],
      )}
    >
      {checking && (
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" aria-hidden />
      )}
      <CheckIcon
        strokeWidth={3.5}
        className={cn(
          "size-3 transition-all duration-200",
          done ? "scale-100 opacity-100" : "scale-50 opacity-0",
        )}
      />
    </button>
  );
}

/** Meta line under a task title: project, due, recurrence, reminder, subtasks, tags. */
export function TaskMeta({ task, compact }: { task: TaskView; compact?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const items = [];
  if (task.project && !compact)
    items.push(
      <span key="p" className="flex min-w-0 items-center gap-1.5">
        <ColorDot color={task.project.color} className="size-2" />
        <span className="truncate">{task.project.name}</span>
      </span>,
    );
  if (task.dueLabel)
    items.push(
      <Badge
        key="d"
        variant={task.overdue ? "destructive" : task.dueToday ? "warning" : "neutral"}
        className="font-semibold"
      >
        <CalendarIcon /> {task.dueLabel}
      </Badge>,
    );
  if (task.recurring)
    items.push(<RepeatIcon key="r" className="size-3.5" aria-label={t.tasks.recurring} />);
  if (task.hasReminder)
    items.push(<AlarmClockIcon key="a" className="size-3.5" aria-label={t.tasks.reminder} />);
  if (task.subtasks.total)
    items.push(
      <span key="s" className="flex items-center gap-1 tabular-nums">
        <ListChecksIcon className="size-3.5" />
        {format(t.tasks.subtaskProgress, {
          done: formatNumber(task.subtasks.done, locale),
          total: formatNumber(task.subtasks.total, locale),
        })}
      </span>,
    );
  for (const tag of task.tags.slice(0, 3))
    items.push(
      <span key={`t-${tag}`} className="font-medium text-info">
        #{tag}
      </span>,
    );
  if (task.assignee && !compact)
    items.push(
      <span key="u" className="truncate">
        {task.assignee}
      </span>,
    );
  if (!items.length) return null;
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
      {items}
    </span>
  );
}
