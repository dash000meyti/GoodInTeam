import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lt,
  ne,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/server/db/client";
import { projects, tasks, timeEntries, users, type TaskStatus } from "@/server/db/schema";
import { assertStaff, isStaff, type Actor } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { AppError, forbidden, notFound } from "@/server/errors";
import { projectAccessWhere, recalcProgress } from "@/server/modules/projects/service";
import { appTimezone } from "@/server/modules/settings/service";
import { startTimer } from "@/server/modules/time/service";
import { normalizeClock } from "@/lib/duration";
import { parseQuickAdd } from "@/lib/quick-add";
import { addDays, fromDateInput, startOfDay, toDateInputValue, toTimeInputValue } from "@/lib/tz";
import { accessibleTask, taskAccessWhere } from "./access";
import { nextTaskOccurrence } from "./recurrence";
import type {
  addSubtaskInput,
  createTaskInput,
  listTasksInput,
  moveTaskInput,
  SmartList,
  updateTaskInput,
} from "./schemas";

export { taskAccessWhere };

/** Statuses that count as "open" (not finished). */
export const OPEN_STATUSES = ["inbox", "todo", "in_progress", "waiting", "someday"] as const;
/** Statuses that show up in Today / Upcoming (someday is deliberately parked). */
const ACTIVE_STATUSES = ["inbox", "todo", "in_progress", "waiting"] as const;
export const BOARD_STATUSES = ["todo", "in_progress", "waiting", "done"] as const;
export const UPCOMING_DAYS = 14;
const NO_PROJECT = "_none";

// ─── Helpers ────────────────────────────────────────────────────────────────

function accessibleProjectId(actor: Actor, projectId: string) {
  const p = db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), projectAccessWhere(actor)))
    .get();
  if (!p) throw notFound("Project");
  return p.id;
}

/** Keep project progress in sync when it is computed from tasks. */
function syncProgress(...projectIds: (string | null | undefined)[]) {
  for (const id of new Set(projectIds.filter((x): x is string => !!x))) {
    const p = db
      .select({ mode: projects.progressMode })
      .from(projects)
      .where(eq(projects.id, id))
      .get();
    if (p?.mode === "tasks") recalcProgress(id);
  }
}

function validAssignee(id: string | null | undefined) {
  if (!id) return null;
  const u = db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, id), ne(users.role, "client"), eq(users.disabled, false)))
    .get();
  if (!u) throw new AppError("validation", "Unknown assignee", { assigneeId: ["Unknown user"] });
  return u.id;
}

function dueFrom(dueDate: string, dueTime: string | null | undefined, tz: string) {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : null;
  if (!day) {
    const d = new Date(dueDate);
    if (Number.isNaN(d.getTime()))
      throw new AppError("validation", "Invalid due date (use YYYY-MM-DD)", {
        dueDate: ["Invalid date"],
      });
    return { dueAt: d, dueAllDay: false };
  }
  const time = dueTime ? normalizeClock(dueTime) : null;
  if (dueTime && !time)
    throw new AppError("validation", "Invalid due time (use HH:mm)", { dueTime: ["Invalid time"] });
  return { dueAt: fromDateInput(day, time ?? undefined, tz), dueAllDay: !time };
}

function remindFrom(
  input: { remindAt?: string | null; remindDate?: string | null; remindTime?: string | null },
  tz: string,
): Date | null | undefined {
  if (input.remindDate !== undefined) {
    if (!input.remindDate) return null;
    const time = normalizeClock(input.remindTime ?? "09:00");
    if (!time || !/^\d{4}-\d{2}-\d{2}$/.test(input.remindDate))
      throw new AppError("validation", "Invalid reminder", { remindTime: ["Invalid time"] });
    return fromDateInput(input.remindDate, time, tz);
  }
  if (input.remindAt === undefined) return undefined;
  if (!input.remindAt) return null;
  const d = new Date(input.remindAt);
  if (Number.isNaN(d.getTime()))
    throw new AppError("validation", "Invalid reminder (ISO 8601)", { remindAt: ["Invalid date"] });
  return d;
}

