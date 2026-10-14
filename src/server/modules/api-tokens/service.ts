import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/server/db/client";
import { apiTokens } from "@/server/db/schema";
import { hmac } from "@/server/auth/crypto";
import type { Actor } from "@/server/auth/actor";
import { assertStaff } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { notFound } from "@/server/errors";
import { TOKEN_PREFIX } from "@/server/api/auth";
import { newToken } from "@/lib/ids";
import type { createTokenInput } from "./schemas";

export { createTokenInput } from "./schemas";

/** The caller's own active (non-revoked) tokens. Never returns hashes. */
export function listTokens(actor: Actor) {
  assertStaff(actor);
  return db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      prefix: apiTokens.prefix,
      scopes: apiTokens.scopes,
      lastUsedAt: apiTokens.lastUsedAt,
      expiresAt: apiTokens.expiresAt,
      createdAt: apiTokens.createdAt,
    })
    .from(apiTokens)
    .where(and(eq(apiTokens.userId, actor.user.id), isNull(apiTokens.revokedAt)))
    .orderBy(desc(apiTokens.createdAt))
    .all();
}

/** Returns the raw token ONCE. Only its HMAC is stored. */
export function createToken(actor: Actor, input: z.output<typeof createTokenInput>) {
  assertStaff(actor);
  // Every token can read; "write" is additive.
  const scopes = [...new Set(["read" as const, ...input.scopes])];
  const raw = `${TOKEN_PREFIX}${newToken(32)}`;
  const row = db
    .insert(apiTokens)
    .values({
      userId: actor.user.id,
      name: input.name,
      prefix: raw.slice(0, 10),
      tokenHash: hmac(raw),
      scopes,
      expiresAt: input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 86_400_000)
        : null,
    })
    .returning({ id: apiTokens.id })
    .get();
  logActivity(actor, "api_token.create", "api_token", row.id, input.name, { scopes });
  return { id: row.id, token: raw };
}

export function revokeToken(actor: Actor, id: string) {
  assertStaff(actor);
  const row = db
    .update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(apiTokens.id, id), eq(apiTokens.userId, actor.user.id), isNull(apiTokens.revokedAt)),
    )
    .returning({ name: apiTokens.name })
    .get();
  if (!row) throw notFound("API token");
  logActivity(actor, "api_token.revoke", "api_token", id, row.name);
}
