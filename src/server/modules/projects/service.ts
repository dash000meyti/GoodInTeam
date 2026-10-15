import "server-only";
import { and, asc, desc, eq, inArray, isNull, like, ne, or, sql, type SQL } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/server/db/client";
import {
  milestones,
  projectMembers,
  projects,
  projectUpdates,
  tasks,
  timeEntries,
  transactions,
} from "@/server/db/schema";
import { assertAdmin, assertStaff, isAdmin, type Actor } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { forbidden, notFound } from "@/server/errors";
import { appTimezone } from "@/server/modules/settings/service";
import { newToken } from "@/lib/ids";
import { fromMinor, isCurrency, toMinor, type CurrencyCode } from "@/lib/money";
import { fromDateInput } from "@/lib/tz";
import { slugify } from "@/lib/utils";
import type {
  listProjectsInput,
  milestoneInput,
  projectInput,
  projectUpdateInput,
  updateMilestoneInput,
  updateProjectInput,
} from "./schemas";

type ProjectRow = typeof projects.$inferSelect;

// ─── Access control ─────────────────────────────────────────────────────────

/**
 * SQL filter for the projects an actor may read.
 * owner/admin: all · member: assigned projects · client: own client's portal projects.
 */
export function projectAccessWhere(actor: Actor): SQL | undefined {
  if (isAdmin(actor)) return undefined;
  if (actor.user.role === "member") {
    return inArray(
      projects.id,
      db
        .select({ id: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, actor.user.id)),
    );
  }
  if (!actor.user.clientId) return sql`0`;
  return and(eq(projects.clientId, actor.user.clientId), eq(projects.portalEnabled, true));
}

export function assertProjectRead(actor: Actor, projectId: string) {
  const row = db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), projectAccessWhere(actor)))
    .get();
  if (!row) throw notFound("Project");
}

const isClientActor = (actor: Actor) => actor.user.role === "client";

/** Clients see tracked time only when the project shares it; staff always. */
function canSeeTime(actor: Actor, p: Pick<ProjectRow, "shareTime">) {
  return !isClientActor(actor) || p.shareTime;
}

/** Clients see progress/milestones only when the project shares it; staff always. */
function canSeeProgress(actor: Actor, p: Pick<ProjectRow, "shareProgress">) {
  return !isClientActor(actor) || p.shareProgress;
}

/** Fields `projectView` may blank out (null / []) depending on the viewer. */
interface RedactedProjectFields {
  budgetMinor: number | null;
  hourlyRateMinor: number | null;
  shareToken: string | null;
  progress: number | null;
  estimateHours: number | null;
  repoUrl: string | null;
  tags: string[];
}

/**
 * What a viewer may see of a project row (applied server-side, so pages, REST
 * and MCP all get the same answer):
 * - owner/admin: everything.
 * - member: no money (budget, hourly rate) and no public share token.
 * - client: additionally no internal fields (repo, tags); progress only with
 *   `shareProgress`, estimate only with `shareTime`.
 */
export function projectView<T extends ProjectRow>(
  actor: Actor,
  p: T,
): Omit<T, keyof RedactedProjectFields> & RedactedProjectFields {
  const admin = isAdmin(actor);
  const client = isClientActor(actor);
  return {
    ...p,
    budgetMinor: admin ? p.budgetMinor : null,
    hourlyRateMinor: admin ? p.hourlyRateMinor : null,
    shareToken: admin ? p.shareToken : null,
    progress: canSeeProgress(actor, p) ? p.progress : null,
    estimateHours: client && !p.shareTime ? null : p.estimateHours,
    repoUrl: client ? null : p.repoUrl,
    tags: client ? [] : p.tags,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** "YYYY-MM-DD" → start of that day in the app timezone; ISO date-times as-is. */
function dayToDate(v: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return fromDateInput(v, undefined, appTimezone());
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Nullable day field: undefined = untouched (omitted), null = clear. */
const dayField = (v: string | null) => (v === null ? null : dayToDate(v));

/** Drop `undefined` values so a patch only contains the keys the caller sent. */
function definedOnly<T extends Record<string, unknown>>(o: T) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}

const currencyOf = (v: string): CurrencyCode => (isCurrency(v) ? v : "IRT");
const clampProgress = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function uniqueSlug(name: string, excludeId?: string) {
  const base = slugify(name) || "project";
  let slug = base;
  for (let i = 2; ; i++) {
    const hit = db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.slug, slug), excludeId ? ne(projects.id, excludeId) : undefined))
      .get();
    if (!hit) return slug;
    slug = `${base}-${i}`;
  }
}

