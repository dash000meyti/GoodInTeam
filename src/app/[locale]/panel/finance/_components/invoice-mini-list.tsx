import Link from "next/link";
import { InvoiceStatusBadge } from "@/components/finance/invoice-status-badge";
import { Money } from "@/components/finance/money";
import { formatDate } from "@/lib/format";
import type { InvoiceStatus } from "@/server/db/schema/finance";
import type { PanelContext } from "@/server/page-context";

/** Compact invoice list (project ledger, project finance panel). */
export function InvoiceMiniList({
  invoices,
  ctx,
  empty,
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
}) {
  const { t, href, fmt, locale } = ctx;
  const f = t.finance;
  if (!invoices.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y divide-dashed">
      {invoices.map((inv) => (
        <li key={inv.id}>
          <Link href={href(`/panel/invoices/${inv.id}`)} className="group flex items-center gap-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold group-hover:text-primary" dir="ltr">
                  {inv.number}
                </span>
                <InvoiceStatusBadge status={inv.status} t={f} />
              </span>
              <span className="block text-xs text-muted-foreground">{formatDate(inv.issueDate, fmt)}</span>
            </span>
            <span className="text-end">
              <Money minor={inv.totalMinor} currency={inv.currency} locale={locale} className="block text-sm font-bold" />
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
