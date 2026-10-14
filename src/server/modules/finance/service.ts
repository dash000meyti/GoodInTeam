import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { z } from "zod";
import { db } from "@/server/db/client";
import {
  accounts,
  categories,
  clients,
  invoices,
  projects,
  transactions,
  type TransactionKind,
} from "@/server/db/schema";
import { assertAdmin, type Actor } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { notFound } from "@/server/errors";
import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { dateParts } from "@/lib/format";
import { calendarFor, startOfMonth, toDateInputValue, toTimeInputValue } from "@/lib/tz";
import { appTimezone } from "@/server/modules/settings/service";
import { accountBalance, minorToMajor, sumByCurrency, type AccountFlowRow, type TxStatus } from "./calc";
import { mapImportRows, parseCsv, toCsv } from "./csv";
import { FinanceError } from "./errors";
import { applyInvoicePaymentDelta } from "./invoices";
import { dayRange, parseAmount, parseMovementDate } from "./internal";
import type {
  accountInput,
  categoryInput,
  ListTransactionsInput,
  transactionInput,
  updateAccountInput,
  updateCategoryInput,
  updateTransactionInput,
} from "./schemas";

// ─── Accounts ───────────────────────────────────────────────────────────────

/** Balances for all (or some) accounts: opening ± flows; pending tracked separately. */
export function accountBalances(ids?: string[]) {
  const accs = db
    .select({ id: accounts.id, opening: accounts.openingBalanceMinor })
    .from(accounts)
    .where(ids ? inArray(accounts.id, ids) : undefined)
    .all();
  const out = db
    .select({
      accountId: transactions.accountId,
      kind: transactions.kind,
      status: transactions.status,
      total: sql<number>`sum(${transactions.amountMinor})`,
    })
    .from(transactions)
    .where(ids ? inArray(transactions.accountId, ids) : undefined)
    .groupBy(transactions.accountId, transactions.kind, transactions.status)
    .all();
  const incoming = db
    .select({
      accountId: transactions.transferAccountId,
      status: transactions.status,
      total: sql<number>`sum(coalesce(${transactions.transferAmountMinor}, ${transactions.amountMinor}))`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.kind, "transfer"),
        ids ? inArray(transactions.transferAccountId, ids) : undefined,
      ),
    )
    .groupBy(transactions.transferAccountId, transactions.status)
    .all();
  const map = new Map<string, ReturnType<typeof accountBalance>>();
  for (const a of accs) {
    map.set(
      a.id,
      accountBalance(
        a.opening,
        out.filter((r) => r.accountId === a.id) as AccountFlowRow[],
        incoming.filter((r) => r.accountId === a.id) as { status: TxStatus; total: number }[],
      ),
    );
  }
  return map;
}

export function listAccounts(actor: Actor, opts: { includeArchived?: boolean } = {}) {
  assertAdmin(actor);
  const rows = db
    .select()
    .from(accounts)
    .where(opts.includeArchived ? undefined : eq(accounts.archived, false))
    .orderBy(asc(accounts.archived), asc(accounts.sort), asc(accounts.name))
    .all();
  const balances = accountBalances();
  const counts = new Map(
    db
      .select({ id: transactions.accountId, n: count() })
      .from(transactions)
      .groupBy(transactions.accountId)
      .all()
      .map((r) => [r.id, r.n]),
  );
  return rows.map((a) => ({
    ...a,
    ...(balances.get(a.id) ?? { balance: a.openingBalanceMinor, pending: 0, cleared: a.openingBalanceMinor, income: 0, expense: 0 }),
    txCount: counts.get(a.id) ?? 0,
  }));
}

/** Minimal list for pickers (active accounts). */
export function accountOptions(actor: Actor) {
  assertAdmin(actor);
  return db
    .select({
      id: accounts.id,
      name: accounts.name,
      currency: accounts.currency,
      kind: accounts.kind,
      color: accounts.color,
    })
    .from(accounts)
    .where(eq(accounts.archived, false))
    .orderBy(asc(accounts.sort), asc(accounts.name))
    .all();
}

export function getAccount(actor: Actor, id: string) {
  assertAdmin(actor);
  const a = db.select().from(accounts).where(eq(accounts.id, id)).get();
  if (!a) throw notFound("Account");
  return { ...a, ...accountBalances([id]).get(id)! };
}

