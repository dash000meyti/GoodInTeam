import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { bool, createdAt, json, money, pk, timestamp, updatedAt } from "./_columns";
import { users } from "./auth";
import { clients } from "./crm";
import { projects } from "./projects";

// ─── Tasks / to-dos / reminders ────────────────────────────────────────────

export const taskStatuses = [
  "inbox",
  "todo",
  "in_progress",
  "waiting",
  "someday",
  "done",
  "canceled",
] as const;
export type TaskStatus = (typeof taskStatuses)[number];

/** 0 none · 1 low · 2 medium · 3 high · 4 urgent */
export const taskPriorities = [0, 1, 2, 3, 4] as const;

export const tasks = sqliteTable(
  "tasks",
  {
    id: pk(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    parentId: text("parent_id"),
    title: text("title").notNull(),
    notes: text("notes"),
    status: text("status", { enum: taskStatuses }).notNull().default("inbox"),
    priority: integer("priority").notNull().default(0),
    dueAt: timestamp("due_at"),
    /** true = dueAt is a calendar day, not a precise time. */
    dueAllDay: bool("due_all_day").notNull().default(true),
    remindAt: timestamp("remind_at"),
    remindedAt: timestamp("reminded_at"),
    completedAt: timestamp("completed_at"),
    estimateMinutes: integer("estimate_minutes"),
    /** RFC 5545 RRULE (e.g. "FREQ=WEEKLY;BYDAY=SA"). Completing spawns the next one. */
    recurrence: text("recurrence"),
    tags: json<string[]>("tags").notNull().default([]),
    sort: real("sort").notNull().default(0),
    assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
    visibleToClient: bool("visible_to_client").notNull().default(false),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("tasks_status_idx").on(t.status),
    index("tasks_project_idx").on(t.projectId),
    index("tasks_due_idx").on(t.dueAt),
    index("tasks_remind_idx").on(t.remindAt),
  ],
);

// ─── Time tracking ─────────────────────────────────────────────────────────

export const timeEntrySources = ["timer", "manual", "api", "import"] as const;

/**
 * A time entry with endedAt = null is a RUNNING timer. Multiple timers can run
 * at the same time (e.g. two projects in parallel) — by design.
 */
export const timeEntries = sqliteTable(
  "time_entries",
  {
    id: pk(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
    description: text("description"),
    startedAt: timestamp("started_at").notNull(),
    endedAt: timestamp("ended_at"),
    billable: bool("billable").notNull().default(true),
    /** Snapshot of the rate when the entry was created (minor units/hour). */
    hourlyRateMinor: money("hourly_rate_minor"),
    currency: text("currency"),
    invoiceId: text("invoice_id"),
    source: text("source", { enum: timeEntrySources }).notNull().default("timer"),
    tags: json<string[]>("tags").notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("time_entries_user_started_idx").on(t.userId, t.startedAt),
    index("time_entries_project_idx").on(t.projectId, t.startedAt),
    index("time_entries_running_idx").on(t.endedAt),
  ],
);

// ─── Calendar ─────────────────────────────────────────────────────────────

export const eventKinds = [
  "meeting",
  "commitment",
  "deadline",
  "focus",
  "reminder",
  "personal",
  "other",
] as const;
export type EventKind = (typeof eventKinds)[number];

export const eventStatuses = ["tentative", "confirmed", "done", "missed", "canceled"] as const;

export const events = sqliteTable(
  "events",
  {
    id: pk(),
    title: text("title").notNull(),
    description: text("description"),
    kind: text("kind", { enum: eventKinds }).notNull().default("meeting"),
    status: text("status", { enum: eventStatuses }).notNull().default("confirmed"),
    startAt: timestamp("start_at").notNull(),
    endAt: timestamp("end_at"),
    allDay: bool("all_day").notNull().default(false),
    location: text("location"),
    meetingUrl: text("meeting_url"),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    /** For commitments: the team/client the promise was made to. */
    clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
    taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
    /** For commitments: when the promise was made ("I told them on …"). */
    promisedAt: timestamp("promised_at"),
    color: text("color"),
    /** RFC 5545 RRULE for recurring events. */
    recurrence: text("recurrence"),
    remindMinutesBefore: integer("remind_minutes_before"),
    remindedAt: timestamp("reminded_at"),
    attendees: json<{ name: string; email?: string }[]>("attendees").notNull().default([]),
    visibleToClient: bool("visible_to_client").notNull().default(false),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("events_start_idx").on(t.startAt),
    index("events_kind_idx").on(t.kind),
    index("events_project_idx").on(t.projectId),
  ],
);
