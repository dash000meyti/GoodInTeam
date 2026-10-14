import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  ne,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/server/db/client";
import {
  accounts,
  clients,
  invoiceItems,
  invoices,
  projects,
  tasks,
  timeEntries,
  transactions,
  users,
  type InvoiceStatus,
} from "@/server/db/schema";
import { assertAdmin, isAdmin, type Actor } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { notFound } from "@/server/errors";
import { messages } from "@/i18n/messages";
import { format } from "@/i18n/format-message";
import { newToken } from "@/lib/ids";
import { isCurrency } from "@/lib/money";
import { addDays, calendarFor, startOfMonth, zonedParts } from "@/lib/tz";
import { notify } from "@/server/modules/notifications/service";
import { appTimezone, getSettings } from "@/server/modules/settings/service";
import { decimalsOf, sumByCurrency, type CurrencyAmount } from "./calc";
import { FinanceError } from "./errors";
import {
  balanceDue,
  deriveInvoiceStatus,
  formatInvoiceNumber,
  groupTimeEntries,
  invoiceTotals,
  nextInvoiceSeq,
  openInvoiceStatuses,
  percentToBps,
} from "./invoice-calc";
import {
  installCalendar,
  parseAmount,
  parseDay,
  parseMovementDate,
  parseOptDay,
  todayStart,
} from "./internal";
import type {
  invoiceFromTimeInput,
  invoiceInput,
  listInvoicesInput,
  recordPaymentInput,
  unbilledTimeInput,
  updateInvoiceInput,
} from "./schemas";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ─── Access ─────────────────────────────────────────────────────────────────

/**
 * Invoices an actor may read. owner/admin: all. client: their client's
 * non-draft invoices that are not tied to a project, or whose project is in
 * the portal with `shareFinance` on. Others: none.
 */
export function invoiceAccessWhere(actor: Actor): SQL | undefined {
  if (isAdmin(actor)) return undefined;
  const clientId = actor.user.role === "client" ? actor.user.clientId : null;
  if (!clientId) return sql`0`;
  return and(
    eq(invoices.clientId, clientId),
    ne(invoices.status, "draft"),
    or(
      isNull(invoices.projectId),
      inArray(
        invoices.projectId,
        db
          .select({ id: projects.id })
          .from(projects)
          .where(
            and(
              eq(projects.clientId, clientId),
              eq(projects.portalEnabled, true),
              eq(projects.shareFinance, true),
            ),
          ),
      ),
    ),
  );
}

// ─── Lifecycle helpers ──────────────────────────────────────────────────────

/**
 * Overdue job: sent/viewed/partial invoices whose due day is before today
 * (app timezone) become `overdue`. Idempotent; returns the number changed.
 * Called lazily when listing invoices and by the background scheduler.
 */
export function markOverdueInvoices(now: Date | number = Date.now()) {
  const today = new Date(todayStart(new Date(now).getTime()));
  const res = db
    .update(invoices)
    .set({ status: "overdue" })
    .where(
      and(
        inArray(invoices.status, ["sent", "viewed", "partial"]),
        isNotNull(invoices.dueDate),
        lt(invoices.dueDate, today),
      ),
    )
    .run();
  return res.changes;
}

function refreshStatus(tx: Tx | typeof db, id: string) {
  const inv = tx.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!inv) return;
  const status = deriveInvoiceStatus(inv, todayStart());
  const paidAt = status === "paid" ? (inv.paidAt ?? new Date()) : null;
  if (status !== inv.status || paidAt?.getTime() !== inv.paidAt?.getTime()) {
    tx.update(invoices).set({ status, paidAt }).where(eq(invoices.id, id)).run();
  }
}

/**
 * Keep `paidMinor` in sync when a payment transaction linked to an invoice is
 * edited or deleted (delta in the invoice currency; negative = less paid).
 */
export function applyInvoicePaymentDelta(tx: Tx | typeof db, invoiceId: string, delta: number) {
  if (!delta) return;
  const inv = tx.select().from(invoices).where(eq(invoices.id, invoiceId)).get();
  if (!inv) return;
  tx.update(invoices)
    .set({ paidMinor: Math.max(0, inv.paidMinor + delta) })
    .where(eq(invoices.id, invoiceId))
    .run();
  refreshStatus(tx, invoiceId);
}

