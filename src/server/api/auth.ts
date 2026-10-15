import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { apiTokens, users } from "@/server/db/schema";
import { env } from "@/lib/env";
import { clientIp } from "@/server/auth/client-ip";
import { hmac } from "@/server/auth/crypto";
import { rateLimit } from "@/server/auth/rate-limit";
import type { Actor } from "@/server/auth/actor";
import { AppError } from "@/server/errors";

export const TOKEN_PREFIX = "gt_";
/** `gt_` + base64url (tokens are `gt_` + 43 chars; allow some slack). */
const TOKEN_SHAPE = /^gt_[A-Za-z0-9_-]{20,128}$/;

/** Requests per minute per (verified) token. */
export const API_RATE_LIMIT = 600;
/** Failed authentications per minute per client IP before answering 429. */
export const API_AUTH_FAILURES_PER_IP = 30;

/** Look up a bearer token; a malformed one never reaches the database. */
function findToken(header: string) {
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token.startsWith(TOKEN_PREFIX)) return { problem: "Missing or invalid bearer token" };
  const row = TOKEN_SHAPE.test(token)
    ? db
        .select({ token: apiTokens, user: users })
        .from(apiTokens)
        .innerJoin(users, eq(users.id, apiTokens.userId))
        .where(and(eq(apiTokens.tokenHash, hmac(token)), isNull(apiTokens.revokedAt)))
        .get()
    : undefined;
  if (!row || row.user.disabled) return { problem: "Invalid or revoked token" };
  if (row.token.expiresAt && row.token.expiresAt.getTime() < Date.now()) {
    return { problem: "Token expired" };
  }
  return { row };
}

/**
 * Resolve `Authorization: Bearer gt_…` into an Actor (or throw 401/429).
 *
 * The token is verified *before* any per-token rate limiting, so buckets are
 * keyed by the token's id — random or forged tokens can't create buckets or
 * eat into a real token's budget. Failed attempts are counted per client IP
 * (see TRUST_PROXY); a valid token is never blocked by someone else's failures.
 */
export function actorFromRequest(req: Request): Actor {
  const { row, problem } = findToken(req.headers.get("authorization") ?? "");
  if (!row) {
    const ip = clientIp(req.headers, env.trustProxy) ?? "unknown";
    const failures = rateLimit(`api:auth-fail:${ip}`, API_AUTH_FAILURES_PER_IP, 60_000);
    if (!failures.ok) {
      throw new AppError("rate_limited", "Too many failed authentication attempts");
    }
    throw new AppError("unauthorized", problem ?? "Invalid or revoked token");
  }

  const limited = rateLimit(`api:token:${row.token.id}`, API_RATE_LIMIT, 60_000);
  if (!limited.ok) {
    throw new AppError("rate_limited", `Rate limit exceeded (${API_RATE_LIMIT} req/min)`);
  }

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