/**
 * Transactions touching an account (newest first) with the running balance
 * after each one, in the account currency.
 */
export function accountStatement(actor: Actor, id: string, opts: { page?: number; pageSize?: number } = {}) {
  const account = getAccount(actor, id);
  const rows = db
    .select({
      id: transactions.id,
      kind: transactions.kind,
      accountId: transactions.accountId,
      transferAccountId: transactions.transferAccountId,
      amountMinor: transactions.amountMinor,
      transferAmountMinor: transactions.transferAmountMinor,
      occurredAt: transactions.occurredAt,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .where(or(eq(transactions.accountId, id), eq(transactions.transferAccountId, id)))
    .orderBy(asc(transactions.occurredAt), asc(transactions.createdAt))
    .all();
  let running = account.openingBalanceMinor;
  const after = new Map<string, { delta: number; balance: number }>();
  for (const r of rows) {
    const delta =
      r.kind === "income"
        ? r.amountMinor
        : r.kind === "expense"
          ? -r.amountMinor
          : r.accountId === id
            ? -r.amountMinor
            : (r.transferAmountMinor ?? r.amountMinor);
    running += delta;
    after.set(r.id, { delta, balance: running });
  }
  const pageSize = opts.pageSize ?? 50;
  const list = listTransactions(actor, { accountId: id, page: opts.page, pageSize });
  return {
    account,
    ...list,
    rows: list.rows.map((r) => ({ ...r, delta: after.get(r.id)?.delta ?? 0, balanceAfter: after.get(r.id)?.balance ?? 0 })),
  };
}

export function createAccount(actor: Actor, input: z.output<typeof accountInput>) {
  assertAdmin(actor);
  const max = db.select({ s: sql<number>`coalesce(max(${accounts.sort}), 0)` }).from(accounts).get();
  const row = db
    .insert(accounts)
    .values({
      name: input.name,
      kind: input.kind,
      currency: input.currency,
      openingBalanceMinor: input.openingBalance
        ? parseAmount(input.openingBalance, input.currency, { field: "openingBalance", allowNegative: true, allowZero: true })
        : 0,
      color: input.color ?? null,
      notes: input.notes ?? null,
      sort: (max?.s ?? 0) + 1,
    })
    .returning()
    .get();
  logActivity(actor, "account.create", "account", row.id, row.name);
  return row;
}

export function updateAccount(actor: Actor, { id, ...input }: z.output<typeof updateAccountInput>) {
  assertAdmin(actor);
  const acc = db.select().from(accounts).where(eq(accounts.id, id)).get();
  if (!acc) throw notFound("Account");
  const currency = input.currency ?? acc.currency;
  if (currency !== acc.currency) {
    const used = db
      .select({ id: transactions.id })
      .from(transactions)
      .where(or(eq(transactions.accountId, id), eq(transactions.transferAccountId, id)))
      .get();
    if (used) throw new FinanceError("currencyLocked", "currency");
  }
  const row = db
    .update(accounts)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.kind !== undefined && { kind: input.kind }),
      currency,
      ...(input.openingBalance !== undefined && {
        openingBalanceMinor: input.openingBalance
          ? parseAmount(input.openingBalance, currency, { field: "openingBalance", allowNegative: true, allowZero: true })
          : 0,
      }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.notes !== undefined && { notes: input.notes }),
    })
    .where(eq(accounts.id, id))
    .returning()
    .get();
  logActivity(actor, "account.update", "account", id, row.name);
  return row;
}

export function setAccountArchived(actor: Actor, id: string, archived: boolean) {
  assertAdmin(actor);
  db.update(accounts).set({ archived }).where(eq(accounts.id, id)).run();
  logActivity(actor, archived ? "account.archive" : "account.unarchive", "account", id);
}

export function deleteAccount(actor: Actor, id: string) {
  assertAdmin(actor);
  const used = db
    .select({ id: transactions.id })
    .from(transactions)
    .where(or(eq(transactions.accountId, id), eq(transactions.transferAccountId, id)))
    .get();
  if (used) throw new FinanceError("accountHasTransactions");
  db.delete(accounts).where(eq(accounts.id, id)).run();
  logActivity(actor, "account.delete", "account", id);
}