/** Next number `${prefix}${year}-NNN`; year in the install calendar (Jalali for fa). */
export function nextInvoiceNumber(issueDate: Date | number = Date.now()) {
  const prefix = getSettings("business").invoicePrefix;
  const year = zonedParts(issueDate, appTimezone(), installCalendar()).year;
  const head = `${prefix}${year}-`;
  const existing = db
    .select({ number: invoices.number })
    .from(invoices)
    .where(sql`substr(${invoices.number}, 1, ${head.length}) = ${head}`)
    .all()
    .map((r) => r.number);
  return formatInvoiceNumber(prefix, year, nextInvoiceSeq(existing, prefix, year));
}

function assertNumberFree(number: string, exceptId?: string) {
  const hit = db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.number, number), exceptId ? ne(invoices.id, exceptId) : undefined))
    .get();
  if (hit) throw new FinanceError("invoiceNumberTaken", "number");
}

// ─── Queries ────────────────────────────────────────────────────────────────

export function listInvoices(actor: Actor, input: z.output<typeof listInvoicesInput> = {}) {
  markOverdueInvoices();
  const statusWhere =
    input.status === "open"
      ? inArray(invoices.status, [...openInvoiceStatuses])
      : input.status === "sent"
        ? inArray(invoices.status, ["sent", "viewed"])
        : input.status
          ? eq(invoices.status, input.status)
          : undefined;
  const rows = db
    .select({
      invoice: invoices,
      clientName: clients.name,
      clientColor: clients.color,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(invoices)
    .leftJoin(clients, eq(clients.id, invoices.clientId))
    .leftJoin(projects, eq(projects.id, invoices.projectId))
    .where(
      and(
        invoiceAccessWhere(actor),
        statusWhere,
        input.clientId ? eq(invoices.clientId, input.clientId) : undefined,
        input.projectId ? eq(invoices.projectId, input.projectId) : undefined,
        input.q
          ? or(like(invoices.number, `%${input.q}%`), like(clients.name, `%${input.q}%`))
          : undefined,
      ),
    )
    .orderBy(desc(invoices.issueDate), desc(invoices.number))
    .all();
  return rows.map((r) => ({
    ...r.invoice,
    client: r.clientName ? { name: r.clientName, color: r.clientColor } : null,
    project: r.projectName ? { name: r.projectName, color: r.projectColor } : null,
    dueMinor: r.invoice.status === "void" ? 0 : balanceDue(r.invoice),
  }));
}

/** Counts per status tab (respecting access). */
export function invoiceStatusCounts(actor: Actor) {
  const rows = db
    .select({ status: invoices.status, n: count() })
    .from(invoices)
    .where(invoiceAccessWhere(actor))
    .groupBy(invoices.status)
    .all();
  const map = Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<
    Record<InvoiceStatus, number>
  >;
  const total = rows.reduce((s, r) => s + r.n, 0);
  return { ...map, all: total };
}

/** KPIs for the invoices page: outstanding & overdue per currency, paid this month, drafts. */
export function invoiceKpis(actor: Actor, opts: { now: number; locale: "fa" | "en" }) {
  const access = invoiceAccessWhere(actor);
  const open = db
    .select({ status: invoices.status, currency: invoices.currency, total: invoices.totalMinor, paid: invoices.paidMinor })
    .from(invoices)
    .where(and(access, inArray(invoices.status, [...openInvoiceStatuses])))
    .all();
  const outstanding = sumByCurrency(open.map((r) => ({ currency: r.currency, minor: balanceDue({ totalMinor: r.total, paidMinor: r.paid }) })));
  const overdueRows = open.filter((r) => r.status === "overdue");
  const overdue = sumByCurrency(overdueRows.map((r) => ({ currency: r.currency, minor: balanceDue({ totalMinor: r.total, paidMinor: r.paid }) })));
  const monthStart = startOfMonth(opts.now, appTimezone(), calendarFor(opts.locale));
  const paidThisMonth: CurrencyAmount[] = db
    .select({ currency: transactions.currency, minor: sql<number>`sum(${transactions.amountMinor})` })
    .from(transactions)
    .innerJoin(invoices, eq(invoices.id, transactions.invoiceId))
    .where(and(access, eq(transactions.kind, "income"), gte(transactions.occurredAt, monthStart)))
    .groupBy(transactions.currency)
    .all();
  const drafts = isAdmin(actor)
    ? (db.select({ n: count() }).from(invoices).where(eq(invoices.status, "draft")).get()?.n ?? 0)
    : 0;
  return { outstanding, openCount: open.length, overdue, overdueCount: overdueRows.length, paidThisMonth, drafts };
}

export async function getInvoice(actor: Actor, id: string) {
  const inv = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, id), invoiceAccessWhere(actor)),
    with: {
      client: true,
      project: { columns: { id: true, name: true, color: true, currency: true, hourlyRateMinor: true } },
      items: { orderBy: (it, { asc }) => [asc(it.sort)] },
    },
  });
  if (!inv) throw notFound("Invoice");
  const payments = db
    .select({
      id: transactions.id,
      amountMinor: transactions.amountMinor,
      currency: transactions.currency,
      occurredAt: transactions.occurredAt,
      description: transactions.description,
      status: transactions.status,
      accountName: accounts.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(and(eq(transactions.invoiceId, id), eq(transactions.kind, "income")))
    .orderBy(asc(transactions.occurredAt))
    .all();
  const createdBy = inv.createdBy
    ? db.select({ name: users.name }).from(users).where(eq(users.id, inv.createdBy)).get()
    : null;
  return { ...inv, payments, dueMinor: inv.status === "void" ? 0 : balanceDue(inv), createdByName: createdBy?.name ?? null };
}

/** Public, token-gated invoice (no auth). Drafts are never public. */
export async function getPublicInvoice(token: string) {
  if (!token || token.length < 16) return null;
  const inv = await db.query.invoices.findFirst({
    where: and(eq(invoices.shareToken, token), ne(invoices.status, "draft")),
    with: {
      client: true,
      project: { columns: { name: true } },
      items: { orderBy: (it, { asc }) => [asc(it.sort)] },
    },
  });
  if (!inv) return null;
  return { ...inv, dueMinor: inv.status === "void" ? 0 : balanceDue(inv) };
}

// ─── Mutations ──────────────────────────────────────────────────────────────

type ItemInput = z.output<typeof invoiceInput>["items"][number];

function buildItems(items: ItemInput[], currency: string) {
  return items.map((it, i) => {
    const unitPriceMinor = parseAmount(it.unitPrice, currency, {
      field: `items.${i}.unitPrice`,
      allowZero: true,
      allowNegative: true,
    });
    return {
      description: it.description,
      quantity: it.quantity,
      unitPriceMinor,
      amountMinor: Math.round(it.quantity * unitPriceMinor),
      sort: i + 1,
      timeEntryIds: it.timeEntryIds ?? [],
    };
  });
}

/** Link time entries to the invoice; release the ones no longer referenced. */
function syncTimeEntries(tx: Tx, invoiceId: string, ids: string[], release: boolean) {
  tx.update(timeEntries)
    .set({ invoiceId: null })
    .where(
      and(
        eq(timeEntries.invoiceId, invoiceId),
        ids.length && !release ? notInArray(timeEntries.id, ids) : undefined,
      ),
    )
    .run();
  if (release || !ids.length) return;
  const taken = tx
    .select({ id: timeEntries.id })
    .from(timeEntries)
    .where(
      and(
        inArray(timeEntries.id, ids),
        isNotNull(timeEntries.invoiceId),
        ne(timeEntries.invoiceId, invoiceId),
      ),
    )
    .get();
  if (taken) throw new FinanceError("timeAlreadyBilled");
  tx.update(timeEntries).set({ invoiceId }).where(inArray(timeEntries.id, ids)).run();
}

function resolveParties(clientId: string | null | undefined, projectId: string | null | undefined) {
  let client = clientId ?? null;
  if (projectId) {
    const p = db
      .select({ clientId: projects.clientId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();
    if (!p) throw notFound("Project");
    if (!client) client = p.clientId;
  }
  if (client && !db.select({ id: clients.id }).from(clients).where(eq(clients.id, client)).get()) {
    throw notFound("Client");
  }
  return { clientId: client, projectId: projectId ?? null };
}

export function createInvoice(actor: Actor, input: z.output<typeof invoiceInput>) {
  assertAdmin(actor);
  const business = getSettings("business");
  const currency = isCurrency(input.currency) ? input.currency : "IRT";
  const parties = resolveParties(input.clientId, input.projectId);
  const issueDate = input.issueDate ? parseDay(input.issueDate, undefined, "issueDate") : new Date(todayStart());
  const dueDate = parseOptDay(input.dueDate, undefined, "dueDate");
  const items = buildItems(input.items, currency);
  const discountMinor = input.discount
    ? parseAmount(input.discount, currency, { field: "discount", allowZero: true })
    : 0;
  const taxBps = input.taxPercent != null ? percentToBps(input.taxPercent) : business.defaultTaxBps;
  const totals = invoiceTotals({ items, discountMinor, taxBps });
  if (input.number) assertNumberFree(input.number);

  const row = db.transaction((tx) => {
    let created: typeof invoices.$inferSelect | undefined;
    for (let attempt = 0; !created; attempt++) {
      const number = input.number ?? nextInvoiceNumber(issueDate);
      try {
        created = tx
          .insert(invoices)
          .values({
            number,
            ...parties,
            status: "draft",
            issueDate,
            dueDate,
            currency,
            subtotalMinor: totals.subtotal,
            discountMinor: totals.discount,
            taxBps: totals.taxBps,
            totalMinor: totals.total,
            notes: input.notes ?? null,
            terms: input.terms ?? null,
            createdBy: actor.user.id,
          })
          .returning()
          .get();
      } catch (err) {
        if (attempt >= 4 || input.number || !String(err).includes("UNIQUE")) throw err;
      }
    }
    if (items.length) {
      tx.insert(invoiceItems)
        .values(items.map((it) => ({ ...it, invoiceId: created!.id })))
        .run();
    }
    syncTimeEntries(tx, created.id, items.flatMap((i) => i.timeEntryIds), false);
    return created;
  });
  logActivity(actor, "invoice.create", "invoice", row.id, row.number);
  if (input.send) return sendInvoice(actor, row.id).invoice;
  return row;
}

export function updateInvoice(actor: Actor, input: z.output<typeof updateInvoiceInput>) {
  assertAdmin(actor);
  const inv = db.select().from(invoices).where(eq(invoices.id, input.id)).get();
  if (!inv) throw notFound("Invoice");
  if (inv.status === "void" || inv.status === "paid") throw new FinanceError("invoiceNotEditable");
  const currency = input.currency && isCurrency(input.currency) ? input.currency : inv.currency;
  if (currency !== inv.currency && inv.paidMinor > 0) throw new FinanceError("invoiceNotEditable");
  const parties =
    input.clientId !== undefined || input.projectId !== undefined
      ? resolveParties(
          input.clientId !== undefined ? input.clientId : inv.clientId,
          input.projectId !== undefined ? input.projectId : inv.projectId,
        )
      : { clientId: inv.clientId, projectId: inv.projectId };
  if (input.number && input.number !== inv.number) assertNumberFree(input.number, inv.id);

  const existingItems = db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, inv.id)).all();
  const items = input.items ? buildItems(input.items, currency) : null;
  const lines = items ?? existingItems;
  const discountMinor =
    input.discount !== undefined
      ? input.discount
        ? parseAmount(input.discount, currency, { field: "discount", allowZero: true })
        : 0
      : inv.discountMinor;
  const taxBps = input.taxPercent !== undefined && input.taxPercent !== null ? percentToBps(input.taxPercent) : inv.taxBps;
  const totals = invoiceTotals({ items: lines, discountMinor, taxBps });

  db.transaction((tx) => {
    tx.update(invoices)
      .set({
        ...parties,
        number: input.number || inv.number,
        currency,
        issueDate: input.issueDate ? parseDay(input.issueDate, undefined, "issueDate") : inv.issueDate,
        dueDate: input.dueDate !== undefined ? parseOptDay(input.dueDate, undefined, "dueDate") : inv.dueDate,
        subtotalMinor: totals.subtotal,
        discountMinor: totals.discount,
        taxBps: totals.taxBps,
        totalMinor: totals.total,
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.terms !== undefined && { terms: input.terms }),
      })
      .where(eq(invoices.id, inv.id))
      .run();
    if (items) {
      tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, inv.id)).run();
      if (items.length) {
        tx.insert(invoiceItems)
          .values(items.map((it) => ({ ...it, invoiceId: inv.id })))
          .run();
      }
      syncTimeEntries(tx, inv.id, items.flatMap((i) => i.timeEntryIds), false);
    }
    refreshStatus(tx, inv.id);
  });
  logActivity(actor, "invoice.update", "invoice", inv.id, inv.number);
  if (input.send) return sendInvoice(actor, inv.id).invoice;
  return db.select().from(invoices).where(eq(invoices.id, inv.id)).get()!;
}

