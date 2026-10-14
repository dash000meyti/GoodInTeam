import "server-only";
import { and, asc, desc, eq, inArray, isNull, lt, ne, notInArray, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/server/db/client";
import { projects, tasks, timeEntries, users } from "@/server/db/schema";
import { assertStaff, isAdmin, isStaff, type Actor } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { AppError, forbidden, notFound } from "@/server/errors";
import { projectAccessWhere } from "@/server/modules/projects/service";
import { appTimezone } from "@/server/modules/settings/service";
import { accessibleTask } from "@/server/modules/tasks/access";
import { addDays, fromDateInput, startOfDay, startOfWeek } from "@/lib/tz";
import { formatDurationInput } from "@/lib/duration";
import {
  dayKey,
  daysInRange,
  earnedMinor,
  entryDurationMs,
  NO_PROJECT,
  NO_TASK,
  resolveEntryTimes,
  summarize,
  type EntryTimeErrorKey,
} from "./calc";
import type {
  entryInput,
  listEntriesInput,
  reportInput,
  startTimerInput,
  updateEntryInput,
} from "./schemas";

// ─── Errors ─────────────────────────────────────────────────────────────────

const TIME_ERRORS: Record<EntryTimeErrorKey, string> = {
  invalidTime: "Invalid date/time. Use 'YYYY-MM-DD' + 'HH:mm' (24h) or ISO 8601 instants.",
  invalidDuration: "Invalid duration. Examples: '1:30', '90m', '1.5h', '1.5'.",
  endBeforeStart: "End time must be after start time.",
  tooLong: "A single entry can't be longer than 24 hours.",
  missingTimes:
    "Provide date + startTime + endTime, date + startTime + duration, date + duration, or startedAt + endedAt.",
};

/** Validation error with a stable key so server actions can localize it. */
export class TimeInputError extends AppError {
  constructor(
    public key: EntryTimeErrorKey,
    field: string,
  ) {
    super("validation", TIME_ERRORS[key], { [field]: [TIME_ERRORS[key]] });
    this.name = "TimeInputError";
  }
}

// ─── Access helpers ─────────────────────────────────────────────────────────

/**
 * Whose time to read. Members: always themselves. Owner/admin: themselves by
 * default, a specific user id, or everyone ("all" → null).
 */
export function resolveUserScope(actor: Actor, userId?: string | null): string | null {
  if (!isAdmin(actor) || !userId) return actor.user.id;
  return userId === "all" ? null : userId;
}

function userWhere(scope: string | null) {
  return scope ? eq(timeEntries.userId, scope) : undefined;
}

function accessibleProject(actor: Actor, projectId: string) {
  const p = db
    .select({
      id: projects.id,
      hourlyRateMinor: projects.hourlyRateMinor,
      currency: projects.currency,
      billingType: projects.billingType,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), projectAccessWhere(actor)))
    .get();
  if (!p) throw notFound("Project");
  return p;
}

/** An entry the actor may change: members only their own; admins any. */
function ownEntry(actor: Actor, id: string) {
  assertStaff(actor);
  const e = db.select().from(timeEntries).where(eq(timeEntries.id, id)).get();
  if (!e || (!isAdmin(actor) && e.userId !== actor.user.id)) throw notFound("Time entry");
  return e;
}

/** Resolve project/task pair: a task implies its project; mismatches are rejected. */
function resolveLinks(actor: Actor, projectId: string | null, taskId: string | null) {
  if (taskId) {
    const t = accessibleTask(actor, taskId);
    if (!projectId) projectId = t.projectId;
    else if (t.projectId && t.projectId !== projectId)
      throw new AppError("validation", "The task belongs to another project.", {
        taskId: ["The task belongs to another project."],
      });
  }
  const project = projectId ? accessibleProject(actor, projectId) : null;
  return { projectId, taskId, project };
}

const entryWith = {
  project: { columns: { id: true, name: true, color: true } },
  task: { columns: { id: true, title: true } },
  user: { columns: { id: true, name: true } },
} as const;

// ─── Options for pickers ────────────────────────────────────────────────────

