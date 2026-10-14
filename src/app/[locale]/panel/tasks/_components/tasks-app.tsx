"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { KanbanSquareIcon, ListIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageHeader } from "@/components/panel/page-header";
import type { ProjectOption } from "@/components/time/project-select";
import { useT } from "@/i18n/client";
import {
  groupTasks,
  inList,
  matchesFilters,
  SMART_LISTS,
  sortForList,
  type Filters,
  type SmartListKey,
  type TaskView,
} from "./lists";
import { QuickAdd } from "./quick-add";
import { TaskBoard } from "./task-board";
import { TaskFilters } from "./task-filters";
import { SmartListNav, TaskListView } from "./task-list";
import { TaskSheet } from "./task-sheet";

export interface TasksAppProps {
  tasks: TaskView[];
  projects: ProjectOption[];
  tags: string[];
  assignees: { id: string; name: string }[];
  tz: string;
  now: number;
  todayKey: string;
  upcomingEndKey: string;
  dayLabels: Record<string, string>;
  initial: {
    list: SmartListKey;
    view: "list" | "board";
    filters: Filters;
    taskId: string | null;
  };
  crumbs: { label: string; href?: string }[];
}

/** Sync UI state into the URL without a server round-trip (shareable/reloadable). */
function syncUrl(state: {
  list: SmartListKey;
  view: string;
  filters: Filters;
  taskId: string | null;
}) {
  const sp = new URLSearchParams();
  if (state.view === "board") sp.set("view", "board");
  else if (state.list !== "today") sp.set("list", state.list);
  if (state.filters.projectId) sp.set("project", state.filters.projectId);
  if (state.filters.priority) sp.set("priority", state.filters.priority);
  if (state.filters.tag) sp.set("tag", state.filters.tag);
  if (state.filters.q) sp.set("q", state.filters.q);
  if (state.taskId) sp.set("task", state.taskId);
  const qs = sp.toString();
  const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
  if (url !== `${window.location.pathname}${window.location.search}`)
    window.history.replaceState(null, "", url);
}

/**
 * The whole tasks experience as one client island: smart lists, filters and
 * the list/board switch are instant (computed from server data); mutations go
 * through server actions and `refresh()` streams fresh data back in.
 */
export function TasksApp(props: TasksAppProps) {
  const t = useT();
  const tk = t.tasks;
  const [list, setList] = useState<SmartListKey>(props.initial.list);
  const [view, setView] = useState(props.initial.view);
  const [filters, setFilters] = useState<Filters>(props.initial.filters);
  const [taskId, setTaskId] = useState<string | null>(props.initial.taskId);
  const quickAdd = useRef<HTMLInputElement>(null);

  useEffect(() => syncUrl({ list, view, filters, taskId }), [list, view, filters, taskId]);

  // "n" focuses quick add (when not typing somewhere else).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (el?.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      if (e.key === "n" || e.key === "ن") {
        e.preventDefault();
        quickAdd.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(() => {
    const c = Object.fromEntries(SMART_LISTS.map((l) => [l, 0])) as Record<SmartListKey, number>;
    let overdue = 0;
    for (const task of props.tasks) {
      for (const l of SMART_LISTS)
        if (inList(task, l, props.todayKey, props.upcomingEndKey)) c[l]++;
      if (task.overdue && task.status !== "done" && task.status !== "someday") overdue++;
    }
    return { ...c, overdue };
  }, [props.tasks, props.todayKey, props.upcomingEndKey]);

  const filtered = useMemo(
    () => props.tasks.filter((task) => matchesFilters(task, filters)),
    [props.tasks, filters],
  );

  const groups = useMemo(
    () =>
      groupTasks(
        list,
        sortForList(
          list,
          filtered.filter((task) => inList(task, list, props.todayKey, props.upcomingEndKey)),
        ),
        {
          todayKey: props.todayKey,
          dayLabels: props.dayLabels,
          overdueLabel: tk.overdue,
          todayLabel: t.common.today,
        },
      ),
    [
      filtered,
      list,
      props.todayKey,
      props.upcomingEndKey,
      props.dayLabels,
      tk.overdue,
      t.common.today,
    ],
  );

  const filtersActive = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader
        title={tk.title}
        description={tk.subtitle}
        crumbs={props.crumbs}
        actions={
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setView(v as typeof view)}
            aria-label={`${tk.view_list} / ${tk.view_board}`}
          >
            <ToggleGroupItem value="list" className="px-3">
              <ListIcon /> {tk.view_list}
            </ToggleGroupItem>
            <ToggleGroupItem value="board" className="px-3">
              <KanbanSquareIcon /> {tk.view_board}
            </ToggleGroupItem>
          </ToggleGroup>
        }
      />

      <QuickAdd
        ref={quickAdd}
        projects={props.projects}
        tz={props.tz}
        now={props.now}
        list={view === "board" ? "anytime" : list}
        todayKey={props.todayKey}
        filterProjectId={filters.projectId}
      />

      <div
        className={
          view === "list"
            ? "mt-6 grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6"
            : "mt-6 grid gap-4"
        }
      >
        {view === "list" && (
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <SmartListNav active={list} counts={counts} onSelect={setList} />
          </aside>
        )}
        <div className="min-w-0 space-y-4">
          <TaskFilters
            value={filters}
            onChange={setFilters}
            projects={props.projects}
            tags={props.tags}
          />
          {view === "list" ? (
            <TaskListView list={list} groups={groups} filtered={filtersActive} onOpen={setTaskId} />
          ) : (
            <TaskBoard tasks={filtered} now={props.now} onOpen={setTaskId} />
          )}
        </div>
      </div>

      <TaskSheet
        taskId={taskId}
        onClose={() => setTaskId(null)}
        onOpenTask={setTaskId}
        projects={props.projects}
        assignees={props.assignees}
        tz={props.tz}
      />
    </>
  );
}