/** Mark as sent: creates the public share token (if missing) and sentAt. */
export function sendInvoice(actor: Actor, id: string) {
  assertAdmin(actor);
  const inv = db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!inv) throw notFound("Invoice");
  if (inv.status === "void") throw new FinanceError("invoiceNotEditable");
  const itemCount = db.select({ n: count() }).from(invoiceItems).where(eq(invoiceItems.invoiceId, id)).get()?.n ?? 0;
  if (!itemCount || inv.totalMinor <= 0) throw new FinanceError("invoiceEmpty");
  const token = inv.shareToken ?? newToken(18);
  db.transaction((tx) => {
    tx.update(invoices)
      .set({
        shareToken: token,
        sentAt: inv.sentAt ?? new Date(),
        status: inv.status === "draft" ? "sent" : inv.status,
      })
      .where(eq(invoices.id, id))
      .run();
    refreshStatus(tx, id);
  });
  logActivity(actor, "invoice.send", "invoice", id, inv.number);
  const invoice = db.select().from(invoices).where(eq(invoices.id, id)).get()!;
  return { invoice, token, path: `/i/${token}` };
}

export function recordPayment(actor: Actor, input: z.output<typeof recordPaymentInput>) {
  assertAdmin(actor);
  const inv = db.select().from(invoices).where(eq(invoices.id, input.invoiceId)).get();
  if (!inv) throw notFound("Invoice");
  if (inv.status === "void" || inv.status === "paid") throw new FinanceError("invoiceNotPayable");
  const account = db.select().from(accounts).where(eq(accounts.id, input.accountId)).get();
  if (!account) throw new FinanceError("accountNotFound", "accountId");
  if (account.archived) throw new FinanceError("accountArchived", "accountId");
  if (account.currency !== inv.currency) throw new FinanceError("invoiceCurrencyMismatch", "accountId");
  const amountMinor = parseAmount(input.amount, inv.currency);
  if (amountMinor > balanceDue(inv)) throw new FinanceError("amountExceedsDue", "amount");
  const occurredAt = parseMovementDate(input.date, input.time);

  const txRow = db.transaction((tx) => {
    const row = tx
      .insert(transactions)
      .values({
        kind: "income",
        accountId: account.id,
        amountMinor,
        currency: inv.currency,
        occurredAt,
        projectId: inv.projectId,
        clientId: inv.clientId,
        invoiceId: inv.id,
        description: input.description ?? null,
        status: "cleared",
        createdBy: actor.user.id,
      })
      .returning()
      .get();
    tx.update(invoices)
      .set({
        paidMinor: inv.paidMinor + amountMinor,
        sentAt: inv.sentAt ?? new Date(),
        status: inv.status === "draft" ? "sent" : inv.status,
      })
      .where(eq(invoices.id, inv.id))
      .run();
    refreshStatus(tx, inv.id);
    // A paid invoice's paidAt is the payment date, not "now".
    const after = tx.select().from(invoices).where(eq(invoices.id, inv.id)).get()!;
    if (after.status === "paid") {
      tx.update(invoices).set({ paidAt: occurredAt }).where(eq(invoices.id, inv.id)).run();
    }
    return row;
  });
  logActivity(actor, "invoice.payment", "invoice", inv.id, inv.number, { amountMinor, accountId: account.id });
  return { transaction: txRow, invoice: db.select().from(invoices).where(eq(invoices.id, inv.id)).get()! };
}

