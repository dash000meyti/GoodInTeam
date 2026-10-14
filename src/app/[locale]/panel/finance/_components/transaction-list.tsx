import Link from "next/link";
import {
  ArrowDownLeftIcon,
  ArrowLeftIcon,
  ArrowLeftRightIcon,
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ReceiptIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ColorDot } from "@/components/shared/color-dot";
import { Money } from "@/components/finance/money";
import { format } from "@/i18n/format-message";
import { formatDate, formatNumber, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TransactionRow } from "@/server/modules/finance/service";
import type { PanelContext } from "@/server/page-context";
import { toFormValues, type TxFormOptions } from "../_lib/options";
import { TransactionActions } from "./transaction-actions";

type Row = TransactionRow & { delta?: number; balanceAfter?: number };

const kindIcon = {
  income: { icon: ArrowDownLeftIcon, cls: "bg-success/14 text-[#118d57] dark:text-[#77ed8b]" },
  expense: { icon: ArrowUpRightIcon, cls: "bg-destructive/12 text-[#b71d18] dark:text-[#ffac82]" },
  transfer: { icon: ArrowLeftRightIcon, cls: "bg-info/14 text-[#006c9c] dark:text-[#61f3f3]" },
} as const;

export function KindIcon({ kind, className }: { kind: Row["kind"]; className?: string }) {
  const k = kindIcon[kind];
  const Icon = k.icon;
  return (
    <span
      aria-hidden
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", k.cls, className)}
    >
      <Icon className="size-4 rtl:-scale-x-100" />
    </span>
  );
}

function title(r: Row, ctx: PanelContext) {
  const f = ctx.t.finance;
  return (
    r.description ||
    (r.invoice ? `${f.paymentFor} ${r.invoice.number}` : null) ||
    r.client?.name ||
    r.counterparty ||
    r.category?.name ||
    f[`kind_${r.kind}`]
  );
}

function Meta({ r, ctx }: { r: Row; ctx: PanelContext }) {
  const party = r.client?.name ?? r.counterparty;
  const f = ctx.t.finance;
  const bits: React.ReactNode[] = [];
  if (party && party !== title(r, ctx)) bits.push(<span key="p">{party}</span>);
  if (r.project)
    bits.push(
      <span key="pr" className="inline-flex items-center gap-1">
        <ColorDot color={r.project.color} className="size-2" />
        {r.project.name}
      </span>,
    );
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {bits.map((b, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {i > 0 && <span className="size-1 rounded-full bg-grey-500/60" />}
          {b}
        </span>
      ))}
      {r.invoice && (
        <Link href={ctx.href(`/panel/invoices/${r.invoice.id}`)} className="hover:underline">
          <Badge variant="info">
            <ReceiptIcon /> {format(f.linkedInvoice, { number: r.invoice.number })}
          </Badge>
        </Link>
      )}
      {r.status === "pending" && <Badge variant="warning">{f.status_pending}</Badge>}
      {r.tags.map((tag) => (
        <Badge key={tag} variant="neutral">
          #{tag}
        </Badge>
      ))}
    </div>
  );
}

function Amount({ r, ctx, accountId }: { r: Row; ctx: PanelContext; accountId?: string }) {
  const { locale } = ctx;
  if (r.kind === "transfer") {
    const incoming = accountId && r.transferAccountId === accountId;
    const cross = r.toAccount && r.toAccount.currency !== r.currency;
    if (incoming)
      return (
        <Money
          minor={r.transferAmountMinor ?? r.amountMinor}
          currency={r.toAccount?.currency ?? r.currency}
          locale={locale}
          signed
          tone="income"
          className="font-bold"
        />
      );
    return (
      <span className="inline-flex flex-col items-end gap-0.5">
        <Money
          minor={accountId ? -r.amountMinor : r.amountMinor}
          currency={r.currency}
          locale={locale}
          tone={accountId ? "expense" : "none"}
          className="font-bold"
        />
        {cross && r.transferAmountMinor != null && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeftIcon className="size-3 ltr:rotate-180" />
            <Money minor={r.transferAmountMinor} currency={r.toAccount!.currency} locale={locale} />
          </span>
        )}
      </span>
    );
  }
  return (
    <Money
      minor={r.kind === "income" ? r.amountMinor : -r.amountMinor}
      currency={r.currency}
      locale={locale}
      signed
      tone={r.kind === "income" ? "income" : "expense"}
      className="font-bold"
    />
  );
}

