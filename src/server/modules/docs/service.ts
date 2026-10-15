import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { z } from "zod";
import { db, type DB } from "@/server/db/client";
import { clients, docs, projects, users } from "@/server/db/schema";
import { assertStaff, isAdmin, isStaff, type Actor } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { AppError, forbidden, notFound } from "@/server/errors";
import { assertProjectRead, projectAccessWhere } from "@/server/modules/projects/service";
import { markdownToText } from "@/lib/markdown";
import { buildDocTree, escapeLike, makeSnippet, normalizeSearch } from "./tree";
import type {
  docInput,
  listDocsInput,
  moveDocInput,
  searchDocsInput,
  updateDocInput,
} from "./schemas";

type DocVisibility = (typeof docs.$inferSelect)["visibility"];

// ─── Access control ─────────────────────────────────────────────────────────

/**
 * SQL filter for the docs an actor may read.
 * - staff: team + client docs, and their own private docs (private = author only,
 *   even for the owner).
 * - client (portal): non-archived `client` docs that are either linked directly to
 *   their client, or linked to one of their client's projects that has the portal
 *   enabled and `shareDocs` on.
 */
export function docAccessWhere(actor: Actor): SQL | undefined {
  if (isStaff(actor)) return or(ne(docs.visibility, "private"), eq(docs.createdBy, actor.user.id));
  const clientId = actor.user.clientId;
  if (!clientId) return sql`0`;
  return and(
    eq(docs.visibility, "client"),
    isNull(docs.archivedAt),
    or(
      eq(docs.clientId, clientId),
      inArray(
        docs.projectId,
        db
          .select({ id: projects.id })
          .from(projects)
          .where(
            and(
              eq(projects.clientId, clientId),
              eq(projects.portalEnabled, true),
              eq(projects.shareDocs, true),
            ),
          ),
      ),
    ),
  );
}

/** Authors manage (visibility, archive, delete) their pages; admins manage all. */
function canManage(actor: Actor, doc: { createdBy: string | null }) {
  return isAdmin(actor) || (isStaff(actor) && doc.createdBy === actor.user.id);
}

const baseColumns = {
  id: docs.id,
  parentId: docs.parentId,
  title: docs.title,
  icon: docs.icon,
  visibility: docs.visibility,
  projectId: docs.projectId,
  clientId: docs.clientId,
  sort: docs.sort,
  archivedAt: docs.archivedAt,
  createdBy: docs.createdBy,
  createdAt: docs.createdAt,
  updatedAt: docs.updatedAt,
};

function accessibleDoc(actor: Actor, id: string) {
  return db
    .select({ ...baseColumns, contentMd: docs.contentMd })
    .from(docs)
    .where(and(eq(docs.id, id), docAccessWhere(actor)))
    .get();
}

/** Keep `updated_at` untouched on structural changes (move). */
const keepUpdatedAt = () => ({ updatedAt: sql`"updated_at"` });

// ─── Queries ────────────────────────────────────────────────────────────────

function listRows(actor: Actor, where?: SQL) {
  return db
    .select({
      ...baseColumns,
      projectName: projects.name,
      projectColor: projects.color,
      clientName: clients.name,
    })
    .from(docs)
    .leftJoin(projects, eq(projects.id, docs.projectId))
    .leftJoin(clients, eq(clients.id, docs.clientId))
    .where(and(docAccessWhere(actor), where))
    .orderBy(asc(docs.sort), asc(docs.title))
    .all();
}

export type DocRow = ReturnType<typeof listRows>[number];
export type DocNode = DocRow & { children: DocNode[] };
export { buildDocTree, flattenDocTree } from "./tree";

export function listDocs(actor: Actor, input: Partial<z.output<typeof listDocsInput>> = {}) {
  const rows = listRows(
    actor,
    and(
      input.archived ? isNotNull(docs.archivedAt) : isNull(docs.archivedAt),
      input.projectId ? eq(docs.projectId, input.projectId) : undefined,
      input.visibility ? eq(docs.visibility, input.visibility) : undefined,
    ),
  );
  return input.format === "flat" ? rows : buildDocTree(rows);
}