/** Resolve "+slug" from quick-add: exact slug, then prefix, then name contains. */
export function resolveProjectSlug(actor: Actor, slug: string) {
  const access = projectAccessWhere(actor);
  const active = and(access, isNull(projects.archivedAt));
  const exact = db
    .select({ id: projects.id })
    .from(projects)
    .where(and(active, eq(projects.slug, slug)))
    .get();
  if (exact) return exact.id;
  const prefix = db
    .select({ id: projects.id })
    .from(projects)
    .where(and(active, or(like(projects.slug, `${slug}%`), like(projects.name, `%${slug}%`))))
    .orderBy(asc(projects.name))
    .get();
  return prefix?.id ?? null;
}

function nextSort(where?: SQL) {
  return (
    (db
      .select({ s: sql<number>`coalesce(max(${tasks.sort}), 0)` })
      .from(tasks)
      .where(where)
      .get()?.s ?? 0) + 1
  );
}

const projectCols = { id: true, name: true, color: true, slug: true } as const;

// ─── Queries ────────────────────────────────────────────────────────────────

function filtersWhere(f: z.output<typeof listTasksInput>) {
  return and(
    f.projectId
      ? f.projectId === NO_PROJECT
        ? isNull(tasks.projectId)
        : eq(tasks.projectId, f.projectId)
      : undefined,
    f.priority != null ? eq(tasks.priority, f.priority) : undefined,
    f.tag ? sql`exists (select 1 from json_each(${tasks.tags}) where value = ${f.tag})` : undefined,
    f.q ? or(like(tasks.title, `%${f.q}%`), like(tasks.notes, `%${f.q}%`)) : undefined,
    f.includeSubtasks ? undefined : isNull(tasks.parentId),
  );
}

function dayBounds(now: number, tz: string) {
  const today = startOfDay(now, tz);
  const tomorrow = addDays(today, 1, tz);
  return { today, tomorrow, upcomingEnd: addDays(tomorrow, UPCOMING_DAYS, tz) };
}

function listWhere(list: SmartList | undefined, b: ReturnType<typeof dayBounds>) {
  switch (list) {
    case "inbox":
      return eq(tasks.status, "inbox");
    case "today":
      return and(inArray(tasks.status, [...ACTIVE_STATUSES]), lt(tasks.dueAt, b.tomorrow));
    case "upcoming":
      return and(
        inArray(tasks.status, [...ACTIVE_STATUSES]),
        gte(tasks.dueAt, b.tomorrow),
        lt(tasks.dueAt, b.upcomingEnd),
      );
    case "anytime":
      return and(inArray(tasks.status, ["todo", "in_progress"]), isNull(tasks.dueAt));
    case "waiting":
      return eq(tasks.status, "waiting");
    case "someday":
      return eq(tasks.status, "someday");
    case "done":
      return eq(tasks.status, "done");
    default:
      return inArray(tasks.status, [...OPEN_STATUSES]);
  }
}

function listOrder(list: SmartList | undefined) {
  switch (list) {
    case "today":
    case "upcoming":
      return [asc(tasks.dueAt), desc(tasks.priority), asc(tasks.sort)];
    case "done":
      return [desc(tasks.completedAt)];
    case "inbox":
      return [desc(tasks.createdAt)];
    default:
      return [
        desc(tasks.priority),
        asc(sql`${tasks.dueAt} is null`),
        asc(tasks.dueAt),
        asc(tasks.sort),
      ];
  }
}

