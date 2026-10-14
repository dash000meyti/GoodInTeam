"use client";

import { useState } from "react";
import {
  ArchiveIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  HourglassIcon,
  InboxIcon,
  LayersIcon,
  SearchXIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/panel/empty-state";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SMART_LISTS, type SmartListKey, type TaskGroup, type TaskView } from "./lists";
import { PriorityFlag, TaskCheck, TaskMeta } from "./task-bits";

export const listIcons: Record<SmartListKey, { icon: LucideIcon; tone: string }> = {
  inbox: { icon: InboxIcon, tone: "text-info" },
  today: { icon: SunIcon, tone: "text-[#b76e00] dark:text-warning" },
  upcoming: { icon: CalendarDaysIcon, tone: "text-destructive" },
  anytime: { icon: LayersIcon, tone: "text-primary" },
  waiting: { icon: HourglassIcon, tone: "text-violet" },
  someday: { icon: ArchiveIcon, tone: "text-muted-foreground" },
  done: { icon: CheckCircle2Icon, tone: "text-success" },
};

/** Smart lists: vertical card on desktop, horizontally scrolling pills on mobile. */
export function SmartListNav({
  active,
  counts,
  onSelect,
}: {
  active: SmartListKey;
  counts: Record<SmartListKey, number> & { overdue: number };
  onSelect: (list: SmartListKey) => void;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <nav aria-label={t.tasks.title}>
      <div className="-mx-4 overflow-x-auto px-4 lg:hidden">
        <div className="flex w-max gap-2 pb-1">
          {SMART_LISTS.map((l) => {
            const { icon: Icon, tone } = listIcons[l];
            const on = l === active;
            return (
              <button
                key={l}
                type="button"
                onClick={() => onSelect(l)}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                  on
                    ? "border-transparent bg-foreground text-background"
                    : "border-border bg-card hover:bg-accent",
                )}
              >
                <Icon className={cn("size-4", !on && tone)} />
                {t.tasks[`list_${l}`]}
                {l !== "done" && counts[l] > 0 && (
                  <span className="text-xs tabular-nums opacity-70">
                    {formatNumber(counts[l], locale)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <Card className="hidden gap-0.5 p-2 lg:flex">
        {SMART_LISTS.map((l) => {
          const { icon: Icon, tone } = listIcons[l];
          const on = l === active;
          return (
            <button
              key={l}
              type="button"
              onClick={() => onSelect(l)}
              aria-current={on ? "page" : undefined}
              title={t.tasks[`listHint_${l}`]}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm font-medium transition-colors hover:bg-accent",
                on && "bg-primary/8 font-bold text-foreground",
                l === "done" && "mt-2 border-t border-dashed pt-3",
              )}
            >
              <Icon className={cn("size-[18px]", tone)} />
              <span className="flex-1">{t.tasks[`list_${l}`]}</span>
              {l === "today" && counts.overdue > 0 && (
                <span className="rounded-md bg-destructive/16 px-1.5 text-xs font-bold text-[#b71d18] tabular-nums dark:text-[#ffac82]">
                  {formatNumber(counts.overdue, locale)}
                </span>
              )}
              {l !== "done" && counts[l] > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatNumber(counts[l], locale)}
                </span>
              )}
            </button>
          );
        })}
      </Card>
    </nav>
  );
}

function TaskRow({ task, onOpen }: { task: TaskView; onOpen: (id: string) => void }) {
  const [leaving, setLeaving] = useState(false);
  const done = task.status === "done" || leaving;
  return (
    <li
      className={cn(
        "group flex items-start gap-3 px-4 py-3 transition-[background-color,opacity] duration-300 hover:bg-accent/40 sm:px-5",
        leaving && "bg-primary/4",
      )}
    >
      <div className="pt-[3px]">
        <TaskCheck
          id={task.id}
          status={task.status}
          priority={task.priority}
          title={task.title}
          onDone={setLeaving}
        />
      </div>
      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="min-w-0 flex-1 cursor-pointer space-y-1 rounded-md text-start outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        <span
          className={cn(
            "block leading-6 font-semibold decoration-primary/70 decoration-2 transition-colors duration-300",
            done && "text-muted-foreground line-through",
          )}
        >
          <bdi>{task.title}</bdi>
        </span>
        <TaskMeta task={task} />
      </button>
      <PriorityFlag priority={task.priority} className="mt-1" />
    </li>
  );
}

/** Grouped task list with per-list empty states. */
export function TaskListView({
  list,
  groups,
  filtered,
  onOpen,
}: {
  list: SmartListKey;
  groups: TaskGroup[];
  filtered: boolean;
  onOpen: (id: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  if (!groups.some((g) => g.tasks.length)) {
    return filtered ? (
      <EmptyState icon={SearchXIcon} title={t.tasks.emptyFiltered} />
    ) : (
      <EmptyState
        icon={listIcons[list].icon}
        title={t.tasks[`empty_${list}`]}
        description={t.tasks[`emptyHint_${list}`]}
      />
    );
  }
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <Card key={g.key} className="gap-0 overflow-hidden py-0">
          {g.label && (
            <div className="flex items-center justify-between gap-3 border-b border-dashed bg-muted/30 px-4 py-2.5 sm:px-5">
              <h3
                className={cn(
                  "text-sm font-bold",
                  g.tone === "overdue" && "text-[#b71d18] dark:text-[#ffac82]",
                )}
              >
                {g.label}
              </h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatNumber(g.tasks.length, locale)}
              </span>
            </div>
          )}
          <ul className="divide-y divide-dashed">
            {g.tasks.map((task) => (
              <TaskRow key={task.id} task={task} onOpen={onOpen} />
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
