import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createdAt, json, pk, timestamp, updatedAt } from "./_columns";

/**
 * A client is any counterparty: a company, a team, or a person.
 * Used for projects, invoices, contracts, finance ledgers and the portal.
 */
export const clientKinds = ["company", "team", "person"] as const;

export const clients = sqliteTable(
  "clients",
  {
    id: pk(),
    name: text("name").notNull(),
    kind: text("kind", { enum: clientKinds }).notNull().default("company"),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),
    address: text("address"),
    taxId: text("tax_id"),
    notes: text("notes"),
    color: text("color"),
    logoUrl: text("logo_url"),
    defaultCurrency: text("default_currency").notNull().default("IRT"),
    tags: json<string[]>("tags").notNull().default([]),
    archivedAt: timestamp("archived_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("clients_name_idx").on(t.name)],
);