async function withExtras<T extends { id: string }>(rows: T[]) {
  const ids = rows.map((r) => r.id);
  const subs = ids.length
    ? db
        .select({
          parentId: tasks.parentId,
          total: count(),
          done: sql<number>`sum(case when ${tasks.status} = 'done' then 1 else 0 end)`,
        })
        .from(tasks)
        .where(and(inArray(tasks.parentId, ids), ne(tasks.status, "canceled")))
        .groupBy(tasks.parentId)
        .all()
    : [];
  const map = new Map(subs.map((s) => [s.parentId, { total: s.total, done: s.done ?? 0 }]));
  return rows.map((r) => ({ ...r, subtasks: map.get(r.id) ?? { total: 0, done: 0 } }));
}

/** Tasks for a smart list (or all open tasks) with filters. Top-level only by default. */
export async function listTasks(
  actor: Actor,
  input: z.output<typeof listTasksInput>,
  now = Date.now(),
) {
  assertStaff(actor);
  const tz = appTimezone();
  const b = dayBounds(now, tz);
  const rows = await db.query.tasks.findMany({
    where: and(taskAccessWhere(actor), listWhere(input.list, b), filtersWhere(input)),
    with: {
      project: { columns: projectCols },
      assignee: { columns: { id: true, name: true } },
    },
    orderBy: listOrder(input.list),
    limit: input.list === "done" ? Math.min(input.limit ?? 50, 200) : (input.limit ?? 500),
  });
  return withExtras(rows);
}

export type TaskListItem = Awaited<ReturnType<typeof listTasks>>[number];

/** Badge counts for every smart list (access-scoped, unfiltered, top-level). */
export function smartListCounts(actor: Actor, now = Date.now()) {
  assertStaff(actor);
  const b = dayBounds(now, appTimezone());
  const base = and(taskAccessWhere(actor), isNull(tasks.parentId));
  const n = (where: SQL | undefined) =>
    db.select({ n: count() }).from(tasks).where(and(base, where)).get()?.n ?? 0;
  return {
    inbox: n(listWhere("inbox", b)),
    today: n(listWhere("today", b)),
    overdue: n(and(inArray(tasks.status, [...ACTIVE_STATUSES]), lt(tasks.dueAt, b.today))),
    upcoming: n(listWhere("upcoming", b)),
    anytime: n(listWhere("anytime", b)),
    waiting: n(listWhere("waiting", b)),
    someday: n(listWhere("someday", b)),
    done: Math.min(n(listWhere("done", b)), 50),
  };
}

/** Kanban columns (todo / in_progress / waiting / done — done: last 14 days). */
export async function boardTasks(
  actor: Actor,
  input: z.output<typeof listTasksInput>,
  now = Date.now(),
) {
  assertStaff(actor);
  const tz = appTimezone();
  const recent = addDays(startOfDay(now, tz), -14, tz);
  const rows = await db.query.tasks.findMany({
    where: and(
      taskAccessWhere(actor),
      filtersWhere(input),
      or(
        inArray(tasks.status, ["todo", "in_progress", "waiting"]),
        and(eq(tasks.status, "done"), gte(tasks.completedAt, recent)),
      ),
    ),
    with: {
      project: { columns: projectCols },
      assignee: { columns: { id: true, name: true } },
    },
    orderBy: [asc(tasks.sort), asc(tasks.createdAt)],
    limit: 400,
  });
  return withExtras(rows);
}

/** Full task with subtasks, project and tracked time. */
export async function getTask(actor: Actor, id: string) {
  assertStaff(actor);
  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), taskAccessWhere(actor)),
    with: {
      project: { columns: projectCols },
      assignee: { columns: { id: true, name: true } },
    },
  });
  if (!task) throw notFound("Task");
  const subtasks = db
    .select({ id: tasks.id, title: tasks.title, status: tasks.status })
    .from(tasks)
    .where(eq(tasks.parentId, id))
    .orderBy(asc(tasks.sort), asc(tasks.createdAt))
    .all();
  const parent = task.parentId
    ? (db
        .select({ id: tasks.id, title: tasks.title })
        .from(tasks)
        .where(eq(tasks.id, task.parentId))
        .get() ?? null)
    : null;
  const now = Date.now();
  const trackedMs =
    db
      .select({
        ms: sql<number>`coalesce(sum(coalesce(${timeEntries.endedAt}, ${now}) - ${timeEntries.startedAt}), 0)`,
      })
      .from(timeEntries)
      .where(eq(timeEntries.taskId, id))
      .get()?.ms ?? 0;
  const running = !!db
    .select({ id: timeEntries.id })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.taskId, id),
        eq(timeEntries.userId, actor.user.id),
        isNull(timeEntries.endedAt),
      ),
    )
    .get();
  return { ...task, subtasks, parent, trackedMs, timerRunning: running };
}