/** Void: keeps the number and any payments; releases billed time entries. */
export function voidInvoice(actor: Actor, id: string) {
  assertAdmin(actor);
  const inv = db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!inv) throw notFound("Invoice");
  db.transaction((tx) => {
    tx.update(invoices).set({ status: "void" }).where(eq(invoices.id, id)).run();
    syncTimeEntries(tx, id, [], true);
  });
  logActivity(actor, "invoice.void", "invoice", id, inv.number);
}

export function deleteInvoice(actor: Actor, id: string) {
  assertAdmin(actor);
  const inv = db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!inv) throw notFound("Invoice");
  if (inv.status !== "draft") throw new FinanceError("onlyDraftDelete");
  db.transaction((tx) => {
    syncTimeEntries(tx, id, [], true);
    tx.delete(invoices).where(eq(invoices.id, id)).run();
  });
  logActivity(actor, "invoice.delete", "invoice", id, inv.number);
}

/** Copy as a new draft dated today (same due-date term), without billed time links. */
export function duplicateInvoice(actor: Actor, id: string) {
  assertAdmin(actor);
  const inv = db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!inv) throw notFound("Invoice");
  const items = db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id)).orderBy(asc(invoiceItems.sort)).all();
  const issueDate = new Date(todayStart());
  const termDays = inv.dueDate
    ? Math.max(0, Math.round((inv.dueDate.getTime() - inv.issueDate.getTime()) / 86_400_000))
    : null;
  const row = db.transaction((tx) => {
    const created = tx
      .insert(invoices)
      .values({
        number: nextInvoiceNumber(issueDate),
        clientId: inv.clientId,
        projectId: inv.projectId,
        status: "draft",
        issueDate,
        dueDate: termDays != null ? addDays(issueDate, termDays, appTimezone()) : null,
        currency: inv.currency,
        subtotalMinor: inv.subtotalMinor,
        discountMinor: inv.discountMinor,
        taxBps: inv.taxBps,
        totalMinor: inv.totalMinor,
        notes: inv.notes,
        terms: inv.terms,
        createdBy: actor.user.id,
      })
      .returning()
      .get();
    if (items.length) {
      tx.insert(invoiceItems)
        .values(
          items.map((it) => ({
            invoiceId: created.id,
            description: it.description,
            quantity: it.quantity,
            unitPriceMinor: it.unitPriceMinor,
            amountMinor: it.amountMinor,
            sort: it.sort,
            timeEntryIds: [],
          })),
        )
        .run();
    }
    return created;
  });
  logActivity(actor, "invoice.duplicate", "invoice", row.id, row.number, { from: inv.number });
  return row;
}