/** Projects the actor can track time on (for selects). */
export function timeProjectOptions(actor: Actor) {
  assertStaff(actor);
  return db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
      slug: projects.slug,
      billingType: projects.billingType,
    })
    .from(projects)
    .where(
      and(
        projectAccessWhere(actor),
        isNull(projects.archivedAt),
        notInArray(projects.status, ["canceled", "archived"]),
      ),
    )
    .orderBy(
      asc(sql`case ${projects.status} when 'active' then 0 when 'planning' then 1 else 2 end`),
      asc(projects.name),
    )
    .all();
}

/** Staff users for the "whose time" filter (admins only). */
export function timeUserOptions(actor: Actor) {
  if (!isAdmin(actor)) return [];
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(ne(users.role, "client"), eq(users.disabled, false)))
    .orderBy(asc(users.name))
    .all();
}

// ─── Timers ─────────────────────────────────────────────────────────────────

/** The caller's running timers (oldest first). */
export async function listRunning(actor: Actor) {
  assertStaff(actor);
  return db.query.timeEntries.findMany({
    where: and(eq(timeEntries.userId, actor.user.id), isNull(timeEntries.endedAt)),
    with: entryWith,
    orderBy: asc(timeEntries.startedAt),
  });
}

export function startTimer(actor: Actor, input: z.output<typeof startTimerInput>) {
  assertStaff(actor);
  const { projectId, taskId, project } = resolveLinks(
    actor,
    input.projectId ?? null,
    input.taskId ?? null,
  );
  const row = db
    .insert(timeEntries)
    .values({
      userId: actor.user.id,
      projectId,
      taskId,
      description: input.description ?? null,
      startedAt: new Date(),
      billable: input.billable ?? (project ? project.billingType !== "internal" : false),
      hourlyRateMinor: project?.hourlyRateMinor ?? null,
      currency: project?.currency ?? null,
      tags: input.tags ?? [],
      source: actor.via === "api" ? "api" : "timer",
    })
    .returning()
    .get();
  logActivity(actor, "time.start", "time_entry", row.id, row.description ?? undefined);
  return row;
}

/** Stop one running timer (idempotent). `endedAt` ISO defaults to now. */
export function stopTimer(actor: Actor, id: string, endedAt?: string) {
  const e = ownEntry(actor, id);
  if (e.endedAt) return e;
  const now = Date.now();
  let end = endedAt ? new Date(endedAt) : new Date(now);
  if (Number.isNaN(end.getTime())) throw new TimeInputError("invalidTime", "endedAt");
  if (end.getTime() <= e.startedAt.getTime()) {
    if (endedAt) throw new TimeInputError("endBeforeStart", "endedAt");
    end = new Date(e.startedAt.getTime() + 1000);
  }
  const row = db
    .update(timeEntries)
    .set({ endedAt: end })
    .where(eq(timeEntries.id, id))
    .returning()
    .get()!;
  logActivity(actor, "time.stop", "time_entry", id, formatDurationInput(entryDurationMs(row, now)));
  return row;
}

/** Stop every running timer of the caller. Returns how many were stopped. */
export function stopAllTimers(actor: Actor) {
  assertStaff(actor);
  const rows = db
    .update(timeEntries)
    .set({ endedAt: new Date() })
    .where(and(eq(timeEntries.userId, actor.user.id), isNull(timeEntries.endedAt)))
    .returning({ id: timeEntries.id })
    .all();
  if (rows.length) logActivity(actor, "time.stop_all", "time_entry", null, String(rows.length));
  return rows.length;
}

/** Start a new timer with the same description/project/task/billable as `id`. */
export function continueEntry(actor: Actor, id: string) {
  const e = ownEntry(actor, id);
  return startTimer(actor, {
    description: e.description ?? undefined,
    projectId: e.projectId ?? undefined,
    taskId: e.taskId ?? undefined,
    billable: e.billable,
    tags: e.tags,
  });
}

// ─── Entries ────────────────────────────────────────────────────────────────

/**
 * Where a duration-only entry goes on `date`:
 * today → ending now ("I just spent 1:30 on X"); past days → right after that
 * day's last finished entry (if it fits), else 09:00; future days → 09:00.
 */
