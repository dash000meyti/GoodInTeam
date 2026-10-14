import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { bool, createdAt, pk, timestamp, updatedAt } from "./_columns";
import { users } from "./auth";
import { clients } from "./crm";
import { projects } from "./projects";

/**
 * Zero-knowledge vault. The server NEVER sees plaintext secrets or the master
 * password. In the browser: masterPassword --PBKDF2--> KEK, which unwraps a
 * random 256-bit vault key (AES-GCM). Items are encrypted with the vault key.
 * A one-time recovery key wraps the same vault key as a backup.
 * See docs/security.md.
 */
export const vaultKeys = sqliteTable("vault_keys", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  kdf: text("kdf").notNull().default("PBKDF2-SHA256"),
  iterations: integer("iterations").notNull(),
  salt: text("salt").notNull(),
  wrappedKey: text("wrapped_key").notNull(),
  wrapIv: text("wrap_iv").notNull(),
  recoverySalt: text("recovery_salt"),
  recoveryWrappedKey: text("recovery_wrapped_key"),
  recoveryIv: text("recovery_iv"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const vaultItemTypes = [
  "login",
  "note",
  "api_key",
  "ssh_key",
  "database",
  "server",
  "card",
  "env",
  "other",
] as const;

export const vaultItems = sqliteTable(
  "vault_items",
  {
    id: pk(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: vaultItemTypes }).notNull().default("login"),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
    /** base64 AES-GCM ciphertext of JSON {title, username, password, url, notes, fields[]} */
    ciphertext: text("ciphertext").notNull(),
    iv: text("iv").notNull(),
    favorite: bool("favorite").notNull().default(false),
    lastViewedAt: timestamp("last_viewed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("vault_items_user_idx").on(t.userId)],
);
