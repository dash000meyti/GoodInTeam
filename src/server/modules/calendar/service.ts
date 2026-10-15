import "server-only";
import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/server/db/client";
import {
  clients,
  events,
  invoices,
  milestones,
  projectMembers,
  projects,
  tasks,
  users,
  type CalendarEvent,
} from "@/server/db/schema";
import { assertStaff, isAdmin, type Actor } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { AppError, forbidden, notFound } from "@/server/errors";
import { appTimezone } from "@/server/modules/settings/service";
import { assertProjectRead, projectAccessWhere } from "@/server/modules/projects/service";
import { notify } from "@/server/modules/notifications/service";
import { messages } from "@/i18n/messages";
import { markdownToText } from "@/lib/markdown";
import { expandRRule, formatRRule, parseRRule } from "@/lib/rrule";
import { DAY_MS, zonedParts } from "@/lib/tz";
import {
  addDaysKey,
  dayKeyOf,
  dayStartMs,
  diffDaysKey,
  wallTimeMs,
} from "@/components/calendar/grid";
import { kindMeta, sourceMeta } from "@/components/calendar/kinds";
import {
  calendarSources,
  type CalendarEventData,
  type CalendarItem,
  type CalendarRef,
  type CalendarSource,
  type CommitmentState,
} from "@/components/calendar/types";
import type {
  agendaInput,
  commitmentInput,
  commitmentStatusInput,
  EventInput,
  listCommitmentsInput,
  rescheduleCommitmentInput,
  UpdateEventInput,
} from "./schemas";

// ─── Access control ─────────────────────────────────────────────────────────

const memberProjectIds = (userId: string) =>
  db
    .select({ id: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));

/**
 * SQL filter for the events an actor may read.
 * owner/admin: all · member: events they created + events of their assigned
 * projects · client: `visibleToClient` events of their portal projects.
 */
export function eventAccessWhere(actor: Actor): SQL | undefined {
  if (isAdmin(actor)) return undefined;
  if (actor.user.role === "member") {
    return or(
      eq(events.createdBy, actor.user.id),
      inArray(events.projectId, memberProjectIds(actor.user.id)),
    );
  }
  return and(
    eq(events.visibleToClient, true),
    inArray(
      events.projectId,
      db.select({ id: projects.id }).from(projects).where(projectAccessWhere(actor)),
    ),
  );
}

/** owner/admin edit everything; members edit the events they created. */
function canEditEvent(actor: Actor, row: Pick<CalendarEvent, "createdBy">) {
  return isAdmin(actor) || (actor.user.role === "member" && row.createdBy === actor.user.id);
}

function loadEventForWrite(actor: Actor, id: string) {
  assertStaff(actor);
  const row = db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eventAccessWhere(actor)))
    .get();
  if (!row) throw notFound("Event");
  if (!canEditEvent(actor, row))
    throw forbidden("Only the creator or an admin can change this event");
  return row;
}

/** Tasks visible on a member's calendar: assigned to / created by them, or in their projects. */
function taskAccessWhere(actor: Actor): SQL | undefined {
  if (isAdmin(actor)) return undefined;
  return or(
    eq(tasks.assigneeId, actor.user.id),
    eq(tasks.createdBy, actor.user.id),
    inArray(tasks.projectId, memberProjectIds(actor.user.id)),
  );
}

function projectClientId(projectId: string) {
  return (
    db
      .select({ clientId: projects.clientId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .get()?.clientId ?? null
  );
}

/** Validate project/client links for the actor. */
function checkRefs(actor: Actor, input: { projectId?: string | null; clientId?: string | null }) {
  if (input.projectId) {
    if (isAdmin(actor)) {
      const p = db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .get();
      if (!p)
        throw new AppError("validation", "Unknown project", { projectId: ["Unknown project"] });
    } else assertProjectRead(actor, input.projectId);
  }
  if (input.clientId) {
    if (!isAdmin(actor)) throw forbidden("Only admins can link a client directly");
    const c = db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, input.clientId))
      .get();
    if (!c) throw new AppError("validation", "Unknown client", { clientId: ["Unknown client"] });
  }
}

// ─── Time helpers ───────────────────────────────────────────────────────────

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DT_RE = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(:\d{2})?$/;

/** Parse "YYYY-MM-DD", "YYYY-MM-DDTHH:mm" (wall clock in tz) or ISO 8601. */
export function parseWhen(value: string, tz: string): { ms: number; dayOnly: boolean } {
  if (DAY_RE.test(value)) return { ms: dayStartMs(value, tz), dayOnly: true };
  const local = LOCAL_DT_RE.exec(value);
  if (local) return { ms: wallTimeMs(local[1]!, local[2]!, tz), dayOnly: false };
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) throw new AppError("validation", `Invalid date: ${value}`);
  return { ms, dayOnly: false };
}