/** Insert values for a new project (defaults come from the create schema). */
function createRow(input: z.output<typeof projectInput>) {
  const { budget, hourlyRate, startDate, dueDate, progress, ...rest } = input;
  const currency = currencyOf(input.currency);
  return {
    ...definedOnly(rest),
    startDate: startDate ? dayToDate(startDate) : null,
    dueDate: dueDate ? dayToDate(dueDate) : null,
    budgetMinor: budget !== undefined ? toMinor(budget, currency) : null,
    hourlyRateMinor: hourlyRate !== undefined ? toMinor(hourlyRate, currency) : null,
    progress: progress !== undefined ? clampProgress(progress) : 0,
  };
}

/**
 * Patch for a partial update: only keys present in `input` are written
 * (`undefined` = untouched, `null` = clear). Money is converted with the new
 * currency, or the project's current one when the currency isn't changing;
 * changing only the currency keeps the amounts' major-unit values.
 */
function projectPatch(
  input: Omit<z.output<typeof updateProjectInput>, "id">,
  current: Pick<ProjectRow, "currency" | "budgetMinor" | "hourlyRateMinor">,
) {
  const { budget, hourlyRate, startDate, dueDate, progress, ...rest } = input;
  const oldCurrency = currencyOf(current.currency);
  const currency = input.currency ?? oldCurrency;
  const money = (value: number | null | undefined, currentMinor: number | null) =>
    value !== undefined
      ? value === null
        ? null
        : toMinor(value, currency)
      : currentMinor != null && currency !== oldCurrency
        ? toMinor(fromMinor(currentMinor, oldCurrency), currency)
        : undefined;
  return definedOnly({
    ...rest,
    startDate: startDate === undefined ? undefined : dayField(startDate),
    dueDate: dueDate === undefined ? undefined : dayField(dueDate),
    budgetMinor: money(budget, current.budgetMinor),
    hourlyRateMinor: money(hourlyRate, current.hourlyRateMinor),
    progress: progress === undefined ? undefined : clampProgress(progress),
  });
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function listProjects(actor: Actor, input: z.output<typeof listProjectsInput> = {}) {
  const where = and(
    projectAccessWhere(actor),
    input.includeArchived ? undefined : isNull(projects.archivedAt),
    input.status ? eq(projects.status, input.status) : undefined,
    input.clientId ? eq(projects.clientId, input.clientId) : undefined,
    input.q
      ? or(like(projects.name, `%${input.q}%`), like(projects.description, `%${input.q}%`))
      : undefined,
  );
  const rows = await db.query.projects.findMany({
    where,
    with: { client: { columns: { id: true, name: true } } },
    orderBy: [
      asc(
        sql`case ${projects.status} when 'active' then 0 when 'planning' then 1 when 'lead' then 2 when 'paused' then 3 else 4 end`,
      ),
      desc(projects.updatedAt),
    ],
  });
  // Only aggregate time for projects whose time the viewer may see.
  const ids = rows.filter((r) => canSeeTime(actor, r)).map((r) => r.id);
  const tracked = new Map<string | null, number>(
    ids.length
      ? db
          .select({
            projectId: timeEntries.projectId,
            ms: sql<number>`sum(coalesce(${timeEntries.endedAt}, ${Date.now()}) - ${timeEntries.startedAt})`,
          })
          .from(timeEntries)
          .where(inArray(timeEntries.projectId, ids))
          .groupBy(timeEntries.projectId)
          .all()
          .map((r) => [r.projectId, r.ms] as const)
      : [],
  );
  return rows.map((r) => ({
    ...projectView(actor, r),
    /** Tracked ms; null when the viewer may not see time (client without `shareTime`). */
    trackedMs: canSeeTime(actor, r) ? (tracked.get(r.id) ?? 0) : null,
  }));
}

/** Minimal list for <select> pickers (respects access). */
export function projectOptions(actor: Actor) {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
      clientId: projects.clientId,
    })
    .from(projects)
    .where(
      and(projectAccessWhere(actor), isNull(projects.archivedAt), ne(projects.status, "canceled")),
    )
    .orderBy(asc(projects.name))
    .all();
}

