/**
 * Pure finance math (no DB, no server-only imports) — safe to use from client
 * components and unit tests. Money is always integer minor units + currency.
 */
import { newDate } from "date-fns-jalali";
import { currencies, isCurrency } from "@/lib/money";
import { fromDateInput, startOfMonth, startOfNextMonth } from "@/lib/tz";

export type Kind = "income" | "expense" | "transfer";
export type TxStatus = "cleared" | "pending";

export interface CurrencyAmount {
  currency: string;
  minor: number;
}

/** Number of decimals of a currency (unknown codes default to 2). */
export function decimalsOf(currency: string) {
  return isCurrency(currency) ? currencies[currency].decimals : 2;
}

/** Major units (e.g. 12.5 USD) → minor units (1250) for any currency code. */
export function majorToMinor(major: number, currency: string) {
  return Math.round(major * 10 ** decimalsOf(currency));
}

export function minorToMajor(minor: number, currency: string) {
  return minor / 10 ** decimalsOf(currency);
}

// ─── Balances ───────────────────────────────────────────────────────────────

/** Aggregated outflow/inflow rows for one account (from SQL `group by`). */
export interface AccountFlowRow {
  /** income / expense / transfer (outgoing side of a transfer). */
  kind: Kind;
  status: TxStatus;
  total: number;
}

/**
 * Account balance = opening + incomes − expenses − transfers out + transfers in.
 * `pending` is the net effect of transactions still marked "pending" (already
 * included in `balance`; `cleared = balance − pending`).
 */
export function accountBalance(
  openingMinor: number,
  out: AccountFlowRow[],
  incoming: { status: TxStatus; total: number }[],
) {
  let balance = openingMinor;
  let pending = 0;
  let income = 0;
  let expense = 0;
  for (const r of out) {
    const signed = r.kind === "income" ? r.total : -r.total;
    balance += signed;
    if (r.status === "pending") pending += signed;
    if (r.kind === "income") income += r.total;
    if (r.kind === "expense") expense += r.total;
  }
  for (const r of incoming) {
    balance += r.total;
    if (r.status === "pending") pending += r.total;
  }
  return { balance, pending, cleared: balance - pending, income, expense };
}

