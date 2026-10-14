import Link from "next/link";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BookOpenTextIcon,
  GaugeIcon,
  PlusIcon,
  ReceiptIcon,
  ScaleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { KpiCard } from "@/components/finance/kpi-card";
import { Money, MoneyStack } from "@/components/finance/money";
import { formatDate, formatHours, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AppError } from "@/server/errors";
import { getProjectFinance } from "@/server/modules/finance/ledger";
import type { PanelContext } from "@/server/page-context";
import { txFormOptions } from "../_lib/options";
import { InvoiceMiniList } from "./invoice-mini-list";
import { KindIcon } from "./transaction-list";
import { TransactionFormDialog } from "./transaction-form";

/**
 * Finance block for the project page (wired in by the projects module).
 *
 *   <ProjectFinancePanel projectId={project.id} ctx={ctx} clientView={isClient} />
 *
 * - owner/admin: income, expenses, net, budget usage, invoices, recent transactions.
 * - clientView (client users — or admins previewing the portal): only the client's
 *   non-draft invoices and payments, and only when the project has `shareFinance`.
 * Renders nothing when the viewer may not see project finance.
 */
export async function ProjectFinancePanel({
  projectId,
  ctx,
  clientView = false,
}: {
  projectId: string;
  ctx: PanelContext;
  clientView?: boolean;
}) {
  let data: ReturnType<typeof getProjectFinance>;
  try {
    data = getProjectFinance(ctx.actor, projectId, { clientView });
  } catch (e) {
    if (e instanceof AppError && (e.code === "forbidden" || e.code === "not_found")) return null;
    throw e;
  }
  if (!data.visible) return null;
  const { t, href, locale, fmt } = ctx;
  const f = t.finance;

  if (data.mode === "client") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{f.pf_clientTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                [f.pf_invoiced, data.totals.invoiced],
                [f.pf_paid, data.totals.paid],
                [f.pf_outstanding, data.totals.outstanding],
              ] as const
            ).map(([label, rows]) => (
              <div key={label} className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                <MoneyStack rows={rows} locale={locale} className="mt-1 text-lg font-extrabold" />
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-bold">{f.invoicesTitle}</h3>
              <InvoiceMiniList invoices={data.invoices} ctx={ctx} empty={f.pf_noInvoices} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-bold">{f.payments}</h3>
              {data.payments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{f.noPayments}</p>
              ) : (
                <ul className="divide-y divide-dashed">
                  {data.payments.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-2.5 text-sm">
                      <KindIcon kind="income" className="size-8" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{formatDate(p.occurredAt, fmt)}</span>
                        {p.invoiceNumber && (
                          <span className="block text-xs text-muted-foreground" dir="ltr">
                            {p.invoiceNumber}
                          </span>
                        )}
                      </span>
                      <Money
                        minor={p.amountMinor}
                        currency={p.currency}
                        locale={locale}
                        className="font-bold"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { stats } = data;
  const approx = stats.approximate ? "≈ " : "";
  const net = stats.incomeMinor - stats.expenseMinor;
  const options = txFormOptions(ctx.actor);
  return (
    <section className="space-y-6" aria-label={f.pf_title}>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={f.colIncome}
          icon={ArrowDownLeftIcon}
          tone="success"
          value={
            <>
              {approx}
              <Money minor={stats.incomeMinor} currency={stats.currency} locale={locale} compact />
            </>
          }
        />
        <KpiCard
          label={f.colExpense}
          icon={ArrowUpRightIcon}
          tone="destructive"
          value={
            <>
              {approx}
              <Money minor={stats.expenseMinor} currency={stats.currency} locale={locale} compact />
            </>
          }
        />
        <KpiCard
          label={f.colNet}
          icon={ScaleIcon}
          tone="info"
          value={
            <>
              {approx}
              <Money minor={net} currency={stats.currency} locale={locale} compact />
            </>
          }
          hint={
            <>
              {formatHours(stats.trackedMs, locale)} {t.common.hours}
              {stats.effectiveRateMinor != null && (
                <>
                  {" · "}
                  {f.colEffectiveRate}:{" "}
                  <Money
                    minor={stats.effectiveRateMinor}
                    currency={stats.currency}
                    locale={locale}
                    compact
                  />
                </>
              )}
            </>
          }
        />
        <KpiCard
          label={f.colBudgetUsed}
          icon={GaugeIcon}
          tone="warning"
          value={
            stats.budgetUsedPct != null
              ? formatNumber(stats.budgetUsedPct / 100, locale, {
                  style: "percent",
                  maximumFractionDigits: 0,
                })
              : "—"
          }
          hint={
            stats.budgetUsedPct != null ? (
              <span className="flex flex-col gap-2" title={f.budgetUsedHint}>
                <Progress
                  value={Math.min(100, stats.budgetUsedPct)}
                  indicatorClassName={cn(
                    stats.budgetUsedPct > 100
                      ? "bg-destructive"
                      : stats.budgetUsedPct > 80
                        ? "bg-warning"
                        : undefined,
                  )}
                />
                <span>
                  {f.pf_timeValue}:{" "}
                  <Money
                    minor={stats.timeValueMinor}
                    currency={stats.currency}
                    locale={locale}
                    compact
                  />{" "}
                  /{" "}
                  <Money
                    minor={stats.budgetMinor ?? 0}
                    currency={stats.currency}
                    locale={locale}
                    compact
                  />
                </span>
              </span>
            ) : undefined
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptIcon className="size-4 text-muted-foreground" /> {f.invoicesTitle}
            </CardTitle>
            <CardDescription>
              {f.colOutstanding}: <MoneyStack rows={stats.outstanding} locale={locale} compact />
            </CardDescription>
            <CardAction>
              <Button asChild variant="soft" size="sm">
                <Link href={href(`/panel/invoices/new?projectId=${projectId}`)}>
                  <PlusIcon /> {f.pf_newInvoice}
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <InvoiceMiniList invoices={data.invoices} ctx={ctx} empty={f.pf_noInvoices} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{f.pf_recent}</CardTitle>
            <CardAction className="flex gap-1">
              <Button asChild variant="ghost" size="sm">
                <Link href={href(`/panel/finance/ledgers/project/${projectId}`)}>
                  <BookOpenTextIcon /> {f.pf_viewLedger}
                </Link>
              </Button>
              <TransactionFormDialog
                options={options}
                defaults={{ projectId }}
                trigger={
                  <Button variant="soft" size="icon-sm" aria-label={f.newTransaction}>
                    <PlusIcon />
                  </Button>
                }
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            {data.recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{f.txEmpty}</p>
            ) : (
              <ul className="divide-y divide-dashed">
                {data.recent.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2.5">
                    <KindIcon kind={r.kind} className="size-8" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {r.description ||
                          (r.invoiceNumber ? `${f.paymentFor} ${r.invoiceNumber}` : null) ||
                          r.clientName ||
                          r.counterparty ||
                          f[`kind_${r.kind}`]}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(r.occurredAt, fmt)}
                      </span>
                    </span>
                    <Money
                      minor={r.kind === "income" ? r.amountMinor : -r.amountMinor}
                      currency={r.currency}
                      locale={locale}
                      signed
                      tone={r.kind === "income" ? "income" : "expense"}
                      className="text-sm font-bold"
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