const pad = (n: number) => String(n).padStart(2, "0");
/** "HH:mm" wall-clock time of an instant in tz. */
function timeOf(ms: number, tz: string) {
  const p = zonedParts(ms, tz);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

interface Timing {
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
}

interface TimingFields {
  allDay: boolean;
  date: string;
  startTime: string | null;
  endTime: string | null;
  endDate: string | null;
}

/**
 * Form-style timing → stored instants.
 * All-day: startAt = 00:00 of the first day; endAt = 00:00 of the LAST day
 * (inclusive) or null for single-day events. Timed: endAt null = no end.
 */
export function computeTiming(f: TimingFields, tz: string): Timing {
  if (f.allDay) {
    const start = dayStartMs(f.date, tz);
    const end = f.endDate && f.endDate > f.date ? dayStartMs(f.endDate, tz) : null;
    return { allDay: true, startAt: new Date(start), endAt: end != null ? new Date(end) : null };
  }
  const start = wallTimeMs(f.date, f.startTime ?? "09:00", tz);
  let end: number | null = null;
  if (f.endTime) {
    const endDay = f.endDate && f.endDate > f.date ? f.endDate : f.date;
    end = wallTimeMs(endDay, f.endTime, tz);
    // "22:00 → 01:00" ends the next day.
    if (end < start && endDay === f.date) end = wallTimeMs(addDaysKey(f.date, 1), f.endTime, tz);
    if (end <= start) end = null;
  }
  return { allDay: false, startAt: new Date(start), endAt: end != null ? new Date(end) : null };
}

function explicitTiming(
  input: { startAt?: string; endAt?: string | null; allDay?: boolean },
  tz: string,
  existing?: Timing,
): Timing {
  const s = parseWhen(input.startAt!, tz);
  const allDay = input.allDay ?? s.dayOnly;
  const startMs = allDay ? dayStartMs(dayKeyOf(s.ms, tz), tz) : s.ms;
  let endMs: number | null = null;
  if (input.endAt) {
    const e = parseWhen(input.endAt, tz);
    endMs = allDay ? dayStartMs(dayKeyOf(e.ms, tz), tz) : e.ms;
    if (endMs <= startMs) {
      if (!allDay)
        throw new AppError("validation", "endAt must be after startAt", {
          endAt: ["endAt must be after startAt"],
        });
      endMs = null;
    }
  } else if (input.endAt === undefined && existing?.endAt && existing.allDay === allDay) {
    endMs = startMs + (existing.endAt.getTime() - existing.startAt.getTime());
  }
  return { allDay, startAt: new Date(startMs), endAt: endMs != null ? new Date(endMs) : null };
}

/** New timing for an update, or null when no timing field was provided. */
function mergeTiming(input: UpdateEventInput, row: CalendarEvent, tz: string): Timing | null {
  const existing: Timing = { startAt: row.startAt, endAt: row.endAt, allDay: row.allDay };
  if (input.startAt) return explicitTiming(input, tz, existing);
  const touched =
    input.allDay !== undefined ||
    input.date !== undefined ||
    input.startTime !== undefined ||
    input.endTime !== undefined ||
    input.endDate !== undefined;
  if (!touched) {
    if (input.endAt === undefined) return null;
    // Only the end changed.
    return explicitTiming(
      { startAt: new Date(row.startAt).toISOString(), endAt: input.endAt, allDay: row.allDay },
      tz,
      existing,
    );
  }
  const allDay = input.allDay ?? row.allDay;
  const date = input.date ?? dayKeyOf(row.startAt, tz);
  const startTime =
    input.startTime !== undefined ? input.startTime : timeOf(row.startAt.getTime(), tz);
  const keepEnd = input.endTime === undefined && input.endDate === undefined;
  if (keepEnd && row.endAt && allDay === row.allDay) {
    if (allDay) {
      const span = diffDaysKey(dayKeyOf(row.startAt, tz), dayKeyOf(row.endAt, tz));
      return computeTiming(
        { allDay, date, startTime: null, endTime: null, endDate: addDaysKey(date, span) },
        tz,
      );
    }
    const t = computeTiming({ allDay, date, startTime, endTime: null, endDate: null }, tz);
    return {
      ...t,
      endAt: new Date(t.startAt.getTime() + (row.endAt.getTime() - row.startAt.getTime())),
    };
  }
  return computeTiming(
    {
      allDay,
      date,
      startTime,
      endTime: input.endTime ?? null,
      endDate: input.endDate ?? null,
    },
    tz,
  );
}

/** Canonical RRULE text; a DATE UNTIL is stored as the end of that day in `tz` (UTC). */
function normalizeRecurrence(value: string | null | undefined, tz: string) {
  if (value == null) return value;
  const rule = parseRRule(value, tz);
  return rule ? formatRRule(rule) : null;
}

/** Exclusive end of an occurrence starting at `start` (point items: end = start). */
function occurrenceEnd(row: CalendarEvent, start: number, tz: string) {
  if (row.allDay) {
    const span = row.endAt
      ? Math.max(0, diffDaysKey(dayKeyOf(row.startAt, tz), dayKeyOf(row.endAt, tz)))
      : 0;
    return dayStartMs(addDaysKey(dayKeyOf(start, tz), span + 1), tz);
  }
  return row.endAt ? start + (row.endAt.getTime() - row.startAt.getTime()) : start;
}

/** Occurrence start instants overlapping [from, to). */
function occurrences(row: CalendarEvent, from: number, to: number, tz: string) {
  const first = row.startAt.getTime();
  const duration = occurrenceEnd(row, first, tz) - first;
  const starts = row.recurrence
    ? expandRRule(
        row.recurrence,
        row.startAt,
        new Date(from - duration),
        new Date(to),
        tz,
        500,
      ).map((d) => d.getTime())
    : [first];
  return starts.filter((s) => s < to && Math.max(s + duration, s + 1) > from);
}

// ─── Mapping ────────────────────────────────────────────────────────────────

type EventWithRefs = CalendarEvent & {
  project?: { id: string; name: string; color: string } | null;
  client?: { id: string; name: string; color: string | null } | null;
};

const refColumns = { columns: { id: true, name: true, color: true } } as const;

function toEventData(actor: Actor, row: CalendarEvent): CalendarEventData {
  const isClient = actor.user.role === "client";
  return {
    id: row.id,
    title: row.title,
    description: isClient ? null : row.description,
    descriptionText: !isClient && row.description ? markdownToText(row.description, 400) : null,
    kind: row.kind,
    status: row.status,
    startAt: row.startAt.getTime(),
    endAt: row.endAt?.getTime() ?? null,
    allDay: row.allDay,
    location: row.location,
    meetingUrl: row.meetingUrl,
    projectId: row.projectId,
    clientId: row.clientId,
    promisedAt: row.promisedAt?.getTime() ?? null,
    color: row.color,
    recurrence: row.recurrence,
    remindMinutesBefore: isClient ? null : row.remindMinutesBefore,
    visibleToClient: row.visibleToClient,
    attendees: isClient ? [] : row.attendees,
    canEdit: canEditEvent(actor, row),
  };
}

function eventItems(actor: Actor, row: EventWithRefs, from: number, to: number, tz: string) {
  const data = toEventData(actor, row);
  const color = row.color ?? kindMeta[row.kind].color;
  const source: CalendarSource = row.kind === "commitment" ? "commitments" : "events";
  return occurrences(row, from, to, tz).map((start): CalendarItem => ({
    key: `ev:${row.id}:${start}`,
    source,
    type: "event",
    id: row.id,
    title: row.title,
    start,
    end: occurrenceEnd(row, start, tz),
    allDay: row.allDay,
    color,
    status: row.status,
    done: row.status === "done",
    href: null,
    project: row.project ?? null,
    client: row.client ?? null,
    event: data,
    amount: null,
  }));
}

function sortItems(items: CalendarItem[]) {
  return items.sort(
    (a, b) =>
      a.start - b.start ||
      Number(b.allDay) - Number(a.allDay) ||
      b.end - a.end ||
      a.title.localeCompare(b.title),
  );
}

// ─── Queries ────────────────────────────────────────────────────────────────

const MAX_RANGE = 366 * DAY_MS;

/**
 * Everything to draw in [from, to): events (recurring ones expanded),
 * commitments, task due dates, project & milestone due dates and (admins)
 * invoice due dates — filtered by access and by `sources`.
 */
export function listCalendarItems(
  actor: Actor,
  input: { from: number; to: number; sources?: readonly CalendarSource[] },
): CalendarItem[] {
  assertStaff(actor);
  const tz = appTimezone();
  const { from } = input;
  const to = Math.min(input.to, from + MAX_RANGE);
  if (!(to > from)) return [];
  const want = new Set(input.sources ?? calendarSources);
  const items: CalendarItem[] = [];
  const lower = new Date(from - 2 * DAY_MS);

  if (want.has("events") || want.has("commitments")) {
    const kindFilter =
      want.has("events") && want.has("commitments")
        ? undefined
        : want.has("events")
          ? ne(events.kind, "commitment")
          : eq(events.kind, "commitment");
    const rows = db.query.events.findMany({
      where: and(
        eventAccessWhere(actor),
        kindFilter,
        lt(events.startAt, new Date(to)),
        or(
          isNotNull(events.recurrence),
          sql`coalesce(${events.endAt}, ${events.startAt}) >= ${lower.getTime()}`,
        ),
      ),
      with: { project: refColumns, client: refColumns },
      orderBy: asc(events.startAt),
    });
    for (const row of rows.sync()) items.push(...eventItems(actor, row, from, to, tz));
  }

  if (want.has("tasks")) {
    const rows = db.query.tasks
      .findMany({
        where: and(
          taskAccessWhere(actor),
          isNotNull(tasks.dueAt),
          gte(tasks.dueAt, lower),
          lt(tasks.dueAt, new Date(to)),
          ne(tasks.status, "canceled"),
        ),
        with: { project: refColumns },
        orderBy: asc(tasks.dueAt),
        limit: 1000,
      })
      .sync();
    for (const t of rows) {
      const key = dayKeyOf(t.dueAt!, tz);
      const start = t.dueAllDay ? dayStartMs(key, tz) : t.dueAt!.getTime();
      const end = t.dueAllDay ? dayStartMs(addDaysKey(key, 1), tz) : start;
      if (!(start < to && Math.max(end, start + 1) > from)) continue;
      items.push({
        key: `task:${t.id}`,
        source: "tasks",
        type: "task",
        id: t.id,
        title: t.title,
        start,
        end,
        allDay: t.dueAllDay,
        color: sourceMeta.tasks.color,
        status: t.status,
        done: t.status === "done",
        href: `/panel/tasks?task=${t.id}`,
        project: t.project ?? null,
        client: null,
        event: null,
        amount: null,
      });
    }
  }

  if (want.has("projects")) {
    const visible = and(projectAccessWhere(actor), isNull(projects.archivedAt));
    const projectRows = db
      .select({
        id: projects.id,
        name: projects.name,
        color: projects.color,
        status: projects.status,
        dueDate: projects.dueDate,
      })
      .from(projects)
      .where(
        and(
          visible,
          notInArray(projects.status, ["canceled", "archived"]),
          isNotNull(projects.dueDate),
          gte(projects.dueDate, lower),
          lt(projects.dueDate, new Date(to)),
        ),
      )
      .all();
    for (const p of projectRows) {
      const key = dayKeyOf(p.dueDate!, tz);
      const start = dayStartMs(key, tz);
      const end = dayStartMs(addDaysKey(key, 1), tz);
      if (!(start < to && end > from)) continue;
      const ref = { id: p.id, name: p.name, color: p.color };
      items.push({
        key: `project:${p.id}`,
        source: "projects",
        type: "project",
        id: p.id,
        title: p.name,
        start,
        end,
        allDay: true,
        color: p.color,
        status: p.status,
        done: p.status === "completed",
        href: `/panel/projects/${p.id}`,
        project: ref,
        client: null,
        event: null,
        amount: null,
      });
    }
    const milestoneRows = db
      .select({
        id: milestones.id,
        title: milestones.title,
        status: milestones.status,
        dueDate: milestones.dueDate,
        projectId: projects.id,
        projectName: projects.name,
        projectColor: projects.color,
      })
      .from(milestones)
      .innerJoin(projects, eq(projects.id, milestones.projectId))
      .where(
        and(
          visible,
          isNotNull(milestones.dueDate),
          gte(milestones.dueDate, lower),
          lt(milestones.dueDate, new Date(to)),
        ),
      )
      .all();
    for (const m of milestoneRows) {
      const key = dayKeyOf(m.dueDate!, tz);
      const start = dayStartMs(key, tz);
      const end = dayStartMs(addDaysKey(key, 1), tz);
      if (!(start < to && end > from)) continue;
      items.push({
        key: `milestone:${m.id}`,
        source: "projects",
        type: "milestone",
        id: m.id,
        title: m.title,
        start,
        end,
        allDay: true,
        color: m.projectColor,
        status: m.status,
        done: m.status === "done",
        href: `/panel/projects/${m.projectId}`,
        project: { id: m.projectId, name: m.projectName, color: m.projectColor },
        client: null,
        event: null,
        amount: null,
      });
    }
  }

  if (want.has("invoices") && isAdmin(actor)) {
    const rows = db
      .select({
        id: invoices.id,
        number: invoices.number,
        status: invoices.status,
        dueDate: invoices.dueDate,
        totalMinor: invoices.totalMinor,
        paidMinor: invoices.paidMinor,
        currency: invoices.currency,
        clientId: clients.id,
        clientName: clients.name,
        clientColor: clients.color,
      })
      .from(invoices)
      .leftJoin(clients, eq(clients.id, invoices.clientId))
      .where(
        and(
          isNotNull(invoices.dueDate),
          notInArray(invoices.status, ["draft", "void"]),
          gte(invoices.dueDate, lower),
          lt(invoices.dueDate, new Date(to)),
        ),
      )
      .all();
    for (const inv of rows) {
      const key = dayKeyOf(inv.dueDate!, tz);
      const start = dayStartMs(key, tz);
      const end = dayStartMs(addDaysKey(key, 1), tz);
      if (!(start < to && end > from)) continue;
      items.push({
        key: `invoice:${inv.id}`,
        source: "invoices",
        type: "invoice",
        id: inv.id,
        title: inv.number,
        start,
        end,
        allDay: true,
        color: sourceMeta.invoices.color,
        status: inv.status,
        done: inv.status === "paid",
        href: `/panel/invoices/${inv.id}`,
        project: null,
        client: inv.clientId
          ? { id: inv.clientId, name: inv.clientName ?? "", color: inv.clientColor }
          : null,
        event: null,
        amount: { minor: Math.max(0, inv.totalMinor - inv.paidMinor), currency: inv.currency },
      });
    }
  }

  return sortItems(items);
}

export function getEvent(actor: Actor, id: string) {
  const row = db.query.events
    .findFirst({
      where: and(eq(events.id, id), eventAccessWhere(actor)),
      with: { project: refColumns, client: refColumns },
    })
    .sync();
  if (!row) throw notFound("Event");
  return row;
}

/** Event as API/LLM-friendly JSON (ISO instants in UTC + local wall-clock). */
export function eventToJson(row: EventWithRefs, tz = appTimezone()) {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    status: row.kind === "commitment" ? toCommitmentState(row.status) : row.status,
    allDay: row.allDay,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt?.toISOString() ?? null,
    local: {
      date: dayKeyOf(row.startAt, tz),
      startTime: row.allDay ? null : timeOf(row.startAt.getTime(), tz),
      endDate: row.endAt ? dayKeyOf(row.endAt, tz) : null,
      endTime: row.endAt && !row.allDay ? timeOf(row.endAt.getTime(), tz) : null,
      timezone: tz,
    },
    location: row.location,
    meetingUrl: row.meetingUrl,
    project: row.project ? { id: row.project.id, name: row.project.name } : null,
    client: row.client ? { id: row.client.id, name: row.client.name } : null,
    promisedAt: row.promisedAt?.toISOString() ?? null,
    recurrence: row.recurrence,
    remindMinutesBefore: row.remindMinutesBefore,
    visibleToClient: row.visibleToClient,
    attendees: row.attendees,
    description: row.description,
  };
}

