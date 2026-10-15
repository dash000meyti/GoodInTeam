import { z } from "zod";
import { accountKinds, categoryKinds, invoiceStatuses, transactionKinds } from "@/server/db/schema";
import { currencyCodes } from "@/lib/money";
import { zBool, zColor, zId, zNullString, zOptNumber, zOptString, zTags } from "@/lib/zod-helpers";

/**
 * Money typed by a person or sent by an agent, in MAJOR units of the relevant
 * currency ("1,250.50", "۱۲٬۰۰۰٬۰۰۰", 1250.5). Parsed in the service with the
 * account/invoice currency (`parseMoneyInput`).
 */
const zMoney = z.preprocess(
  (v) => (typeof v === "number" ? String(v) : v),
  z.string().trim().min(1).max(40),
);
const zOptMoney = z.preprocess(
  (v) =>
    v === "" || v === null || v === undefined ? undefined : typeof v === "number" ? String(v) : v,
  z.string().trim().max(40).optional(),
);
/** "YYYY-MM-DD" (Gregorian or Jalali like 1405/07/22) in the app timezone. */
const zDay = z.string().trim().min(8).max(20);
const zOptDay = zOptString(20);
/** "HH:mm" */
const zOptTime = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z
    .string()
    .regex(/^\d{1,2}:\d{2}$/)
    .optional(),
);
const zCurrency = z.enum(currencyCodes as [string, ...string[]]);
const zPage = z.coerce.number().int().min(1).max(10_000).optional();

// ─── Accounts ───────────────────────────────────────────────────────────────

export const accountInput = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(accountKinds).default("bank"),
  currency: zCurrency.default("IRT"),
  /** Opening balance in MAJOR units of the account currency (may be negative). */
  openingBalance: zOptMoney,
  color: zColor.optional(),
  notes: zNullString(2000),
});
export const updateAccountInput = accountInput.partial().extend({ id: zId });

// ─── Categories ─────────────────────────────────────────────────────────────

export const categoryInput = z.object({
  name: z.string().trim().min(1).max(80),
  kind: z.enum(categoryKinds),
  color: zColor.optional(),
});
export const updateCategoryInput = categoryInput.partial().extend({ id: zId });

// ─── Transactions ───────────────────────────────────────────────────────────

export const transactionInput = z.object({
  kind: z.enum(transactionKinds),
  /** Account the money is in (income/expense) or leaves from (transfer). */
  accountId: zId,
  /** MAJOR units of the account currency. Always positive; `kind` gives the sign. */
  amount: zMoney,
  /** Day "YYYY-MM-DD" (app timezone). Defaults to today. */
  date: zOptDay,
  /** Optional "HH:mm" wall-clock time. */
  time: zOptTime,
  categoryId: zNullString(64),
  projectId: zNullString(64),
  /** Counterparty from the clients list (company/team/person). */
  clientId: zNullString(64),
  /** Free-text counterparty when it is not a saved client. */
  counterparty: zNullString(200),
  description: zNullString(2000),
  status: z.enum(["cleared", "pending"]).default("cleared"),
  tags: zTags.optional(),
  /** Transfers only: destination account. */
  transferAccountId: zNullString(64),
  /** Transfers only: MAJOR units received in the destination currency (defaults to `amount`). */
  transferAmount: zOptMoney,
});
export type TransactionInput = z.input<typeof transactionInput>;

export const updateTransactionInput = transactionInput.partial().extend({ id: zId });

export const listTransactionsInput = z.object({
  accountId: zOptString(64),
  kind: z.enum(transactionKinds).optional(),
  /** Category id, or "none" for uncategorized. */
  categoryId: zOptString(64),
  projectId: zOptString(64),
  clientId: zOptString(64),
  invoiceId: zOptString(64),
  status: z.enum(["cleared", "pending"]).optional(),
  /** Inclusive day range "YYYY-MM-DD" (app timezone). */
  from: zOptDay,
  to: zOptDay,
  q: zOptString(200),
  page: zPage,
  pageSize: z.coerce.number().int().min(1).max(500).optional(),
});
export type ListTransactionsInput = z.output<typeof listTransactionsInput>;

