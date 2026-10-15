/**
 * Enum value lists of the data model (status / kind / role lists …).
 *
 * This module is **dependency-free on purpose**: client components import their option
 * lists from here. Importing them from `@/server/db/schema/*` instead would pull
 * drizzle-orm (and a `node:crypto` polyfill via the id helper) into the browser bundle.
 * The schema files use these lists for their `text(..., { enum })` columns and re-export
 * them, so server code can keep importing from `@/server/db/schema`.
 *
 * Rule: no imports in this file (enforced by `enums.test.ts`).
 */

// ─── Auth ──────────────────────────────────────────────────────────────────

/**
 * Roles:
 * - owner:  you. Full access to everything.
 * - admin:  trusted teammate with full access except owner-only settings.
 * - member: teammate; sees projects they are a member of, tracks own time.
 * - client: customer portal user; sees only their client's shared data.
 */
export const userRoles = ["owner", "admin", "member", "client"] as const;
export type UserRole = (typeof userRoles)[number];

export const apiTokenScopes = ["read", "write", "admin"] as const;
export type ApiTokenScope = (typeof apiTokenScopes)[number];

// ─── CRM ───────────────────────────────────────────────────────────────────

export const clientKinds = ["company", "team", "person"] as const;

// ─── Projects ──────────────────────────────────────────────────────────────

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
export const milestoneStatuses = ["planned", "in_progress", "done"] as const;
export const projectUpdateKinds = ["update", "release", "issue", "request", "note"] as const;

// ─── Work: tasks, time, calendar ───────────────────────────────────────────

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

export const timeEntrySources = ["timer", "manual", "api", "import"] as const;

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

// ─── Finance ───────────────────────────────────────────────────────────────

export const accountKinds = ["bank", "cash", "card", "crypto", "wallet", "other"] as const;
export const categoryKinds = ["income", "expense"] as const;
export const transactionKinds = ["income", "expense", "transfer"] as const;
export type TransactionKind = (typeof transactionKinds)[number];

export const invoiceStatuses = [
  "draft",
  "sent",
  "viewed",
  "partial",
  "paid",
  "overdue",
  "void",
] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

// ─── Contracts ─────────────────────────────────────────────────────────────

export const contractKinds = ["contract", "proposal", "nda", "approval", "change_request"] as const;
export const contractStatuses = [
  "draft",
  "sent",
  "viewed",
  "signed",
  "declined",
  "void",
  "expired",
] as const;
export type ContractStatus = (typeof contractStatuses)[number];

export const contractEventTypes = [
  "created",
  "updated",
  "sent",
  "viewed",
  "signed",
  "declined",
  "voided",
  "reminded",
] as const;

// ─── Vault ─────────────────────────────────────────────────────────────────

export const vaultItemTypes = [
  "login",
  "note",
  "api_key",
  "ssh_key",
  "database",
  "server",
  "card",
  "env",
  "other",
] as const;

// ─── Knowledge base ────────────────────────────────────────────────────────

export const docVisibilities = ["private", "team", "client"] as const;

// ─── Content (CMS) ─────────────────────────────────────────────────────────

/** See `schema/content.ts` for what each post type is. */
export const postTypes = [
  "article",
  "tutorial",
  "vlog",
  "note",
  "work",
  "service",
  "page",
] as const;
export type PostType = (typeof postTypes)[number];
export const postStatuses = ["draft", "scheduled", "published", "archived"] as const;

export const socialNetworks = [
  "x",
  "linkedin",
  "telegram",
  "instagram",
  "mastodon",
  "bluesky",
  "threads",
  "youtube",
] as const;

export const leadStatuses = ["new", "contacted", "qualified", "won", "lost", "spam"] as const;
