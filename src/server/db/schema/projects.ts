import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { bool, createdAt, json, money, pk, timestamp, updatedAt } from "./_columns";
import { users } from "./auth";
import { clients } from "./crm";

export const projectStatuses = [
  "lead",
  "planning",
  "active",
  "paused",
  "completed",
  "canceled",
  "archived",
] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export const billingTypes = ["hourly", "fixed", "retainer", "internal"] as const;
export const progressModes = ["manual", "milestones", "tasks"] as const;

export const projects = sqliteTable(
  "projects",
  {
    id: pk(),
    clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    status: text("status", { enum: projectStatuses }).notNull().default("active"),
    color: text("color").notNull().default("#00A76F"),
    icon: text("icon"),
    startDate: timestamp("start_date"),
    dueDate: timestamp("due_date"),
    billingType: text("billing_type", { enum: billingTypes }).notNull().default("hourly"),
    currency: text("currency").notNull().default("IRT"),
    budgetMinor: money("budget_minor"),
    hourlyRateMinor: money("hourly_rate_minor"),
    /** Planned effort in hours (for burn-down / estimates). */
    estimateHours: real("estimate_hours"),
    progress: integer("progress").notNull().default(0),
    progressMode: text("progress_mode", { enum: progressModes }).notNull().default("milestones"),
    websiteUrl: text("website_url"),
    repoUrl: text("repo_url"),
    tags: json<string[]>("tags").notNull().default([]),

    // ── Client portal visibility (what the client can see) ──
    portalEnabled: bool("portal_enabled").notNull().default(false),
    shareProgress: bool("share_progress").notNull().default(true),
    shareTime: bool("share_time").notNull().default(false),
    shareTasks: bool("share_tasks").notNull().default(false),
    shareFinance: bool("share_finance").notNull().default(false),
    shareDocs: bool("share_docs").notNull().default(false),
    /** Public, unauthenticated status page token (/p/<token>). Null = disabled. */
    shareToken: text("share_token"),

    archivedAt: timestamp("archived_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("projects_slug_uq").on(t.slug),
    uniqueIndex("projects_share_token_uq").on(t.shareToken),
    index("projects_client_idx").on(t.clientId),
    index("projects_status_idx").on(t.status),
  ],
);

/** Team members (role member/admin) assigned to a project. */
export const projectMembers = sqliteTable(
  "project_members",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["lead", "member", "viewer"] })
      .notNull()
      .default("member"),
    hourlyCostMinor: money("hourly_cost_minor"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

export const milestoneStatuses = ["planned", "in_progress", "done"] as const;

export const milestones = sqliteTable(
  "milestones",
  {
    id: pk(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: milestoneStatuses }).notNull().default("planned"),
    dueDate: timestamp("due_date"),
    /** Relative weight for progress calculation. */
    weight: integer("weight").notNull().default(1),
    completedAt: timestamp("completed_at"),
    sort: real("sort").notNull().default(0),
    visibleToClient: bool("visible_to_client").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("milestones_project_idx").on(t.projectId)],
);

export const projectUpdateKinds = ["update", "release", "issue", "request", "note"] as const;

/** Status feed shown to the client ("what happened this week"). */
export const projectUpdates = sqliteTable(
  "project_updates",
  {
    id: pk(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: projectUpdateKinds }).notNull().default("update"),
    title: text("title").notNull(),
    bodyMd: text("body_md"),
    visibleToClient: bool("visible_to_client").notNull().default(true),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("project_updates_project_idx").on(t.projectId, t.createdAt)],
);
