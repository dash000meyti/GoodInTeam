import { index, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createdAt, pk, timestamp, updatedAt } from "./_columns";
import { users } from "./auth";
import { clients } from "./crm";
import { projects } from "./projects";

export const docVisibilities = ["private", "team", "client"] as const;

/**
 * Internal documentation / knowledge base (tree of markdown pages).
 * `client` visibility exposes the page in that project's client portal.
 */
export const docs = sqliteTable(
  "docs",
  {
    id: pk(),
    parentId: text("parent_id"),
    title: text("title").notNull(),
    icon: text("icon"),
    contentMd: text("content_md").notNull().default(""),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
    visibility: text("visibility", { enum: docVisibilities }).notNull().default("private"),
    sort: real("sort").notNull().default(0),
    archivedAt: timestamp("archived_at"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("docs_parent_idx").on(t.parentId), index("docs_project_idx").on(t.projectId)],
);