export const importCsvInput = z.object({
  csv: z.string().min(1).max(2_000_000),
});

// ─── FX rates ───────────────────────────────────────────────────────────────

export const fxRateInput = z.object({
  /** Currency being priced (e.g. "USD"). */
  currency: zCurrency,
  /** Units of the BASE currency that one unit of `currency` is worth (major per major). */
  rate: z.preprocess(
    (v) => (typeof v === "number" ? String(v) : v),
    z.string().trim().min(1).max(30),
  ),
  /** Day "YYYY-MM-DD" (defaults to today). */
  date: zOptDay,
});
export const updateFxRateInput = fxRateInput.partial().extend({ id: zId });

// ─── Reports & ledgers ──────────────────────────────────────────────────────

export const summaryInput = z.object({
  /** Month key: "2026-10" (Gregorian) or "1405-07" (Jalali). Defaults to the current month. */
  month: zOptString(10),
  /** Or an inclusive day range "YYYY-MM-DD". */
  from: zOptDay,
  to: zOptDay,
});

export const ledgerInput = z
  .object({
    clientId: zOptString(64),
    projectId: zOptString(64),
    /** Free-text counterparty name (transactions without a client). */
    counterparty: zOptString(200),
  })
  .refine((v) => v.clientId || v.projectId || v.counterparty, {
    message: "Pass clientId, projectId or counterparty",
  });

// ─── Invoices ───────────────────────────────────────────────────────────────

export const invoiceItemInput = z.object({
  description: z.string().trim().min(1).max(1000),
  /** Quantity (hours, units…). */
  quantity: z.coerce.number().finite().min(0).max(1_000_000).default(1),
  /** MAJOR units of the invoice currency. */
  unitPrice: zMoney,
  /** Time entries billed by this line (set automatically when adding from tracked time). */
  timeEntryIds: z.array(zId).max(5000).optional(),
});

export const invoiceInput = z.object({
  clientId: zNullString(64),
  projectId: zNullString(64),
  /** Leave empty to auto-number as `${prefix}${year}-NNN`. */
  number: zOptString(40),
  /** Day "YYYY-MM-DD"; defaults to today. */
  issueDate: zOptDay,
  dueDate: zNullString(20),
  currency: zCurrency.default("IRT"),
  items: z.array(invoiceItemInput).max(200).default([]),
  /** MAJOR units. */
  discount: zOptMoney,
  /** Tax percent (9 = 9%). Stored as basis points. */
  taxPercent: zOptNumber,
  notes: zNullString(5000),
  terms: zNullString(5000),
  /** Also mark as sent (creates the public share link). */
  send: z.boolean().optional(),
});
export type InvoiceInput = z.input<typeof invoiceInput>;
export const updateInvoiceInput = invoiceInput.partial().extend({ id: zId });

export const listInvoicesInput = z.object({
  /** Status filter. "open" = sent | viewed | partial | overdue. */
  status: z.enum([...invoiceStatuses, "open"]).optional(),
  clientId: zOptString(64),
  projectId: zOptString(64),
  q: zOptString(100),
});

export const recordPaymentInput = z.object({
  invoiceId: zId,
  /** MAJOR units of the invoice currency. */
  amount: zMoney,
  /** Receiving account — must use the invoice currency. */
  accountId: zId,
  /** Day "YYYY-MM-DD"; defaults to today. */
  date: zOptDay,
  time: zOptTime,
  description: zNullString(500),
});

export const unbilledTimeInput = z.object({
  projectId: zId,
  /** Inclusive day range "YYYY-MM-DD"; omit for all unbilled time. */
  from: zOptDay,
  to: zOptDay,
});

export const invoiceFromTimeInput = z.object({
  projectId: zId,
  from: zOptDay,
  to: zOptDay,
  dueDate: zNullString(20),
  taxPercent: zOptNumber,
  notes: zNullString(5000),
  send: z.boolean().optional(),
});

export const tokenInput = z.object({ token: z.string().min(16).max(200) });

export { zDay, zBool, zMoney };