export type TaskDetail = Awaited<ReturnType<typeof getTask>>;

/** Distinct tags used on visible tasks (for filters). */
export function listTaskTags(actor: Actor) {
  assertStaff(actor);
  const rows = db
    .select({ tags: tasks.tags })
    .from(tasks)
    .where(and(taskAccessWhere(actor), sql`${tasks.tags} != '[]'`))
    .all();
  return [...new Set(rows.flatMap((r) => r.tags ?? []))].sort((a, b) => a.localeCompare(b));
}

/** Open tasks for pickers (e.g. the timer's task select). */
export function taskPickerOptions(actor: Actor) {
  assertStaff(actor);
  return db
    .select({ id: tasks.id, title: tasks.title, projectId: tasks.projectId })
    .from(tasks)
    .where(and(taskAccessWhere(actor), notInArray(tasks.status, ["done", "canceled"])))
    .orderBy(desc(tasks.priority), asc(sql`${tasks.dueAt} is null`), asc(tasks.dueAt))
    .limit(500)
    .all();
}

/** Staff users tasks can be assigned to. */
export function assigneeOptions(actor: Actor) {
  assertStaff(actor);
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(ne(users.role, "client"), eq(users.disabled, false)))
    .orderBy(asc(users.name))
    .all();
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Create a task. `text` is parsed with the quick-add syntax; explicit fields win.
 * Default status: "todo" when it has a project or due date, else "inbox".
 */
export function createTask(
  actor: Actor,
  input: z.output<typeof createTaskInput>,
  now = Date.now(),
) {
  assertStaff(actor);
  const tz = appTimezone();
  let title = input.title?.trim() ?? "";
  let projectId = input.projectId ?? null;
  let { priority, dueDate, dueTime } = input;
  let tags = input.tags ?? [];

  if (input.text) {
    const parsed = parseQuickAdd(input.text, { now, tz });
    let parsedTitle = parsed.title;
    if (parsed.project && input.projectId === undefined) {
      const id = resolveProjectSlug(actor, parsed.project);
      if (id) projectId = id;
      else {
        const raw = parsed.tokens.find((t) => t.kind === "project")?.raw;
        if (raw) parsedTitle = `${parsedTitle} ${raw}`.trim();
      }
    }
    title ||= parsedTitle;
    priority ??= parsed.priority;
    if (dueDate === undefined && parsed.dueDate) dueDate = parsed.dueDate;
    if (dueTime === undefined && parsed.dueTime) {
      dueTime = parsed.dueTime;
      dueDate ??= toDateInputValue(now, tz);
    }
    tags = [...new Set([...tags, ...parsed.tags])];
  }
  if (!title) throw new AppError("validation", "Title is required", { title: ["Required"] });

  let parent: typeof tasks.$inferSelect | null = null;
  if (input.parentId) {
    parent = accessibleTask(actor, input.parentId);
    if (input.projectId === undefined) projectId = parent.projectId;
  }
  if (projectId) accessibleProjectId(actor, projectId);

  const due = dueDate ? dueFrom(dueDate, dueTime, tz) : { dueAt: null, dueAllDay: true };
  const remindAt = remindFrom(input, tz) ?? null;
  const status: TaskStatus = input.status ?? (projectId || due.dueAt || parent ? "todo" : "inbox");

  const row = db
    .insert(tasks)
    .values({
      title,
      notes: input.notes ?? null,
      projectId,
      parentId: parent?.id ?? null,
      status,
      priority: priority ?? 0,
      dueAt: due.dueAt,
      dueAllDay: due.dueAllDay,
      remindAt,
      estimateMinutes: input.estimateMinutes ?? null,
      recurrence: input.recurrence ?? null,
      tags,
      sort: nextSort(parent ? eq(tasks.parentId, parent.id) : isNull(tasks.parentId)),
      assigneeId: validAssignee(input.assigneeId),
      visibleToClient: input.visibleToClient ?? false,
      completedAt: status === "done" ? new Date(now) : null,
      createdBy: actor.user.id,
    })
    .returning()
    .get();
  logActivity(actor, "task.create", "task", row.id, row.title);
  syncProgress(projectId);
  return row;
}

