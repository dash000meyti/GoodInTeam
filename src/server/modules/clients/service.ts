import "server-only";
import { and, asc, count, eq, isNull, like, or } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/server/db/client";
import { clients, projects, users } from "@/server/db/schema";
import { assertAdmin, type Actor } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { notFound } from "@/server/errors";
import { newToken } from "@/lib/ids";
import { createUser } from "@/server/modules/users/service";
import type {
  clientInput,
  inviteClientUserInput,
  listClientsInput,
  updateClientInput,
} from "./schemas";

/** Clients are admin-only data (owner/admin). */
export function listClients(actor: Actor, input: z.output<typeof listClientsInput> = {}) {
  assertAdmin(actor);
  const where = and(
    input.includeArchived ? undefined : isNull(clients.archivedAt),
    input.q
      ? or(like(clients.name, `%${input.q}%`), like(clients.email, `%${input.q}%`))
      : undefined,
  );
  const rows = db.select().from(clients).where(where).orderBy(asc(clients.name)).all();
  const counts = new Map(
    db
      .select({ clientId: projects.clientId, n: count() })
      .from(projects)
      .groupBy(projects.clientId)
      .all()
      .map((r) => [r.clientId, r.n]),
  );
  return rows.map((c) => ({ ...c, projectCount: counts.get(c.id) ?? 0 }));
}

/** Minimal list for <select> pickers. */
export function clientOptions(actor: Actor) {
  assertAdmin(actor);
  return db
    .select({ id: clients.id, name: clients.name, color: clients.color })
    .from(clients)
    .where(isNull(clients.archivedAt))
    .orderBy(asc(clients.name))
    .all();
}

export async function getClient(actor: Actor, id: string) {
  assertAdmin(actor);
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, id),
    with: {
      projects: { orderBy: (p, { desc }) => [desc(p.updatedAt)] },
      users: { columns: { id: true, name: true, email: true, lastLoginAt: true, disabled: true } },
    },
  });
  if (!client) throw notFound("Client");
  return client;
}

export function createClient(actor: Actor, input: z.output<typeof clientInput>) {
  assertAdmin(actor);
  const row = db.insert(clients).values(input).returning().get();
  logActivity(actor, "client.create", "client", row.id, row.name);
  return row;
}

/** Partial update — only the keys present in `input` change (`null` clears). */
export function updateClient(actor: Actor, { id, ...input }: z.output<typeof updateClientInput>) {
  assertAdmin(actor);
  const patch = Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined),
  ) as Partial<typeof input>;
  const row = db
    .update(clients)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(clients.id, id))
    .returning()
    .get();
  if (!row) throw notFound("Client");
  logActivity(actor, "client.update", "client", id, row.name);
  return row;
}

export function setClientArchived(actor: Actor, id: string, archived: boolean) {
  assertAdmin(actor);
  db.update(clients)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(clients.id, id))
    .run();
  logActivity(actor, archived ? "client.archive" : "client.unarchive", "client", id);
}

export function deleteClient(actor: Actor, id: string) {
  assertAdmin(actor);
  db.delete(clients).where(eq(clients.id, id)).run();
  logActivity(actor, "client.delete", "client", id);
}

/** Create a portal user for a client. Returns the one-time temporary password. */
export async function inviteClientUser(
  actor: Actor,
  input: z.output<typeof inviteClientUserInput>,
) {
  assertAdmin(actor);
  const client = db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.id, input.clientId))
    .get();
  if (!client) throw notFound("Client");
  const tempPassword = newToken(12);
  const user = await createUser({
    email: input.email,
    name: input.name,
    password: tempPassword,
    role: "client",
    clientId: input.clientId,
    locale: input.locale,
  });
  logActivity(actor, "client.invite_user", "user", user.id, input.email, {
    clientId: input.clientId,
  });
  return { userId: user.id, email: user.email, tempPassword };
}

export function removeClientUser(actor: Actor, userId: string) {
  assertAdmin(actor);
  db.delete(users)
    .where(and(eq(users.id, userId), eq(users.role, "client")))
    .run();
  logActivity(actor, "client.remove_user", "user", userId);
}