/** Flat, non-archived rows for the sidebar tree. */
export function listDocRows(actor: Actor) {
  return listRows(actor, isNull(docs.archivedAt));
}

export function listArchivedDocs(actor: Actor) {
  assertStaff(actor);
  return listRows(actor, isNotNull(docs.archivedAt)).map((r) => ({
    ...r,
    canManage: canManage(actor, r),
  }));
}

export function countArchivedDocs(actor: Actor) {
  if (!isStaff(actor)) return 0;
  return (
    db
      .select({ n: count() })
      .from(docs)
      .where(and(docAccessWhere(actor), isNotNull(docs.archivedAt)))
      .get()?.n ?? 0
  );
}

const creator = alias(users, "doc_creator");
const updater = alias(users, "doc_updater");

export async function getDoc(actor: Actor, id: string) {
  const row = db
    .select({
      ...baseColumns,
      contentMd: docs.contentMd,
      updatedBy: docs.updatedBy,
      projectName: projects.name,
      projectColor: projects.color,
      projectShareDocs: projects.shareDocs,
      clientName: clients.name,
      createdByName: creator.name,
      updatedByName: updater.name,
    })
    .from(docs)
    .leftJoin(projects, eq(projects.id, docs.projectId))
    .leftJoin(clients, eq(clients.id, docs.clientId))
    .leftJoin(creator, eq(creator.id, docs.createdBy))
    .leftJoin(updater, eq(updater.id, docs.updatedBy))
    .where(and(eq(docs.id, id), docAccessWhere(actor)))
    .get();
  if (!row) throw notFound("Doc");

  // Breadcrumbs: walk up through ancestors the actor can see (cycle-safe).
  const ancestors: { id: string; title: string; icon: string | null; parentId: string | null }[] =
    [];
  const seen = new Set([row.id]);
  let parentId = row.parentId;
  while (parentId && !seen.has(parentId) && ancestors.length < 32) {
    seen.add(parentId);
    const p = db
      .select({ id: docs.id, title: docs.title, icon: docs.icon, parentId: docs.parentId })
      .from(docs)
      .where(and(eq(docs.id, parentId), docAccessWhere(actor), isNull(docs.archivedAt)))
      .get();
    if (!p) break;
    ancestors.unshift(p);
    parentId = p.parentId;
  }

  const children = db
    .select({
      id: docs.id,
      title: docs.title,
      icon: docs.icon,
      visibility: docs.visibility,
      updatedAt: docs.updatedAt,
      contentMd: docs.contentMd,
    })
    .from(docs)
    .where(and(eq(docs.parentId, id), docAccessWhere(actor), isNull(docs.archivedAt)))
    .orderBy(asc(docs.sort), asc(docs.title))
    .all()
    .map(({ contentMd, ...c }) => ({
      ...c,
      excerpt: markdownToText(contentMd.replace(/\[[ xX]\]\s*/g, ""), 140),
    }));

  // Portal users don't need internal bookkeeping.
  const staff = isStaff(actor);
  return {
    ...row,
    projectShareDocs: staff ? row.projectShareDocs : null,
    ancestors,
    children,
    canEdit: staff && !row.archivedAt,
    canManage: canManage(actor, row),
  };
}

export type DocDetail = Awaited<ReturnType<typeof getDoc>>;

// ─── Search ─────────────────────────────────────────────────────────────────

const normalizedCol = (col: SQL | typeof docs.title | typeof docs.contentMd) =>
  sql`lower(replace(replace(replace(replace(${col}, 'ي', 'ی'), 'ى', 'ی'), 'ك', 'ک'), 'ة', 'ه'))`;