function anchorFor(userId: string, tz: string) {
  return (date: string, durationMs: number) => {
    const dayStart = fromDateInput(date, undefined, tz);
    const dayEnd = addDays(dayStart, 1, tz);
    const now = Date.now();
    if (now >= dayStart.getTime() && now < dayEnd.getTime()) {
      return new Date(Math.max(dayStart.getTime(), now - durationMs));
    }
    const last = db
      .select({ end: sql<number | null>`max(${timeEntries.endedAt})` })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, userId),
          sql`${timeEntries.startedAt} >= ${dayStart.getTime()}`,
          lt(timeEntries.startedAt, dayEnd),
        ),
      )
      .get()?.end;
    if (last && last + durationMs <= dayEnd.getTime()) return new Date(last);
    return fromDateInput(date, "09:00", tz);
  };
}

/** Add a finished entry manually (date + times, date + duration, or ISO instants). */
export function createEntry(actor: Actor, input: z.output<typeof entryInput>) {
  assertStaff(actor);
  const tz = appTimezone();
  const r = resolveEntryTimes(input, { tz, anchor: anchorFor(actor.user.id, tz) });
  if (!r.ok) throw new TimeInputError(r.key, r.field);
  const { projectId, taskId, project } = resolveLinks(
    actor,
    input.projectId ?? null,
    input.taskId ?? null,
  );
  const row = db
    .insert(timeEntries)
    .values({
      userId: actor.user.id,
      projectId,
      taskId,
      description: input.description ?? null,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      billable: input.billable ?? (project ? project.billingType !== "internal" : false),
      hourlyRateMinor: project?.hourlyRateMinor ?? null,
      currency: project?.currency ?? null,
      tags: input.tags ?? [],
      source: actor.via === "api" ? "api" : "manual",
    })
    .returning()
    .get();
  logActivity(actor, "time.create", "time_entry", row.id, row.description ?? undefined);
  return row;
}

export function updateEntry(actor: Actor, input: z.output<typeof updateEntryInput>) {
  const e = ownEntry(actor, input.id);
  const tz = appTimezone();
  const patch: Partial<typeof timeEntries.$inferInsert> = {};

  const timeTouched = [
    input.startedAt,
    input.endedAt,
    input.date,
    input.startTime,
    input.endTime,
    input.duration,
  ].some((v) => v != null);
  if (timeTouched) {
    const r = resolveEntryTimes(input, { tz, existing: e });
    if (!r.ok) throw new TimeInputError(r.key, r.field);
    patch.startedAt = r.startedAt;
    patch.endedAt = r.endedAt;
  }

  if (input.projectId !== undefined || input.taskId !== undefined) {
    const nextProject = input.projectId !== undefined ? input.projectId : e.projectId;
    const nextTask =
      input.taskId !== undefined
        ? input.taskId
        : input.projectId !== undefined && input.projectId !== e.projectId
          ? null // moving to another project drops the old task
          : e.taskId;
    const { projectId, taskId, project } = resolveLinks(actor, nextProject, nextTask);
    patch.projectId = projectId;
    patch.taskId = taskId;
    if (projectId !== e.projectId && !e.invoiceId) {
      patch.hourlyRateMinor = project?.hourlyRateMinor ?? null;
      patch.currency = project?.currency ?? null;
    }
  }
  if (input.description !== undefined) patch.description = input.description;
  if (input.billable !== undefined) patch.billable = input.billable;
  if (input.tags !== undefined) patch.tags = input.tags;

  const row = db.update(timeEntries).set(patch).where(eq(timeEntries.id, e.id)).returning().get()!;
  logActivity(actor, "time.update", "time_entry", e.id, row.description ?? undefined);
  return row;
}

export function deleteEntry(actor: Actor, id: string) {
  const e = ownEntry(actor, id);
  db.delete(timeEntries).where(eq(timeEntries.id, e.id)).run();
  logActivity(actor, "time.delete", "time_entry", e.id, e.description ?? undefined);
}

