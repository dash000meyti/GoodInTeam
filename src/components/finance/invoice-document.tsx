import { LogoMark } from "@/components/brand/logo";
import type { Locale } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import type { Messages } from "@/i18n/messages";
import { formatDate, formatNumber, type FormatOptions } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/server/db/schema/finance";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { Money } from "./money";

export interface InvoiceDocData {
  number: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date | null;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  taxBps: number;
  totalMinor: number;
  paidMinor: number;
  dueMinor: number;
  notes: string | null;
  terms: string | null;
  items: {
    id: string;
    description: string;
    quantity: number;
    unitPriceMinor: number;
    amountMinor: number;
  }[];
  client: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    taxId: string | null;
  } | null;
  project: { name: string } | null;
}

export interface InvoiceBrand {
  name: string;
  email: string;
  phone: string;
  location: string;
}

/**
 * The invoice as a printable document (panel detail + public page). Pure
 * presentational component; `#invoice-doc` is targeted by <InvoicePrintStyles/>.
 */
export function InvoiceDocument({
  invoice,
  brand,
  paymentInstructions,
  locale,
  fmt,
  t,
  className,
}: {
  invoice: InvoiceDocData;
  brand: InvoiceBrand;
  paymentInstructions?: string | null;
  locale: Locale;
  fmt: FormatOptions;
  t: Messages;
  className?: string;
}) {
  const f = t.finance;
  const cur = invoice.currency;
  const showPaid = invoice.paidMinor > 0;
  const taxPct = formatNumber(invoice.taxBps / 10_000, locale, {
    style: "percent",
    maximumFractionDigits: 2,
  });
  const stamp =
    invoice.status === "paid" ? f.paidStamp : invoice.status === "void" ? f.voidStamp : null;

  return (
    <article
      id="invoice-doc"
      className={cn(
        "relative overflow-hidden rounded-2xl bg-card text-card-foreground shadow-card dark:border dark:border-border",
        className,
      )}
    >
      <div aria-hidden className="h-1.5 bg-primary" />
      <div className="space-y-8 p-5 sm:p-10">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <LogoMark className="size-11 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-xl font-black tracking-tight">{brand.name}</p>
              {brand.location && <p className="text-sm text-muted-foreground">{brand.location}</p>}
              {brand.email && (
                <p className="text-sm text-muted-foreground">
                  <span dir="ltr">{brand.email}</span>
                </p>
              )}
              {brand.phone && (
                <p className="text-sm text-muted-foreground">
                  <span dir="ltr">{brand.phone}</span>
                </p>
              )}
            </div>
          </div>
          <div className="space-y-1.5 sm:text-end">
            <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
              {f.invoice}
            </p>
            <p className="text-2xl font-black tracking-tight">
              <span dir="ltr">{invoice.number}</span>
            </p>
            <InvoiceStatusBadge status={invoice.status} t={f} className="print:hidden" />
          </div>
        </header>

        <section className="grid gap-6 rounded-xl bg-muted/60 p-5 sm:grid-cols-2">
          <div className="min-w-0 space-y-1 text-sm">
            <p className="text-xs font-bold text-muted-foreground">{f.billTo}</p>
            {invoice.client ? (
              <>
                <p className="text-base font-bold">{invoice.client.name}</p>
                {invoice.client.address && (
                  <p className="whitespace-pre-line text-muted-foreground">
                    {invoice.client.address}
                  </p>
                )}
                {invoice.client.email && (
                  <p className="text-muted-foreground">
                    <span dir="ltr">{invoice.client.email}</span>
                  </p>
                )}
                {invoice.client.phone && (
                  <p className="text-muted-foreground">
                    <span dir="ltr">{invoice.client.phone}</span>
                  </p>
                )}
                {invoice.client.taxId && (
                  <p className="text-muted-foreground">
                    {f.taxId}: <span dir="ltr">{invoice.client.taxId}</span>
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </div>
          <dl className="grid grid-cols-[auto_1fr] content-start gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{f.issueDate}</dt>
            <dd className="font-semibold">{formatDate(invoice.issueDate, fmt)}</dd>
            <dt className="text-muted-foreground">{f.dueDate}</dt>
            <dd className="font-semibold">
              {invoice.dueDate ? formatDate(invoice.dueDate, fmt) : f.noDueDate}
            </dd>
            {invoice.project && (
              <>
                <dt className="text-muted-foreground">{f.project}</dt>
                <dd className="font-semibold">{invoice.project.name}</dd>
              </>
            )}
            <dt className="text-muted-foreground">{f.currency}</dt>
            <dd className="font-semibold">{cur}</dd>
          </dl>
        </section>

        <ul className="divide-y divide-dashed border-y border-foreground/10 sm:hidden print:hidden">
          {invoice.items.map((it) => (
            <li key={it.id} className="flex items-start justify-between gap-4 py-3 text-sm">
              <span className="min-w-0">
                <span className="block font-medium whitespace-pre-line">{it.description}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatNumber(it.quantity, locale, { maximumFractionDigits: 2 })} ×{" "}
                  <Money minor={it.unitPriceMinor} currency={cur} locale={locale} />
                </span>
              </span>
              <Money
                minor={it.amountMinor}
                currency={cur}
                locale={locale}
                className="shrink-0 font-semibold"
              />
            </li>
          ))}
        </ul>
        <div className="hidden sm:block print:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-foreground/10 text-xs text-muted-foreground">
                <th className="w-8 py-2 text-start font-semibold">#</th>
                <th className="py-2 text-start font-semibold">{f.itemDescription}</th>
                <th className="py-2 text-end font-semibold">{f.quantity}</th>
                <th className="py-2 text-end font-semibold">{f.unitPrice}</th>
                <th className="py-2 text-end font-semibold">{f.lineAmount}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, i) => (
                <tr key={it.id} className="border-b border-dashed align-top last:border-0">
                  <td className="py-3 text-muted-foreground tabular-nums">
                    {formatNumber(i + 1, locale)}
                  </td>
                  <td className="py-3 pe-4 font-medium whitespace-pre-line">{it.description}</td>
                  <td className="py-3 text-end tabular-nums">
                    {formatNumber(it.quantity, locale, { maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 ps-3 text-end">
                    <Money minor={it.unitPriceMinor} currency={cur} locale={locale} />
                  </td>
                  <td className="py-3 ps-3 text-end font-semibold">
                    <Money minor={it.amountMinor} currency={cur} locale={locale} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="flex flex-col-reverse gap-8 sm:flex-row sm:items-start sm:justify-between">
          {invoice.notes ? (
            <p className="min-w-0 flex-1 text-sm whitespace-pre-line text-muted-foreground">
              {invoice.notes}
            </p>
          ) : (
            <span aria-hidden className="hidden sm:block" />
          )}
          <dl className="w-full space-y-2 text-sm sm:w-80">
            <Row label={f.subtotal}>
              <Money minor={invoice.subtotalMinor} currency={cur} locale={locale} />
            </Row>
            {invoice.discountMinor > 0 && (
              <Row label={f.discount}>
                <Money minor={-invoice.discountMinor} currency={cur} locale={locale} />
              </Row>
            )}
            {invoice.taxBps > 0 && (
              <Row label={format(f.taxLine, { pct: taxPct })}>
                <Money
                  minor={invoice.totalMinor - invoice.subtotalMinor + invoice.discountMinor}
                  currency={cur}
                  locale={locale}
                />
              </Row>
            )}
            <Row label={f.total} strong>
              <Money minor={invoice.totalMinor} currency={cur} locale={locale} />
            </Row>
            {showPaid && (
              <Row label={f.paidAmount}>
                <Money minor={-invoice.paidMinor} currency={cur} locale={locale} />
              </Row>
            )}
            {invoice.status !== "void" && (
              <div className="mt-3 flex items-center justify-between gap-4 rounded-xl bg-primary/10 px-4 py-3 text-primary-dark dark:text-primary-light">
                <dt className="font-bold">{f.amountDue}</dt>
                <dd className="text-lg font-black">
                  <Money minor={invoice.dueMinor} currency={cur} locale={locale} />
                </dd>
              </div>
            )}
          </dl>
        </section>

        {(paymentInstructions || invoice.terms) && (
          <footer className="grid gap-6 border-t border-dashed pt-6 text-sm sm:grid-cols-2">
            {paymentInstructions && (
              <div className="space-y-1">
                <p className="font-bold">{f.paymentInstructions}</p>
                <p className="whitespace-pre-line text-muted-foreground">{paymentInstructions}</p>
              </div>
            )}
            {invoice.terms && (
              <div className="space-y-1">
                <p className="font-bold">{f.termsLabel}</p>
                <p className="whitespace-pre-line text-muted-foreground">{invoice.terms}</p>
              </div>
            )}
          </footer>
        )}

        <p className="text-center text-sm text-muted-foreground">{f.thankYou}</p>
      </div>

      {stamp && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute end-6 top-28 rotate-[-12deg] rounded-xl border-[3px] px-4 py-1 text-2xl font-black tracking-widest uppercase opacity-80 select-none sm:end-12 sm:top-32 sm:text-3xl",
            invoice.status === "paid"
              ? "border-success text-success"
              : "border-destructive text-destructive",
          )}
        >
          {stamp}
        </div>
      )}
    </article>
  );
}

function Row({
  label,
  strong,
  children,
}: {
  label: string;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4",
        strong && "border-t border-foreground/10 pt-2 text-base font-bold",
      )}
    >
      <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

/**
 * Print rules for pages showing <InvoiceDocument/>: A4 page, only the document
 * is printed, always with light colors.
 */
export function InvoicePrintStyles() {
  return (
    <style>{`
@media print {
  @page { size: A4; margin: 12mm; }
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  #invoice-doc, #invoice-doc * { visibility: visible !important; }
  #invoice-doc {
    position: absolute; inset-inline: 0; top: 0; margin: 0 !important;
    box-shadow: none !important; border: 0 !important; border-radius: 0 !important;
    --background: #fff; --card: #fff; --card-foreground: #1c252e; --foreground: #1c252e;
    --muted: #f4f6f8; --muted-foreground: #637381; --border: rgb(145 158 171 / .3);
    background: #fff !important; color: #1c252e;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
}`}</style>
  );
}
