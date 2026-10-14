import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { bool, createdAt, json, pk, timestamp, updatedAt } from "./_columns";
import { clients } from "./crm";

/**
 * Roles:
 * - owner:  you. Full access to everything.
 * - admin:  trusted teammate with full access except owner-only settings.
 * - member: teammate; sees projects they are a member of, tracks own time.
 * - client: customer portal user; sees only their client's shared data.
 */
export const userRoles = ["owner", "admin", "member", "client"] as const;
export type UserRole = (typeof userRoles)[number];

export const users = sqliteTable(
  "users",
  {
    id: pk(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    role: text("role", { enum: userRoles }).notNull().default("member"),
    clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
    title: text("title"),
    avatarUrl: text("avatar_url"),
    locale: text("locale", { enum: ["fa", "en"] })
      .notNull()
      .default("fa"),
    timezone: text("timezone"),
    disabled: bool("disabled").notNull().default(false),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email), index("users_client_idx").on(t.clientId)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    /** sha256(token) — the raw token only ever lives in the cookie. */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    lastSeenAt: timestamp("last_seen_at"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const apiTokenScopes = ["read", "write", "admin"] as const;
export type ApiTokenScope = (typeof apiTokenScopes)[number];

/** Personal access tokens for the REST API and the MCP endpoint (AI agents). */
export const apiTokens = sqliteTable(
  "api_tokens",
  {
    id: pk(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** First characters of the token, shown in the UI to identify it. */
    prefix: text("prefix").notNull(),
    tokenHash: text("token_hash").notNull(),
    scopes: json<ApiTokenScope[]>("scopes").notNull().default(["read"]),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("api_tokens_hash_uq").on(t.tokenHash)],
);