/** Copy a finished entry right after the original (or at the same time if that is in the future). */
export function duplicateEntry(actor: Actor, id: string) {
  const e = ownEntry(actor, id);
  if (!e.endedAt) return continueEntry(actor, id);
  const len = e.endedAt.getTime() - e.startedAt.getTime();
  const after = e.endedAt.getTime() + len <= Date.now();
  const start = after ? e.endedAt : e.startedAt;
  const row = db
    .insert(timeEntries)
    .values({
      userId: e.userId,
      projectId: e.projectId,
      taskId: e.taskId,
      description: e.description,
      startedAt: start,
      endedAt: new Date(start.getTime() + len),
      billable: e.billable,
      hourlyRateMinor: e.hourlyRateMinor,
      currency: e.currency,
      tags: e.tags,
      source: "manual",
    })
    .returning()
    .get();
  logActivity(actor, "time.duplicate", "time_entry", row.id, row.description ?? undefined);
  return row;
}

function dayOrIso(v: string | undefined, tz: string, endOfDay = false) {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = fromDateInput(v, undefined, tz);
    return endOfDay ? addDays(d, 1, tz) : d;
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new TimeInputError("invalidTime", endOfDay ? "to" : "from");
  return d;
}

/**
 * Entries overlapping [from, to) for the scoped user(s), newest first.
 * `from`/`to`: "YYYY-MM-DD" (to inclusive) or ISO instants.
 */
export async function listEntries(
  actor: Actor,
  input: z.output<typeof listEntriesInput> & { fromDate?: Date; toDate?: Date },
) {
  assertStaff(actor);
  const tz = appTimezone();
  const from = input.fromDate ?? dayOrIso(input.from, tz);
  const to = input.toDate ?? dayOrIso(input.to, tz, true);
  const scope = resolveUserScope(actor, input.userId);
  const now = Date.now();
  const rows = await db.query.timeEntries.findMany({
    where: and(
      userWhere(scope),
      input.projectId
        ? input.projectId === NO_PROJECT
          ? isNull(timeEntries.projectId)
          : eq(timeEntries.projectId, input.projectId)
        : undefined,
      to ? lt(timeEntries.startedAt, to) : undefined,
      from ? sql`coalesce(${timeEntries.endedAt}, ${now}) > ${from.getTime()}` : undefined,
    ),
    with: entryWith,
    orderBy: desc(timeEntries.startedAt),
    limit: Math.min(Math.max(input.limit ?? 500, 1), 2000),
  });
  const money = isAdmin(actor);
  return rows.map((e) => {
    const durationMs = entryDurationMs(e, now);
    return {
      ...e,
      durationMs,
      running: !e.endedAt,
      earnedMinor: money && e.billable ? earnedMinor(durationMs, e.hourlyRateMinor) : null,
      ...(money ? {} : { hourlyRateMinor: null }),
    };
  });
}

export type TimeEntryView = Awaited<ReturnType<typeof listEntries>>[number];

/** Is there anything older than `before` for this scope? (for "load more"). */
export function hasEntriesBefore(actor: Actor, before: Date, userId?: string | null) {
  assertStaff(actor);
  const scope = resolveUserScope(actor, userId);
  return !!db
    .select({ id: timeEntries.id })
    .from(timeEntries)
    .where(and(userWhere(scope), lt(timeEntries.startedAt, before)))
    .limit(1)
    .get();
}

/** Total tracked ms in [from, to) for the scoped user(s) (running timers count up to now). */
export function trackedMs(actor: Actor, from: Date, to: Date, userId?: string | null) {
  assertStaff(actor);
  const scope = resolveUserScope(actor, userId);
  const now = Date.now();
  const row = db
    .select({
      ms: sql<number>`coalesce(sum(min(coalesce(${timeEntries.endedAt}, ${now}), ${to.getTime()}) - max(${timeEntries.startedAt}, ${from.getTime()})), 0)`,
      billable: sql<number>`coalesce(sum(case when ${timeEntries.billable} then min(coalesce(${timeEntries.endedAt}, ${now}), ${to.getTime()}) - max(${timeEntries.startedAt}, ${from.getTime()}) else 0 end), 0)`,
    })
    .from(timeEntries)
    .where(
      and(
        userWhere(scope),
        lt(timeEntries.startedAt, to),
        sql`coalesce(${timeEntries.endedAt}, ${now}) > ${from.getTime()}`,
      ),
    )
    .get();
  return { ms: Math.max(0, row?.ms ?? 0), billableMs: Math.max(0, row?.billable ?? 0) };
}