// ─── Categories ─────────────────────────────────────────────────────────────

export function listCategories(actor: Actor, opts: { now?: number; locale?: Locale } = {}) {
  assertAdmin(actor);
  const rows = db.select().from(categories).orderBy(asc(categories.kind), asc(categories.name)).all();
  const counts = new Map(
    db
      .select({ id: transactions.categoryId, n: count() })
      .from(transactions)
      .groupBy(transactions.categoryId)
      .all()
      .map((r) => [r.id, r.n]),
  );
  const monthStart = startOfMonth(opts.now ?? Date.now(), appTimezone(), calendarFor(opts.locale ?? "fa"));
  const month = db
    .select({
      id: transactions.categoryId,
      currency: transactions.currency,
      minor: sql<number>`sum(${transactions.amountMinor})`,
    })
    .from(transactions)
    .where(gte(transactions.occurredAt, monthStart))
    .groupBy(transactions.categoryId, transactions.currency)
    .all();
  return rows.map((c) => ({
    ...c,
    txCount: counts.get(c.id) ?? 0,
    month: sumByCurrency(month.filter((m) => m.id === c.id)),
  }));
}

export function categoryOptions(actor: Actor) {
  assertAdmin(actor);
  return db
    .select({ id: categories.id, name: categories.name, kind: categories.kind, color: categories.color })
    .from(categories)
    .orderBy(asc(categories.name))
    .all();
}

export function createCategory(actor: Actor, input: z.output<typeof categoryInput>) {
  assertAdmin(actor);
  const row = db
    .insert(categories)
    .values({ name: input.name, kind: input.kind, color: input.color ?? null })
    .returning()
    .get();
  logActivity(actor, "category.create", "finance_category", row.id, row.name);
  return row;
}

export function updateCategory(actor: Actor, { id, ...input }: z.output<typeof updateCategoryInput>) {
  assertAdmin(actor);
  const cat = db.select().from(categories).where(eq(categories.id, id)).get();
  if (!cat) throw notFound("Category");
  if (input.kind && input.kind !== cat.kind) {
    const used = db.select({ id: transactions.id }).from(transactions).where(eq(transactions.categoryId, id)).get();
    if (used) throw new FinanceError("categoryKindMismatch", "kind");
  }
  const row = db
    .update(categories)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.kind !== undefined && { kind: input.kind }),
      ...(input.color !== undefined && { color: input.color }),
    })
    .where(eq(categories.id, id))
    .returning()
    .get();
  logActivity(actor, "category.update", "finance_category", id, row.name);
  return row;
}

/** Deleting a category leaves its transactions uncategorized. */
export function deleteCategory(actor: Actor, id: string) {
  assertAdmin(actor);
  db.delete(categories).where(eq(categories.id, id)).run();
  logActivity(actor, "category.delete", "finance_category", id);
}

// ─── Transactions ───────────────────────────────────────────────────────────

const toAccount = alias(accounts, "to_account");

function txWhere(input: ListTransactionsInput): SQL | undefined {
  const { start, end } = dayRange(input.from, input.to);
  const q = input.q?.trim();
  return and(
    input.accountId
      ? or(eq(transactions.accountId, input.accountId), eq(transactions.transferAccountId, input.accountId))
      : undefined,
    input.kind ? eq(transactions.kind, input.kind) : undefined,
    input.categoryId === "none"
      ? isNull(transactions.categoryId)
      : input.categoryId
        ? eq(transactions.categoryId, input.categoryId)
        : undefined,
    input.projectId ? eq(transactions.projectId, input.projectId) : undefined,
    input.clientId ? eq(transactions.clientId, input.clientId) : undefined,
    input.invoiceId ? eq(transactions.invoiceId, input.invoiceId) : undefined,
    input.status ? eq(transactions.status, input.status) : undefined,
    start ? gte(transactions.occurredAt, start) : undefined,
    end ? lt(transactions.occurredAt, end) : undefined,
    q
      ? or(
          like(transactions.description, `%${q}%`),
          like(transactions.counterparty, `%${q}%`),
          like(transactions.tags, `%${q}%`),
          inArray(
            transactions.clientId,
            db.select({ id: clients.id }).from(clients).where(like(clients.name, `%${q}%`)),
          ),
        )
      : undefined,
  );
}