/** Upcoming / past events of one project (project page panel & client portal). */
export function listProjectEvents(
  actor: Actor,
  projectId: string,
  opts: { clientView?: boolean; now?: number; limit?: number } = {},
) {
  assertProjectRead(actor, projectId);
  const clientView = !!opts.clientView || actor.user.role === "client";
  const tz = appTimezone();
  const now = opts.now ?? Date.now();
  const limit = opts.limit ?? 8;
  const viewer: Actor = clientView ? { ...actor, user: { ...actor.user, role: "client" } } : actor;
  const rows = db.query.events
    .findMany({
      where: and(
        eq(events.projectId, projectId),
        clientView ? eq(events.visibleToClient, true) : undefined,
        ne(events.status, "canceled"),
      ),
      with: { project: refColumns, client: refColumns },
      orderBy: asc(events.startAt),
    })
    .sync();
  const upcoming: CalendarItem[] = [];
  const past: CalendarItem[] = [];
  for (const row of rows) {
    upcoming.push(...eventItems(viewer, row, now, now + 120 * DAY_MS, tz));
    past.push(...eventItems(viewer, row, now - 365 * DAY_MS, now, tz));
  }
  const live = new Set(upcoming.map((i) => i.key));
  // One entry per series: the next occurrence ahead, the latest one behind.
  const firstPerEvent = (list: CalendarItem[]) => {
    const seen = new Set<string>();
    return list.filter((i) => !seen.has(i.id) && !!seen.add(i.id));
  };
  return {
    upcoming: firstPerEvent(sortItems(upcoming)).slice(0, limit),
    past: firstPerEvent(sortItems(past.filter((i) => !live.has(i.key))).reverse()).slice(0, limit),
  };
}

