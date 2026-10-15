import { describe, expect, it } from "vitest";
import {
  boardColumns,
  groupTasks,
  inList,
  matchesFilters,
  sortForList,
  type TaskView,
} from "./lists";

const task = (over: Partial<TaskView>): TaskView => ({
  id: Math.random().toString(36).slice(2),
  title: "Task",
  status: "todo",
  priority: 0,
  projectId: null,
  project: null,
  tags: [],
  dueKey: null,
  dueLabel: null,
  overdue: false,
  dueToday: false,
  hasReminder: false,
  recurring: false,
  subtasks: { done: 0, total: 0 },
  hasNotes: false,
  assignee: null,
  sort: 0,
  createdAt: 0,
  completedAt: null,
  ...over,
});

const today = "2026-10-14";
const end = "2026-10-28";

describe("smart lists", () => {
  it("assigns tasks to lists", () => {
    const overdue = task({ dueKey: "2026-10-10" });
    const due = task({ dueKey: today, status: "inbox" });
    const soon = task({ dueKey: "2026-10-20" });
    const far = task({ dueKey: "2026-12-01" });
    const undated = task({});
    const parked = task({ status: "someday", dueKey: today });
    const done = task({ status: "done", dueKey: today });
    const is = (t: TaskView, l: Parameters<typeof inList>[1]) => inList(t, l, today, end);

    expect([overdue, due, soon, far, undated, parked, done].filter((t) => is(t, "today"))).toEqual([
      overdue,
      due,
    ]);
    expect(is(soon, "upcoming") && !is(far, "upcoming") && !is(due, "upcoming")).toBe(true);
    expect(is(undated, "anytime") && !is(parked, "anytime")).toBe(true);
    expect(is(due, "inbox") && is(parked, "someday") && is(done, "done")).toBe(true);
  });

  it("filters by project, priority, tag and text", () => {
    const t = task({
      title: "Fix iOS bug",
      projectId: "p1",
      project: { id: "p1", name: "Narenj", color: "#000", slug: "narenj" },
      priority: 4,
      tags: ["mobile"],
    });
    const f = { projectId: "", priority: "", tag: "", q: "" };
    expect(matchesFilters(t, f)).toBe(true);
    expect(
      matchesFilters(t, { ...f, projectId: "p1", priority: "4", tag: "mobile", q: "ios" }),
    ).toBe(true);
    expect(matchesFilters(t, { ...f, q: "narenj" })).toBe(true);
    expect(matchesFilters(t, { ...f, projectId: "_none" })).toBe(false);
    expect(matchesFilters(t, { ...f, priority: "1" })).toBe(false);
    expect(matchesFilters(t, { ...f, tag: "web" })).toBe(false);
  });

  it("groups today: only tasks flagged overdue go in the overdue group", () => {
    const opts = { todayKey: today, dayLabels: {}, overdueLabel: "Overdue", todayLabel: "Today" };
    // All-day task due today: not overdue until the day ends.
    const allDayToday = task({ dueKey: today, overdue: false, dueToday: true });
    // Timed task due earlier today whose time has passed: overdue.
    const timedPast = task({ dueKey: today, overdue: true, dueToday: true });
    const yesterday = task({ dueKey: "2026-10-13", overdue: true });
    const groups = groupTasks("today", [allDayToday, timedPast, yesterday], opts);
    expect(groups.map((g) => [g.key, g.tasks.map((t) => t.id)])).toEqual([
      ["overdue", [timedPast.id, yesterday.id]],
      ["today", [allDayToday.id]],
    ]);
    // Nothing overdue → a single unlabeled group.
    expect(groupTasks("today", [allDayToday], opts)).toEqual([
      { key: "today", label: null, tasks: [allDayToday] },
    ]);
  });

  it("groups today (overdue first) and upcoming by day", () => {
    const a = task({ dueKey: "2026-10-12", overdue: true });
    const b = task({ dueKey: today, priority: 3 });
    const opts = {
      todayKey: today,
      dayLabels: { "2026-10-15": "Tomorrow" },
      overdueLabel: "Overdue",
      todayLabel: "Today",
    };
    const groups = groupTasks("today", sortForList("today", [b, a]), opts);
    expect(groups.map((g) => [g.key, g.tasks.length])).toEqual([
      ["overdue", 1],
      ["today", 1],
    ]);
    const up = groupTasks(
      "upcoming",
      [task({ dueKey: "2026-10-15" }), task({ dueKey: "2026-10-15" })],
      opts,
    );
    expect(up).toMatchObject([{ key: "2026-10-15", label: "Tomorrow" }]);
  });

  it("builds board columns", () => {
    const now = Date.UTC(2026, 9, 14);
    const cols = boardColumns(
      [
        task({ status: "todo", sort: 2 }),
        task({ status: "todo", sort: 1, title: "first" }),
        task({ status: "inbox" }),
        task({ status: "done", completedAt: now - 86_400_000 }),
        task({ status: "done", completedAt: now - 30 * 86_400_000 }),
      ],
      now,
    );
    expect(cols.todo.map((t) => t.title)).toEqual(["first", "Task"]);
    expect(cols.done).toHaveLength(1);
    expect(cols.in_progress).toHaveLength(0);
  });
});