export async function getProject(actor: Actor, id: string) {
  const row = await db.query.projects.findFirst({
    where: and(eq(projects.id, id), projectAccessWhere(actor)),
    with: {
      client: true,
      members: { with: { user: { columns: { id: true, name: true, email: true } } } },
    },
  });
  if (!row) throw notFound("Project");
  const admin = isAdmin(actor);
  const isClient = isClientActor(actor);
  const { client, members, ...rest } = row;
  const project = {
    ...projectView(actor, rest),
    // Client records (contact details, tax id, notes) are admin-only data.
    client: client
      ? admin
        ? client
        : { id: client.id, name: client.name, color: client.color, logoUrl: client.logoUrl }
      : null,
    // Team list is staff-only; per-member cost is admin-only.
    members: isClient
      ? []
      : members.map((m) => ({ ...m, hourlyCostMinor: admin ? m.hourlyCostMinor : null })),
  };

  const ms = canSeeProgress(actor, row)
    ? db
        .select()
        .from(milestones)
        .where(
          and(
            eq(milestones.projectId, id),
            isClient ? eq(milestones.visibleToClient, true) : undefined,
          ),
        )
        .orderBy(asc(milestones.sort), asc(milestones.dueDate))
        .all()
    : [];
  const updates = await db.query.projectUpdates.findMany({
    where: and(
      eq(projectUpdates.projectId, id),
      isClient ? eq(projectUpdates.visibleToClient, true) : undefined,
    ),
    with: { author: { columns: { name: true } } },
    orderBy: desc(projectUpdates.createdAt),
    limit: 50,
  });

  const now = Date.now();
  const time = canSeeTime(actor, row)
    ? (db
        .select({
          totalMs: sql<number>`coalesce(sum(coalesce(${timeEntries.endedAt}, ${now}) - ${timeEntries.startedAt}), 0)`,
          billableMs: sql<number>`coalesce(sum(case when ${timeEntries.billable} then coalesce(${timeEntries.endedAt}, ${now}) - ${timeEntries.startedAt} else 0 end), 0)`,
        })
        .from(timeEntries)
        .where(eq(timeEntries.projectId, id))
        .get() ?? { totalMs: 0, billableMs: 0 })
    : null;

  const money = admin
    ? db
        .select({
          kind: transactions.kind,
          currency: transactions.currency,
          total: sql<number>`sum(${transactions.amountMinor})`,
        })
        .from(transactions)
        .where(
          and(eq(transactions.projectId, id), inArray(transactions.kind, ["income", "expense"])),
        )
        .groupBy(transactions.kind, transactions.currency)
        .all()
    : [];

  return {
    project,
    milestones: ms,
    updates,
    stats: {
      trackedMs: time ? time.totalMs : null,
      billableMs: time ? time.billableMs : null,
      money,
    },
  };
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function createProject(actor: Actor, input: z.output<typeof projectInput>) {
  assertAdmin(actor);
  const row = db
    .insert(projects)
    .values({ ...createRow(input), name: input.name, slug: uniqueSlug(input.name) })
    .returning()
    .get();
  logActivity(actor, "project.create", "project", row.id, row.name);
  return row;
}

/** Partial update — only the keys present in `input` change (see `projectPatch`). */
export function updateProject(actor: Actor, { id, ...input }: z.output<typeof updateProjectInput>) {
  assertAdmin(actor);
  const current = db
    .select({
      name: projects.name,
      currency: projects.currency,
      budgetMinor: projects.budgetMinor,
      hourlyRateMinor: projects.hourlyRateMinor,
    })
    .from(projects)
    .where(eq(projects.id, id))
    .get();
  if (!current) throw notFound("Project");
  const patch = projectPatch(input, current);
  const row = db
    .update(projects)
    .set({
      ...patch,
      // Keep URLs stable: only re-slug when the name actually changes.
      ...(patch.name !== undefined && patch.name !== current.name
        ? { slug: uniqueSlug(patch.name, id) }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id))
    .returning()
    .get();
  if (!row) throw notFound("Project");
  if (input.progressMode && input.progressMode !== "manual") recalcProgress(id);
  logActivity(actor, "project.update", "project", id, row.name);
  return row;
}

export function setProjectArchived(actor: Actor, id: string, archived: boolean) {
  assertAdmin(actor);
  db.update(projects)
    .set({
      archivedAt: archived ? new Date() : null,
      ...(archived ? { status: "archived" as const } : { status: "active" as const }),
    })
    .where(eq(projects.id, id))
    .run();
  logActivity(actor, archived ? "project.archive" : "project.unarchive", "project", id);
}

export function deleteProject(actor: Actor, id: string) {
  assertAdmin(actor);
  db.delete(projects).where(eq(projects.id, id)).run();
  logActivity(actor, "project.delete", "project", id);
}

/** Enable/disable the public status page (/p/<token>). */
export function setProjectShareLink(actor: Actor, id: string, enabled: boolean) {
  assertAdmin(actor);
  const token = enabled ? newToken(18) : null;
  db.update(projects).set({ shareToken: token }).where(eq(projects.id, id)).run();
  logActivity(actor, enabled ? "project.share_on" : "project.share_off", "project", id);
  return token;
}

export function setProjectMembers(actor: Actor, projectId: string, userIds: string[]) {
  assertAdmin(actor);
  db.transaction((tx) => {
    tx.delete(projectMembers).where(eq(projectMembers.projectId, projectId)).run();
    for (const userId of userIds) tx.insert(projectMembers).values({ projectId, userId }).run();
  });
}

/**
 * Recompute `progress` for projects whose progressMode is milestones/tasks.
 * Call after changing milestones or task statuses.
 */
export function recalcProgress(projectId: string) {
  const p = db
    .select({ mode: projects.progressMode })
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();
  if (!p || p.mode === "manual") return;
  let progress = 0;
  if (p.mode === "milestones") {
    const rows = db
      .select({ status: milestones.status, weight: milestones.weight })
      .from(milestones)
      .where(eq(milestones.projectId, projectId))
      .all();
    const total = rows.reduce((s, r) => s + r.weight, 0);
    const done = rows.reduce(
      (s, r) =>
        s + (r.status === "done" ? r.weight : r.status === "in_progress" ? r.weight / 2 : 0),
      0,
    );
    progress = total ? Math.round((done / total) * 100) : 0;
  } else {
    const rows = db
      .select({ status: tasks.status })
      .from(tasks)
      .where(and(eq(tasks.projectId, projectId), ne(tasks.status, "canceled")))
      .all();
    const done = rows.filter((r) => r.status === "done").length;
    progress = rows.length ? Math.round((done / rows.length) * 100) : 0;
  }
  db.update(projects).set({ progress }).where(eq(projects.id, projectId)).run();
}

// ─── Milestones ─────────────────────────────────────────────────────────────

export function addMilestone(actor: Actor, input: z.output<typeof milestoneInput>) {
  assertAdmin(actor);
  const max = db
    .select({ s: sql<number>`coalesce(max(${milestones.sort}), 0)` })
    .from(milestones)
    .where(eq(milestones.projectId, input.projectId))
    .get();
  const row = db
    .insert(milestones)
    .values({
      ...input,
      dueDate: input.dueDate ? dayToDate(input.dueDate) : null,
      sort: (max?.s ?? 0) + 1,
      completedAt: input.status === "done" ? new Date() : null,
    })
    .returning()
    .get();
  recalcProgress(input.projectId);
  logActivity(actor, "milestone.create", "project", input.projectId, input.title);
  return row;
}

/** Partial update — only the keys present in `input` change. */
export function updateMilestone(
  actor: Actor,
  { id, dueDate, ...input }: z.output<typeof updateMilestoneInput>,
) {
  assertAdmin(actor);
  const current = db
    .select({ status: milestones.status })
    .from(milestones)
    .where(eq(milestones.id, id))
    .get();
  if (!current) throw notFound("Milestone");
  const statusChanged = input.status !== undefined && input.status !== current.status;
  const row = db
    .update(milestones)
    .set({
      ...definedOnly(input),
      ...(dueDate !== undefined && { dueDate: dayField(dueDate) }),
      ...(statusChanged && { completedAt: input.status === "done" ? new Date() : null }),
      updatedAt: new Date(),
    })
    .where(eq(milestones.id, id))
    .returning()
    .get();
  if (!row) throw notFound("Milestone");
  recalcProgress(row.projectId);
  return row;
}

export function deleteMilestone(actor: Actor, id: string) {
  assertAdmin(actor);
  const row = db.delete(milestones).where(eq(milestones.id, id)).returning().get();
  if (row) recalcProgress(row.projectId);
}

// ─── Updates feed ───────────────────────────────────────────────────────────

export function addProjectUpdate(actor: Actor, input: z.output<typeof projectUpdateInput>) {
  assertStaff(actor);
  if (!isAdmin(actor)) assertProjectRead(actor, input.projectId);
  const row = db
    .insert(projectUpdates)
    .values({ ...input, createdBy: actor.user.id })
    .returning()
    .get();
  logActivity(actor, "project.update_posted", "project", input.projectId, input.title);
  return row;
}

export function deleteProjectUpdate(actor: Actor, id: string) {
  assertAdmin(actor);
  db.delete(projectUpdates).where(eq(projectUpdates.id, id)).run();
}

/** Public status page data (no auth; token-gated). */
export async function getPublicProjectByToken(token: string) {
  if (!token || token.length < 16) return null;
  // Unauthenticated page: load only what it renders (no budget, rates, notes…).
  const project = await db.query.projects.findFirst({
    where: eq(projects.shareToken, token),
    columns: {
      id: true,
      name: true,
      color: true,
      status: true,
      progress: true,
      dueDate: true,
      shareProgress: true,
    },
    with: { client: { columns: { name: true, logoUrl: true } } },
  });
  if (!project) return null;
  const ms = project.shareProgress
    ? db
        .select()
        .from(milestones)
        .where(and(eq(milestones.projectId, project.id), eq(milestones.visibleToClient, true)))
        .orderBy(asc(milestones.sort))
        .all()
    : [];
  const updates = db
    .select({
      id: projectUpdates.id,
      title: projectUpdates.title,
      bodyMd: projectUpdates.bodyMd,
      kind: projectUpdates.kind,
      createdAt: projectUpdates.createdAt,
    })
    .from(projectUpdates)
    .where(and(eq(projectUpdates.projectId, project.id), eq(projectUpdates.visibleToClient, true)))
    .orderBy(desc(projectUpdates.createdAt))
    .limit(20)
    .all();
  return { project, milestones: ms, updates };
}

export function assertCanSeeProjectFinance(actor: Actor, projectId: string) {
  if (isAdmin(actor)) return;
  const p = db
    .select({ shareFinance: projects.shareFinance })
    .from(projects)
    .where(and(eq(projects.id, projectId), projectAccessWhere(actor)))
    .get();
  if (!p || (actor.user.role === "client" && !p.shareFinance)) throw forbidden();
}