// ─── Agenda (LLM-friendly) ──────────────────────────────────────────────────

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function agenda(actor: Actor, input: z.output<typeof agendaInput>) {
  assertStaff(actor);
  const tz = appTimezone();
  const fromKey = input.from ?? dayKeyOf(Date.now(), tz);
  const endKey = addDaysKey(fromKey, input.days);
  const sources = calendarSources.filter((s) => input.includeTasks || s !== "tasks");
  const items = listCalendarItems(actor, {
    from: dayStartMs(fromKey, tz),
    to: dayStartMs(endKey, tz),
    sources,
  });
  const days: {
    date: string;
    weekday: string;
    items: Record<string, unknown>[];
  }[] = [];
  const lines: string[] = [];
  for (let key = fromKey; key !== endKey; key = addDaysKey(key, 1)) {
    const start = dayStartMs(key, tz);
    const end = dayStartMs(addDaysKey(key, 1), tz);
    const today = items.filter((i) => i.start < end && Math.max(i.end, i.start + 1) > start);
    const weekday = WEEKDAY_NAMES[new Date(`${key}T12:00:00Z`).getUTCDay()]!;
    const list = today.map((i) => {
      const time = i.allDay
        ? "all-day"
        : i.end > i.start
          ? `${timeOf(i.start, tz)}–${timeOf(i.end, tz)}`
          : timeOf(i.start, tz);
      const type =
        i.type === "event"
          ? i.event!.kind === "commitment"
            ? "commitment"
            : i.event!.kind
          : i.type;
      const status =
        i.type === "event" && i.event!.kind === "commitment"
          ? toCommitmentState(i.event!.status)
          : i.status;
      return {
        id: i.id,
        type,
        title: i.title,
        time,
        status,
        project: i.project?.name ?? null,
        client: i.client?.name ?? null,
        location: i.event?.location ?? null,
        meetingUrl: i.event?.meetingUrl ?? null,
        recurring: !!i.event?.recurrence,
      };
    });
    days.push({ date: key, weekday, items: list });
    lines.push(`${weekday} ${key}:`);
    if (!list.length) lines.push("  (nothing scheduled)");
    for (const it of list) {
      const who = [it.project, it.client].filter(Boolean).join(" / ");
      lines.push(
        `  - ${it.time} [${it.type}${it.status ? `, ${it.status}` : ""}] ${it.title}${who ? ` (${who})` : ""}`,
      );
    }
  }
  return { timezone: tz, from: fromKey, to: addDaysKey(endKey, -1), days, text: lines.join("\n") };
}

