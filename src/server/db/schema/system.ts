import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createdAt, json, pk, timestamp, updatedAt } from "./_columns";
import { users } from "./auth";

/** Key/value app settings (site profile, preferences). Typed in server/modules/settings. */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: json<unknown>("value").notNull(),
  updatedAt: updatedAt(),
});

export const notifications = sqliteTable(
  "notifications",
  {
    id: pk(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    readAt: timestamp("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt)],
);

/** Audit log: who did what, when (also what API/MCP clients did). */
export const activityLog = sqliteTable(
  "activity_log",
  {
    id: pk(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorType: text("actor_type", { enum: ["user", "api", "system", "public"] })
      .notNull()
      .default("user"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    summary: text("summary"),
    meta: json<Record<string, unknown>>("meta"),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [
    index("activity_entity_idx").on(t.entityType, t.entityId),
    index("activity_created_idx").on(t.createdAt),
  ],
);