// ─── Tracked time ───────────────────────────────────────────────────────────

/** Unbilled, billable, finished time entries of a project grouped into invoice lines. */
export function unbilledTime(actor: Actor, input: z.output<typeof unbilledTimeInput>, locale: "fa" | "en" = "en") {
  assertAdmin(actor);
  const project = db.select().from(projects).where(eq(projects.id, input.projectId)).get();
  if (!project) throw notFound("Project");
  const business = getSettings("business");
  const from = input.from ? parseDay(input.from, undefined, "from") : null;
  const to = input.to ? addDays(parseDay(input.to, undefined, "to"), 1, appTimezone()) : null;
  const rows = db
    .select({
      id: timeEntries.id,
      startedAt: timeEntries.startedAt,
      endedAt: timeEntries.endedAt,
      description: timeEntries.description,
      taskId: timeEntries.taskId,
      taskTitle: tasks.title,
      rateMinor: timeEntries.hourlyRateMinor,
      currency: timeEntries.currency,
    })
    .from(timeEntries)
    .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
    .where(
      and(
        eq(timeEntries.projectId, project.id),
        eq(timeEntries.billable, true),
        isNull(timeEntries.invoiceId),
        isNotNull(timeEntries.endedAt),
        from ? gte(timeEntries.startedAt, from) : undefined,
        to ? lt(timeEntries.startedAt, to) : undefined,
      ),
    )
    .orderBy(asc(timeEntries.startedAt))
    .all();
  const groups = groupTimeEntries(
    rows.map((r) => ({
      id: r.id,
      ms: r.endedAt!.getTime() - r.startedAt.getTime(),
      description: r.description,
      taskId: r.taskId,
      taskTitle: r.taskTitle,
      rateMinor: r.rateMinor ?? project.hourlyRateMinor,
      currency: r.currency,
    })),
    {
      fallbackRateMinor: project.hourlyRateMinor ?? business.defaultHourlyRateMinor,
      fallbackCurrency: project.currency,
      untitled: messages[locale].finance.untitledWork,
    },
  );
  return { project: { id: project.id, name: project.name, currency: project.currency }, groups, entryCount: rows.length };
}

