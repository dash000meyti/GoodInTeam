import Link from "next/link";
import { FrameCell, FrameGrid } from "@/components/shell/frame";
import { InvoiceStatusBadge } from "@/components/finance/invoice-status-badge";
import { Money, MoneyStack } from "@/components/finance/money";
import type { Locale } from "@/i18n/config";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/server/db/schema/finance";
import type { PanelContext } from "@/server/page-context";
import { FLUSH_LIST } from "./frame-bits";

/**
 * Compact invoice list (project ledger, project finance panel). `flush`: edge
 * to edge at the top of a flush BoxCell (padded rows, solid hairlines);
 * otherwise inside a padded body (dashed separators).
 */
export function InvoiceMiniList({
  invoices,
  ctx,
  empty,
  flush,
}: {
  invoices: {
    id: string;
    number: string;
    status: InvoiceStatus;
    issueDate: Date;
    currency: string;
    totalMinor: number;
    dueMinor: number;
  }[];
  ctx: PanelContext;
  empty: string;
  flush?: boolean;
}) {
  const { t, href, fmt, locale } = ctx;
  const f = t.finance;
  if (!invoices.length)
    return (
      <p
        className={cn("py-6 text-center text-sm text-muted-foreground", flush && "px-(--cell-pad)")}
      >
        {empty}
      </p>
    );
  return (
    <ul className={flush ? FLUSH_LIST : "divide-y divide-dashed divide-frame-line"}>
      {invoices.map((inv) => (
        <li key={inv.id}>
          <Link
            href={href(`/panel/invoices/${inv.id}`)}
            className={cn(
              "group flex items-center gap-3 py-2.5",
              flush && "px-(--cell-pad) py-3 transition-colors hover:bg-card",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold group-hover:text-primary-ink" dir="ltr">
                  {inv.number}
                </span>
                <InvoiceStatusBadge status={inv.status} t={f} />
              </span>
              <span className="block text-xs text-muted-foreground">
                {formatDate(inv.issueDate, fmt)}
              </span>
            </span>
            <span className="text-end">
              <Money
                minor={inv.totalMinor}
                currency={inv.currency}
                locale={locale}
                className="block text-sm font-bold"
              />
              {inv.dueMinor > 0 && inv.dueMinor !== inv.totalMinor && (
                <span className="block text-xs text-muted-foreground">
                  {f.due}: <Money minor={inv.dueMinor} currency={inv.currency} locale={locale} />
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Small per-currency totals (invoiced, outstanding…) as a nested row of cells
 * sharing the box's hairlines, at the top of a flush BoxCell. One cell per
 * item, side by side from `sm` (always for two).
 */
export function MiniTotals({
  items,
  locale,
  compact = true,
}: {
  items: (readonly [label: string, rows: { currency: string; minor: number }[]])[];
  locale: Locale;
  compact?: boolean;
}) {
  return (
    <FrameGrid as="dl" cols={1} className={items.length === 2 ? "grid-cols-2" : "sm:grid-cols-3"}>
      {items.map(([label, rows]) => (
        <FrameCell key={label} className="min-w-0 py-3">
          <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-base font-extrabold">
            <MoneyStack rows={rows} locale={locale} compact={compact} />
          </dd>
        </FrameCell>
      ))}
    </FrameGrid>
  );
}
