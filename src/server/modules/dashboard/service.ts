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
  lt,
  lte,
  ne,
  notInArray,
  sql,
} from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  contracts,
  events,
  invoices,
  leads,
  projects,
  tasks,
  timeEntries,
  transactions,
} from "@/server/db/schema";
import { isAdmin, type Actor } from "@/server/auth/actor";
import {
  addDays,
  calendarFor,
  startOfDay,
  startOfMonth,
  startOfWeek,
  weekStartFor,
} from "@/lib/tz";

const OPEN_TASK = ["done", "canceled", "someday"] as const;

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

export async function staffDashboard(
  actor: Actor,
  opts: { tz: string; locale: "fa" | "en"; now: number },
) {
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

  const openTaskWhere = notInArray(tasks.status, [...OPEN_TASK]);
  const openTasks = db.select({ n: count() }).from(tasks).where(openTaskWhere).get()?.n ?? 0;
  const overdue =
    db
      .select({ n: count() })
      .from(tasks)
      .where(and(openTaskWhere, lt(tasks.dueAt, today)))
      .get()?.n ?? 0;
  const dueTodayList = await db.query.tasks.findMany({
    where: and(openTaskWhere, lt(tasks.dueAt, tomorrow)),
    with: { project: { columns: { name: true, color: true } } },
    orderBy: [asc(tasks.dueAt), desc(tasks.priority)],
    limit: 8,
  });

  const upcoming = await db.query.events.findMany({
    where: and(
      gte(events.startAt, new Date(now - 60 * 60_000)),
      lte(events.startAt, nextWeek),
      ne(events.status, "canceled"),
    ),
    with: {
      project: { columns: { name: true, color: true } },
      client: { columns: { name: true } },
    },
    orderBy: asc(events.startAt),
    limit: 8,
  });

  const activeProjects = await db.query.projects.findMany({
    where: and(inArray(projects.status, ["active", "planning"]), isNull(projects.archivedAt)),
    with: { client: { columns: { name: true } } },
    orderBy: [desc(projects.updatedAt)],
    limit: 6,
  });

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
        .where(inArray(contracts.status, ["sent", "viewed"]))
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
    dueToday: dueTodayList,
    upcoming,
    activeProjects,
    money,
    unpaidInvoices,
    pendingContracts,
    newLeads,
  };
}
