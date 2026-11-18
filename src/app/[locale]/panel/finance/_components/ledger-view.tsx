import Link from "next/link";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  FileTextIcon,
  InfoIcon,
  ReceiptIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatRow } from "@/components/panel/stat-card";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { InvoiceStatusBadge } from "@/components/finance/invoice-status-badge";
import { KpiCard } from "@/components/finance/kpi-card";
import { formatMoneySigned, Money } from "@/components/finance/money";
import { format } from "@/i18n/format-message";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/server/db/schema/finance";
import type { LedgerLine } from "@/server/modules/finance/ledger";
import type { PanelContext } from "@/server/page-context";
import { BoxCell } from "./frame-bits";

export interface LedgerGroup {
  currency: string;
  lines: (LedgerLine & { balance: number })[];
  debit: number;
  credit: number;
  balance: number;
}

/** "They owe us" / "We owe them" / "Settled" chip for a balance. */
export function BalanceBadge({
  minor,
  currency,
  ctx,
  mode = "party",
}: {
  minor: number;
  currency: string;
  ctx: PanelContext;
  mode?: "party" | "project";
}) {
  const f = ctx.t.finance;
  if (mode === "project") {
    return (
      <Money
        minor={minor}
        currency={currency}
        locale={ctx.locale}
        tone={minor < 0 ? "expense" : minor > 0 ? "income" : "none"}
        className="font-bold"
      />
    );
  }
  const variant = minor > 0 ? "success" : minor < 0 ? "destructive" : "neutral";
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Badge variant={variant}>{minor > 0 ? f.theyOwe : minor < 0 ? f.weOwe : f.settled}</Badge>
      {minor !== 0 && (
        <Money
          minor={Math.abs(minor)}
          currency={currency}
          locale={ctx.locale}
          className="font-bold"
        />
      )}
    </span>
  );
}

/** Line-type icon tile (square hairline, the line's ink). */
const lineTone = {
  invoice: { icon: FileTextIcon, cls: "text-[#006c9c] dark:text-[#61f3f3]" },
  received: { icon: ArrowDownLeftIcon, cls: "text-[#118d57] dark:text-[#77ed8b]" },
  paid: { icon: ArrowUpRightIcon, cls: "text-[#b71d18] dark:text-[#ffac82]" },
} as const;

/**
 * A ledger as one framed box: the hint as its first row, then one row per
 * currency — a header row (currency, balance, the "who owes whom" sentence)
 * over the chronological lines with debit / credit / running balance, edge to
 * edge (a table on md+, a row list on phones).
 */