export function searchDocs(actor: Actor, input: z.output<typeof searchDocsInput>) {
  const q = normalizeSearch(input.q.trim());
  const pattern = `%${escapeLike(q)}%`;
  const titleMatch = sql`${normalizedCol(docs.title)} like ${pattern} escape '\\'`;
  const bodyMatch = sql`${normalizedCol(docs.contentMd)} like ${pattern} escape '\\'`;
  const rows = db
    .select({
      id: docs.id,
      parentId: docs.parentId,
      title: docs.title,
      icon: docs.icon,
      visibility: docs.visibility,
      projectId: docs.projectId,
      projectName: projects.name,
      contentMd: docs.contentMd,
      updatedAt: docs.updatedAt,
      titleHit: sql<number>`case when ${titleMatch} then 1 else 0 end`,
    })
    .from(docs)
    .leftJoin(projects, eq(projects.id, docs.projectId))
    .where(
      and(
        docAccessWhere(actor),
        isNull(docs.archivedAt),
        input.projectId ? eq(docs.projectId, input.projectId) : undefined,
        or(titleMatch, bodyMatch),
      ),
    )
    .orderBy(desc(sql`case when ${titleMatch} then 1 else 0 end`), desc(docs.updatedAt))
    .limit(input.limit)
    .all();
  return rows.map(({ contentMd, titleHit, ...r }) => {
    const text = markdownToText(contentMd, 1_000_000);
    const { snippet, ranges } = makeSnippet(text, input.q);
    const title = makeSnippet(r.title, input.q, 1_000);
    return {
      ...r,
      titleMatch: titleHit === 1,
      titleRanges: title.ranges,
      snippet,
      ranges,
    };
  });
}

// ─── Stats (docs home) ──────────────────────────────────────────────────────

export function docStats(actor: Actor) {
  const rows = db
    .select({ visibility: docs.visibility, n: count() })
    .from(docs)
    .where(and(docAccessWhere(actor), isNull(docs.archivedAt)))
    .groupBy(docs.visibility)
    .all();
  const by = Object.fromEntries(rows.map((r) => [r.visibility, r.n])) as Partial<
    Record<DocVisibility, number>
  >;
  return {
    total: rows.reduce((s, r) => s + r.n, 0),
    private: by.private ?? 0,
    team: by.team ?? 0,
    client: by.client ?? 0,
  };
}

export function recentDocs(actor: Actor, limit = 8) {
  return db
    .select({
      id: docs.id,
      title: docs.title,
      icon: docs.icon,
      visibility: docs.visibility,
      projectName: projects.name,
      updatedAt: docs.updatedAt,
      updatedByName: updater.name,
    })
    .from(docs)
    .leftJoin(projects, eq(projects.id, docs.projectId))
    .leftJoin(updater, eq(updater.id, docs.updatedBy))
    .where(and(docAccessWhere(actor), isNull(docs.archivedAt)))
    .orderBy(desc(docs.updatedAt))
    .limit(limit)
    .all();
}

/** Docs linked to a project (for the project page), nested, respecting visibility. */
export function projectDocs(actor: Actor, projectId: string, opts: { clientOnly?: boolean } = {}) {
  assertProjectRead(actor, projectId);
  const rows = listRows(
    actor,
    and(
      eq(docs.projectId, projectId),
      isNull(docs.archivedAt),
      opts.clientOnly ? eq(docs.visibility, "client") : undefined,
    ),
  );
  return buildDocTree(rows);
}

/** Projects the caller can link a page to (with their doc-sharing flag). */
export function docProjectOptions(actor: Actor) {
  assertStaff(actor);
  return db
    .select({ id: projects.id, name: projects.name, shareDocs: projects.shareDocs })
    .from(projects)
    .where(and(projectAccessWhere(actor), isNull(projects.archivedAt)))
    .orderBy(asc(projects.name))
    .all();
}

// ─── Validation helpers ─────────────────────────────────────────────────────

function fieldError(field: string, message: string) {
  return new AppError("validation", message, { [field]: [message] });
}

function checkParent(actor: Actor, parentId: string | null | undefined, selfId?: string) {
  if (!parentId) return;
  if (parentId === selfId) throw fieldError("parentId", "A page can't be its own parent");
  const parent = db
    .select({ id: docs.id, archivedAt: docs.archivedAt })
    .from(docs)
    .where(and(eq(docs.id, parentId), docAccessWhere(actor)))
    .get();
  if (!parent || parent.archivedAt) throw fieldError("parentId", "Unknown parent page");
  if (!selfId) return;
  // No cycles: the new parent must not be a descendant of this page.
  const seen = new Set<string>();
  let cursor: string | null = parentId;
  while (cursor && !seen.has(cursor)) {
    if (cursor === selfId) throw fieldError("parentId", "A page can't move inside its own subpage");
    seen.add(cursor);
    cursor =
      db.select({ parentId: docs.parentId }).from(docs).where(eq(docs.id, cursor)).get()
        ?.parentId ?? null;
  }
}

