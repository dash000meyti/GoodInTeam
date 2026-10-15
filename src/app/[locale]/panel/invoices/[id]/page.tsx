import { notFound } from "next/navigation";
import {
  BanknoteIcon,
  CheckCircle2Icon,
  EyeIcon,
  FilePlusIcon,
  SendIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/shared/copy-button";
import { PageHeader } from "@/components/panel/page-header";
import { InvoiceDocument, InvoicePrintStyles } from "@/components/finance/invoice-document";
import { InvoiceStatusBadge } from "@/components/finance/invoice-status-badge";
import { Money } from "@/components/finance/money";
import { PrintButton } from "@/components/finance/print-button";
import { PrintLightMode } from "@/components/finance/print-light-mode";
import { format } from "@/i18n/format-message";
import { env } from "@/lib/env";
import { formatDate, formatDateTime } from "@/lib/format";
import { isAdmin } from "@/server/auth/actor";
import { AppError } from "@/server/errors";
import { getInvoice } from "@/server/modules/finance/invoices";
import { accountOptions } from "@/server/modules/finance/service";
import { getSettings } from "@/server/modules/settings/service";
import { panelContext } from "@/server/page-context";
import { MarkViewed } from "../../../i/[token]/mark-viewed";
import { InvoiceActions } from "../_components/invoice-actions";

export default async function InvoicePage({ params }: PageProps<"/[locale]/panel/invoices/[id]">) {
  const { id } = await params;
  const ctx = await panelContext({ roles: ["owner", "admin", "client"] });
  const { actor, t, href, locale, fmt } = ctx;
  const f = t.finance;
  const inv = await getInvoice(actor, id).catch((e) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  const admin = isAdmin(actor);
  const profile = getSettings("profile");
  const business = getSettings("business");
  const publicPath = inv.shareToken ? href(`/i/${inv.shareToken}`) : null;
  const publicUrl = publicPath ? `${env.siteUrl}${publicPath}` : null;

  const timeline: { at: Date; label: string; icon: LucideIcon; detail?: React.ReactNode }[] = [
    {
      at: inv.createdAt,
      label: f.ev_created,
      icon: FilePlusIcon,
      detail: inv.createdByName ? format(f.createdBy, { name: inv.createdByName }) : undefined,
    },
    ...(inv.sentAt ? [{ at: inv.sentAt, label: f.ev_sent, icon: SendIcon }] : []),
    ...(inv.viewedAt ? [{ at: inv.viewedAt, label: f.ev_viewed, icon: EyeIcon }] : []),
    ...inv.payments.map((p) => ({
      at: p.occurredAt,
      label: f.ev_payment,
      icon: BanknoteIcon,
      detail: (
        <Money
          minor={p.amountMinor}
          currency={p.currency}
          locale={locale}
          className="font-semibold"
        />
      ),
    })),
    ...(inv.paidAt && inv.status === "paid"
      ? [{ at: inv.paidAt, label: f.ev_paid, icon: CheckCircle2Icon }]
      : []),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <>
      <InvoicePrintStyles />
      <PrintLightMode />
      {/* A client opening it in the portal counts as viewing it. */}
      {!admin && inv.shareToken && <MarkViewed token={inv.shareToken} />}
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {f.invoice} <span dir="ltr">{inv.number}</span>
            <InvoiceStatusBadge status={inv.status} t={f} />
          </span>
        }
        description={[inv.client?.name, inv.project?.name].filter(Boolean).join(" · ") || undefined}
        crumbs={[
          ...(admin ? [{ label: f.title, href: href("/panel/finance") }] : []),
          { label: f.invoicesTitle, href: href("/panel/invoices") },
          { label: inv.number },
        ]}
        actions={
          admin ? (
            <InvoiceActions
              invoice={{
                id: inv.id,
                number: inv.number,
                status: inv.status,
                currency: inv.currency,
                dueMinor: inv.dueMinor,
              }}
              publicUrl={publicUrl}
              accounts={accountOptions(actor)}
            />
          ) : (
            <>
              {publicPath && (
                <Button asChild variant="outline">
                  <a href={publicPath} target="_blank" rel="noopener">
                    <EyeIcon /> {f.viewOnline}
                  </a>
                </Button>
              )}
              <PrintButton label={f.print} />
            </>
          )
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <InvoiceDocument
          invoice={inv}
          brand={{
            name: profile.brandName[locale] || t.common.appName,
            email: profile.email,
            phone: profile.phone,
            location: profile.location[locale],
          }}
          paymentInstructions={business.paymentInstructions[locale]}
          locale={locale}
          fmt={fmt}
          t={t}
        />

        <aside className="space-y-6 print:hidden">
          {admin && (
            <Card>
              <CardHeader>
                <CardTitle>{f.shareLink}</CardTitle>
                <CardDescription>{publicUrl ? f.shareLinkHint : f.notSentYet}</CardDescription>
              </CardHeader>
              {publicUrl && (
                <CardContent className="flex gap-2">
                  <Input
                    readOnly
                    value={publicUrl}
                    dir="ltr"
                    className="font-mono text-xs"
                    aria-label={f.shareLink}
                  />
                  <CopyButton value={publicUrl} size="icon-sm" />
                </CardContent>
              )}
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{f.payments}</CardTitle>
              <CardDescription>
                {f.paidAmount}:{" "}
                <Money minor={inv.paidMinor} currency={inv.currency} locale={locale} />
                {inv.dueMinor > 0 && (
                  <>
                    {" · "}
                    {f.due}: <Money minor={inv.dueMinor} currency={inv.currency} locale={locale} />
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inv.payments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{f.noPayments}</p>
              ) : (
                <ul className="divide-y divide-dashed">
                  {inv.payments.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm"
                    >
                      <span>
                        <span className="block font-semibold">{formatDate(p.occurredAt, fmt)}</span>
                        {admin && (
                          <span className="block text-xs text-muted-foreground">
                            {p.accountName}
                          </span>
                        )}
                      </span>
                      <Money
                        minor={p.amountMinor}
                        currency={p.currency}
                        locale={locale}
                        tone="income"
                        className="font-bold"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {admin && (
            <Card>
              <CardHeader>
                <CardTitle>{f.timeline}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="relative space-y-4 before:absolute before:inset-y-2 before:start-[13px] before:w-px before:bg-border">
                  {timeline.map((e, i) => {
                    const Icon = e.icon;
                    return (
                      <li key={i} className="relative flex gap-3">
                        <span className="z-10 flex size-7 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground">
                          <Icon className="size-3.5 rtl:-scale-x-100" />
                        </span>
                        <span className="min-w-0 text-sm">
                          <span className="block font-semibold">{e.label}</span>
                          <span className="block text-xs text-muted-foreground">
                            {formatDateTime(e.at, fmt)}
                          </span>
                          {e.detail && (
                            <span className="block text-xs text-muted-foreground">{e.detail}</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