// ─── Timesheet & reports ────────────────────────────────────────────────────

function entriesForRange(from: Date, to: Date, scope: string | null, projectId?: string) {
  const now = Date.now();
  return db
    .select({
      startedAt: timeEntries.startedAt,
      endedAt: timeEntries.endedAt,
      billable: timeEntries.billable,
      hourlyRateMinor: timeEntries.hourlyRateMinor,
      currency: timeEntries.currency,
      projectId: timeEntries.projectId,
      taskId: timeEntries.taskId,
    })
    .from(timeEntries)
    .where(
      and(
        userWhere(scope),
        projectId ? eq(timeEntries.projectId, projectId) : undefined,
        lt(timeEntries.startedAt, to),
        sql`coalesce(${timeEntries.endedAt}, ${now}) > ${from.getTime()}`,
      ),
    )
    .all();
}

function projectLabels(ids: string[]) {
  const real = ids.filter((id) => id !== NO_PROJECT);
  return new Map(
    (real.length
      ? db
          .select({ id: projects.id, name: projects.name, color: projects.color })
          .from(projects)
          .where(inArray(projects.id, real))
          .all()
      : []
    ).map((p) => [p.id, p]),
  );
}

/** Project × 7-day grid for the week starting at `weekStart` (a day start in tz). */
export function timesheet(actor: Actor, opts: { weekStart: Date; userId?: string | null }) {
  assertStaff(actor);
  const tz = appTimezone();
  const scope = resolveUserScope(actor, opts.userId);
  const days = Array.from({ length: 7 }, (_, i) => addDays(opts.weekStart, i, tz));
  const end = addDays(opts.weekStart, 7, tz);
  const report = summarize(entriesForRange(opts.weekStart, end, scope), {
    from: opts.weekStart,
    to: end,
    tz,
    now: Date.now(),
  });
  const keys = days.map((d) => dayKey(d, tz));
  const labels = projectLabels([...report.byProject.keys()]);
  const rows = [...report.byProject.entries()]
    .map(([pid, bucket]) => ({
      projectId: pid === NO_PROJECT ? null : pid,
      name: labels.get(pid)?.name ?? null,
      color: labels.get(pid)?.color ?? null,
      cells: keys.map((k) => report.byDay.get(k)?.get(pid) ?? 0),
      totalMs: bucket.ms,
    }))
    .sort((a, b) => b.totalMs - a.totalMs);
  return {
    days,
    dayKeys: keys,
    rows,
    dayTotals: keys.map((k) =>
      [...(report.byDay.get(k)?.values() ?? [])].reduce((s, v) => s + v, 0),
    ),
    totalMs: report.totalMs,
    billableMs: report.billableMs,
  };
}

/**
 * Aggregated report for [from, to) — totals, per-day per-project series,
 * project → task breakdown and earnings per currency (admins only).
 */
export function timeReport(
  actor: Actor,
  opts: { from: Date; to: Date; userId?: string | null; projectId?: string },
) {
  assertStaff(actor);
  const tz = appTimezone();
  const scope = resolveUserScope(actor, opts.userId);
  const report = summarize(entriesForRange(opts.from, opts.to, scope, opts.projectId), {
    from: opts.from,
    to: opts.to,
    tz,
    now: Date.now(),
  });
  const money = isAdmin(actor);
  const labels = projectLabels([...report.byProject.keys()]);
  const taskIds = [...report.byProject.values()].flatMap((p) =>
    [...p.tasks.keys()].filter((k) => k !== NO_TASK),
  );
  const taskTitles = new Map(
    (taskIds.length
      ? db
          .select({ id: tasks.id, title: tasks.title })
          .from(tasks)
          .where(inArray(tasks.id, taskIds))
          .all()
      : []
    ).map((t) => [t.id, t.title]),
  );

  const projectsOut = [...report.byProject.entries()]
    .map(([pid, b]) => ({
      projectId: pid === NO_PROJECT ? null : pid,
      name: labels.get(pid)?.name ?? null,
      color: labels.get(pid)?.color ?? null,
      ms: b.ms,
      billableMs: b.billableMs,
      earned: money ? b.earned : {},
      tasks: [...b.tasks.entries()]
        .map(([tid, tb]) => ({
          taskId: tid === NO_TASK ? null : tid,
          title: tid === NO_TASK ? null : (taskTitles.get(tid) ?? null),
          ms: tb.ms,
          billableMs: tb.billableMs,
          earned: money ? tb.earned : {},
        }))
        .sort((a, b) => b.ms - a.ms),
    }))
    .sort((a, b) => b.ms - a.ms);

  const days = daysInRange(opts.from, opts.to, tz).map((d) => {
    const k = dayKey(d, tz);
    const perProject = report.byDay.get(k);
    return {
      day: k,
      date: d,
      totalMs: perProject ? [...perProject.values()].reduce((s, v) => s + v, 0) : 0,
      byProject: Object.fromEntries(perProject ?? []),
    };
  });

  return {
    totalMs: report.totalMs,
    billableMs: report.billableMs,
    earned: money ? report.earned : {},
    activeDays: report.activeDays,
    days,
    projects: projectsOut,
  };
}