/** Group amounts by currency (never mixes currencies). Sorted by currency code. */
export function sumByCurrency(rows: CurrencyAmount[]): CurrencyAmount[] {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.currency, (map.get(r.currency) ?? 0) + r.minor);
  return [...map.entries()]
    .map(([currency, minor]) => ({ currency, minor }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

/** a − b per currency (currencies present in either side). */
export function subtractByCurrency(a: CurrencyAmount[], b: CurrencyAmount[]) {
  return sumByCurrency([...a, ...b.map((r) => ({ currency: r.currency, minor: -r.minor }))]);
}

// ─── FX ─────────────────────────────────────────────────────────────────────

/**
 * Rates table: currency → how many units of `base` ONE unit of that currency is
 * worth (major per major), e.g. { USD: 105000 } with base IRT.
 */
export type RateTable = Record<string, number>;

/**
 * Convert minor units between currencies through the base currency.
 * Returns null when a needed rate is missing (never guesses).
 */
export function convertMinor(
  minor: number,
  from: string,
  to: string,
  rates: RateTable,
  base: string,
): number | null {
  if (from === to) return minor;
  const rFrom = from === base ? 1 : rates[from];
  const rTo = to === base ? 1 : rates[to];
  if (!rFrom || !rTo || rFrom <= 0 || rTo <= 0) return null;
  const majorTo = (minorToMajor(minor, from) * rFrom) / rTo;
  return majorToMinor(majorTo, to);
}

/**
 * Sum amounts in several currencies into one target currency ("≈" totals).
 * Currencies without a rate are skipped and reported in `missing`.
 */
export function sumConverted(
  rows: CurrencyAmount[],
  target: string,
  rates: RateTable,
  base: string,
): { minor: number; missing: string[]; approximate: boolean } {
  let minor = 0;
  const missing = new Set<string>();
  let approximate = false;
  for (const r of rows) {
    if (!r.minor) continue;
    const v = convertMinor(r.minor, r.currency, target, rates, base);
    if (v == null) missing.add(r.currency);
    else {
      minor += v;
      if (r.currency !== target) approximate = true;
    }
  }
  return { minor, missing: [...missing].sort(), approximate };
}

export interface RatePoint {
  rate: number;
  /** epoch ms (start of the rate's day). */
  date: number;
}

/**
 * Pick the rate to use at instant `at` from a currency's history:
 * the latest on/before `at`, otherwise the earliest after it, otherwise null.
 */
export function pickRate(history: RatePoint[], at: number): RatePoint | null {
  let before: RatePoint | null = null;
  let after: RatePoint | null = null;
  for (const p of history) {
    if (p.date <= at) {
      if (!before || p.date > before.date) before = p;
    } else if (!after || p.date < after.date) after = p;
  }
  return before ?? after;
}

/** Parse a user-typed rate ("105,000", "۱۰۵٬۰۰۰", "0.92") → number or null. */
export function parseRateInput(input: string | number): number | null {
  if (typeof input === "number") return Number.isFinite(input) && input > 0 ? input : null;
  const cleaned = toLatin(input)
    .replace(/[,\s٬_]/g, "")
    .replace("٫", ".");
  if (!/^\d*(\.\d+)?$/.test(cleaned) || cleaned === "") return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toLatin(input: string) {
  return input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

// ─── Calendar months ────────────────────────────────────────────────────────

export type Calendar = "persian" | "gregory";

export interface MonthRange {
  start: number;
  end: number;
}

/** The last `count` calendar months (Jalali for "persian"), oldest first, ending with the current one. */
export function lastMonths(now: number, tz: string, calendar: Calendar, count: number) {
  const out: MonthRange[] = [];
  let start = startOfMonth(now, tz, calendar).getTime();
  let end = startOfNextMonth(now, tz, calendar).getTime();
  for (let i = 0; i < count; i++) {
    out.unshift({ start, end });
    end = start;
    start = startOfMonth(start - 86_400_000, tz, calendar).getTime();
  }
  return out;
}

/** Index of the month range containing `t`, or -1. Ranges must be sorted. */
export function monthIndexOf(ranges: MonthRange[], t: number) {
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const r = ranges[mid]!;
    if (t < r.start) hi = mid - 1;
    else if (t >= r.end) lo = mid + 1;
    else return mid;
  }
  return -1;
}

/** Jalali (Solar Hijri) calendar date → Gregorian y/m/d. */
export function jalaliToGregorian(jy: number, jm: number, jd: number) {
  const d = newDate(jy, jm - 1, jd, 12);
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

/**
 * Parse a calendar day typed by a person or an AI agent into "YYYY-MM-DD" (Gregorian).
 * Accepts `2026-10-14`, `2026/10/14`, Jalali `1405/07/22` (years < 1700), Persian digits.
 */
export function normalizeDay(input: string): string | null {
  const m = toLatin(input.trim()).match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!m) return null;
  let y = Number(m[1]);
  let mo = Number(m[2]);
  let d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  if (y < 1700) {
    if (mo <= 6 ? d > 31 : d > 30) return null;
    ({ y, m: mo, d } = jalaliToGregorian(y, mo, d));
  } else {
    const probe = new Date(Date.UTC(y, mo - 1, d));
    if (probe.getUTCMonth() !== mo - 1) return null;
  }
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * A month key ("2026-10" Gregorian, or "1405-07" Jalali when year < 1700) →
 * [start, end) instants in `tz`.
 */
export function monthKeyRange(key: string, tz: string): MonthRange | null {
  const m = toLatin(key.trim()).match(/^(\d{4})[-/](\d{1,2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const jalali = y < 1700;
  const g = jalali ? jalaliToGregorian(y, mo, 1) : { y, m: mo, d: 1 };
  const day = `${g.y}-${String(g.m).padStart(2, "0")}-${String(g.d).padStart(2, "0")}`;
  const start = fromDateInput(day, undefined, tz);
  const end = startOfNextMonth(start, tz, jalali ? "persian" : "gregory");
  return { start: start.getTime(), end: end.getTime() };
}

// ─── Analytics (client-side switching of currency / range) ──────────────────

/** Compact aggregated flow row: month index, kind, currency, category, client, amount. */
export interface FlowRow {
  m: number;
  k: "income" | "expense";
  c: string;
  cat: string | null;
  cl: string | null;
  a: number;
}

/** Special currency value meaning "everything converted to base (≈)". */
export const APPROX = "≈";

export function analyze(
  rows: FlowRow[],
  opts: {
    /** Total months present in `rows` (indexes 0..totalMonths-1). */
    totalMonths: number;
    /** How many trailing months to analyze. */
    months: number;
    currency: string;
    base: string;
    rates: RateTable;
  },
) {
  const first = opts.totalMonths - opts.months;
  const series = Array.from({ length: opts.months }, (_, i) => ({
    m: first + i,
    income: 0,
    expense: 0,
  }));
  const byCategory = new Map<string, number>();
  const byClient = new Map<string, number>();
  const missing = new Set<string>();
  const target = opts.currency === APPROX ? opts.base : opts.currency;
  for (const r of rows) {
    if (r.m < first || r.m >= opts.totalMonths) continue;
    let v: number | null;
    if (opts.currency === APPROX) {
      v = convertMinor(r.a, r.c, target, opts.rates, opts.base);
      if (v == null) {
        missing.add(r.c);
        continue;
      }
    } else if (r.c === opts.currency) v = r.a;
    else continue;
    const s = series[r.m - first]!;
    if (r.k === "income") {
      s.income += v;
      if (r.cl) byClient.set(r.cl, (byClient.get(r.cl) ?? 0) + v);
    } else {
      s.expense += v;
      const key = r.cat ?? "";
      byCategory.set(key, (byCategory.get(key) ?? 0) + v);
    }
  }
  const sorted = (m: Map<string, number>) =>
    [...m.entries()].map(([id, value]) => ({ id, value })).sort((a, b) => b.value - a.value);
  const income = series.reduce((s, r) => s + r.income, 0);
  const expense = series.reduce((s, r) => s + r.expense, 0);
  return {
    target,
    series,
    byCategory: sorted(byCategory),
    byClient: sorted(byClient),
    income,
    expense,
    net: income - expense,
    missing: [...missing].sort(),
  };
}

/** Currencies that appear in flow rows (for the currency picker). */
export function flowCurrencies(rows: FlowRow[]) {
  return [...new Set(rows.map((r) => r.c))].sort();
}

// ─── Project metrics ────────────────────────────────────────────────────────

/** income ÷ hours (minor units per hour), null when no time was tracked. */
export function effectiveHourlyRate(incomeMinor: number, trackedMs: number) {
  if (trackedMs <= 0) return null;
  return Math.round(incomeMinor / (trackedMs / 3_600_000));
}

/** Value of tracked time: Σ hours × rate (minor). Entries without a rate count as 0. */
export function timeValueMinor(entries: { ms: number; rateMinor: number | null }[]) {
  return Math.round(entries.reduce((s, e) => s + (e.ms / 3_600_000) * (e.rateMinor ?? 0), 0));
}

/** Budget usage percentage (0–∞), null when there is no budget. */
export function budgetUsedPercent(usedMinor: number, budgetMinor: number | null | undefined) {
  if (!budgetMinor || budgetMinor <= 0) return null;
  return Math.round((usedMinor / budgetMinor) * 1000) / 10;
}

// ─── Ledgers ────────────────────────────────────────────────────────────────

export type LedgerLineType = "invoice" | "received" | "paid";

export interface LedgerEvent {
  id: string;
  at: number;
  currency: string;
  type: LedgerLineType;
  /** Increases what the counterparty owes us (invoices issued, money we paid them). */
  debit: number;
  /** Decreases it (money received from them). */
  credit: number;
}

/**
 * Running balance per currency. Positive balance = they owe us (receivable,
 * «طلب»); negative = we owe them (payable / prepayment, «بدهی»).
 */
export function runningLedger<E extends LedgerEvent>(events: E[]) {
  const order: Record<LedgerLineType, number> = { invoice: 0, paid: 1, received: 2 };
  const sorted = [...events].sort(
    (a, b) => a.at - b.at || order[a.type] - order[b.type] || a.id.localeCompare(b.id),
  );
  const groups = new Map<
    string,
    { currency: string; lines: (E & { balance: number })[]; debit: number; credit: number }
  >();
  for (const e of sorted) {
    let g = groups.get(e.currency);
    if (!g) {
      g = { currency: e.currency, lines: [], debit: 0, credit: 0 };
      groups.set(e.currency, g);
    }
    g.debit += e.debit;
    g.credit += e.credit;
    g.lines.push({ ...e, balance: g.debit - g.credit });
  }
  return [...groups.values()]
    .map((g) => ({ ...g, balance: g.debit - g.credit }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