export function addSubtask(actor: Actor, input: z.output<typeof addSubtaskInput>) {
  return createTask(actor, { title: input.title, parentId: input.parentId, status: "todo" });
}

export function updateTask(
  actor: Actor,
  input: z.output<typeof updateTaskInput>,
  now = Date.now(),
) {
  const t = accessibleTask(actor, input.id);
  const tz = appTimezone();
  const patch: Partial<typeof tasks.$inferInsert> = {};

  if (input.title !== undefined) patch.title = input.title;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.estimateMinutes !== undefined) patch.estimateMinutes = input.estimateMinutes;
  if (input.recurrence !== undefined) patch.recurrence = input.recurrence;
  if (input.visibleToClient !== undefined) patch.visibleToClient = input.visibleToClient;
  if (input.assigneeId !== undefined) patch.assigneeId = validAssignee(input.assigneeId);
  if (input.projectId !== undefined && input.projectId !== t.projectId) {
    if (input.projectId) accessibleProjectId(actor, input.projectId);
    patch.projectId = input.projectId;
  }

  if (input.dueDate !== undefined) {
    if (!input.dueDate) Object.assign(patch, { dueAt: null, dueAllDay: true });
    else Object.assign(patch, dueFrom(input.dueDate, input.dueTime, tz));
  } else if (input.dueTime !== undefined && t.dueAt) {
    Object.assign(patch, dueFrom(toDateInputValue(t.dueAt, tz), input.dueTime, tz));
  }

  const remindAt = remindFrom(input, tz);
  if (remindAt !== undefined && remindAt?.getTime() !== t.remindAt?.getTime()) {
    patch.remindAt = remindAt;
    patch.remindedAt = null; // fire again for the new time
  }

  const completing = input.status === "done" && t.status !== "done";
  if (input.status && !completing && input.status !== t.status) {
    patch.status = input.status;
    if (t.status === "done") patch.completedAt = null;
    if (input.status === "canceled") patch.completedAt = null;
  }

  let row = t;
  if (Object.keys(patch).length) {
    row = db.update(tasks).set(patch).where(eq(tasks.id, t.id)).returning().get()!;
    if (patch.projectId !== undefined) {
      // Subtasks follow their parent.
      db.update(tasks).set({ projectId: patch.projectId }).where(eq(tasks.parentId, t.id)).run();
    }
    logActivity(actor, "task.update", "task", t.id, row.title);
  }
  let nextId: string | null = null;
  if (completing) nextId = completeTask(actor, t.id, now).nextId;
  syncProgress(t.projectId, row.projectId);
  return { ...row, nextId };
}

/**
 * Mark a task done. Recurring tasks spawn their next occurrence (same fields,
 * dates shifted, subtasks copied as open). Returns the new occurrence's id.
 */