export function LedgerTables({
  groups,
  ctx,
  mode,
  name,
  hint,
  className,
}: {
  groups: LedgerGroup[];
  ctx: PanelContext;
  mode: "party" | "project";
  name: string;
  /** The ledger's explanation, shown as the box's first row. */
  hint?: string;
  className?: string;
}) {
  const { t, fmt, locale, href } = ctx;
  const f = t.finance;
  const label = (l: LedgerGroup["lines"][number]): React.ReactNode => {
    if (l.type === "invoice") {
      // Keep the LTR invoice number on one line inside RTL text.
      const [before, after] = f.line_invoice.split("{number}");
      return (
        <>
          {before}
          <span dir="ltr" className="whitespace-nowrap">
            {l.invoiceNumber}
          </span>
          {after}
        </>
      );
    }
    if (mode === "project") return l.type === "received" ? f.line_income : f.line_expense;
    return l.type === "received" ? f.line_received : f.line_paid;
  };
  return (
    <FrameBox as="div" density="compact" className={className}>
      {hint && <LedgerHint text={hint} />}
      {groups.map((g) => (
        <FrameGrid key={g.currency} cols={1}>
          <BoxCell
            titleId={`ledger-${g.currency}`}
            title={
              <span className="flex flex-wrap items-center gap-3">
                <Badge variant="neutral" className="font-mono text-sm">
                  {g.currency}
                </Badge>
                <BalanceBadge minor={g.balance} currency={g.currency} ctx={ctx} mode={mode} />
              </span>
            }
            description={
              mode === "party"
                ? format(
                    g.balance > 0 ? f.theyOweLong : g.balance < 0 ? f.weOweLong : f.settledLong,
                    {
                      name,
                      amount: formatMoneySigned(Math.abs(g.balance), g.currency, locale),
                    },
                  )
                : undefined
            }
            flush
          >
            <ul className="divide-y divide-frame-line md:hidden">
              {g.lines.map((l) => {
                const signed =
                  mode === "project" ? l.debit - l.credit : l.debit ? l.debit : -l.credit;
                return (
                  <li key={l.id} className="space-y-1 px-(--cell-pad) py-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 text-sm font-semibold">
                        {l.invoiceId ? (
                          <Link
                            href={href(`/panel/invoices/${l.invoiceId}`)}
                            className="hover:text-primary-ink"
                          >
                            {label(l)}
                          </Link>
                        ) : (
                          label(l)
                        )}
                      </span>
                      <Money
                        minor={signed}
                        currency={g.currency}
                        locale={locale}
                        signed
                        className="shrink-0 text-sm font-bold"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span className="min-w-0 truncate">
                        {[formatDate(l.at, fmt), l.description, l.accountName]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <span className="shrink-0">
                        {f.colBalance}:{" "}
                        <Money minor={l.balance} currency={g.currency} locale={locale} />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.date}</TableHead>
                  <TableHead>{t.common.description}</TableHead>
                  <TableHead className="text-end">
                    {mode === "project" ? f.colIncome : f.debit}
                  </TableHead>
                  <TableHead className="text-end">
                    {mode === "project" ? f.colExpense : f.credit}
                  </TableHead>
                  <TableHead className="text-end">{f.colBalance}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {g.lines.map((l) => {
                  const tone = lineTone[l.type];
                  const Icon = tone.icon;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="align-top text-sm">{formatDate(l.at, fmt)}</TableCell>
                      <TableCell className="max-w-[360px] align-top whitespace-normal">
                        <div className="flex items-start gap-2.5">
                          <span
                            aria-hidden
                            className={cn(
                              "mt-0.5 flex size-7 shrink-0 items-center justify-center border border-frame-line bg-card",
                              tone.cls,
                            )}
                          >
                            <Icon className="size-3.5 rtl:-scale-x-100" />
                          </span>
                          <div className="min-w-0 space-y-0.5">
                            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                              {l.invoiceId ? (
                                <Link
                                  href={href(`/panel/invoices/${l.invoiceId}`)}
                                  className="hover:text-primary-ink"
                                >
                                  {label(l)}
                                </Link>
                              ) : (
                                label(l)
                              )}
                              {l.invoiceStatus && (
                                <InvoiceStatusBadge
                                  status={l.invoiceStatus as InvoiceStatus}
                                  t={f}
                                />
                              )}
                              {l.type !== "invoice" && l.invoiceNumber && (
                                <Badge variant="info">
                                  {format(f.linkedInvoice, { number: l.invoiceNumber })}
                                </Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {[
                                l.description,
                                l.accountName,
                                mode === "party" ? l.projectName : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-end align-top">
                        {l.debit ? (
                          <Money minor={l.debit} currency={g.currency} locale={locale} />
                        ) : (
                          ""
                        )}
                      </TableCell>
                      <TableCell className="text-end align-top">
                        {l.credit ? (
                          <Money minor={l.credit} currency={g.currency} locale={locale} />
                        ) : (
                          ""
                        )}
                      </TableCell>
                      <TableCell className="text-end align-top font-semibold">
                        <Money minor={l.balance} currency={g.currency} locale={locale} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2}>{t.common.total}</TableCell>
                  <TableCell className="text-end">
                    <Money minor={g.debit} currency={g.currency} locale={locale} />
                  </TableCell>
                  <TableCell className="text-end">
                    <Money minor={g.credit} currency={g.currency} locale={locale} />
                  </TableCell>
                  <TableCell className="text-end">
                    <Money minor={g.balance} currency={g.currency} locale={locale} />
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </BoxCell>
        </FrameGrid>
      ))}
    </FrameBox>
  );
}

/** The ledger's explanation as a row of its box (info icon, muted text). */
export function LedgerHint({ text }: { text: string }) {
  return (
    <FrameGrid cols={1}>
      <FrameCell className="flex items-start gap-2 py-3 text-xs leading-6 text-muted-foreground">
        <InfoIcon className="mt-1 size-3.5 shrink-0 text-info-ink" />
        {text}
      </FrameCell>
    </FrameGrid>
  );
}

/**
 * Per-currency totals (invoiced / received / paid / outstanding) as a stat
 * row: a row of the page box (`<PageHeader>{<LedgerTotals/>}</PageHeader>`).
 */
export function LedgerTotals({
  totals,
  ctx,
}: {
  totals: {
    currency: string;
    invoiced: number;
    received: number;
    paid: number;
    outstanding: number;
    balance: number;
  }[];
  ctx: PanelContext;
}) {
  const { t, locale } = ctx;
  const f = t.finance;
  return (
    // Exact amounts: one per row on phones (2×2 from sm).
    <StatRow className="max-sm:grid-cols-1">
      {(
        [
          ["invoiced", f.colInvoiced, FileTextIcon, "info"],
          ["received", f.colReceived, ArrowDownLeftIcon, "success"],
          ["paid", f.colPaid, ArrowUpRightIcon, "destructive"],
          ["outstanding", f.colOutstanding, ReceiptIcon, "warning"],
        ] as const
      ).map(([k, label, icon, tone]) => (
        <KpiCard
          key={k}
          label={label}
          icon={icon}
          tone={tone}
          value={
            totals.length === 0 ? (
              "—"
            ) : (
              <span className="flex min-w-0 flex-col gap-0.5">
                {totals.map((row, i) => (
                  <Money
                    key={row.currency}
                    minor={row[k]}
                    currency={row.currency}
                    locale={locale}
                    className={i > 0 ? "text-sm font-semibold opacity-75" : undefined}
                  />
                ))}
              </span>
            )
          }
        />
      ))}
    </StatRow>
  );
}
