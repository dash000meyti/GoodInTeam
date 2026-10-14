/**
 * CSV helpers for transaction export/import. Pure (no DB) and unit-tested.
 *
 * Import format (header row required, order free, en or fa header names):
 *   date, amount, kind, account, category, description  (+ optional time, counterparty, status)
 * - date: 2026-10-14 · 2026/10/14 · Jalali 1405/07/22 (Persian digits OK), optional " 14:30"
 * - amount: major units ("1,250.50", "۱۲٬۰۰۰٬۰۰۰"); a negative amount means expense when kind is empty
 * - kind: income | expense (درآمد | هزینه); transfers are skipped
 * - account: account name (must exist); its currency is used
 */
import { toLatinDigits } from "@/lib/format";
import { isCurrency, parseMoneyInput } from "@/lib/money";
import { fromDateInput } from "@/lib/tz";
import { normalizeDay } from "./calc";

// ─── Generic CSV ────────────────────────────────────────────────────────────

function detectDelimiter(firstLine: string) {
  const counts = [",", ";", "\t"].map((d) => ({ d, n: firstLine.split(d).length - 1 }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0]!.n > 0 ? counts[0]!.d : ",";
}

/** RFC 4180-ish parser: quotes, escaped quotes, CRLF, BOM; auto-detects , ; or tab. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = detectDelimiter(firstLine);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"' && field === "") inQuotes = true;
    else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function quote(v: string) {
  return /[",\r\n;]/.test(v) || /^\s|\s$/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Serialize rows to CSV (CRLF, quoted when needed, UTF-8 BOM for Excel). */
export function toCsv(rows: (string | number | null | undefined)[][], bom = true) {
  const body = rows.map((r) => r.map((c) => quote(c == null ? "" : String(c))).join(",")).join("\r\n");
  return (bom ? "﻿" : "") + body + "\r\n";
}

// ─── Import mapping ─────────────────────────────────────────────────────────

const headerAliases: Record<string, string[]> = {
  date: ["date", "day", "occurred_at", "occurredat", "تاریخ"],
  time: ["time", "hour", "ساعت", "زمان"],
  amount: ["amount", "sum", "value", "مبلغ", "مقدار"],
  kind: ["kind", "type", "نوع"],
  account: ["account", "حساب"],
  category: ["category", "دسته", "دسته‌بندی", "دسته بندی", "دستهبندی"],
  description: ["description", "desc", "memo", "note", "notes", "شرح", "توضیحات", "توضیح"],
  counterparty: ["counterparty", "payee", "party", "طرف حساب", "طرف‌حساب"],
  status: ["status", "وضعیت"],
};

export type ImportField = keyof typeof headerAliases;

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/‌/g, "‌").replace(/\s+/g, " ");
}

/** Map header cells → column index per known field. */
export function mapHeader(header: string[]) {
  const map: Partial<Record<ImportField, number>> = {};
  header.forEach((h, i) => {
    const n = normalizeHeader(h);
    for (const [field, aliases] of Object.entries(headerAliases)) {
      if (map[field as ImportField] === undefined && aliases.includes(n)) {
        map[field as ImportField] = i;
      }
    }
  });
  return map;
}

export type ImportErrorCode =
  | "missingColumns"
  | "badDate"
  | "badAmount"
  | "badKind"
  | "missingAccount"
  | "unknownAccount";
export type ImportWarningCode = "unknownCategory" | "categoryKind" | "transferSkipped";

export interface ImportContext {
  accounts: { id: string; name: string; currency: string; archived?: boolean }[];
  categories: { id: string; name: string; kind: "income" | "expense" }[];
  tz: string;
}

export interface ImportRow {
  /** 1-based line number in the file (header = 1). */
  line: number;
  errors: ImportErrorCode[];
  warnings: ImportWarningCode[];
  /** Raw display values. */
  raw: { date: string; amount: string; kind: string; account: string; category: string; description: string };
  data: {
    occurredAt: Date;
    kind: "income" | "expense";
    amountMinor: number;
    currency: string;
    accountId: string;
    categoryId: string | null;
    description: string | null;
    counterparty: string | null;
    status: "cleared" | "pending";
  } | null;
}

