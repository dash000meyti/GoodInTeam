/**
 * Pure smart-list logic for the tasks page (runs on the client so switching
 * lists and filters is instant). Mirrors `listWhere` in the tasks service.
 */
import type { TaskStatus } from "@/server/db/schema/work";

export const SMART_LISTS = [
  "inbox",
  "today",
  "upcoming",
  "anytime",
  "waiting",
  "someday",
  "done",
] as const;
export type SmartListKey = (typeof SMART_LISTS)[number];

export const BOARD_COLUMNS = ["todo", "in_progress", "waiting", "done"] as const;
export type BoardColumn = (typeof BOARD_COLUMNS)[number];

const ACTIVE: TaskStatus[] = ["inbox", "todo", "in_progress", "waiting"];

/** Client-side view of a task (pre-formatted labels come from the server). */
export interface TaskView {
  id: string;
  title: string;
  status: TaskStatus;
  priority: number;
  projectId: string | null;
  project: { id: string; name: string; color: string; slug: string } | null;
  tags: string[];
  /** "YYYY-MM-DD" in the app timezone. */
  dueKey: string | null;
  dueLabel: string | null;
  overdue: boolean;
  dueToday: boolean;
  hasReminder: boolean;
  recurring: boolean;
  subtasks: { done: number; total: number };
  hasNotes: boolean;
  assignee: string | null;
  sort: number;
  createdAt: number;
  completedAt: number | null;
}

export interface Filters {
  projectId: string;
  priority: string;
  tag: string;
  q: string;
}

export const emptyFilters: Filters = { projectId: "", priority: "", tag: "", q: "" };

export function inList(t: TaskView, list: SmartListKey, todayKey: string, upcomingEndKey: string) {
  switch (list) {
    case "inbox":
      return t.status === "inbox";
    case "today":
      return ACTIVE.includes(t.status) && !!t.dueKey && t.dueKey <= todayKey;
    case "upcoming":
      return (
        ACTIVE.includes(t.status) && !!t.dueKey && t.dueKey > todayKey && t.dueKey <= upcomingEndKey
      );
    case "anytime":
      return (t.status === "todo" || t.status === "in_progress") && !t.dueKey;
    case "waiting":
      return t.status === "waiting";
    case "someday":
      return t.status === "someday";
    case "done":
      return t.status === "done";
  }
}

export function matchesFilters(t: TaskView, f: Filters) {
  if (f.projectId && (f.projectId === "_none" ? t.projectId : t.projectId !== f.projectId))
    return false;
  if (f.priority && t.priority !== Number(f.priority)) return false;
  if (f.tag && !t.tags.includes(f.tag)) return false;
  if (f.q) {
    const q = f.q.trim().toLowerCase();
    const hay = `${t.title} ${t.tags.join(" ")} ${t.project?.name ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function sortForList(list: SmartListKey, tasks: TaskView[]) {
  const byDue = (a: TaskView, b: TaskView) =>
    (a.dueKey ?? "9999").localeCompare(b.dueKey ?? "9999") ||
    b.priority - a.priority ||
    a.sort - b.sort;
  switch (list) {
    case "today":
    case "upcoming":
      return [...tasks].sort(byDue);
    case "done":
      return [...tasks].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
    case "inbox":
      return [...tasks].sort((a, b) => b.createdAt - a.createdAt);
    default:
      return [...tasks].sort((a, b) => b.priority - a.priority || byDue(a, b));
  }
}

export interface TaskGroup {
  key: string;
  label: string | null;
  tone?: "overdue";
  tasks: TaskView[];
}

/** Group a list for display: Today → overdue + today; Upcoming → per day. */
export function groupTasks(
  list: SmartListKey,
  tasks: TaskView[],
  opts: {
    todayKey: string;
    dayLabels: Record<string, string>;
    overdueLabel: string;
    todayLabel: string;
  },
): TaskGroup[] {
  if (list === "today") {
    const overdue = tasks.filter((t) => t.dueKey! < opts.todayKey);
    const today = tasks.filter((t) => t.dueKey! >= opts.todayKey);
    return [
      ...(overdue.length
        ? [{ key: "overdue", label: opts.overdueLabel, tone: "overdue" as const, tasks: overdue }]
        : []),
      ...(today.length
        ? [{ key: "today", label: overdue.length ? opts.todayLabel : null, tasks: today }]
        : []),
    ];
  }
  if (list === "upcoming") {
    const map = new Map<string, TaskView[]>();
    for (const t of tasks) map.set(t.dueKey!, [...(map.get(t.dueKey!) ?? []), t]);
    return [...map.entries()].map(([key, items]) => ({
      key,
      label: opts.dayLabels[key] ?? key,
      tasks: items,
    }));
  }
  return [{ key: list, label: null, tasks }];
}

/** Board columns; done shows tasks completed in the last 14 days. */
export function boardColumns(tasks: TaskView[], now: number) {
  const recent = now - 14 * 86_400_000;
  const cols = Object.fromEntries(BOARD_COLUMNS.map((c) => [c, [] as TaskView[]])) as Record<
    BoardColumn,
    TaskView[]
  >;
  for (const t of tasks) {
    if (t.status === "done") {
      if ((t.completedAt ?? 0) >= recent) cols.done.push(t);
    } else if ((BOARD_COLUMNS as readonly string[]).includes(t.status)) {
      cols[t.status as BoardColumn].push(t);
    }
  }
  for (const c of BOARD_COLUMNS)
    cols[c].sort((a, b) => a.sort - b.sort || a.createdAt - b.createdAt);
  return cols;
}