function AccountCell({ r }: { r: Row }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <ColorDot color={r.account.color} />
      {r.account.name}
      {r.toAccount && (
        <>
          <ArrowLeftIcon className="size-3.5 text-muted-foreground ltr:rotate-180" />
          {r.toAccount.name}
        </>
      )}
    </span>
  );
}

/** Responsive transaction list: table on md+, compact list on mobile. */
export function TransactionList({
  rows,
  ctx,
  options,
  accountId,
  accountCurrency,
  showBalance,
}: {
  rows: Row[];
  ctx: PanelContext;
  options: TxFormOptions;
  /** Statement mode: amounts signed relative to this account. */
  accountId?: string;
  accountCurrency?: string;
  showBalance?: boolean;
}) {
  const { t, fmt, tz, locale } = ctx;
  const f = t.finance;
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.common.date}</TableHead>
              <TableHead>{t.common.description}</TableHead>
              <TableHead>{f.category}</TableHead>
              <TableHead>{f.account}</TableHead>
              <TableHead className="text-end">{f.amount}</TableHead>
              {showBalance && <TableHead className="text-end">{f.balanceAfter}</TableHead>}
              <TableHead className="w-20">
                <span className="sr-only">{t.common.actions}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="align-top">
                  <div className="text-sm font-semibold">{formatDate(r.occurredAt, fmt)}</div>
                  <div className="text-xs text-muted-foreground">{formatTime(r.occurredAt, fmt)}</div>
                </TableCell>
                <TableCell className="max-w-[340px] align-top whitespace-normal">
                  <div className="flex items-start gap-3">
                    <KindIcon kind={r.kind} className="mt-0.5 size-8" />
                    <div className="min-w-0 space-y-1">
                      <p className="line-clamp-2 font-semibold">{title(r, ctx)}</p>
                      <Meta r={r} ctx={ctx} />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  {r.category ? (
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <ColorDot color={r.category.color} /> {r.category.name}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {r.kind === "transfer" ? f.kind_transfer : f.uncategorized}
                    </span>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <AccountCell r={r} />
                </TableCell>
                <TableCell className="text-end align-top">
                  <Amount r={r} ctx={ctx} accountId={accountId} />
                </TableCell>
                {showBalance && (
                  <TableCell className="text-end align-top text-sm text-muted-foreground">
                    {r.balanceAfter != null && (
                      <Money
                        minor={r.balanceAfter}
                        currency={accountCurrency ?? r.currency}
                        locale={locale}
                      />
                    )}
                  </TableCell>
                )}
                <TableCell className="align-top">
                  <TransactionActions transaction={toFormValues(r, tz)} options={options} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y divide-dashed md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="flex items-start gap-3 px-4 py-3">
            <KindIcon kind={r.kind} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-sm font-semibold">{title(r, ctx)}</p>
                <span className="shrink-0 text-sm">
                  <Amount r={r} ctx={ctx} accountId={accountId} />
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(r.occurredAt, fmt)} · {r.account.name}
                {r.toAccount ? `${ctx.locale === "fa" ? " ← " : " → "}${r.toAccount.name}` : ""}
                {r.category ? ` · ${r.category.name}` : ""}
              </p>
              <Meta r={r} ctx={ctx} />
            </div>
            <TransactionActions transaction={toFormValues(r, tz)} options={options} />
          </li>
        ))}
      </ul>
    </>
  );
}

/** Prev/next pagination that keeps the current query string. */
export function Pager({
  page,
  pages,
  makeHref,
  ctx,
  summary,
}: {
  page: number;
  pages: number;
  makeHref: (page: number) => string;
  ctx: PanelContext;
  summary?: React.ReactNode;
}) {
  const f = ctx.t.finance;
  const Prev = ctx.locale === "fa" ? ChevronRightIcon : ChevronLeftIcon;
  const Next = ctx.locale === "fa" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed px-5 py-3 text-sm text-muted-foreground">
      <span>{summary}</span>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon-sm" aria-disabled={page <= 1}>
            <Link
              href={makeHref(Math.max(1, page - 1))}
              aria-label={ctx.t.common.previous}
              className={cn(page <= 1 && "pointer-events-none opacity-40")}
            >
              <Prev />
            </Link>
          </Button>
          <span className="tabular-nums">
            {format(f.pageOf, {
              page: formatNumber(page, ctx.locale),
              pages: formatNumber(pages, ctx.locale),
            })}
          </span>
          <Button asChild variant="outline" size="icon-sm" aria-disabled={page >= pages}>
            <Link
              href={makeHref(Math.min(pages, page + 1))}
              aria-label={ctx.t.common.next}
              className={cn(page >= pages && "pointer-events-none opacity-40")}
            >
              <Next />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
