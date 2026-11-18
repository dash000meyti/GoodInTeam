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
import { EmptyState } from "@/components/panel/empty-state";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SMART_LISTS, type SmartListKey, type TaskGroup, type TaskView } from "./lists";
import { PriorityFlag, TaskCheck, TaskMeta } from "./task-bits";

export const listIcons: Record<SmartListKey, { icon: LucideIcon; tone: string }> = {
  inbox: { icon: InboxIcon, tone: "text-info-ink" },
  today: { icon: SunIcon, tone: "text-[#b76e00] dark:text-warning" },
  upcoming: { icon: CalendarDaysIcon, tone: "text-destructive" },
  anytime: { icon: LayersIcon, tone: "text-primary-ink" },
  waiting: { icon: HourglassIcon, tone: "text-violet" },
  someday: { icon: ArchiveIcon, tone: "text-muted-foreground" },
  done: { icon: CheckCircle2Icon, tone: "text-success-ink" },
};

/** The site's filter chip (components/site/ui.tsx `Chip`): the phone/tablet list bar. */
const CHIP =
  "flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] border border-frame-line bg-background px-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:bg-foreground aria-[current=page]:text-background";

/**
 * Smart lists, in their cell of the tasks box: rows with a square icon tile on
 * large screens (the active one with a yellow tile and a square dot, like the
 * settings nav), a horizontally scrolling chip bar on phones/tablets.
 */
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
      <div className="flex scrollbar-none gap-1.5 overflow-x-auto px-(--cell-pad) py-3 lg:hidden">
        {SMART_LISTS.map((l) => {
          const { icon: Icon, tone } = listIcons[l];
          const on = l === active;
          return (
            <button
              key={l}
              type="button"
              onClick={() => onSelect(l)}
              aria-current={on ? "page" : undefined}
              className={CHIP}
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
      <ul className="hidden py-2 lg:block">
        {SMART_LISTS.map((l) => {
          const { icon: Icon, tone } = listIcons[l];
          const on = l === active;
          return (
            <li key={l} className={cn(l === "done" && "mt-2 border-t border-frame-line pt-2")}>
              <button
                type="button"
                onClick={() => onSelect(l)}
                aria-current={on ? "page" : undefined}
                title={t.tasks[`listHint_${l}`]}
                className="group flex w-full cursor-pointer items-center gap-3 px-(--cell-pad) py-1.5 text-start text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground aria-[current=page]:bg-card aria-[current=page]:font-bold aria-[current=page]:text-foreground"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center border border-frame-line bg-background transition-colors",
                    on ? "border-[var(--primary-dark)] bg-primary text-primary-foreground" : tone,
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="flex-1 truncate">{t.tasks[`list_${l}`]}</span>
                {l === "today" && counts.overdue > 0 && (
                  <span className="bg-destructive/16 px-1.5 text-xs font-bold text-[#b71d18] tabular-nums dark:text-[#ffac82]">
                    {formatNumber(counts.overdue, locale)}
                  </span>
                )}
                {l !== "done" && counts[l] > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatNumber(counts[l], locale)}
                  </span>
                )}
                {on && <span aria-hidden className="size-1.5 shrink-0 bg-foreground" />}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TaskRow({ task, onOpen }: { task: TaskView; onOpen: (id: string) => void }) {
  const [leaving, setLeaving] = useState(false);
  const done = task.status === "done" || leaving;
  return (
    <li
      className={cn(
        "group flex items-start gap-3 px-(--cell-pad) py-3 transition-[background-color,opacity] duration-300 hover:bg-card",
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
        className="min-w-0 flex-1 cursor-pointer space-y-1 rounded-md text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

/** Grouped task list (sections with a header row, rows sharing hairlines) with per-list empty states. */
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
    <div className="divide-y divide-frame-line">
      {groups.map((g) => (
        <section key={g.key} aria-label={g.label ?? undefined}>
          {g.label && (
            <div
              className={cn(
                "flex items-center justify-between gap-3 border-b border-frame-line px-(--cell-pad) py-2.5",
                g.tone === "overdue" && "bg-destructive/6",
              )}
            >
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
          <ul className="divide-y divide-frame-line">
            {g.tasks.map((task) => (
              <TaskRow key={task.id} task={task} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