const kindWords: Record<string, "income" | "expense" | "transfer"> = {
  income: "income",
  in: "income",
  credit: "income",
  "+": "income",
  درآمد: "income",
  دریافت: "income",
  واریز: "income",
  expense: "expense",
  out: "expense",
  debit: "expense",
  "-": "expense",
  هزینه: "expense",
  پرداخت: "expense",
  برداشت: "expense",
  transfer: "transfer",
  انتقال: "transfer",
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Parse "YYYY-MM-DD[ HH:mm]" (Gregorian or Jalali) + optional separate time → instant in tz. */
export function parseImportDate(dateCell: string, timeCell: string | undefined, tz: string) {
  const s = toLatinDigits(dateCell.trim()).replace("T", " ");
  const [dayPart, inlineTime] = s.split(/\s+/, 2);
  const day = dayPart ? normalizeDay(dayPart) : null;
  if (!day) return null;
  const t = toLatinDigits((timeCell ?? inlineTime ?? "").trim()).slice(0, 5);
  const time = /^\d{1,2}:\d{2}$/.test(t) ? t : undefined;
  if (time) {
    const [h, m] = time.split(":").map(Number);
    if (h! > 23 || m! > 59) return null;
  }
  return fromDateInput(day, time, tz);
}

/** Validate + map parsed CSV rows (including header) to transactions. */
export function mapImportRows(table: string[][], ctx: ImportContext): {
  rows: ImportRow[];
  missingColumns: ImportField[];
} {
  const [header, ...body] = table;
  if (!header) return { rows: [], missingColumns: ["date", "amount", "account"] };
  const col = mapHeader(header);
  const missingColumns = (["date", "amount", "account"] as const).filter(
    (f) => col[f] === undefined,
  );
  if (missingColumns.length) return { rows: [], missingColumns: [...missingColumns] };

  const accounts = new Map(ctx.accounts.map((a) => [norm(a.name), a]));
  const categories = ctx.categories;
  const cell = (r: string[], f: ImportField) => (col[f] === undefined ? "" : (r[col[f]!] ?? "").trim());

  const rows = body.map((r, i): ImportRow => {
    const raw = {
      date: cell(r, "date"),
      amount: cell(r, "amount"),
      kind: cell(r, "kind"),
      account: cell(r, "account"),
      category: cell(r, "category"),
      description: cell(r, "description"),
    };
    const errors: ImportErrorCode[] = [];
    const warnings: ImportWarningCode[] = [];

    const occurredAt = parseImportDate(raw.date, col.time === undefined ? undefined : cell(r, "time"), ctx.tz);
    if (!occurredAt) errors.push("badDate");

    let kindWord = kindWords[norm(raw.kind)];
    if (raw.kind && !kindWord) errors.push("badKind");
    if (kindWord === "transfer") warnings.push("transferSkipped");

    const account = raw.account ? accounts.get(norm(raw.account)) : undefined;
    if (!raw.account) errors.push("missingAccount");
    else if (!account || account.archived) errors.push("unknownAccount");
    const currency = account?.currency ?? "IRT";

    // Amount: "-1,200" → expense when no kind given.
    const amountText = toLatinDigits(raw.amount).replace(/[()]/g, "").trim();
    const negative = /^[-−]/.test(amountText);
    const amountMinor = parseMoneyInput(
      amountText.replace(/^[-−+]/, ""),
      isCurrency(currency) ? currency : "USD",
    );
    if (amountMinor == null || amountMinor <= 0) errors.push("badAmount");
    if (!kindWord && !raw.kind) kindWord = negative ? "expense" : "income";

    let categoryId: string | null = null;
    if (raw.category && (kindWord === "income" || kindWord === "expense")) {
      const byName = categories.filter((c) => norm(c.name) === norm(raw.category));
      const match = byName.find((c) => c.kind === kindWord);
      if (match) categoryId = match.id;
      else warnings.push(byName.length ? "categoryKind" : "unknownCategory");
    }

    const ok =
      errors.length === 0 &&
      kindWord !== "transfer" &&
      (kindWord === "income" || kindWord === "expense");
    const statusWord = norm(cell(r, "status"));
    return {
      line: i + 2,
      errors,
      warnings,
      raw,
      data: ok
        ? {
            occurredAt: occurredAt!,
            kind: kindWord as "income" | "expense",
            amountMinor: amountMinor!,
            currency,
            accountId: account!.id,
            categoryId,
            description: raw.description || null,
            counterparty: cell(r, "counterparty") || null,
            status: statusWord === "pending" || statusWord === "در انتظار" ? "pending" : "cleared",
          }
        : null,
    };
  });
  return { rows, missingColumns: [] };
}