function checkLinks(
  actor: Actor,
  projectId: string | null | undefined,
  clientId: string | null | undefined,
) {
  if (projectId) {
    const ok = db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), projectAccessWhere(actor)))
      .get();
    if (!ok) throw fieldError("projectId", "Unknown project");
  }
  if (clientId) {
    if (!isAdmin(actor)) throw fieldError("clientId", "Only admins can link a client");
    const ok = db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)).get();
    if (!ok) throw fieldError("clientId", "Unknown client");
  }
}

function checkClientVisibility(
  visibility: DocVisibility,
  projectId: string | null | undefined,
  clientId: string | null | undefined,
) {
  if (visibility === "client" && !projectId && !clientId) {
    throw fieldError("visibility", "Client-shared pages must be linked to a project or a client");
  }
}

function nextSort(parentId: string | null | undefined) {
  const max = db
    .select({ s: sql<number>`coalesce(max(${docs.sort}), 0)` })
    .from(docs)
    .where(parentId ? eq(docs.parentId, parentId) : isNull(docs.parentId))
    .get();
  return (max?.s ?? 0) + 1;
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function createDoc(actor: Actor, input: z.output<typeof docInput>) {
  assertStaff(actor);
  checkParent(actor, input.parentId);
  checkLinks(actor, input.projectId, input.clientId);
  checkClientVisibility(input.visibility, input.projectId, input.clientId);
  const row = db
    .insert(docs)
    .values({
      title: input.title,
      icon: input.icon ?? null,
      contentMd: input.contentMd ?? "",
      parentId: input.parentId ?? null,
      projectId: input.projectId ?? null,
      clientId: input.clientId ?? null,
      visibility: input.visibility,
      sort: nextSort(input.parentId),
      createdBy: actor.user.id,
      updatedBy: actor.user.id,
    })
    .returning({ id: docs.id, title: docs.title })
    .get();
  logActivity(actor, "doc.create", "doc", row.id, row.title);
  return row;
}

export function updateDoc(actor: Actor, { id, ...patch }: z.output<typeof updateDocInput>) {
  assertStaff(actor);
  const doc = accessibleDoc(actor, id);
  if (!doc) throw notFound("Doc");
  if (doc.archivedAt) throw new AppError("conflict", "Restore the page before editing it");
  if (
    patch.visibility !== undefined &&
    patch.visibility !== doc.visibility &&
    !canManage(actor, doc)
  ) {
    throw forbidden("Only the author or an admin can change who sees this page");
  }
  const parentChanged = patch.parentId !== undefined && (patch.parentId ?? null) !== doc.parentId;
  if (parentChanged) checkParent(actor, patch.parentId, id);
  if (patch.projectId !== undefined || patch.clientId !== undefined) {
    checkLinks(
      actor,
      patch.projectId !== undefined && patch.projectId !== doc.projectId ? patch.projectId : null,
      patch.clientId !== undefined && patch.clientId !== doc.clientId ? patch.clientId : null,
    );
  }
  checkClientVisibility(
    patch.visibility ?? doc.visibility,
    patch.projectId !== undefined ? patch.projectId : doc.projectId,
    patch.clientId !== undefined ? patch.clientId : doc.clientId,
  );
  const row = db
    .update(docs)
    .set({
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.icon !== undefined && { icon: patch.icon }),
      ...(patch.contentMd !== undefined && { contentMd: patch.contentMd }),
      ...(patch.visibility !== undefined && { visibility: patch.visibility }),
      ...(patch.projectId !== undefined && { projectId: patch.projectId }),
      ...(patch.clientId !== undefined && { clientId: patch.clientId }),
      ...(parentChanged && { parentId: patch.parentId ?? null, sort: nextSort(patch.parentId) }),
      updatedBy: actor.user.id,
    })
    .where(eq(docs.id, id))
    .returning({ id: docs.id, title: docs.title, updatedAt: docs.updatedAt })
    .get();
  logActivity(actor, "doc.update", "doc", id, row?.title);
  return row!;
}

