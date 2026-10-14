import "server-only";
import { db } from "@/server/db/client";
import { activityLog } from "@/server/db/schema";
import type { Actor } from "./auth/actor";

/** Append an entry to the audit log. Never throws. */
export function logActivity(
  actor: Actor | null,
  action: string,
  entityType: string,
  entityId: string | null,
  summary?: string,
  meta?: Record<string, unknown>,
) {
  try {
    db.insert(activityLog)
      .values({
        actorId: actor?.user.id ?? null,
        actorType: !actor
          ? "public"
          : actor.via === "api"
            ? "api"
            : actor.via === "system"
              ? "system"
              : "user",
        action,
        entityType,
        entityId,
        summary,
        meta,
      })
      .run();
  } catch (err) {
    console.error("[activity] failed to log", err);
  }
}