/** Create a draft invoice for a project's unbilled time (optionally sent). */
export function createInvoiceFromTime(actor: Actor, input: z.output<typeof invoiceFromTimeInput>) {
  const { project, groups } = unbilledTime(actor, input);
  const lines = groups.filter((g) => g.currency === project.currency);
  if (!lines.length) throw new FinanceError("noUnbilledTime");
  const decimals = decimalsOf(project.currency);
  return createInvoice(actor, {
    projectId: project.id,
    clientId: undefined,
    currency: project.currency,
    dueDate: input.dueDate,
    taxPercent: input.taxPercent,
    notes: input.notes,
    send: input.send,
    items: lines.map((g) => ({
      description: g.label,
      quantity: g.hours,
      unitPrice: (g.rateMinor / 10 ** decimals).toFixed(decimals),
      timeEntryIds: g.entryIds,
    })),
  });
}

// ─── Public view ────────────────────────────────────────────────────────────

/**
 * First view of a public invoice link: sets viewedAt (+ status viewed if it was
 * sent) and notifies owners/admins in their own language. Idempotent.
 */
export function markInvoiceViewed(token: string) {
  const inv = db.select().from(invoices).where(eq(invoices.shareToken, token)).get();
  if (!inv || inv.viewedAt || inv.status === "draft") return false;
  db.transaction((tx) => {
    tx.update(invoices).set({ viewedAt: new Date() }).where(eq(invoices.id, inv.id)).run();
    refreshStatus(tx, inv.id);
  });
  const clientName = inv.clientId
    ? db.select({ name: clients.name }).from(clients).where(eq(clients.id, inv.clientId)).get()?.name
    : null;
  const admins = db
    .select({ id: users.id, locale: users.locale })
    .from(users)
    .where(and(inArray(users.role, ["owner", "admin"]), eq(users.disabled, false)))
    .all();
  for (const a of admins) {
    const t = messages[a.locale].finance;
    notify(a.id, {
      kind: "invoice.viewed",
      title: format(t.notifyViewedTitle, { number: inv.number }),
      body: clientName ? format(t.notifyViewedBody, { client: clientName }) : undefined,
      href: `/panel/invoices/${inv.id}`,
    });
  }
  logActivity(null, "invoice.viewed", "invoice", inv.id, inv.number);
  return true;
}

// ─── Editor options ─────────────────────────────────────────────────────────

/** Pickers and defaults for the invoice editor. */
export function invoiceFormOptions(actor: Actor) {
  assertAdmin(actor);
  const business = getSettings("business");
  return {
    clients: db
      .select({
        id: clients.id,
        name: clients.name,
        color: clients.color,
        defaultCurrency: clients.defaultCurrency,
      })
      .from(clients)
      .where(isNull(clients.archivedAt))
      .orderBy(asc(clients.name))
      .all(),
    projects: db
      .select({
        id: projects.id,
        name: projects.name,
        color: projects.color,
        clientId: projects.clientId,
        currency: projects.currency,
      })
      .from(projects)
      .where(and(isNull(projects.archivedAt), ne(projects.status, "canceled")))
      .orderBy(asc(projects.name))
      .all(),
    nextNumber: nextInvoiceNumber(),
    defaultTaxPercent: business.defaultTaxBps / 100,
    baseCurrency: isCurrency(business.baseCurrency) ? business.baseCurrency : "IRT",
  };
}
export type InvoiceFormOptions = ReturnType<typeof invoiceFormOptions>;