function selectTx() {
  return db
    .select({
      tx: transactions,
      account: { id: accounts.id, name: accounts.name, color: accounts.color, kind: accounts.kind },
      toAccount: { id: toAccount.id, name: toAccount.name, currency: toAccount.currency },
      category: { id: categories.id, name: categories.name, color: categories.color },
      project: { id: projects.id, name: projects.name, color: projects.color },
      client: { id: clients.id, name: clients.name, color: clients.color },
      invoice: { id: invoices.id, number: invoices.number },
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(toAccount, eq(toAccount.id, transactions.transferAccountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(projects, eq(projects.id, transactions.projectId))
    .leftJoin(clients, eq(clients.id, transactions.clientId))
    .leftJoin(invoices, eq(invoices.id, transactions.invoiceId));
}

type TxSelectRow = Awaited<ReturnType<ReturnType<typeof selectTx>["all"]>>[number];

function shapeTx(r: TxSelectRow) {
  return {
    ...r.tx,
    account: r.account,
    toAccount: r.toAccount?.id ? r.toAccount : null,
    category: r.category?.id ? r.category : null,
    project: r.project?.id ? r.project : null,
    client: r.client?.id ? r.client : null,
    invoice: r.invoice?.id ? r.invoice : null,
  };
}
export type TransactionRow = ReturnType<typeof shapeTx>;

/** Filtered, paginated transactions (newest first) + per-currency totals of the filter. */
export function listTransactions(actor: Actor, input: ListTransactionsInput = {}) {
  assertAdmin(actor);
  const where = txWhere(input);
  const pageSize = input.pageSize ?? 50;
  const total = db.select({ n: count() }).from(transactions).where(where).get()?.n ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(input.page ?? 1, pages);
  const rows = selectTx()
    .where(where)
    .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all()
    .map(shapeTx);
  const sums = db
    .select({
      kind: transactions.kind,
      currency: transactions.currency,
      minor: sql<number>`sum(${transactions.amountMinor})`,
    })
    .from(transactions)
    .where(and(where, ne(transactions.kind, "transfer")))
    .groupBy(transactions.kind, transactions.currency)
    .all();
  return {
    rows,
    total,
    page,
    pages,
    pageSize,
    totals: {
      income: sumByCurrency(sums.filter((s) => s.kind === "income")),
      expense: sumByCurrency(sums.filter((s) => s.kind === "expense")),
    },
  };
}

export function getTransaction(actor: Actor, id: string) {
  assertAdmin(actor);
  const r = selectTx().where(eq(transactions.id, id)).get();
  if (!r) throw notFound("Transaction");
  return shapeTx(r);
}

function activeAccount(id: string | null | undefined, field: string) {
  if (!id) throw new FinanceError(field === "accountId" ? "accountNotFound" : "transferAccountRequired", field);
  const a = db.select().from(accounts).where(eq(accounts.id, id)).get();
  if (!a) throw new FinanceError("accountNotFound", field);
  return a;
}

function checkCategory(categoryId: string | null | undefined, kind: TransactionKind) {
  if (!categoryId || kind === "transfer") return null;
  const c = db.select({ kind: categories.kind }).from(categories).where(eq(categories.id, categoryId)).get();
  if (!c) return null;
  if (c.kind !== kind) throw new FinanceError("categoryKindMismatch", "categoryId");
  return categoryId;
}

function occurredAtFrom(date: string | undefined, time: string | undefined, fallback?: Date) {
  return parseMovementDate(date, time, fallback);
}

type TxFields = Omit<typeof transactions.$inferInsert, "id" | "createdAt" | "updatedAt" | "createdBy">;

/** Validate a full transaction (create, or existing merged with a patch) → DB row values. */
function buildTx(
  input: z.output<typeof transactionInput>,
  opts: { requireActiveAccount: boolean; fallbackDate?: Date },
): TxFields {
  const account = activeAccount(input.accountId, "accountId");
  if (opts.requireActiveAccount && account.archived) throw new FinanceError("accountArchived", "accountId");
  const amountMinor = parseAmount(input.amount, account.currency);
  const occurredAt = occurredAtFrom(input.date, input.time, opts.fallbackDate);
  const base = {
    kind: input.kind,
    accountId: account.id,
    amountMinor,
    currency: account.currency,
    occurredAt,
    description: input.description ?? null,
    status: input.status,
    tags: input.tags ?? [],
  };
  if (input.kind === "transfer") {
    const to = activeAccount(input.transferAccountId, "transferAccountId");
    if (to.id === account.id) throw new FinanceError("transferSameAccount", "transferAccountId");
    if (opts.requireActiveAccount && to.archived) throw new FinanceError("accountArchived", "transferAccountId");
    let transferAmountMinor: number;
    if (input.transferAmount) {
      transferAmountMinor = parseAmount(input.transferAmount, to.currency, { field: "transferAmount" });
    } else if (to.currency === account.currency) transferAmountMinor = amountMinor;
    else throw new FinanceError("invalidTransferAmount", "transferAmount");
    return {
      ...base,
      transferAccountId: to.id,
      transferAmountMinor,
      categoryId: null,
      projectId: input.projectId ?? null,
      clientId: null,
      counterparty: null,
    };
  }
  return {
    ...base,
    transferAccountId: null,
    transferAmountMinor: null,
    categoryId: checkCategory(input.categoryId, input.kind),
    projectId: input.projectId ?? null,
    clientId: input.clientId ?? null,
    counterparty: input.clientId ? null : (input.counterparty ?? null),
  };
}

export function createTransaction(actor: Actor, input: z.output<typeof transactionInput>) {
  assertAdmin(actor);
  const values = buildTx(input, { requireActiveAccount: true });
  const row = db
    .insert(transactions)
    .values({ ...values, createdBy: actor.user.id })
    .returning()
    .get();
  logActivity(actor, "transaction.create", "transaction", row.id, `${row.kind} ${row.amountMinor} ${row.currency}`);
  return row;
}

/** Current row as a `transactionInput`-shaped object (major units), for partial updates. */
function toInput(row: typeof transactions.$inferSelect): z.output<typeof transactionInput> {
  const tz = appTimezone();
  const transferCurrency = row.transferAccountId
    ? (db.select({ c: accounts.currency }).from(accounts).where(eq(accounts.id, row.transferAccountId)).get()?.c ?? row.currency)
    : row.currency;
  return {
    kind: row.kind,
    accountId: row.accountId,
    amount: String(minorToMajor(row.amountMinor, row.currency)),
    date: toDateInputValue(row.occurredAt, tz),
    time: toTimeInputValue(row.occurredAt, tz),
    categoryId: row.categoryId,
    projectId: row.projectId,
    clientId: row.clientId,
    counterparty: row.counterparty,
    description: row.description,
    status: row.status,
    tags: row.tags,
    transferAccountId: row.transferAccountId,
    transferAmount:
      row.transferAmountMinor != null ? String(minorToMajor(row.transferAmountMinor, transferCurrency)) : undefined,
  };
}

export function updateTransaction(actor: Actor, { id, ...patch }: z.output<typeof updateTransactionInput>) {
  assertAdmin(actor);
  const row = db.select().from(transactions).where(eq(transactions.id, id)).get();
  if (!row) throw notFound("Transaction");
  const merged = { ...toInput(row), ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) };
  // When the account changes, amounts must be re-read in the new currency (already major units).
  const values = buildTx(merged as z.output<typeof transactionInput>, {
    requireActiveAccount: false,
    fallbackDate: row.occurredAt,
  });
  if (row.invoiceId) {
    if (values.kind !== "income") throw new FinanceError("linkedToInvoice", "kind");
    const inv = db.select({ currency: invoices.currency }).from(invoices).where(eq(invoices.id, row.invoiceId)).get();
    if (inv && values.currency !== inv.currency) throw new FinanceError("invoiceCurrencyMismatch", "accountId");
  }
  const updated = db.transaction((tx) => {
    const u = tx.update(transactions).set(values).where(eq(transactions.id, id)).returning().get();
    if (row.invoiceId) applyInvoicePaymentDelta(tx, row.invoiceId, u.amountMinor - row.amountMinor);
    return u;
  });
  logActivity(actor, "transaction.update", "transaction", id);
  return updated;
}

export function deleteTransaction(actor: Actor, id: string) {
  assertAdmin(actor);
  const row = db.select().from(transactions).where(eq(transactions.id, id)).get();
  if (!row) throw notFound("Transaction");
  db.transaction((tx) => {
    tx.delete(transactions).where(eq(transactions.id, id)).run();
    if (row.invoiceId && row.kind === "income") applyInvoicePaymentDelta(tx, row.invoiceId, -row.amountMinor);
  });
  logActivity(actor, "transaction.delete", "transaction", id, `${row.kind} ${row.amountMinor} ${row.currency}`);
}

// ─── CSV export / import ────────────────────────────────────────────────────

/** All transactions matching the filter as CSV (major units; Gregorian + Jalali dates). */
export function exportTransactionsCsv(actor: Actor, input: ListTransactionsInput, locale: Locale) {
  assertAdmin(actor);
  const tz = appTimezone();
  const t = messages[locale].finance;
  const rows = selectTx()
    .where(txWhere(input))
    .orderBy(asc(transactions.occurredAt), asc(transactions.createdAt))
    .all()
    .map(shapeTx);
  const jalali = (d: Date) => {
    const p = dateParts(d, { locale: "fa", timeZone: tz, calendar: "persian" });
    return `${p.year}/${String(p.month).padStart(2, "0")}/${String(p.day).padStart(2, "0")}`;
  };
  const header = [
    "date",
    "time",
    "date_jalali",
    "kind",
    "amount",
    "currency",
    "account",
    "to_account",
    "to_amount",
    "to_currency",
    "category",
    "project",
    "client",
    "counterparty",
    "description",
    "status",
    "tags",
    "invoice",
  ];
  const body = rows.map((r) => [
    toDateInputValue(r.occurredAt, tz),
    toTimeInputValue(r.occurredAt, tz),
    jalali(r.occurredAt),
    r.kind,
    minorToMajor(r.amountMinor, r.currency),
    r.currency,
    r.account.name,
    r.toAccount?.name ?? "",
    r.toAccount && r.transferAmountMinor != null ? minorToMajor(r.transferAmountMinor, r.toAccount.currency) : "",
    r.toAccount?.currency ?? "",
    r.category?.name ?? "",
    r.project?.name ?? "",
    r.client?.name ?? "",
    r.counterparty ?? "",
    r.description ?? (r.invoice ? `${t.paymentFor} ${r.invoice.number}` : ""),
    r.status,
    r.tags.join(", "),
    r.invoice?.number ?? "",
  ]);
  return toCsv([header, ...body]);
}

function importContext() {
  return {
    tz: appTimezone(),
    accounts: db
      .select({ id: accounts.id, name: accounts.name, currency: accounts.currency, archived: accounts.archived })
      .from(accounts)
      .all(),
    categories: db.select({ id: categories.id, name: categories.name, kind: categories.kind }).from(categories).all(),
  };
}

/** Parse + validate a CSV without writing anything (for the preview table). */
export function previewImport(actor: Actor, csv: string) {
  assertAdmin(actor);
  const { rows, missingColumns } = mapImportRows(parseCsv(csv), importContext());
  return {
    missingColumns,
    total: rows.length,
    valid: rows.filter((r) => r.data).length,
    rows: rows.slice(0, 500).map((r) => ({
      line: r.line,
      ok: !!r.data,
      errors: r.errors,
      warnings: r.warnings,
      raw: r.raw,
      kind: r.data?.kind ?? null,
      amountMinor: r.data?.amountMinor ?? null,
      currency: r.data?.currency ?? null,
      occurredAt: r.data?.occurredAt.getTime() ?? null,
    })),
  };
}

/** Insert every valid row of the CSV in one DB transaction. */
export function importTransactions(actor: Actor, csv: string) {
  assertAdmin(actor);
  const { rows } = mapImportRows(parseCsv(csv), importContext());
  const valid = rows.filter((r) => r.data).map((r) => r.data!);
  if (!valid.length) throw new FinanceError("importNothing");
  db.transaction((tx) => {
    for (let i = 0; i < valid.length; i += 200) {
      tx.insert(transactions)
        .values(valid.slice(i, i + 200).map((v) => ({ ...v, tags: ["import"], createdBy: actor.user.id })))
        .run();
    }
  });
  logActivity(actor, "transaction.import", "transaction", null, `${valid.length} rows`);
  return { imported: valid.length, skipped: rows.length - valid.length };
}