// ─── Mutations ──────────────────────────────────────────────────────────────

function eventValues(
  input: Partial<EventInput> & { projectId?: string | null; clientId?: string | null },
  tz: string,
) {
  return {
    ...(input.title !== undefined && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.kind !== undefined && { kind: input.kind }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.location !== undefined && { location: input.location }),
    ...(input.meetingUrl !== undefined && { meetingUrl: input.meetingUrl }),
    ...(input.projectId !== undefined && { projectId: input.projectId }),
    ...(input.clientId !== undefined && { clientId: input.clientId }),
    ...(input.promisedAt !== undefined && {
      promisedAt: input.promisedAt ? new Date(parseWhen(input.promisedAt, tz).ms) : null,
    }),
    ...(input.color !== undefined && { color: input.color }),
    ...(input.recurrence !== undefined && { recurrence: normalizeRecurrence(input.recurrence, tz) }),
    ...(input.remindMinutesBefore !== undefined && {
      remindMinutesBefore: input.remindMinutesBefore,
    }),
    ...(input.visibleToClient !== undefined && { visibleToClient: input.visibleToClient }),
    ...(input.attendees !== undefined && { attendees: input.attendees }),
  };
}

export function createEvent(actor: Actor, input: EventInput) {
  assertStaff(actor);
  const tz = appTimezone();
  checkRefs(actor, input);
  const timing = input.startAt
    ? explicitTiming(input, tz)
    : computeTiming(
        {
          allDay: input.allDay,
          date: input.date!,
          startTime: input.startTime ?? null,
          endTime: input.endTime ?? null,
          endDate: input.endDate ?? null,
        },
        tz,
      );
  const clientId =
    input.clientId ?? (input.projectId ? projectClientId(input.projectId) : null) ?? null;
  const values = eventValues({ ...input, clientId }, tz);
  const row = db
    .insert(events)
    .values({
      ...values,
      title: input.title,
      kind: input.kind,
      status: input.status ?? "confirmed",
      ...timing,
      promisedAt: values.promisedAt ?? (input.kind === "commitment" ? new Date() : null),
      attendees: input.attendees ?? [],
      createdBy: actor.user.id,
    })
    .returning()
    .get();
  logActivity(
    actor,
    input.kind === "commitment" ? "commitment.create" : "event.create",
    "event",
    row.id,
    row.title,
  );
  return row;
}

