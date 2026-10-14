import Link from "next/link";
import { ArrowDownLeftIcon, ArrowUpRightIcon, FileTextIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/finance/invoice-status-badge";
import { formatMoneySigned, Money } from "@/components/finance/money";
import { format } from "@/i18n/format-message";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/server/db/schema/finance";
import type { LedgerLine } from "@/server/modules/finance/ledger";
import type { PanelContext } from "@/server/page-context";

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
        <Money minor={Math.abs(minor)} currency={currency} locale={ctx.locale} className="font-bold" />
      )}
    </span>
  );
}

/** One card per currency: chronological lines with debit / credit / running balance. */
export function LedgerTables({
  groups,
  ctx,
  mode,
  name,
}: {
  groups: LedgerGroup[];
  ctx: PanelContext;
  mode: "party" | "project";
  name: string;
}) {
  const { t, fmt, locale, href } = ctx;
  const f = t.finance;
  const label = (l: LedgerGroup["lines"][number]) => {
    if (l.type === "invoice") return format(f.line_invoice, { number: l.invoiceNumber ?? "" });
    if (mode === "project") return l.type === "received" ? f.line_income : f.line_expense;
    return l.type === "received" ? f.line_received : f.line_paid;
  };
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <Card key={g.currency} className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b border-dashed py-5">
            <CardTitle className="flex flex-wrap items-center gap-3">
              <Badge variant="neutral" className="font-mono text-sm">
                {g.currency}
              </Badge>
              <BalanceBadge minor={g.balance} currency={g.currency} ctx={ctx} mode={mode} />
            </CardTitle>
            {mode === "party" && (
              <CardDescription>
                {format(g.balance > 0 ? f.theyOweLong : g.balance < 0 ? f.weOweLong : f.settledLong, {
                  name,
                  amount: formatMoneySigned(Math.abs(g.balance), g.currency, locale),
                })}
              </CardDescription>
            )}
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.date}</TableHead>
                <TableHead>{t.common.description}</TableHead>
                <TableHead className="text-end">{mode === "project" ? f.colIncome : f.debit}</TableHead>
                <TableHead className="text-end">{mode === "project" ? f.colExpense : f.credit}</TableHead>
                <TableHead className="text-end">{f.colBalance}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {g.lines.map((l) => {
                const Icon =
                  l.type === "invoice" ? FileTextIcon : l.type === "received" ? ArrowDownLeftIcon : ArrowUpRightIcon;
                return (
                  <TableRow key={l.id}>
                    <TableCell className="align-top text-sm">{formatDate(l.at, fmt)}</TableCell>
                    <TableCell className="max-w-[360px] align-top whitespace-normal">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                            l.type === "invoice"
                              ? "bg-info/14 text-[#006c9c] dark:text-[#61f3f3]"
                              : l.type === "received"
                                ? "bg-success/14 text-[#118d57] dark:text-[#77ed8b]"
                                : "bg-destructive/12 text-[#b71d18] dark:text-[#ffac82]",
                          )}
                        >
                          <Icon className="size-3.5 rtl:-scale-x-100" />
                        </span>
                        <div className="min-w-0 space-y-0.5">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                            {l.invoiceId ? (
                              <Link href={href(`/panel/invoices/${l.invoiceId}`)} className="hover:text-primary">
                                {label(l)}
                              </Link>
                            ) : (
                              label(l)
                            )}
                            {l.invoiceStatus && (
                              <InvoiceStatusBadge status={l.invoiceStatus as InvoiceStatus} t={f} />
                            )}
                            {l.type !== "invoice" && l.invoiceNumber && (
                              <Badge variant="info">{format(f.linkedInvoice, { number: l.invoiceNumber })}</Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[l.description, l.accountName, mode === "party" ? l.projectName : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-end align-top">
                      {l.debit ? <Money minor={l.debit} currency={g.currency} locale={locale} /> : ""}
                    </TableCell>
                    <TableCell className="text-end align-top">
                      {l.credit ? <Money minor={l.credit} currency={g.currency} locale={locale} /> : ""}
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
        </Card>
      ))}
    </div>
  );
}

/** Per-currency summary tiles: invoiced / received / paid / outstanding. */
export function LedgerTotals({
  totals,
  ctx,
}: {
  totals: { currency: string; invoiced: number; received: number; paid: number; outstanding: number; balance: number }[];
  ctx: PanelContext;
}) {
  const { t, locale } = ctx;
  const f = t.finance;
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {(
        [
          ["invoiced", f.colInvoiced],
          ["received", f.colReceived],
          ["paid", f.colPaid],
          ["outstanding", f.colOutstanding],
        ] as const
      ).map(([k, label]) => (
        <Card key={k} className="gap-1.5 p-5">
          <p className="text-sm font-semibold text-muted-foreground">{label}</p>
          <div className="flex flex-col gap-0.5 text-xl font-extrabold">
            {totals.length === 0
              ? "—"
              : totals.map((row) => (
                  <Money key={row.currency} minor={row[k]} currency={row.currency} locale={locale} />
                ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