export function completeTask(actor: Actor, id: string, now = Date.now()) {
  const t = accessibleTask(actor, id);
  if (t.status === "done") return { task: t, nextId: null as string | null };
  const tz = appTimezone();
  const next = nextTaskOccurrence(t, { now, tz });
  let nextId: string | null = null;

  const task = db.transaction((tx) => {
    const done = tx
      .update(tasks)
      .set({ status: "done", completedAt: new Date(now) })
      .where(eq(tasks.id, id))
      .returning()
      .get()!;
    if (next) {
      const copy = tx
        .insert(tasks)
        .values({
          title: t.title,
          notes: t.notes,
          projectId: t.projectId,
          parentId: t.parentId,
          status: t.status === "someday" || t.status === "waiting" ? t.status : "todo",
          priority: t.priority,
          dueAt: next.dueAt,
          dueAllDay: t.dueAllDay,
          remindAt: next.remindAt,
          estimateMinutes: t.estimateMinutes,
          recurrence: t.recurrence,
          tags: t.tags,
          sort: t.sort,
          assigneeId: t.assigneeId,
          visibleToClient: t.visibleToClient,
          createdBy: t.createdBy,
        })
        .returning({ id: tasks.id })
        .get();
      nextId = copy.id;
      const subs = tx.select().from(tasks).where(eq(tasks.parentId, id)).all();
      for (const s of subs) {
        if (s.status === "canceled") continue;
        tx.insert(tasks)
          .values({
            title: s.title,
            notes: s.notes,
            projectId: s.projectId,
            parentId: copy.id,
            status: "todo",
            priority: s.priority,
            tags: s.tags,
            sort: s.sort,
            estimateMinutes: s.estimateMinutes,
            assigneeId: s.assigneeId,
            visibleToClient: s.visibleToClient,
            createdBy: s.createdBy,
          })
          .run();
      }
    }
    return done;
  });
  logActivity(actor, "task.complete", "task", id, t.title, nextId ? { nextId } : undefined);
  syncProgress(t.projectId);
  return { task, nextId };
}

/** Undo completion: back to `status` (default todo); optionally delete the spawned occurrence. */
export function reopenTask(
  actor: Actor,
  input: { id: string; status?: TaskStatus; spawnedId?: string },
) {
  const t = accessibleTask(actor, input.id);
  const status = input.status && input.status !== "done" ? input.status : "todo";
  db.update(tasks).set({ status, completedAt: null }).where(eq(tasks.id, t.id)).run();
  if (input.spawnedId) {
    const spawned = accessibleTask(actor, input.spawnedId);
    if (spawned.status !== "done" && spawned.title === t.title) deleteTaskRow(spawned.id);
  }
  logActivity(actor, "task.reopen", "task", t.id, t.title);
  syncProgress(t.projectId);
}

/** Board drag & drop: change status and position (before `beforeId`, or at the end). */
export function moveTask(actor: Actor, input: z.output<typeof moveTaskInput>, now = Date.now()) {
  const t = accessibleTask(actor, input.id);
  let sort: number;
  const before = input.beforeId ? accessibleTask(actor, input.beforeId) : null;
  if (before && before.id !== t.id) {
    const prev = db
      .select({ sort: tasks.sort })
      .from(tasks)
      .where(
        and(
          eq(tasks.status, input.status),
          lt(tasks.sort, before.sort),
          ne(tasks.id, t.id),
          taskAccessWhere(actor),
        ),
      )
      .orderBy(desc(tasks.sort))
      .get();
    sort = prev ? (prev.sort + before.sort) / 2 : before.sort - 1;
  } else {
    sort = nextSort(eq(tasks.status, input.status));
  }
  db.update(tasks).set({ sort }).where(eq(tasks.id, t.id)).run();
  if (input.status === t.status) return { nextId: null };
  if (input.status === "done") return { nextId: completeTask(actor, t.id, now).nextId };
  db.update(tasks).set({ status: input.status, completedAt: null }).where(eq(tasks.id, t.id)).run();
  logActivity(actor, "task.move", "task", t.id, `${t.status} → ${input.status}`);
  syncProgress(t.projectId);
  return { nextId: null };
}