/** Re-parent and/or reorder a page (tree drag & drop, move up/down). */
export function moveDoc(actor: Actor, input: z.output<typeof moveDocInput>) {
  assertStaff(actor);
  const doc = accessibleDoc(actor, input.id);
  if (!doc || doc.archivedAt) throw notFound("Doc");
  const parentId = input.parentId ?? null;
  if (parentId !== doc.parentId) checkParent(actor, parentId, doc.id);

  const siblings = db
    .select({ id: docs.id, sort: docs.sort })
    .from(docs)
    .where(
      and(
        parentId ? eq(docs.parentId, parentId) : isNull(docs.parentId),
        isNull(docs.archivedAt),
        docAccessWhere(actor),
        ne(docs.id, doc.id),
      ),
    )
    .orderBy(asc(docs.sort), asc(docs.title))
    .all();
  const index = Math.min(Math.max(input.index, 0), siblings.length);
  const prev = siblings[index - 1]?.sort;
  const next = siblings[index]?.sort;

  db.transaction((tx) => {
    let sort: number;
    if (prev === undefined && next === undefined) sort = 1;
    else if (prev === undefined) sort = next! - 1;
    else if (next === undefined) sort = prev + 1;
    else if (next - prev > 1e-6) sort = (prev + next) / 2;
    else {
      // Positions got too close together: renumber the whole sibling list.
      const ordered = [...siblings.slice(0, index), { id: doc.id }, ...siblings.slice(index)];
      ordered.forEach((s, i) => {
        if (s.id !== doc.id)
          tx.update(docs)
            .set({ sort: i + 1, ...keepUpdatedAt() })
            .where(eq(docs.id, s.id))
            .run();
      });
      sort = index + 1;
    }
    tx.update(docs)
      .set({ parentId, sort, ...keepUpdatedAt() })
      .where(eq(docs.id, doc.id))
      .run();
  });
  logActivity(actor, "doc.move", "doc", doc.id, doc.title);
}

/** Children of an archived/deleted page move up to its parent (keeping their order). */
function liftChildren(tx: Pick<DB, "update">, doc: { id: string; parentId: string | null }) {
  tx.update(docs)
    .set({ parentId: doc.parentId, ...keepUpdatedAt() })
    .where(eq(docs.parentId, doc.id))
    .run();
}

export function setDocArchived(actor: Actor, id: string, archived: boolean) {
  assertStaff(actor);
  const doc = accessibleDoc(actor, id);
  if (!doc) throw notFound("Doc");
  if (!canManage(actor, doc)) throw forbidden("Only the author or an admin can archive this page");
  db.transaction((tx) => {
    if (archived) {
      liftChildren(tx, doc);
      tx.update(docs)
        .set({ archivedAt: new Date(), ...keepUpdatedAt() })
        .where(eq(docs.id, id))
        .run();
    } else {
      const parentOk =
        doc.parentId &&
        tx
          .select({ id: docs.id })
          .from(docs)
          .where(and(eq(docs.id, doc.parentId), isNull(docs.archivedAt)))
          .get();
      tx.update(docs)
        .set({
          archivedAt: null,
          ...(parentOk ? {} : { parentId: null, sort: nextSort(null) }),
          ...keepUpdatedAt(),
        })
        .where(eq(docs.id, id))
        .run();
    }
  });
  logActivity(actor, archived ? "doc.archive" : "doc.restore", "doc", id, doc.title);
}

export function deleteDoc(actor: Actor, id: string) {
  assertStaff(actor);
  const doc = accessibleDoc(actor, id);
  if (!doc) throw notFound("Doc");
  if (!canManage(actor, doc)) throw forbidden("Only the author or an admin can delete this page");
  db.transaction((tx) => {
    liftChildren(tx, doc);
    tx.delete(docs).where(eq(docs.id, id)).run();
  });
  logActivity(actor, "doc.delete", "doc", id, doc.title);
  return { id, parentId: doc.parentId };
}