export function updateEvent(actor: Actor, { id, ...input }: UpdateEventInput) {
  const row = loadEventForWrite(actor, id);
  const tz = appTimezone();
  checkRefs(actor, { projectId: input.projectId, clientId: input.clientId });
  const timing = mergeTiming({ id, ...input }, row, tz);
  let clientId = input.clientId;
  // Members can't pick clients: follow the project's client when the project changes.
  if (!isAdmin(actor) && input.projectId !== undefined && input.projectId !== row.projectId)
    clientId = input.projectId ? projectClientId(input.projectId) : null;
  const patch = {
    ...eventValues({ ...input, clientId }, tz),
    ...(timing ?? {}),
  };
  if (timing || input.remindMinutesBefore !== undefined || input.recurrence !== undefined)
    Object.assign(patch, { remindedAt: null });
  const updated = db.update(events).set(patch).where(eq(events.id, id)).returning().get();
  logActivity(actor, "event.update", "event", id, updated?.title);
  return updated!;
}

export function deleteEvent(actor: Actor, id: string) {
  const row = loadEventForWrite(actor, id);
  db.delete(events).where(eq(events.id, id)).run();
  logActivity(actor, "event.delete", "event", id, row.title);
  return { id };
}

/** Copy an event (same time); the copy belongs to the actor. */
export function duplicateEvent(actor: Actor, id: string) {
  assertStaff(actor);
  const src = getEvent(actor, id);
  const row = db
    .insert(events)
    .values({
      title: src.title,
      description: src.description,
      kind: src.kind,
      status: src.kind === "commitment" ? "confirmed" : src.status,
      startAt: src.startAt,
      endAt: src.endAt,
      allDay: src.allDay,
      location: src.location,
      meetingUrl: src.meetingUrl,
      projectId: src.projectId,
      clientId: src.clientId,
      taskId: src.taskId,
      promisedAt: src.promisedAt,
      color: src.color,
      recurrence: src.recurrence,
      remindMinutesBefore: src.remindMinutesBefore,
      attendees: src.attendees,
      visibleToClient: src.visibleToClient,
      createdBy: actor.user.id,
    })
    .returning()
    .get();
  logActivity(actor, "event.duplicate", "event", row.id, row.title, { from: id });
  return row;
}

// ─── Commitments ────────────────────────────────────────────────────────────

const toStatus: Record<CommitmentState, CalendarEvent["status"]> = {
  pending: "confirmed",
  kept: "done",
  missed: "missed",
  canceled: "canceled",
};

export function toCommitmentState(status: CalendarEvent["status"]): CommitmentState {
  return status === "done"
    ? "kept"
    : status === "missed"
      ? "missed"
      : status === "canceled"
        ? "canceled"
        : "pending";
}

export type CommitmentGroup = "overdue" | "upcoming" | "kept" | "missed" | "canceled";

