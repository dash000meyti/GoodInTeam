/**
 * Pure invoice math: line amounts, totals with discount & tax (basis points),
 * numbering, lifecycle status, and grouping tracked time into invoice lines.
 * No DB access — unit-tested and usable from client components.
 */
import type { InvoiceStatus } from "@/server/db/schema/finance";

export interface LineInput {
  quantity: number;
  unitPriceMinor: number;
}

/** quantity × unit price, rounded to whole minor units. */
export function lineAmount(quantity: number, unitPriceMinor: number) {
  return Math.round(quantity * unitPriceMinor);
}

/**
 * subtotal = Σ lines · discount clamped to [0, subtotal] ·
 * tax = round((subtotal − discount) × taxBps / 10 000) · total = taxable + tax.
 */
export function invoiceTotals(input: {
  items: LineInput[];
  discountMinor?: number;
  taxBps?: number;
}) {
  const subtotal = input.items.reduce((s, i) => s + lineAmount(i.quantity, i.unitPriceMinor), 0);
  const discount = Math.min(Math.max(0, input.discountMinor ?? 0), Math.max(0, subtotal));
  const taxable = subtotal - discount;
  const taxBps = Math.max(0, Math.round(input.taxBps ?? 0));
  const tax = Math.round((taxable * taxBps) / 10_000);
  return { subtotal, discount, taxable, taxBps, tax, total: taxable + tax };
}

/** "9" / 9 / "۹٫۵" percent → basis points (900 / 950). */
export function percentToBps(pct: number) {
  return Math.round(pct * 100);
}

export function bpsToPercent(bps: number) {
  return bps / 100;
}

// ─── Numbering ──────────────────────────────────────────────────────────────

/** `${prefix}${year}-${seq:3}` → "GT-1405-007". */
export function formatInvoiceNumber(prefix: string, year: number, seq: number) {
  return `${prefix}${year}-${String(seq).padStart(3, "0")}`;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Next sequence number for `${prefix}${year}-NNN` given the existing numbers. */
export function nextInvoiceSeq(existing: string[], prefix: string, year: number) {
  const re = new RegExp(`^${escapeRegExp(prefix)}${year}-(\\d+)$`);
  let max = 0;
  for (const n of existing) {
    const m = n.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

export interface StatusInput {
  status: InvoiceStatus;
  totalMinor: number;
  paidMinor: number;
  dueDate: Date | number | null;
  viewedAt: Date | number | null;
}

/**
 * Status of a non-draft, non-void invoice derived from its facts:
 * paid ≥ total → paid · past due (due day before `today`) → overdue ·
 * some payment → partial · viewed → viewed · otherwise sent.
 * `today` = start of the current day in the app timezone (ms).
 */
export function deriveInvoiceStatus(inv: StatusInput, today: number): InvoiceStatus {
  if (inv.status === "draft" || inv.status === "void") return inv.status;
  if (inv.totalMinor > 0 && inv.paidMinor >= inv.totalMinor) return "paid";
  const due = inv.dueDate == null ? null : new Date(inv.dueDate).getTime();
  if (due != null && due < today) return "overdue";
  if (inv.paidMinor > 0) return "partial";
  if (inv.viewedAt) return "viewed";
  return "sent";
}

/** Statuses with money still expected from the client. */
export const openInvoiceStatuses = ["sent", "viewed", "partial", "overdue"] as const;

export function isOpenStatus(s: InvoiceStatus) {
  return (openInvoiceStatuses as readonly string[]).includes(s);
}

/** Amount still due (never negative). */
export function balanceDue(inv: { totalMinor: number; paidMinor: number }) {
  return Math.max(0, inv.totalMinor - inv.paidMinor);
}

// ─── Tracked time → invoice lines ───────────────────────────────────────────

export interface UnbilledEntry {
  id: string;
  ms: number;
  description: string | null;
  taskId: string | null;
  taskTitle: string | null;
  /** Snapshot rate on the entry (minor/hour) — falls back to `fallbackRateMinor`. */
  rateMinor: number | null;
  currency: string | null;
}

export interface TimeGroup {
  key: string;
  label: string;
  entryIds: string[];
  ms: number;
  /** Hours rounded to 2 decimals (the invoice line quantity). */
  hours: number;
  rateMinor: number;
  currency: string;
  amountMinor: number;
}

/**
 * Group unbilled entries by task (or description) and rate into invoice lines.
 * Quantity = hours (2 decimals), unit price = hourly rate.
 */
export function groupTimeEntries(
  entries: UnbilledEntry[],
  opts: { fallbackRateMinor: number; fallbackCurrency: string; untitled: string },
): TimeGroup[] {
  const groups = new Map<string, TimeGroup>();
  for (const e of entries) {
    const rate = e.rateMinor ?? opts.fallbackRateMinor;
    const currency = e.currency ?? opts.fallbackCurrency;
    const label = (e.taskTitle ?? e.description ?? "").trim() || opts.untitled;
    const key = `${e.taskId ?? `d:${label}`}|${rate}|${currency}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, label, entryIds: [], ms: 0, hours: 0, rateMinor: rate, currency, amountMinor: 0 };
      groups.set(key, g);
    }
    g.entryIds.push(e.id);
    g.ms += e.ms;
  }
  return [...groups.values()]
    .map((g) => {
      const hours = Math.round((g.ms / 3_600_000) * 100) / 100;
      return { ...g, hours, amountMinor: lineAmount(hours, g.rateMinor) };
    })
    .sort((a, b) => b.ms - a.ms);
}
