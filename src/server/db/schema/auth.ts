import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { bool, createdAt, json, pk, timestamp, updatedAt } from "./_columns";
import { clients } from "./crm";
import { userRoles, type ApiTokenScope } from "../enums";

// Enum lists live in the dependency-free `../enums` (safe for client bundles).
export { userRoles, apiTokenScopes, type UserRole, type ApiTokenScope } from "../enums";

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
