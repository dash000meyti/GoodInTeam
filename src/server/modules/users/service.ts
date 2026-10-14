import "server-only";
import { and, asc, count, eq, gt, isNull, ne, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/server/db/client";
import { projectMembers, projects, sessions, users, type UserRole } from "@/server/db/schema";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { rateLimit } from "@/server/auth/rate-limit";
import { assertAdmin, isOwner, type Actor } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { AppError, notFound } from "@/server/errors";
import { newToken } from "@/lib/ids";
import { errors } from "./errors";
import type {
  changePasswordInput,
  inviteTeamUserInput,
  listUsersInput,
  setUserRoleInput,
  updateAccountInput,
} from "./schemas";

export function countUsers() {
  return db.select({ n: count() }).from(users).get()?.n ?? 0;
}

export function hasOwner() {
  return !!db.select({ id: users.id }).from(users).where(eq(users.role, "owner")).get();
}

export function findUserByEmail(email: string) {
  return db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).get();
}

export async function createUser(input: {
  email: string;
  name: string;
  password?: string;
  role: UserRole;
  clientId?: string | null;
  locale?: "fa" | "en";
  title?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  if (findUserByEmail(email))
    throw new AppError("conflict", "A user with this email already exists");
  return db
    .insert(users)
    .values({
      email,
      name: input.name.trim(),
      role: input.role,
      clientId: input.clientId ?? null,
      locale: input.locale ?? "fa",
      title: input.title ?? null,
      passwordHash: input.password ? await hashPassword(input.password) : null,
    })
    .returning()
    .get();
}

/** Columns that are safe to return to the UI / API (never the password hash). */
const publicColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  clientId: users.clientId,
  title: users.title,
  avatarUrl: users.avatarUrl,
  locale: users.locale,
  disabled: users.disabled,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
};

/** Temporary passwords: 16 url-safe chars (96 bits), shown once. */
const tempPassword = () => newToken(12);

// ─── My account ─────────────────────────────────────────────────────────────

/** The signed-in user's own account (with their client for portal users). */
export async function getAccount(actor: Actor) {
  const row = await db.query.users.findFirst({
    columns: { passwordHash: false },
    where: eq(users.id, actor.user.id),
    with: { client: { columns: { id: true, name: true } } },
  });
  if (!row) throw notFound("User");
  return row;
}

export function updateAccount(actor: Actor, input: z.output<typeof updateAccountInput>) {
  const clash = db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, input.email), ne(users.id, actor.user.id)))
    .get();
  if (clash) throw errors.emailTaken();
  const row = db
    .update(users)
    .set({
      name: input.name,
      email: input.email,
      title: input.title ?? null,
      avatarUrl: input.avatarUrl ?? null,
      locale: input.locale,
    })
    .where(eq(users.id, actor.user.id))
    .returning(publicColumns)
    .get();
  if (!row) throw notFound("User");
  logActivity(actor, "user.update_account", "user", actor.user.id, row.name);
  return row;
}

/**
 * Change the signed-in user's password. Optionally signs out every other
 * session (pass the current session id to keep it alive).
 */
export async function changePassword(
  actor: Actor,
  input: z.output<typeof changePasswordInput>,
  opts: { keepSessionId: string | null },
) {
  const limited = rateLimit(`password:${actor.user.id}`, 10, 15 * 60_000);
  if (!limited.ok) throw new AppError("rate_limited", "Too many attempts");
  if (input.newPassword !== input.confirmPassword) throw errors.passwordMismatch();
  const row = db
    .select({ hash: users.passwordHash })
    .from(users)
    .where(eq(users.id, actor.user.id))
    .get();
  if (!(await verifyPassword(input.currentPassword, row?.hash))) throw errors.wrongPassword();
  if (input.newPassword === input.currentPassword) throw errors.passwordSame();

  db.update(users)
    .set({ passwordHash: await hashPassword(input.newPassword) })
    .where(eq(users.id, actor.user.id))
    .run();
  let revoked = 0;
  if (input.revokeOtherSessions) {
    revoked = db
      .delete(sessions)
      .where(
        and(
          eq(sessions.userId, actor.user.id),
          opts.keepSessionId ? ne(sessions.id, opts.keepSessionId) : undefined,
        ),
      )
      .run().changes;
  }
  logActivity(actor, "user.password_change", "user", actor.user.id, undefined, {
    revokedSessions: revoked,
  });
  return { revokedSessions: revoked };
}

// ─── Team & users (owner/admin) ─────────────────────────────────────────────

const roleOrder = sql`case ${users.role} when 'owner' then 0 when 'admin' then 1 when 'member' then 2 else 3 end`;

