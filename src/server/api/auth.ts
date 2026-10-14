import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { apiTokens, users } from "@/server/db/schema";
import { hmac } from "@/server/auth/crypto";
import { rateLimit } from "@/server/auth/rate-limit";
import type { Actor } from "@/server/auth/actor";
import { AppError } from "@/server/errors";

export const TOKEN_PREFIX = "gt_";

/** Resolve `Authorization: Bearer gt_…` into an Actor (or throw 401). */
export function actorFromRequest(req: Request): Actor {
  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
  if (!token || !token.startsWith(TOKEN_PREFIX))
    throw new AppError("unauthorized", "Missing or invalid bearer token");

  const limited = rateLimit(`api:${token.slice(0, 12)}`, 600, 60_000);
  if (!limited.ok) throw new AppError("rate_limited", "Rate limit exceeded (600 req/min)");

  const row = db
    .select({ token: apiTokens, user: users })
    .from(apiTokens)
    .innerJoin(users, eq(users.id, apiTokens.userId))
    .where(and(eq(apiTokens.tokenHash, hmac(token)), isNull(apiTokens.revokedAt)))
    .get();
  if (!row || row.user.disabled) throw new AppError("unauthorized", "Invalid or revoked token");
  if (row.token.expiresAt && row.token.expiresAt.getTime() < Date.now())
    throw new AppError("unauthorized", "Token expired");

  // Throttle last-used writes to once a minute.
  if (!row.token.lastUsedAt || Date.now() - row.token.lastUsedAt.getTime() > 60_000) {
    db.update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, row.token.id))
      .run();
  }
  const u = row.user;
  return {
    via: "api",
    scopes: row.token.scopes,
    user: {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      clientId: u.clientId,
      locale: u.locale,
      avatarUrl: u.avatarUrl,
      title: u.title,
    },
  };
}
