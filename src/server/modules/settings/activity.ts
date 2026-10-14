import "server-only";
import { and, asc, count, desc, eq, gte, lt, type SQL } from "drizzle-orm";
import { db } from "@/server/db/client";
import { activityLog, users } from "@/server/db/schema";
import { isAdmin, type Actor } from "@/server/auth/actor";
import { addDays, fromDateInput } from "@/lib/tz";
import type { ActivityQuery } from "./schemas";
import { appTimezone } from "./service";

/**
 * Audit log reader. Everyone sees their own entries; owner/admin see everyone's
 * and may filter by actor, entity type, action and a day range (app timezone).
 */
export function listActivity(actor: Actor, q: ActivityQuery) {
  const admin = isAdmin(actor);
  const tz = appTimezone();
  const where: (SQL | undefined)[] = [
    admin
      ? q.actor
        ? eq(activityLog.actorId, q.actor)
        : undefined
      : eq(activityLog.actorId, actor.user.id),
    q.type ? eq(activityLog.entityType, q.type) : undefined,
    q.action ? eq(activityLog.action, q.action) : undefined,
    q.from ? gte(activityLog.createdAt, fromDateInput(q.from, undefined, tz)) : undefined,
    q.to
      ? lt(activityLog.createdAt, addDays(fromDateInput(q.to, undefined, tz), 1, tz))
      : undefined,
  ];
  const filter = and(...where);
  const total = db.select({ n: count() }).from(activityLog).where(filter).get()?.n ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / q.pageSize));
  const page = Math.min(q.page, pageCount);
  const rows = db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      summary: activityLog.summary,
      meta: activityLog.meta,
      actorType: activityLog.actorType,
      createdAt: activityLog.createdAt,
      actorId: activityLog.actorId,
      actorName: users.name,
      actorEmail: users.email,
      actorAvatar: users.avatarUrl,
    })
    .from(activityLog)
    .leftJoin(users, eq(users.id, activityLog.actorId))
    .where(filter)
    .orderBy(desc(activityLog.createdAt))
    .limit(q.pageSize)
    .offset((page - 1) * q.pageSize)
    .all();
  return { rows, total, page, pageCount, pageSize: q.pageSize };
}

/** Values for the admin filter bar (actors, entity types, actions). */
export function activityFilterOptions(actor: Actor) {
  if (!isAdmin(actor)) return null;
  const actors = db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .orderBy(asc(users.name))
    .all();
  const types = db
    .selectDistinct({ v: activityLog.entityType })
    .from(activityLog)
    .orderBy(asc(activityLog.entityType))
    .all()
    .map((r) => r.v);
  const actions = db
    .selectDistinct({ v: activityLog.action })
    .from(activityLog)
    .orderBy(asc(activityLog.action))
    .all()
    .map((r) => r.v);
  return { actors, types, actions };
}
