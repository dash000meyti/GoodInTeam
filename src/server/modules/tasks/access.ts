import "server-only";
import { and, eq, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db/client";
import { projectMembers, tasks } from "@/server/db/schema";
import { isAdmin, type Actor } from "@/server/auth/actor";
import { notFound } from "@/server/errors";

/**
 * SQL filter for the tasks an actor may see (staff only).
 *
 * - Project tasks: owner/admin see all; members see tasks of their assigned projects.
 * - Personal tasks (no project) are private to whoever created them or is assigned.
 * - Clients: none (the client portal uses `projectTasksPanel` with share flags).
 */
export function taskAccessWhere(actor: Actor): SQL | undefined {
  const personal = and(
    isNull(tasks.projectId),
    or(eq(tasks.createdBy, actor.user.id), eq(tasks.assigneeId, actor.user.id)),
  );
  if (isAdmin(actor)) return or(isNotNull(tasks.projectId), personal);
  if (actor.user.role === "member") {
    return or(
      inArray(
        tasks.projectId,
        db
          .select({ id: projectMembers.projectId })
          .from(projectMembers)
          .where(eq(projectMembers.userId, actor.user.id)),
      ),
      personal,
    );
  }
  return sql`0`;
}

/** Load a task the actor can see, or throw not_found. */
export function accessibleTask(actor: Actor, id: string) {
  const row = db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), taskAccessWhere(actor)))
    .get();
  if (!row) throw notFound("Task");
  return row;
}