/** Due instant after which a pending commitment counts as overdue. */
function commitmentDueEnd(row: Pick<CalendarEvent, "startAt" | "allDay">, tz: string) {
  return row.allDay
    ? dayStartMs(addDaysKey(dayKeyOf(row.startAt, tz), 1), tz)
    : row.startAt.getTime();
}

export function commitmentGroup(
  row: Pick<CalendarEvent, "startAt" | "allDay" | "status">,
  now: number,
  tz: string,
): CommitmentGroup {
  const state = toCommitmentState(row.status);
  if (state !== "pending") return state;
  return commitmentDueEnd(row, tz) <= now ? "overdue" : "upcoming";
}

interface Tally {
  kept: number;
  missed: number;
  pending: number;
  canceled: number;
}

/** kept / (kept + missed); null when nothing has been decided yet. */
export function keepRate(t: Pick<Tally, "kept" | "missed">) {
  return t.kept + t.missed ? t.kept / (t.kept + t.missed) : null;
}

export function listCommitments(
  actor: Actor,
  input: Partial<z.output<typeof listCommitmentsInput>> = {},
  now = Date.now(),
) {
  assertStaff(actor);
  const tz = appTimezone();
  const rows = db.query.events
    .findMany({
      where: and(
        eventAccessWhere(actor),
        eq(events.kind, "commitment"),
        input.clientId ? eq(events.clientId, input.clientId) : undefined,
        input.projectId ? eq(events.projectId, input.projectId) : undefined,
      ),
      with: { project: refColumns, client: refColumns },
      orderBy: asc(events.startAt),
    })
    .sync();

  const all = rows.map((row) => ({
    row,
    group: commitmentGroup(row, now, tz),
  }));

  // ── stats (over the client/project filter, ignoring the status filter)
  const total: Tally = { kept: 0, missed: 0, pending: 0, canceled: 0 };
  const byClient = new Map<string, Tally & { client: CalendarRef | null }>();
  let leadSum = 0;
  let leadN = 0;
  for (const { row, group } of all) {
    const state = toCommitmentState(row.status);
    total[state]++;
    const k = row.clientId ?? "";
    const entry = byClient.get(k) ?? {
      client: row.client ?? null,
      kept: 0,
      missed: 0,
      pending: 0,
      canceled: 0,
    };
    entry[state]++;
    byClient.set(k, entry);
    if (row.promisedAt && row.startAt >= row.promisedAt) {
      leadSum += row.startAt.getTime() - row.promisedAt.getTime();
      leadN++;
    }
    void group;
  }
  const overdue = all.filter((c) => c.group === "overdue").length;
  const dueSoon = all.filter(
    (c) => c.group === "upcoming" && c.row.startAt.getTime() < now + 7 * DAY_MS,
  ).length;

  const status = input.status ?? "all";
  const filtered = all.filter(({ group }) =>
    status === "all"
      ? true
      : status === "pending"
        ? group === "overdue" || group === "upcoming"
        : group === status,
  );

  return {
    items: filtered.map(({ row, group }) => ({
      id: row.id,
      title: row.title,
      group,
      state: toCommitmentState(row.status),
      due: row.startAt.getTime(),
      allDay: row.allDay,
      promisedAt: row.promisedAt?.getTime() ?? null,
      project: row.project ?? null,
      client: row.client ?? null,
      event: toEventData(actor, row),
    })),
    stats: {
      ...total,
      overdue,
      dueSoon,
      keepRate: keepRate(total),
      avgLeadMs: leadN ? Math.round(leadSum / leadN) : null,
      byClient: [...byClient.values()]
        .map((c) => ({ ...c, keepRate: keepRate(c) }))
        .sort((a, b) => b.kept + b.missed + b.pending - (a.kept + a.missed + a.pending)),
    },
  };
}

/** Commitments as API/LLM-friendly JSON. */
export function listCommitmentsJson(actor: Actor, input: z.output<typeof listCommitmentsInput>) {
  const tz = appTimezone();
  const res = listCommitments(actor, input);
  return {
    timezone: tz,
    stats: {
      kept: res.stats.kept,
      missed: res.stats.missed,
      pending: res.stats.pending,
      overdue: res.stats.overdue,
      keepRate: res.stats.keepRate,
      avgLeadDays: res.stats.avgLeadMs != null ? +(res.stats.avgLeadMs / DAY_MS).toFixed(1) : null,
      byClient: res.stats.byClient.map((c) => ({
        client: c.client?.name ?? null,
        clientId: c.client?.id ?? null,
        kept: c.kept,
        missed: c.missed,
        pending: c.pending,
        keepRate: c.keepRate,
      })),
    },
    commitments: res.items.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.state,
      overdue: c.group === "overdue",
      to: c.client?.name ?? null,
      clientId: c.client?.id ?? null,
      project: c.project?.name ?? null,
      projectId: c.project?.id ?? null,
      due: c.allDay ? dayKeyOf(c.due, tz) : new Date(c.due).toISOString(),
      dueLocal: c.allDay ? dayKeyOf(c.due, tz) : `${dayKeyOf(c.due, tz)} ${timeOf(c.due, tz)}`,
      promisedAt: c.promisedAt ? new Date(c.promisedAt).toISOString() : null,
    })),
  };
}

