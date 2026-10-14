import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { bool, createdAt, json, money, pk, timestamp, updatedAt } from "./_columns";
import { users } from "./auth";
import { clients } from "./crm";
import { projects } from "./projects";

export const accountKinds = ["bank", "cash", "card", "crypto", "wallet", "other"] as const;

/** Where money lives (bank account, cash, crypto wallet …). One currency each. */
export const accounts = sqliteTable("accounts", {
  id: pk(),
  name: text("name").notNull(),
  kind: text("kind", { enum: accountKinds }).notNull().default("bank"),
  currency: text("currency").notNull().default("IRT"),
  openingBalanceMinor: money("opening_balance_minor").notNull().default(0),
  color: text("color"),
  notes: text("notes"),
  sort: real("sort").notNull().default(0),
  archived: bool("archived").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const categoryKinds = ["income", "expense"] as const;

export const categories = sqliteTable("finance_categories", {
  id: pk(),
  name: text("name").notNull(),
  kind: text("kind", { enum: categoryKinds }).notNull(),
  color: text("color"),
  icon: text("icon"),
  parentId: text("parent_id"),
  createdAt: createdAt(),
});

export const transactionKinds = ["income", "expense", "transfer"] as const;
export type TransactionKind = (typeof transactionKinds)[number];

/**
 * Every money movement. `amountMinor` is always positive; `kind` gives the sign.
 * Transfers move money between two accounts (possibly different currencies).
 * `clientId` = counterparty (person/company), enabling per-counterparty ledgers.
 */
export const transactions = sqliteTable(
  "transactions",
  {
    id: pk(),
    kind: text("kind", { enum: transactionKinds }).notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    amountMinor: money("amount_minor").notNull(),
    currency: text("currency").notNull(),
    occurredAt: timestamp("occurred_at").notNull(),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
    counterparty: text("counterparty"),
    description: text("description"),
    invoiceId: text("invoice_id"),
    transferAccountId: text("transfer_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    transferAmountMinor: money("transfer_amount_minor"),
    status: text("status", { enum: ["cleared", "pending"] })
      .notNull()
      .default("cleared"),
    tags: json<string[]>("tags").notNull().default([]),
    attachmentId: text("attachment_id"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("tx_occurred_idx").on(t.occurredAt),
    index("tx_account_idx").on(t.accountId),
    index("tx_project_idx").on(t.projectId),
    index("tx_client_idx").on(t.clientId),
  ],
);

export const invoiceStatuses = [
  "draft",
  "sent",
  "viewed",
  "partial",
  "paid",
  "overdue",
  "void",
] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const invoices = sqliteTable(
  "invoices",
  {
    id: pk(),
    number: text("number").notNull(),
    clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    status: text("status", { enum: invoiceStatuses }).notNull().default("draft"),
    issueDate: timestamp("issue_date").notNull(),
    dueDate: timestamp("due_date"),
    currency: text("currency").notNull().default("IRT"),
    subtotalMinor: money("subtotal_minor").notNull().default(0),
    discountMinor: money("discount_minor").notNull().default(0),
    /** Tax in basis points (900 = 9%). */
    taxBps: integer("tax_bps").notNull().default(0),
    totalMinor: money("total_minor").notNull().default(0),
    paidMinor: money("paid_minor").notNull().default(0),
    notes: text("notes"),
    terms: text("terms"),
    shareToken: text("share_token"),
    sentAt: timestamp("sent_at"),
    viewedAt: timestamp("viewed_at"),
    paidAt: timestamp("paid_at"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("invoices_number_uq").on(t.number),
    uniqueIndex("invoices_share_token_uq").on(t.shareToken),
    index("invoices_client_idx").on(t.clientId),
  ],
);

export const invoiceItems = sqliteTable(
  "invoice_items",
  {
    id: pk(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    /** Quantity (e.g. hours). */
    quantity: real("quantity").notNull().default(1),
    unitPriceMinor: money("unit_price_minor").notNull().default(0),
    amountMinor: money("amount_minor").notNull().default(0),
    sort: real("sort").notNull().default(0),
    timeEntryIds: json<string[]>("time_entry_ids").notNull().default([]),
  },
  (t) => [index("invoice_items_invoice_idx").on(t.invoiceId)],
);
