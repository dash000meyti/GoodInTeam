import "server-only";
import {
  and,
  gt,
  or,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  notInArray,
  sql,
} from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  contracts,
  invoices,
  leads,
  projects,
  tasks,
  timeEntries,
  transactions,
} from "@/server/db/schema";
import { assertStaff, isAdmin, type Actor } from "@/server/auth/actor";
import { listCalendarItems } from "@/server/modules/calendar/service";
import { projectAccessWhere } from "@/server/modules/projects/service";
import { overdueTaskWhere, taskAccessWhere } from "@/server/modules/tasks/service";
import { isOverdue } from "@/lib/due";
import {
  addDays,
  calendarFor,
  startOfDay,
  startOfMonth,
  startOfWeek,
  weekStartFor,
} from "@/lib/tz";

const OPEN_TASK = ["done", "canceled", "someday"] as const;
const UPCOMING_LIMIT = 8;

/** Sum of tracked ms for a user in [from, to), counting running timers up to `now`. */
function trackedMs(userId: string, from: Date, to: Date, now: number) {
  const row = db
    .select({
      ms: sql<number>`coalesce(sum(min(coalesce(${timeEntries.endedAt}, ${now}), ${to.getTime()}) - max(${timeEntries.startedAt}, ${from.getTime()})), 0)`,
    })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.userId, userId),
        lt(timeEntries.startedAt, to),
        sql`coalesce(${timeEntries.endedAt}, ${now}) > ${from.getTime()}`,
      ),
    )
    .get();
  return Math.max(0, row?.ms ?? 0);
}

/**
 * Staff home page data. Everything is scoped to what the actor may see:
 * tasks via `taskAccessWhere` (members: their projects' tasks + own/assigned
 * personal tasks), projects via `projectAccessWhere`, events via the calendar
 * service (access + recurring occurrences). Money/contracts/leads: admins only.
 */
export async function staffDashboard(
  actor: Actor,
  opts: { tz: string; locale: "fa" | "en"; now: number },
) {
  assertStaff(actor);
  const { tz, locale, now } = opts;
  const today = startOfDay(now, tz);
  const tomorrow = addDays(today, 1, tz);
  const week = startOfWeek(now, tz, weekStartFor(locale));
  const month = startOfMonth(now, tz, calendarFor(locale));
  const nextWeek = addDays(today, 7, tz);

  const running = await db.query.timeEntries.findMany({
    where: and(eq(timeEntries.userId, actor.user.id), isNull(timeEntries.endedAt)),
    with: { project: { columns: { id: true, name: true, color: true } } },
    orderBy: asc(timeEntries.startedAt),
  });

  const visibleTasks = taskAccessWhere(actor);
  const openTaskWhere = and(visibleTasks, notInArray(tasks.status, [...OPEN_TASK]));
  const openTasks = db.select({ n: count() }).from(tasks).where(openTaskWhere).get()?.n ?? 0;
  const overdue =
    db
      .select({ n: count() })
      .from(tasks)
      .where(and(visibleTasks, overdueTaskWhere(now, today)))
      .get()?.n ?? 0;
  const dueTodayRows = await db.query.tasks.findMany({
    where: and(openTaskWhere, lt(tasks.dueAt, tomorrow)),
    with: { project: { columns: { name: true, color: true } } },
    orderBy: [asc(tasks.dueAt), desc(tasks.priority)],
    limit: 8,
  });
  const dueToday = dueTodayRows.map((task) => ({
    ...task,
    // All-day: overdue only after the due day ends; timed: after the instant.
    overdue: isOverdue(task.dueAt, { allDay: task.dueAllDay, now, tz }),
  }));

  // Recurring series are expanded by the calendar service (next occurrences show up).
  const upcoming = listCalendarItems(actor, {
    from: now - 60 * 60_000,
    to: nextWeek.getTime(),
    sources: ["events", "commitments"],
  })
    .filter((item) => item.status !== "canceled")
    .slice(0, UPCOMING_LIMIT)
    .map((item) => ({
      key: item.key,
      title: item.title,
      start: item.start,
      allDay: item.allDay,
      color: item.color,
      project: item.project,
      client: item.client,
    }));

  const activeWhere = and(
    projectAccessWhere(actor),
    inArray(projects.status, ["active", "planning"]),
    isNull(projects.archivedAt),
  );
  const activeProjects = await db.query.projects.findMany({
    where: activeWhere,
    columns: { id: true, name: true, color: true, progress: true, status: true },
    with: { client: { columns: { name: true } } },
    orderBy: [desc(projects.updatedAt)],
    limit: 6,
  });
  const activeProjectCount =
    db.select({ n: count() }).from(projects).where(activeWhere).get()?.n ?? 0;

  const money = isAdmin(actor)
    ? db
        .select({
          kind: transactions.kind,
          currency: transactions.currency,
          total: sql<number>`sum(${transactions.amountMinor})`,
        })
        .from(transactions)
        .where(
          and(
            gte(transactions.occurredAt, month),
            inArray(transactions.kind, ["income", "expense"]),
          ),
        )
        .groupBy(transactions.kind, transactions.currency)
        .all()
    : [];

  const unpaidInvoices = isAdmin(actor)
    ? db
        .select({
          n: count(),
          currency: invoices.currency,
          total: sql<number>`sum(${invoices.totalMinor} - ${invoices.paidMinor})`,
        })
        .from(invoices)
        .where(inArray(invoices.status, ["sent", "viewed", "partial", "overdue"]))
        .groupBy(invoices.currency)
        .all()
    : [];

  const pendingContracts = isAdmin(actor)
    ? (db
        .select({ n: count() })
        .from(contracts)
        .where(
          and(
            inArray(contracts.status, ["sent", "viewed"]),
            or(isNull(contracts.expiresAt), gt(contracts.expiresAt, new Date(now))),
          ),
        )
        .get()?.n ?? 0)
    : 0;
  const newLeads = isAdmin(actor)
    ? (db.select({ n: count() }).from(leads).where(eq(leads.status, "new")).get()?.n ?? 0)
    : 0;

  return {
    running,
    todayMs: trackedMs(actor.user.id, today, tomorrow, now),
    weekMs: trackedMs(actor.user.id, week, tomorrow, now),
    openTasks,
    overdue,
    dueToday,
    upcoming,
    activeProjects,
    activeProjectCount,
    money,
    unpaidInvoices,
    pendingContracts,
    newLeads,
  };
}
