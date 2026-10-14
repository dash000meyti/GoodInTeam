import "server-only";
import { and, asc, eq, gte, inArray, isNull, lt, ne, notInArray, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/server/db/client";
import {
  categories,
  clients,
  invoices,
  projects,
  timeEntries,
  transactions,
} from "@/server/db/schema";
import { assertAdmin, type Actor } from "@/server/auth/actor";
import { localeMeta, type Locale } from "@/i18n/config";
import { calendarFor, startOfMonth, startOfNextMonth } from "@/lib/tz";
import { appTimezone } from "@/server/modules/settings/service";
import {
  budgetUsedPercent,
  effectiveHourlyRate,
  lastMonths,
  monthIndexOf,
  monthKeyRange,
  subtractByCurrency,
  sumByCurrency,
  sumConverted,
  type CurrencyAmount,
  type FlowRow,
  type RateTable,
} from "./calc";
import { latestRates } from "./fx";
import { balanceDue, openInvoiceStatuses } from "./invoice-calc";
import { dayRange, installCalendar } from "./internal";
import { listAccounts } from "./service";
import type { summaryInput } from "./schemas";

// ─── Building blocks ────────────────────────────────────────────────────────

/** Income / expense per currency in [start, end). Transfers excluded. */
export function flowsBetween(start: Date | number, end: Date | number) {
  const rows = db
    .select({
      kind: transactions.kind,
      currency: transactions.currency,
      minor: sql<number>`sum(${transactions.amountMinor})`,
    })
    .from(transactions)
    .where(
      and(
        ne(transactions.kind, "transfer"),
        gte(transactions.occurredAt, new Date(start)),
        lt(transactions.occurredAt, new Date(end)),
      ),
    )
    .groupBy(transactions.kind, transactions.currency)
    .all();
  const income = sumByCurrency(rows.filter((r) => r.kind === "income"));
  const expense = sumByCurrency(rows.filter((r) => r.kind === "expense"));
  return { income, expense, net: subtractByCurrency(income, expense) };
}

/** Open (unpaid) invoices with the amount still due. */
export function receivables(limit = 6) {
  const rows = db
    .select({
      id: invoices.id,
      number: invoices.number,
      status: invoices.status,
      currency: invoices.currency,
      totalMinor: invoices.totalMinor,
      paidMinor: invoices.paidMinor,
      dueDate: invoices.dueDate,
      clientName: clients.name,
    })
    .from(invoices)
    .leftJoin(clients, eq(clients.id, invoices.clientId))
    .where(inArray(invoices.status, [...openInvoiceStatuses]))
    .orderBy(asc(sql`coalesce(${invoices.dueDate}, ${invoices.issueDate})`))
    .all()
    .map((r) => ({ ...r, dueMinor: balanceDue(r) }));
  return {
    count: rows.length,
    totals: sumByCurrency(rows.map((r) => ({ currency: r.currency, minor: r.dueMinor }))),
    list: rows.slice(0, limit),
  };
}

export interface ProjectFinanceStats {
  projectId: string;
  currency: string;
  income: CurrencyAmount[];
  expense: CurrencyAmount[];
  /** Income/expense in the project currency (others converted with latest rates). */
  incomeMinor: number;
  expenseMinor: number;
  approximate: boolean;
  missing: string[];
  invoiced: CurrencyAmount[];
  outstanding: CurrencyAmount[];
  trackedMs: number;
  billableMs: number;
  /** Σ hours × (entry snapshot rate ?? project rate), in the project currency. */
  timeValueMinor: number;
  budgetMinor: number | null;
  /** (tracked time value + expenses) ÷ budget, in %. */
  budgetUsedPct: number | null;
  /** income ÷ tracked hours (minor units per hour). */
  effectiveRateMinor: number | null;
}

/** Money + time figures for projects (all non-archived when `ids` is omitted). */
export function projectStats(ids?: string[], now: number = Date.now()) {
  const list = db
    .select({
      id: projects.id,
      currency: projects.currency,
      budgetMinor: projects.budgetMinor,
      hourlyRateMinor: projects.hourlyRateMinor,
    })
    .from(projects)
    .where(ids ? inArray(projects.id, ids) : isNull(projects.archivedAt))
    .all();
  const projectIds = list.map((p) => p.id);
  if (!projectIds.length) return new Map<string, ProjectFinanceStats>();
  const { base, rates } = latestRates();

  const money = db
    .select({
      projectId: transactions.projectId,
      kind: transactions.kind,
      currency: transactions.currency,
      minor: sql<number>`sum(${transactions.amountMinor})`,
    })
    .from(transactions)
    .where(and(inArray(transactions.projectId, projectIds), ne(transactions.kind, "transfer")))
    .groupBy(transactions.projectId, transactions.kind, transactions.currency)
    .all();
  const inv = db
    .select({
      projectId: invoices.projectId,
      status: invoices.status,
      currency: invoices.currency,
      totalMinor: invoices.totalMinor,
      paidMinor: invoices.paidMinor,
    })
    .from(invoices)
    .where(
      and(inArray(invoices.projectId, projectIds), notInArray(invoices.status, ["draft", "void"])),
    )
    .all();
  const time = db
    .select({
      projectId: timeEntries.projectId,
      ms: sql<number>`coalesce(sum(coalesce(${timeEntries.endedAt}, ${now}) - ${timeEntries.startedAt}), 0)`,
      billableMs: sql<number>`coalesce(sum(case when ${timeEntries.billable} then coalesce(${timeEntries.endedAt}, ${now}) - ${timeEntries.startedAt} else 0 end), 0)`,
      value: sql<number>`coalesce(sum((coalesce(${timeEntries.endedAt}, ${now}) - ${timeEntries.startedAt}) / 3600000.0 * coalesce(${timeEntries.hourlyRateMinor}, ${projects.hourlyRateMinor}, 0)), 0)`,
    })
    .from(timeEntries)
    .innerJoin(projects, eq(projects.id, timeEntries.projectId))
    .where(
      and(
        inArray(timeEntries.projectId, projectIds),
        sql`(${timeEntries.currency} is null or ${timeEntries.currency} = ${projects.currency})`,
      ),
    )
    .groupBy(timeEntries.projectId)
    .all();
  const timeMs = db
    .select({
      projectId: timeEntries.projectId,
      ms: sql<number>`coalesce(sum(coalesce(${timeEntries.endedAt}, ${now}) - ${timeEntries.startedAt}), 0)`,
      billableMs: sql<number>`coalesce(sum(case when ${timeEntries.billable} then coalesce(${timeEntries.endedAt}, ${now}) - ${timeEntries.startedAt} else 0 end), 0)`,
    })
    .from(timeEntries)
    .where(inArray(timeEntries.projectId, projectIds))
    .groupBy(timeEntries.projectId)
    .all();

  const out = new Map<string, ProjectFinanceStats>();
  for (const p of list) {
    const income = sumByCurrency(money.filter((m) => m.projectId === p.id && m.kind === "income"));
    const expense = sumByCurrency(
      money.filter((m) => m.projectId === p.id && m.kind === "expense"),
    );
    const inc = sumConverted(income, p.currency, rates, base);
    const exp = sumConverted(expense, p.currency, rates, base);
    const pi = inv.filter((i) => i.projectId === p.id);
    const tv = time.find((t) => t.projectId === p.id);
    const tm = timeMs.find((t) => t.projectId === p.id);
    const timeValueMinor = Math.round(tv?.value ?? 0);
    out.set(p.id, {
      projectId: p.id,
      currency: p.currency,
      income,
      expense,
      incomeMinor: inc.minor,
      expenseMinor: exp.minor,
      approximate: inc.approximate || exp.approximate,
      missing: [...new Set([...inc.missing, ...exp.missing])],
      invoiced: sumByCurrency(pi.map((i) => ({ currency: i.currency, minor: i.totalMinor }))),
      outstanding: sumByCurrency(
        pi
          .filter((i) => (openInvoiceStatuses as readonly string[]).includes(i.status))
          .map((i) => ({ currency: i.currency, minor: balanceDue(i) })),
      ),
      trackedMs: tm?.ms ?? 0,
      billableMs: tm?.billableMs ?? 0,
      timeValueMinor,
      budgetMinor: p.budgetMinor,
      budgetUsedPct: budgetUsedPercent(timeValueMinor + exp.minor, p.budgetMinor),
      effectiveRateMinor: effectiveHourlyRate(inc.minor, tm?.ms ?? 0),
    });
  }
  return out;
}

// ─── Overview page ──────────────────────────────────────────────────────────

const monthFmt = new Map<string, Intl.DateTimeFormat>();
function monthLabel(t: number, locale: Locale, tz: string, opts: Intl.DateTimeFormatOptions) {
  const meta = localeMeta[locale];
  const key = `${locale}|${tz}|${JSON.stringify(opts)}`;
  let f = monthFmt.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(`${meta.intl}-u-ca-${meta.calendar}`, { timeZone: tz, ...opts });
    monthFmt.set(key, f);
  }
  return f.format(t);
}

