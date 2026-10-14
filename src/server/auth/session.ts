import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/server/db/client";
import { sessions, users, type UserRole } from "@/server/db/schema";
import { newToken } from "@/lib/ids";
import { env } from "@/lib/env";
import { localePath, type Locale } from "@/i18n/config";
import { sha256 } from "./crypto";
import type { Actor, SessionUser } from "./actor";

export const SESSION_COOKIE = "gt_session";
const SESSION_DAYS = 30;
const RENEW_WHEN_DAYS_LEFT = 15;
const DAY = 86_400_000;
const SEEN_THROTTLE_MS = 5 * 60_000;

export async function createSession(
  userId: string,
  meta: { ip: string | null; userAgent: string | null },
) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
  db.insert(sessions)
    .values({
      id: sha256(token),
      userId,
      expiresAt,
      ip: meta.ip,
      userAgent: meta.userAgent,
      lastSeenAt: new Date(),
    })
    .run();
  db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId)).run();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd && env.siteUrl.startsWith("https"),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token)
    db.delete(sessions)
      .where(eq(sessions.id, sha256(token)))
      .run();
  jar.delete(SESSION_COOKIE);
}

/**
 * Current user from the session cookie, or null. Deduplicated per request.
 * Reads cookies → request-time only (wrap callers in <Suspense> or use in
 * dynamic routes).
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // Session validity depends on the current time (and may renew the row), so it
  // must not resolve inside a Partial Prefetching App Shell prerender, where
  // cookies are available but `new Date()` is rejected.
  await connection();
  const id = sha256(token);
  const now = new Date();
  const row = db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      lastSeenAt: sessions.lastSeenAt,
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      clientId: users.clientId,
      locale: users.locale,
      avatarUrl: users.avatarUrl,
      title: users.title,
      disabled: users.disabled,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, now)))
    .get();
  if (!row || row.disabled) return null;

  // Sliding expiration (DB side; the proxy refreshes the cookie expiry).
  if (row.expiresAt.getTime() - now.getTime() < RENEW_WHEN_DAYS_LEFT * DAY) {
    db.update(sessions)
      .set({ expiresAt: new Date(now.getTime() + SESSION_DAYS * DAY), lastSeenAt: now })
      .where(eq(sessions.id, id))
      .run();
  } else if (!row.lastSeenAt || now.getTime() - row.lastSeenAt.getTime() > SEEN_THROTTLE_MS) {
    // "Last seen" for Settings → Sessions (throttled to one write per few minutes).
    db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, id)).run();
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    clientId: row.clientId,
    locale: row.locale,
    avatarUrl: row.avatarUrl,
    title: row.title,
  };
});

export async function getActor(): Promise<Actor | null> {
  const user = await getSessionUser();
  return user ? { via: "session", user, scopes: ["read", "write", "admin"] } : null;
}

/** For pages/layouts: the actor, or redirect to the login page. */
export async function requireActor(
  opts: { roles?: UserRole[]; locale?: Locale } = {},
): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect(localePath(opts.locale ?? "fa", "/login"));
  if (opts.roles && !opts.roles.includes(actor.user.role)) {
    redirect(localePath(opts.locale ?? actor.user.locale, "/panel"));
  }
  return actor;
}