/** Every user with their client, assigned projects and active-session count. */
export async function listUsers(
  actor: Actor,
  input: Partial<z.output<typeof listUsersInput>> = {},
) {
  assertAdmin(actor);
  const rows = await db.query.users.findMany({
    columns: { passwordHash: false, timezone: false },
    where: and(
      input.role ? eq(users.role, input.role) : undefined,
      input.includeDisabled === false ? eq(users.disabled, false) : undefined,
    ),
    with: { client: { columns: { id: true, name: true, color: true } } },
    orderBy: [asc(roleOrder), asc(users.name)],
  });

  const memberships = db
    .select({
      userId: projectMembers.userId,
      role: projectMembers.role,
      id: projects.id,
      name: projects.name,
      color: projects.color,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(isNull(projects.archivedAt))
    .orderBy(asc(projects.name))
    .all();
  const byUser = new Map<string, { id: string; name: string; color: string; role: string }[]>();
  for (const m of memberships) {
    const list = byUser.get(m.userId) ?? [];
    list.push({ id: m.id, name: m.name, color: m.color, role: m.role });
    byUser.set(m.userId, list);
  }

  const sessionCounts = new Map(
    db
      .select({ userId: sessions.userId, n: count() })
      .from(sessions)
      .where(gt(sessions.expiresAt, new Date()))
      .groupBy(sessions.userId)
      .all()
      .map((r) => [r.userId, r.n]),
  );

  return rows.map((u) => ({
    ...u,
    projects: byUser.get(u.id) ?? [],
    activeSessions: sessionCounts.get(u.id) ?? 0,
  }));
}

function loadUser(id: string) {
  const row = db.select(publicColumns).from(users).where(eq(users.id, id)).get();
  if (!row) throw notFound("User");
  return row;
}

/** Shared guard for every admin operation on another user. */
function assertCanManage(actor: Actor, target: { id: string; role: UserRole }) {
  assertAdmin(actor);
  if (target.id === actor.user.id) throw errors.selfAction();
  if (target.role === "owner" && !isOwner(actor)) throw errors.ownerOnly();
}

/** Active (not disabled) owners, optionally excluding one user. */
function activeOwnerCount(excludeId?: string) {
  return (
    db
      .select({ n: count() })
      .from(users)
      .where(
        and(
          eq(users.role, "owner"),
          eq(users.disabled, false),
          excludeId ? ne(users.id, excludeId) : undefined,
        ),
      )
      .get()?.n ?? 0
  );
}

/** Create a team member/admin with a one-time temporary password. */
export async function inviteTeamUser(actor: Actor, input: z.output<typeof inviteTeamUserInput>) {
  assertAdmin(actor);
  if (findUserByEmail(input.email)) throw errors.emailTaken();
  const password = tempPassword();
  const user = await createUser({ ...input, password });
  logActivity(actor, "user.invite", "user", user.id, user.email, { role: user.role });
  return { userId: user.id, email: user.email, tempPassword: password };
}

export function setUserRole(actor: Actor, { id, role }: z.output<typeof setUserRoleInput>) {
  const target = loadUser(id);
  assertCanManage(actor, target);
  if (target.role === "client") throw errors.clientRole();
  if (role === "owner" && !isOwner(actor)) throw errors.ownerOnly();
  if (target.role === role) return target;
  if (target.role === "owner" && activeOwnerCount(target.id) < 1) throw errors.lastOwner();
  const row = db
    .update(users)
    .set({ role })
    .where(eq(users.id, id))
    .returning(publicColumns)
    .get()!;
  logActivity(actor, "user.role_change", "user", id, target.email, { from: target.role, to: role });
  return row;
}

/** Disable/enable sign-in. Disabling also ends every session of that user. */
export function setUserDisabled(actor: Actor, id: string, disabled: boolean) {
  const target = loadUser(id);
  assertCanManage(actor, target);
  if (disabled && target.role === "owner" && activeOwnerCount(target.id) < 1)
    throw errors.lastOwner();
  db.transaction((tx) => {
    tx.update(users).set({ disabled }).where(eq(users.id, id)).run();
    if (disabled) tx.delete(sessions).where(eq(sessions.userId, id)).run();
  });
  logActivity(actor, disabled ? "user.disable" : "user.enable", "user", id, target.email);
}

/** New temporary password (shown once); signs the user out everywhere. */
export async function resetUserPassword(actor: Actor, id: string) {
  const target = loadUser(id);
  assertCanManage(actor, target);
  const password = tempPassword();
  const hash = await hashPassword(password);
  db.transaction((tx) => {
    tx.update(users).set({ passwordHash: hash }).where(eq(users.id, id)).run();
    tx.delete(sessions).where(eq(sessions.userId, id)).run();
  });
  logActivity(actor, "user.password_reset", "user", id, target.email);
  return { email: target.email, tempPassword: password };
}

/**
 * Permanently delete a user. Their sessions, tokens, time entries, vault and
 * notifications go with them (FK cascade); authored content keeps a null author.
 */
export function deleteUser(actor: Actor, id: string) {
  const target = loadUser(id);
  assertCanManage(actor, target);
  if (target.role === "owner" && activeOwnerCount(target.id) < 1) throw errors.lastOwner();
  db.delete(users).where(eq(users.id, id)).run();
  logActivity(actor, "user.delete", "user", id, target.email, { role: target.role });
}