/** Everything the finance overview page shows, in one call. */
export function financeOverview(
  actor: Actor,
  opts: { now: number; locale: Locale; months?: number },
) {
  assertAdmin(actor);
  const tz = appTimezone();
  const cal = calendarFor(opts.locale);
  const { base, rates, dates } = latestRates();

  const monthStart = startOfMonth(opts.now, tz, cal);
  const monthEnd = startOfNextMonth(opts.now, tz, cal);
  const prevStart = startOfMonth(monthStart.getTime() - 86_400_000, tz, cal);
  const month = flowsBetween(monthStart, monthEnd);
  const prev = flowsBetween(prevStart, monthStart);
  const approx = (rows: CurrencyAmount[]) => sumConverted(rows, base, rates, base);

  const accountRows = listAccounts(actor);
  const balances = sumByCurrency(
    accountRows.map((a) => ({ currency: a.currency, minor: a.balance })),
  );

  const recv = receivables();

  // Analytics: compact rows for the last N months (switched client-side).
  const count = opts.months ?? 12;
  const ranges = lastMonths(opts.now, tz, cal, count);
  const raw = db
    .select({
      kind: transactions.kind,
      currency: transactions.currency,
      categoryId: transactions.categoryId,
      clientId: transactions.clientId,
      occurredAt: transactions.occurredAt,
      amountMinor: transactions.amountMinor,
    })
    .from(transactions)
    .where(
      and(
        ne(transactions.kind, "transfer"),
        gte(transactions.occurredAt, new Date(ranges[0]!.start)),
        lt(transactions.occurredAt, new Date(ranges[ranges.length - 1]!.end)),
      ),
    )
    .all();
  const agg = new Map<string, FlowRow>();
  for (const r of raw) {
    const m = monthIndexOf(ranges, r.occurredAt.getTime());
    if (m < 0) continue;
    const k = r.kind as "income" | "expense";
    const key = `${m}|${k}|${r.currency}|${r.categoryId}|${r.clientId}`;
    const row = agg.get(key);
    if (row) row.a += r.amountMinor;
    else agg.set(key, { m, k, c: r.currency, cat: r.categoryId, cl: r.clientId, a: r.amountMinor });
  }
  const flowRows = [...agg.values()];
  const catIds = [...new Set(flowRows.map((r) => r.cat).filter(Boolean))] as string[];
  const clientIds = [...new Set(flowRows.map((r) => r.cl).filter(Boolean))] as string[];

  // Project profitability (projects with activity or not archived).
  const projectRows = db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
      status: projects.status,
      billingType: projects.billingType,
      clientName: clients.name,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(and(isNull(projects.archivedAt), ne(projects.status, "canceled")))
    .all();
  const stats = projectStats(
    projectRows.map((p) => p.id),
    opts.now,
  );
  const profitability = projectRows
    .map((p) => ({ ...p, ...stats.get(p.id)! }))
    .filter((p) => p.incomeMinor || p.expenseMinor || p.trackedMs || p.invoiced.length)
    .sort((a, b) => {
      const av = sumConverted(
        [{ currency: a.currency, minor: a.incomeMinor }],
        base,
        rates,
        base,
      ).minor;
      const bv = sumConverted(
        [{ currency: b.currency, minor: b.incomeMinor }],
        base,
        rates,
        base,
      ).minor;
      return bv - av;
    });

  return {
    base,
    rates,
    rateDates: dates,
    month: {
      start: monthStart.getTime(),
      ...month,
      approx: {
        income: approx(month.income),
        expense: approx(month.expense),
        net: approx(month.net),
      },
      prevApprox: { income: approx(prev.income), expense: approx(prev.expense) },
    },
    accounts: accountRows,
    balances,
    balancesApprox: approx(balances),
    receivables: { ...recv, approx: approx(recv.totals) },
    analytics: {
      rows: flowRows,
      months: ranges.map((r, i) => ({
        start: r.start,
        label: monthLabel(r.start, opts.locale, tz, { month: "short" }),
        full: monthLabel(r.start, opts.locale, tz, { month: "long", year: "numeric" }),
        first: i === 0,
      })),
      categories: catIds.length
        ? db
            .select({ id: categories.id, name: categories.name, color: categories.color })
            .from(categories)
            .where(inArray(categories.id, catIds))
            .all()
        : [],
      clients: clientIds.length
        ? db
            .select({ id: clients.id, name: clients.name, color: clients.color })
            .from(clients)
            .where(inArray(clients.id, clientIds))
            .all()
        : [],
    },
    profitability,
  };
}