function dueTiming(due: string, dueTime: string | undefined, tz: string): Timing {
  const w = parseWhen(due, tz);
  if (w.dayOnly && dueTime)
    return { allDay: false, startAt: new Date(wallTimeMs(due, dueTime, tz)), endAt: null };
  return { allDay: w.dayOnly, startAt: new Date(w.ms), endAt: null };
}

export function createCommitment(actor: Actor, input: z.output<typeof commitmentInput>) {
  assertStaff(actor);
  const tz = appTimezone();
  checkRefs(actor, input);
  const timing = dueTiming(input.due, input.dueTime, tz);
  const clientId =
    input.clientId ?? (input.projectId ? projectClientId(input.projectId) : null) ?? null;
  const row = db
    .insert(events)
    .values({
      title: input.title,
      kind: "commitment",
      status: "confirmed",
      ...timing,
      projectId: input.projectId ?? null,
      clientId,
      description: input.description ?? null,
      promisedAt: input.promisedAt ? new Date(parseWhen(input.promisedAt, tz).ms) : new Date(),
      visibleToClient: input.visibleToClient,
      createdBy: actor.user.id,
    })
    .returning()
    .get();
  logActivity(actor, "commitment.create", "event", row.id, row.title);
  return row;
}

function loadCommitmentForWrite(actor: Actor, id: string) {
  const row = loadEventForWrite(actor, id);
  if (row.kind !== "commitment") throw new AppError("validation", "This event is not a commitment");
  return row;
}

export function setCommitmentStatus(actor: Actor, input: z.output<typeof commitmentStatusInput>) {
  const row = loadCommitmentForWrite(actor, input.id);
  const updated = db
    .update(events)
    .set({ status: toStatus[input.status] })
    .where(eq(events.id, row.id))
    .returning()
    .get();
  logActivity(actor, `commitment.${input.status}`, "event", row.id, row.title);
  return updated!;
}

/** Move a commitment to a new due date (keeps its time of day unless `dueTime` is given). */
export function rescheduleCommitment(
  actor: Actor,
  input: z.output<typeof rescheduleCommitmentInput>,
) {
  const row = loadCommitmentForWrite(actor, input.id);
  const tz = appTimezone();
  const w = parseWhen(input.due, tz);
  let timing: Timing;
  if (w.dayOnly && !input.dueTime && !row.allDay)
    timing = dueTiming(input.due, timeOf(row.startAt.getTime(), tz), tz);
  else timing = dueTiming(input.due, input.dueTime, tz);
  const updated = db
    .update(events)
    .set({
      ...timing,
      status: row.status === "done" || row.status === "canceled" ? row.status : "confirmed",
      remindedAt: null,
    })
    .where(eq(events.id, row.id))
    .returning()
    .get();
  logActivity(actor, "commitment.reschedule", "event", row.id, row.title, {
    from: row.startAt.toISOString(),
    to: timing.startAt.toISOString(),
  });
  return updated!;
}

// ─── Reminders (call periodically from the jobs runner) ─────────────────────

/**
 * Send in-app reminders for events whose `remindMinutesBefore` window has
 * started. Recurring events remind once per occurrence (tracked through
 * `remindedAt`). Safe to call every minute; returns the number sent.
 */
export function runEventReminders(now = Date.now()) {
  const tz = appTimezone();
  const rows = db
    .select({ ev: events, locale: users.locale })
    .from(events)
    .innerJoin(users, eq(users.id, events.createdBy))
    .where(
      and(
        isNotNull(events.remindMinutesBefore),
        notInArray(events.status, ["canceled", "done", "missed"]),
        or(isNotNull(events.recurrence), gte(events.startAt, new Date(now - DAY_MS))),
        lt(events.startAt, new Date(now + 15 * DAY_MS)),
      ),
    )
    .all();
  let sent = 0;
  for (const { ev, locale } of rows) {
    const lead = (ev.remindMinutesBefore ?? 0) * 60_000;
    const next = ev.recurrence
      ? expandRRule(
          ev.recurrence,
          ev.startAt,
          new Date(now - 10 * 60_000),
          new Date(now + lead + 60_000),
          tz,
          5,
        )
      : [ev.startAt].filter((d) => d.getTime() >= now - 10 * 60_000);
    const occ = next.find((d) => d.getTime() - lead <= now);
    if (!occ) continue;
    const remindAt = occ.getTime() - lead;
    if (ev.remindedAt && ev.remindedAt.getTime() >= remindAt) continue;
    const t = messages[locale].calendar;
    notify(ev.createdBy!, {
      kind: ev.kind === "commitment" ? "commitment.reminder" : "event.reminder",
      title: `${ev.kind === "commitment" ? "🤝 " : "🔔 "}${ev.title}`,
      body: ev.allDay
        ? t.reminderBodyAllDay
        : t.reminderBody.replace("{time}", timeOf(occ.getTime(), tz)),
      href: `/panel/calendar?view=day&date=${dayKeyOf(occ, tz)}&event=${ev.id}`,
    });
    db.update(events)
      .set({ remindedAt: new Date(now) })
      .where(eq(events.id, ev.id))
      .run();
    sent++;
  }
  return sent;
}