export type TimeReport = ReturnType<typeof timeReport>;

/** Tool-friendly report with day strings (inclusive range). */
export function timeReportForDays(actor: Actor, input: z.output<typeof reportInput>) {
  const tz = appTimezone();
  const from = fromDateInput(input.from, undefined, tz);
  const to = addDays(fromDateInput(input.to, undefined, tz), 1, tz);
  if (to <= from) throw new TimeInputError("endBeforeStart", "to");
  const r = timeReport(actor, { from, to, userId: input.userId, projectId: input.projectId });
  return {
    from: input.from,
    to: input.to,
    timezone: tz,
    totalHours: +(r.totalMs / 3_600_000).toFixed(2),
    billableHours: +(r.billableMs / 3_600_000).toFixed(2),
    earnedMinorByCurrency: r.earned,
    activeDays: r.activeDays,
    byDay: r.days
      .filter((d) => d.totalMs > 0)
      .map((d) => ({ day: d.day, hours: +(d.totalMs / 3_600_000).toFixed(2) })),
    byProject: r.projects.map((p) => ({
      projectId: p.projectId,
      project: p.name,
      hours: +(p.ms / 3_600_000).toFixed(2),
      billableHours: +(p.billableMs / 3_600_000).toFixed(2),
      earnedMinorByCurrency: p.earned,
      tasks: p.tasks.map((t) => ({
        taskId: t.taskId,
        task: t.title,
        hours: +(t.ms / 3_600_000).toFixed(2),
      })),
    })),
  };
}

// ─── Project panel (project detail page / client portal) ────────────────────

/**
 * Hours per week + recent entries for one project.
 * Staff with access see everything (rates/earnings for admins only);
 * clients only when the project shares time, without names or money.
 */