// ─── Summary (tool) ─────────────────────────────────────────────────────────

/** Totals for a month or day range, balances and receivables (for agents). */
export function financeSummary(
  actor: Actor,
  input: z.output<typeof summaryInput>,
  now = Date.now(),
) {
  assertAdmin(actor);
  const tz = appTimezone();
  let start: number;
  let end: number;
  if (input.from || input.to) {
    const r = dayRange(input.from, input.to);
    start = r.start?.getTime() ?? 0;
    end = r.end?.getTime() ?? now + 1;
  } else {
    const r = input.month ? monthKeyRange(input.month, tz) : null;
    start = r?.start ?? startOfMonth(now, tz, installCalendar()).getTime();
    end = r?.end ?? startOfNextMonth(now, tz, installCalendar()).getTime();
  }
  const { base, rates } = latestRates();
  const flows = flowsBetween(start, end);
  const byCategory = db
    .select({
      kind: transactions.kind,
      currency: transactions.currency,
      category: categories.name,
      minor: sql<number>`sum(${transactions.amountMinor})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        ne(transactions.kind, "transfer"),
        gte(transactions.occurredAt, new Date(start)),
        lt(transactions.occurredAt, new Date(end)),
      ),
    )
    .groupBy(transactions.kind, transactions.currency, categories.name)
    .all();
  const accountRows = listAccounts(actor);
  const recv = receivables(20);
  const approx = (rows: CurrencyAmount[]) => sumConverted(rows, base, rates, base);
  return {
    range: { from: new Date(start).toISOString(), to: new Date(end).toISOString(), timezone: tz },
    note: "Amounts are integer MINOR units of their currency (IRT has 0 decimals, USD 2). Never add different currencies; approx* fields are converted to the base currency with the latest manual FX rates.",
    baseCurrency: base,
    fxRates: rates as RateTable,
    income: flows.income,
    expense: flows.expense,
    net: flows.net,
    approxInBase: {
      income: approx(flows.income),
      expense: approx(flows.expense),
      net: approx(flows.net),
    },
    byCategory: byCategory.map((r) => ({ ...r, category: r.category ?? null })),
    accounts: accountRows.map((a) => ({
      id: a.id,
      name: a.name,
      kind: a.kind,
      currency: a.currency,
      balanceMinor: a.balance,
      pendingMinor: a.pending,
    })),
    receivables: recv,
  };
}
