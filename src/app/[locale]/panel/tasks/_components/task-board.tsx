"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import {
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleDotIcon,
  HourglassIcon,
  MoreHorizontalIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { moveTaskAction } from "@/server/modules/tasks/actions";
import { BOARD_COLUMNS, boardColumns, type BoardColumn, type TaskView } from "./lists";
import { PriorityFlag, TaskMeta } from "./task-bits";

const columnStyle: Record<BoardColumn, { icon: LucideIcon; tone: string; bar: string }> = {
  todo: { icon: CircleDashedIcon, tone: "text-muted-foreground", bar: "bg-grey-500" },
  in_progress: { icon: CircleDotIcon, tone: "text-info", bar: "bg-info" },
  waiting: { icon: HourglassIcon, tone: "text-violet", bar: "bg-violet" },
  done: { icon: CheckCircle2Icon, tone: "text-success", bar: "bg-success" },
};

interface Move {
  id: string;
  status: BoardColumn;
  beforeId: string | null;
}

/**
 * Kanban by status with native HTML5 drag & drop (pointer) and a "Move to"
 * menu on every card (keyboard / touch).
 */
export function TaskBoard({
  tasks,
  now,
  onOpen,
}: {
  tasks: TaskView[];
  now: number;
  onOpen: (id: string) => void;
}) {
  const t = useT();
  const tk = t.tasks;
  const locale = useLocale();
  const [, start] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ status: BoardColumn; beforeId: string | null } | null>(null);
  const columnsRef = useRef<Partial<Record<BoardColumn, HTMLOListElement | null>>>({});

  const [items, applyMove] = useOptimistic(tasks, (state, m: Move) => {
    const moving = state.find((x) => x.id === m.id);
    if (!moving) return state;
    const rest = state.filter((x) => x.id !== m.id);
    const cols = boardColumns(rest, now);
    const col = cols[m.status];
    const idx = m.beforeId ? col.findIndex((x) => x.id === m.beforeId) : -1;
    const at = idx === -1 ? col.length : idx;
    const prev = col[at - 1]?.sort;
    const next = col[at]?.sort;
    const sort =
      prev != null && next != null ? (prev + next) / 2 : next != null ? next - 1 : (prev ?? 0) + 1;
    return [
      ...rest,
      {
        ...moving,
        status: m.status,
        sort,
        completedAt: m.status === "done" ? (moving.completedAt ?? now) : null,
      },
    ];
  });
  const cols = boardColumns(items, now);

  const move = (m: Move) => {
    const current = items.find((x) => x.id === m.id);
    if (!current) return;
    start(async () => {
      applyMove(m);
      const res = await moveTaskAction({
        id: m.id,
        status: m.status,
        beforeId: m.beforeId ?? undefined,
      });
      if (!res.ok) toast.error(res.error.message);
      else if (m.status === "done" && current.status !== "done") toast.success(tk.completed);
    });
  };

  /** Which card the pointer is above → insert before it. */
  const beforeAt = (status: BoardColumn, y: number) => {
    const list = columnsRef.current[status];
    if (!list) return null;
    for (const el of Array.from(list.querySelectorAll<HTMLElement>("[data-task-id]"))) {
      if (el.dataset.taskId === dragId) continue;
      const r = el.getBoundingClientRect();
      if (y < r.top + r.height / 2) return el.dataset.taskId ?? null;
    }
    return null;
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="grid w-max auto-cols-[minmax(17rem,82vw)] grid-flow-col gap-4 sm:auto-cols-[18rem] xl:w-full xl:grid-flow-row xl:grid-cols-4">
        {BOARD_COLUMNS.map((status) => {
          const { icon: Icon, tone, bar } = columnStyle[status];
          const list = cols[status];
          const isOver = over?.status === status;
          return (
            <section
              key={status}
              aria-label={tk[`status_${status}`]}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                const beforeId = beforeAt(status, e.clientY);
                if (over?.status !== status || over.beforeId !== beforeId)
                  setOver({ status, beforeId });
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || dragId;
                if (id) move({ id, status, beforeId: beforeAt(status, e.clientY) });
                setDragId(null);
                setOver(null);
              }}
              className={cn(
                "flex min-h-72 flex-col rounded-2xl bg-muted/50 p-2 transition-colors",
                isOver && "bg-primary/8 ring-2 ring-primary/30",
              )}
            >
              <header className="flex items-center gap-2 px-2 pt-1 pb-3">
                <Icon className={cn("size-4", tone)} />
                <h3 className="text-sm font-bold">{tk[`status_${status}`]}</h3>
                <span className="ms-auto rounded-full bg-background px-2 text-xs font-bold text-muted-foreground tabular-nums">
                  {formatNumber(list.length, locale)}
                </span>
              </header>
              <ol
                ref={(el) => {
                  columnsRef.current[status] = el;
                }}
                className="flex flex-1 flex-col gap-2"
              >
                {list.map((task) => (
                  <li key={task.id} data-task-id={task.id}>
                    {isOver && over.beforeId === task.id && <DropLine />}
                    <BoardCard
                      task={task}
                      bar={bar}
                      dragging={dragId === task.id}
                      onOpen={onOpen}
                      onMove={(to) => move({ id: task.id, status: to, beforeId: null })}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", task.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragId(task.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOver(null);
                      }}
                    />
                  </li>
                ))}
                {isOver && over.beforeId === null && <DropLine />}
                {list.length === 0 && !isOver && (
                  <li className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-border p-6 text-xs text-muted-foreground">
                    {tk.emptyColumn}
                  </li>
                )}
              </ol>
            </section>
          );
        })}
      </div>
      <p className="mt-3 hidden text-xs text-muted-foreground sm:block">{tk.dragHint}</p>
    </div>
  );
}

function DropLine() {
  return <div className="my-1 h-1 rounded-full bg-primary/70" aria-hidden />;
}

function BoardCard({
  task,
  bar,
  dragging,
  onOpen,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  task: TaskView;
  bar: string;
  dragging: boolean;
  onOpen: (id: string) => void;
  onMove: (status: BoardColumn) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const t = useT();
  const tk = t.tasks;
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative cursor-grab overflow-hidden rounded-xl bg-card p-3 shadow-card transition-[opacity,transform,box-shadow] hover:shadow-dropdown active:cursor-grabbing dark:border dark:border-border",
        dragging && "scale-[0.98] opacity-40",
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 start-0 w-1", bar)}
        style={task.project ? { backgroundColor: task.project.color } : undefined}
      />
      <div className="flex items-start gap-2 ps-1.5">
        <button
          type="button"
          onClick={() => onOpen(task.id)}
          className={cn(
            "min-w-0 flex-1 cursor-pointer text-start text-sm leading-6 font-semibold outline-none focus-visible:underline",
            task.status === "done" && "text-muted-foreground line-through",
          )}
        >
          <bdi>{task.title}</bdi>
        </button>
        <PriorityFlag priority={task.priority} className="mt-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="-me-1 -mt-1 size-7 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
              aria-label={tk.moveTo}
            >
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onOpen(task.id)}>{tk.open}</DropdownMenuItem>
            <DropdownMenuLabel className="text-xs">{tk.moveTo}</DropdownMenuLabel>
            {BOARD_COLUMNS.filter((c) => c !== task.status).map((c) => {
              const Icon = columnStyle[c].icon;
              return (
                <DropdownMenuItem key={c} onSelect={() => onMove(c)}>
                  <Icon className={columnStyle[c].tone} /> {tk[`status_${c}`]}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-2 ps-1.5">
        <TaskMeta task={task} />
      </div>
    </article>
  );
}