export async function projectTimeSummary(
  actor: Actor,
  projectId: string,
  opts: { weeks?: number; weekStartsOn: number },
) {
  const project = db
    .select({ id: projects.id, shareTime: projects.shareTime })
    .from(projects)
    .where(and(eq(projects.id, projectId), projectAccessWhere(actor)))
    .get();
  if (!project) throw notFound("Project");
  const staff = isStaff(actor);
  if (!staff && !project.shareTime) throw forbidden();
  const money = isAdmin(actor);

  const tz = appTimezone();
  const now = Date.now();
  const weeks = Math.min(Math.max(opts.weeks ?? 12, 1), 52);
  const thisWeek = startOfWeek(now, tz, opts.weekStartsOn);
  const firstWeek = addDays(thisWeek, -7 * (weeks - 1), tz);
  const end = addDays(thisWeek, 7, tz);

  const rows = db
    .select({
      startedAt: timeEntries.startedAt,
      endedAt: timeEntries.endedAt,
      billable: timeEntries.billable,
    })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.projectId, projectId),
        lt(timeEntries.startedAt, end),
        sql`coalesce(${timeEntries.endedAt}, ${now}) > ${firstWeek.getTime()}`,
      ),
    )
    .all();
  const series = Array.from({ length: weeks }, (_, i) => {
    const ws = addDays(firstWeek, 7 * i, tz);
    const we = addDays(ws, 7, tz);
    let ms = 0;
    let billableMs = 0;
    for (const r of rows) {
      const o = Math.max(
        0,
        Math.min(r.endedAt?.getTime() ?? now, we.getTime()) -
          Math.max(r.startedAt.getTime(), ws.getTime()),
      );
      ms += o;
      if (r.billable) billableMs += o;
    }
    return { weekStart: ws, ms, billableMs };
  });

  const totals = db
    .select({
      ms: sql<number>`coalesce(sum(coalesce(${timeEntries.endedAt}, ${now}) - ${timeEntries.startedAt}), 0)`,
      billableMs: sql<number>`coalesce(sum(case when ${timeEntries.billable} then coalesce(${timeEntries.endedAt}, ${now}) - ${timeEntries.startedAt} else 0 end), 0)`,
    })
    .from(timeEntries)
    .where(eq(timeEntries.projectId, projectId))
    .get() ?? { ms: 0, billableMs: 0 };

  const recent = await db.query.timeEntries.findMany({
    where: eq(timeEntries.projectId, projectId),
    with: entryWith,
    orderBy: desc(timeEntries.startedAt),
    limit: 12,
  });

  return {
    weeks: series,
    totalMs: totals.ms,
    billableMs: totals.billableMs,
    recent: recent.map((e) => {
      const durationMs = entryDurationMs(e, now);
      return {
        id: e.id,
        description: e.description,
        startedAt: e.startedAt,
        endedAt: e.endedAt,
        durationMs,
        billable: e.billable,
        task: e.task,
        user: staff ? e.user : null,
        earnedMinor: money && e.billable ? earnedMinor(durationMs, e.hourlyRateMinor) : null,
        currency: money ? e.currency : null,
      };
    }),
  };
}

// ─── CSV export ─────────────────────────────────────────────────────────────

function csvCell(v: string | number | null | undefined) {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function wall(d: Date, tz: string, calendar: "gregory" | "persian") {
  const p = new Intl.DateTimeFormat(`en-US-u-ca-${calendar}`, {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${get("year").replace(/\D/g, "")}-${get("month")}-${get("day")}`;
}

function clockOf(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

/** CSV (UTF-8 with BOM so Excel shows Persian correctly). */
export async function exportEntriesCsv(
  actor: Actor,
  opts: { from: Date; to: Date; userId?: string | null; projectId?: string },
) {
  const tz = appTimezone();
  const rows = await listEntries(actor, {
    fromDate: opts.from,
    toDate: opts.to,
    userId: opts.userId ?? undefined,
    projectId: opts.projectId,
    limit: 2000,
  });
  const money = isAdmin(actor);
  const header = [
    "date",
    "date_jalali",
    "start",
    "end",
    "duration",
    "hours",
    "user",
    "project",
    "task",
    "description",
    "billable",
    ...(money ? ["hourly_rate_minor", "currency", "amount_minor"] : []),
  ];
  const lines = [header.join(",")];
  for (const e of [...rows].reverse()) {
    lines.push(
      [
        wall(e.startedAt, tz, "gregory"),
        wall(e.startedAt, tz, "persian"),
        clockOf(e.startedAt, tz),
        e.endedAt ? clockOf(e.endedAt, tz) : "",
        formatDurationInput(e.durationMs),
        (e.durationMs / 3_600_000).toFixed(2),
        e.user?.name,
        e.project?.name,
        e.task?.title,
        e.description,
        e.billable ? "yes" : "no",
        ...(money ? [e.hourlyRateMinor, e.currency, e.earnedMinor] : []),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** Day-start helper for pages: today's start in the app timezone. */
export function todayStart(now: number) {
  return startOfDay(now, appTimezone());
}

/** Running timers older than `ms` that haven't been flagged yet (for jobs). */
export function longRunningEntries(olderThanMs: number) {
  return db
    .select({
      id: timeEntries.id,
      userId: timeEntries.userId,
      description: timeEntries.description,
      startedAt: timeEntries.startedAt,
      projectName: projects.name,
    })
    .from(timeEntries)
    .leftJoin(projects, eq(projects.id, timeEntries.projectId))
    .where(
      and(
        isNull(timeEntries.endedAt),
        lt(timeEntries.startedAt, new Date(Date.now() - olderThanMs)),
      ),
    )
    .all();
}
