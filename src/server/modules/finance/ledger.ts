import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, isNull, ne, notInArray, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { accounts, clients, invoices, projects, transactions } from "@/server/db/schema";
import { assertAdmin, isAdmin, type Actor } from "@/server/auth/actor";
import { forbidden, notFound } from "@/server/errors";
import { assertCanSeeProjectFinance } from "@/server/modules/projects/service";
import { runningLedger, sumByCurrency, type CurrencyAmount, type LedgerEvent } from "./calc";
import { balanceDue, openInvoiceStatuses } from "./invoice-calc";
import { projectStats } from "./reports";

/**
 * Ledgers («حساب طرف‌حساب»): money and invoices exchanged with a counterparty,
 * with a running balance per currency.
 *
 *   debit  (+) = invoice issued to them · money we paid them (expense)
 *   credit (−) = money received from them (income)
 *   balance > 0 → they owe us (receivable) · < 0 → we owe them (prepayment / payable)
 */

export interface LedgerLine extends LedgerEvent {
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
  transactionId: string | null;
  description: string | null;
  accountName: string | null;
  projectName: string | null;
}

interface PartyTotals {
  currency: string;
  invoiced: number;
  received: number;
  paid: number;
  outstanding: number;
  balance: number;
}

function totalsFrom(rows: { currency: string; field: keyof Omit<PartyTotals, "currency" | "balance">; minor: number }[]) {
  const map = new Map<string, PartyTotals>();
  for (const r of rows) {
    const t = map.get(r.currency) ?? { currency: r.currency, invoiced: 0, received: 0, paid: 0, outstanding: 0, balance: 0 };
    t[r.field] += r.minor;
    map.set(r.currency, t);
  }
  return [...map.values()]
    .map((t) => ({ ...t, balance: t.invoiced + t.paid - t.received }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

const issued = notInArray(invoices.status, ["draft", "void"]);

/** Every counterparty (saved clients + free-text names) with per-currency totals and balance. */
export function listCounterparties(actor: Actor) {
  assertAdmin(actor);
  const inv = db
    .select({
      clientId: invoices.clientId,
      status: invoices.status,
      currency: invoices.currency,
      totalMinor: invoices.totalMinor,
      paidMinor: invoices.paidMinor,
    })
    .from(invoices)
    .where(and(issued, isNotNull(invoices.clientId)))
    .all();
  const tx = db
    .select({
      clientId: transactions.clientId,
      kind: transactions.kind,
      currency: transactions.currency,
      minor: sql<number>`sum(${transactions.amountMinor})`,
      last: sql<number>`max(${transactions.occurredAt})`,
    })
    .from(transactions)
    .where(and(ne(transactions.kind, "transfer"), isNotNull(transactions.clientId)))
    .groupBy(transactions.clientId, transactions.kind, transactions.currency)
    .all();
  const party = db
    .select({
      key: sql<string>`lower(trim(${transactions.counterparty}))`,
      name: sql<string>`min(trim(${transactions.counterparty}))`,
      kind: transactions.kind,
      currency: transactions.currency,
      minor: sql<number>`sum(${transactions.amountMinor})`,
      last: sql<number>`max(${transactions.occurredAt})`,
    })
    .from(transactions)
    .where(
      and(
        ne(transactions.kind, "transfer"),
        isNull(transactions.clientId),
        isNotNull(transactions.counterparty),
        sql`trim(${transactions.counterparty}) <> ''`,
      ),
    )
    .groupBy(sql`lower(trim(${transactions.counterparty}))`, transactions.kind, transactions.currency)
    .all();

  const clientIds = [...new Set([...inv.map((i) => i.clientId!), ...tx.map((t) => t.clientId!)])];
  const clientRows = clientIds.length
    ? db
        .select({ id: clients.id, name: clients.name, color: clients.color, kind: clients.kind })
        .from(clients)
        .where(inArray(clients.id, clientIds))
        .all()
    : [];

  const out = clientRows.map((c) => {
    const ci = inv.filter((i) => i.clientId === c.id);
    const ct = tx.filter((t) => t.clientId === c.id);
    return {
      type: "client" as const,
      id: c.id,
      name: c.name,
      color: c.color,
      clientKind: c.kind,
      lastActivity: Math.max(0, ...ct.map((t) => Number(t.last) || 0)),
      currencies: totalsFrom([
        ...ci.map((i) => ({ currency: i.currency, field: "invoiced" as const, minor: i.totalMinor })),
        ...ci
          .filter((i) => (openInvoiceStatuses as readonly string[]).includes(i.status))
          .map((i) => ({ currency: i.currency, field: "outstanding" as const, minor: balanceDue(i) })),
        ...ct.map((t) => ({
          currency: t.currency,
          field: t.kind === "income" ? ("received" as const) : ("paid" as const),
          minor: t.minor,
        })),
      ]),
    };
  });
  const parties = new Map<string, { name: string; rows: typeof party }>();
  for (const p of party) {
    const e = parties.get(p.key) ?? { name: p.name, rows: [] };
    e.rows.push(p);
    parties.set(p.key, e);
  }
  const partyOut = [...parties.values()].map((p) => ({
    type: "party" as const,
    id: null,
    name: p.name,
    color: null,
    clientKind: null,
    lastActivity: Math.max(0, ...p.rows.map((r) => Number(r.last) || 0)),
    currencies: totalsFrom(
      p.rows.map((r) => ({
        currency: r.currency,
        field: r.kind === "income" ? ("received" as const) : ("paid" as const),
        minor: r.minor,
      })),
    ),
  }));
  return [...out, ...partyOut].sort((a, b) => b.lastActivity - a.lastActivity || a.name.localeCompare(b.name));
}

function txEvents(where: ReturnType<typeof and>, mode: "party" | "project"): LedgerLine[] {
  return db
    .select({
      id: transactions.id,
      kind: transactions.kind,
      amountMinor: transactions.amountMinor,
      currency: transactions.currency,
      occurredAt: transactions.occurredAt,
      description: transactions.description,
      invoiceId: transactions.invoiceId,
      invoiceNumber: invoices.number,
      accountName: accounts.name,
      projectName: projects.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(invoices, eq(invoices.id, transactions.invoiceId))
    .leftJoin(projects, eq(projects.id, transactions.projectId))
    .where(and(where, ne(transactions.kind, "transfer")))
    .all()
    .map((t) => {
      const income = t.kind === "income";
      // Party: income = credit (they paid us). Project: income = + net cash.
      const plus = mode === "project" ? income : !income;
      return {
        id: t.id,
        at: t.occurredAt.getTime(),
        currency: t.currency,
        type: income ? ("received" as const) : ("paid" as const),
        debit: plus ? t.amountMinor : 0,
        credit: plus ? 0 : t.amountMinor,
        invoiceId: t.invoiceId,
        invoiceNumber: t.invoiceNumber,
        invoiceStatus: null,
        transactionId: t.id,
        description: t.description,
        accountName: t.accountName,
        projectName: t.projectName,
      };
    });
}

function invoiceEvents(where: ReturnType<typeof and>): LedgerLine[] {
  return db
    .select({
      id: invoices.id,
      number: invoices.number,
      status: invoices.status,
      currency: invoices.currency,
      totalMinor: invoices.totalMinor,
      issueDate: invoices.issueDate,
      projectName: projects.name,
    })
    .from(invoices)
    .leftJoin(projects, eq(projects.id, invoices.projectId))
    .where(and(where, issued))
    .all()
    .map((i) => ({
      id: `inv:${i.id}`,
      at: i.issueDate.getTime(),
      currency: i.currency,
      type: "invoice" as const,
      debit: i.totalMinor,
      credit: 0,
      invoiceId: i.id,
      invoiceNumber: i.number,
      invoiceStatus: i.status,
      transactionId: null,
      description: null,
      accountName: null,
      projectName: i.projectName,
    }));
}

function invoicesOf(where: ReturnType<typeof and>) {
  return db
    .select()
    .from(invoices)
    .where(and(where, ne(invoices.status, "draft")))
    .orderBy(desc(invoices.issueDate))
    .all()
    .map((i) => ({ ...i, dueMinor: i.status === "void" ? 0 : balanceDue(i) }));
}

function summarize(groups: ReturnType<typeof runningLedger<LedgerLine>>, invs: { currency: string; status: string; totalMinor: number; paidMinor: number }[]) {
  const outstanding = sumByCurrency(
    invs
      .filter((i) => (openInvoiceStatuses as readonly string[]).includes(i.status))
      .map((i) => ({ currency: i.currency, minor: balanceDue(i) })),
  );
  return groups.map((g) => ({
    currency: g.currency,
    invoiced: g.lines.filter((l) => l.type === "invoice").reduce((s, l) => s + l.debit, 0),
    received: g.lines.filter((l) => l.type === "received").reduce((s, l) => s + l.credit + l.debit, 0),
    paid: g.lines.filter((l) => l.type === "paid").reduce((s, l) => s + l.debit + l.credit, 0),
    outstanding: outstanding.find((o) => o.currency === g.currency)?.minor ?? 0,
    balance: g.balance,
  }));
}

/** Ledger with a saved client (company/team/person). */
export function getClientLedger(actor: Actor, clientId: string) {
  assertAdmin(actor);
  const client = db.select().from(clients).where(eq(clients.id, clientId)).get();
  if (!client) throw notFound("Client");
  const events = [
    ...invoiceEvents(eq(invoices.clientId, clientId)),
    ...txEvents(eq(transactions.clientId, clientId), "party"),
  ];
  const groups = runningLedger(events);
  const invs = invoicesOf(eq(invoices.clientId, clientId));
  return { client, groups, totals: summarize(groups, invs), invoices: invs };
}

/** Ledger with a free-text counterparty (transactions without a saved client). */
export function getPartyLedger(actor: Actor, name: string) {
  assertAdmin(actor);
  const key = name.trim().toLowerCase();
  const events = txEvents(
    and(isNull(transactions.clientId), sql`lower(trim(${transactions.counterparty})) = ${key}`),
    "party",
  );
  const groups = runningLedger(events);
  return { name: name.trim(), groups, totals: summarize(groups, []) };
}

/** Projects with money activity: income/expense/invoiced/outstanding per currency. */
export function listProjectLedgers(actor: Actor) {
  assertAdmin(actor);
  const rows = db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
      status: projects.status,
      currency: projects.currency,
      clientName: clients.name,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .orderBy(asc(projects.name))
    .all();
  const stats = projectStats(rows.map((r) => r.id));
  return rows
    .map((r) => ({ ...r, stats: stats.get(r.id)! }))
    .filter((r) => r.stats && (r.stats.income.length || r.stats.expense.length || r.stats.invoiced.length));
}

/** Project cash ledger: income (+) / expense (−) with running net per currency + invoices. */
export function getProjectLedger(actor: Actor, projectId: string) {
  assertAdmin(actor);
  const project = db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
      currency: projects.currency,
      budgetMinor: projects.budgetMinor,
      clientId: projects.clientId,
      clientName: clients.name,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(eq(projects.id, projectId))
    .get();
  if (!project) throw notFound("Project");
  const groups = runningLedger(txEvents(eq(transactions.projectId, projectId), "project"));
  const invs = invoicesOf(eq(invoices.projectId, projectId));
  const stats = projectStats([projectId]).get(projectId)!;
  return { project, groups, invoices: invs, stats };
}

// ─── Project page panel ─────────────────────────────────────────────────────

/**
 * Finance block for a project page.
 * - admins: income/expenses/budget usage, invoices and recent transactions;
 * - clientView (client users, or admins previewing): only non-draft invoices and
 *   the client's payments, and only when the project shares finance.
 */
export function getProjectFinance(actor: Actor, projectId: string, opts: { clientView?: boolean } = {}) {
  const asClient = opts.clientView || actor.user.role === "client";
  if (asClient) {
    if (actor.user.role === "client") assertCanSeeProjectFinance(actor, projectId);
    else assertAdmin(actor);
    const p = db
      .select({ id: projects.id, clientId: projects.clientId, shareFinance: projects.shareFinance, currency: projects.currency })
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();
    if (!p) throw notFound("Project");
    if (!p.shareFinance) return { mode: "client" as const, visible: false as const };
    const clientId = actor.user.role === "client" ? actor.user.clientId : p.clientId;
    const invs = invoicesOf(
      and(eq(invoices.projectId, projectId), clientId ? eq(invoices.clientId, clientId) : sql`0`),
    ).filter((i) => i.status !== "void");
    const payments = clientId
      ? db
          .select({
            id: transactions.id,
            amountMinor: transactions.amountMinor,
            currency: transactions.currency,
            occurredAt: transactions.occurredAt,
            invoiceNumber: invoices.number,
          })
          .from(transactions)
          .leftJoin(invoices, eq(invoices.id, transactions.invoiceId))
          .where(
            and(
              eq(transactions.projectId, projectId),
              eq(transactions.clientId, clientId),
              eq(transactions.kind, "income"),
            ),
          )
          .orderBy(desc(transactions.occurredAt))
          .all()
      : [];
    const sumOf = (rows: CurrencyAmount[]) => sumByCurrency(rows);
    return {
      mode: "client" as const,
      visible: true as const,
      invoices: invs,
      payments,
      totals: {
        invoiced: sumOf(invs.map((i) => ({ currency: i.currency, minor: i.totalMinor }))),
        paid: sumOf(payments.map((p) => ({ currency: p.currency, minor: p.amountMinor }))),
        outstanding: sumOf(
          invs
            .filter((i) => (openInvoiceStatuses as readonly string[]).includes(i.status))
            .map((i) => ({ currency: i.currency, minor: i.dueMinor })),
        ),
      },
    };
  }
  if (!isAdmin(actor)) throw forbidden();
  const p = db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
  if (!p) throw notFound("Project");
  const stats = projectStats([projectId]).get(projectId)!;
  const invs = db
    .select()
    .from(invoices)
    .where(eq(invoices.projectId, projectId))
    .orderBy(desc(invoices.issueDate))
    .all()
    .map((i) => ({ ...i, dueMinor: i.status === "void" ? 0 : balanceDue(i) }));
  const recent = db
    .select({
      id: transactions.id,
      kind: transactions.kind,
      amountMinor: transactions.amountMinor,
      currency: transactions.currency,
      occurredAt: transactions.occurredAt,
      description: transactions.description,
      counterparty: transactions.counterparty,
      invoiceNumber: invoices.number,
      clientName: clients.name,
    })
    .from(transactions)
    .leftJoin(invoices, eq(invoices.id, transactions.invoiceId))
    .leftJoin(clients, eq(clients.id, transactions.clientId))
    .where(and(eq(transactions.projectId, projectId), ne(transactions.kind, "transfer")))
    .orderBy(desc(transactions.occurredAt))
    .limit(8)
    .all();
  return { mode: "admin" as const, visible: true as const, stats, invoices: invs, recent };
}
