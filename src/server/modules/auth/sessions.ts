import "server-only";
import { cookies } from "next/headers";
import { and, desc, eq, lt, ne } from "drizzle-orm";
import { db } from "@/server/db/client";
import { sessions } from "@/server/db/schema";
import { sha256 } from "@/server/auth/crypto";
import { SESSION_COOKIE } from "@/server/auth/session";
import type { Actor } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { AppError, notFound } from "@/server/errors";
import { parseUserAgent } from "./user-agent";

/** DB id (sha256 of the cookie token) of the current browser session, if any. */
export async function currentSessionId() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? sha256(token) : null;
}

/**
 * Session ids are sha256(token). We never send them to the browser; the UI
 * gets a derived, non-reversible handle instead.
 */
export function publicSessionId(id: string) {
  return sha256(`session-handle:${id}`).slice(0, 24);
}

/** The actor's active sessions (newest activity first). Prunes expired rows. */
export function listMySessions(actor: Actor, currentId: string | null) {
  const now = new Date();
  db.delete(sessions)
    .where(and(eq(sessions.userId, actor.user.id), lt(sessions.expiresAt, now)))
    .run();
  const rows = db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, actor.user.id))
    .orderBy(desc(sessions.lastSeenAt), desc(sessions.createdAt))
    .all();
  return rows
    .map((r) => ({
      id: publicSessionId(r.id),
      current: r.id === currentId,
      ip: r.ip,
      userAgent: r.userAgent,
      agent: parseUserAgent(r.userAgent),
      createdAt: r.createdAt,
      lastSeenAt: r.lastSeenAt ?? r.createdAt,
      expiresAt: r.expiresAt,
    }))
    .sort((a, b) => Number(b.current) - Number(a.current));
}

export function revokeSession(actor: Actor, handle: string, currentId: string | null) {
  const target = db
    .select({ id: sessions.id, userAgent: sessions.userAgent })
    .from(sessions)
    .where(eq(sessions.userId, actor.user.id))
    .all()
    .find((r) => publicSessionId(r.id) === handle);
  if (!target) throw notFound("Session");
  if (target.id === currentId)
    throw new AppError("validation", "Use “Sign out” to end the current session");
  db.delete(sessions).where(eq(sessions.id, target.id)).run();
  const ua = parseUserAgent(target.userAgent);
  logActivity(
    actor,
    "session.revoke",
    "session",
    null,
    [ua.browser, ua.os].filter(Boolean).join(" / "),
  );
}

/** Sign out everywhere except the current browser. Returns how many were ended. */
export function revokeOtherSessions(actor: Actor, currentId: string | null) {
  const n = db
    .delete(sessions)
    .where(
      and(eq(sessions.userId, actor.user.id), currentId ? ne(sessions.id, currentId) : undefined),
    )
    .run().changes;
  logActivity(actor, "session.revoke_others", "session", null, undefined, { count: n });
  return n;
}