function deleteTaskRow(id: string) {
  db.transaction((tx) => {
    tx.delete(tasks).where(eq(tasks.parentId, id)).run();
    tx.delete(tasks).where(eq(tasks.id, id)).run();
  });
}

/** Delete a task and its subtasks (time entries keep their hours, unlinked). */
export function deleteTask(actor: Actor, id: string) {
  const t = accessibleTask(actor, id);
  deleteTaskRow(t.id);
  logActivity(actor, "task.delete", "task", t.id, t.title);
  syncProgress(t.projectId);
}

/** Start a running timer linked to the task (and move todo/inbox → in_progress). */
export function startTaskTimer(actor: Actor, id: string) {
  const t = accessibleTask(actor, id);
  const entry = startTimer(actor, {
    description: t.title,
    projectId: t.projectId ?? undefined,
    taskId: t.id,
  });
  if (t.status === "inbox" || t.status === "todo") {
    db.update(tasks).set({ status: "in_progress" }).where(eq(tasks.id, t.id)).run();
    syncProgress(t.projectId);
  }
  return entry;
}

// ─── Project panel (project page / client portal) ───────────────────────────

/**
 * Tasks of one project. Staff with project access see everything; clients only
 * `visibleToClient` tasks when the project shares tasks.
 */
export async function projectTasks(actor: Actor, projectId: string) {
  const project = db
    .select({ id: projects.id, shareTasks: projects.shareTasks })
    .from(projects)
    .where(and(eq(projects.id, projectId), projectAccessWhere(actor)))
    .get();
  if (!project) throw notFound("Project");
  const staff = isStaff(actor);
  if (!staff && !project.shareTasks) throw forbidden();
  const rows = await db.query.tasks.findMany({
    where: and(
      eq(tasks.projectId, projectId),
      isNull(tasks.parentId),
      ne(tasks.status, "canceled"),
      staff ? undefined : eq(tasks.visibleToClient, true),
    ),
    with: { assignee: { columns: { id: true, name: true } } },
    orderBy: [
      asc(
        sql`case ${tasks.status} when 'in_progress' then 0 when 'todo' then 1 when 'waiting' then 2 when 'inbox' then 3 when 'someday' then 4 else 5 end`,
      ),
      asc(sql`${tasks.dueAt} is null`),
      asc(tasks.dueAt),
      desc(tasks.completedAt),
    ],
    limit: 300,
  });
  const list = await withExtras(rows);
  return list.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueAt: t.dueAt,
    dueAllDay: t.dueAllDay,
    completedAt: t.completedAt,
    tags: staff ? t.tags : [],
    visibleToClient: t.visibleToClient,
    assignee: staff ? t.assignee : null,
    subtasks: t.subtasks,
  }));
}

// ─── Reminders (background job) ─────────────────────────────────────────────

/** Open tasks whose reminder is due and hasn't fired yet. */
export function dueTaskReminders(now = Date.now()) {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueAt: tasks.dueAt,
      dueAllDay: tasks.dueAllDay,
      userId: sql<string | null>`coalesce(${tasks.assigneeId}, ${tasks.createdBy})`,
    })
    .from(tasks)
    .where(
      and(
        isNull(tasks.remindedAt),
        lt(tasks.remindAt, new Date(now + 1)),
        inArray(tasks.status, [...OPEN_STATUSES]),
      ),
    )
    .limit(200)
    .all();
}

export function markTaskReminded(id: string, now = Date.now()) {
  db.update(tasks)
    .set({ remindedAt: new Date(now) })
    .where(eq(tasks.id, id))
    .run();
}

/** "HH:mm" of a due date for forms (empty when all-day). */
export function dueTimeValue(t: { dueAt: Date | null; dueAllDay: boolean }, tz: string) {
  return t.dueAt && !t.dueAllDay ? toTimeInputValue(t.dueAt, tz) : "";
}
