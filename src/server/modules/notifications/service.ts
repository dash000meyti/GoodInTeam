import "server-only";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { notifications, users } from "@/server/db/schema";
import type { Actor } from "@/server/auth/actor";

export interface NotifyInput {
  kind: string; // e.g. "task.reminder", "contract.signed", "lead.new", "invoice.viewed"
  title: string;
  body?: string;
  /** Panel-relative path, e.g. "/panel/contracts/abc" (locale prefix added by the UI). */
  href?: string;
}

/** Create an in-app notification for one user. Never throws. */
export function notify(userId: string, input: NotifyInput) {
  try {
    db.insert(notifications)
      .values({ userId, ...input })
      .run();
  } catch (err) {
    console.error("[notify] failed", err);
  }
}

/** Notify every owner/admin (business events: lead received, contract signed…). */
export function notifyAdmins(input: NotifyInput) {
  const admins = db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.role, ["owner", "admin"]), eq(users.disabled, false)))
    .all();
  for (const a of admins) notify(a.id, input);
}

export function listNotifications(actor: Actor, limit = 30) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, actor.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .all();
}

export function unreadCount(actor: Actor) {
  return (
    db
      .select({ n: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, actor.user.id), isNull(notifications.readAt)))
      .get()?.n ?? 0
  );
}

export function markRead(actor: Actor, ids?: string[]) {
  db.update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, actor.user.id),
        isNull(notifications.readAt),
        ids?.length ? inArray(notifications.id, ids) : undefined,
      ),
    )
    .run();
}
