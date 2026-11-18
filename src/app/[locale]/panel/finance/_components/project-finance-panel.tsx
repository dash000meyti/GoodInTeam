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
import { Progress } from "@/components/ui/progress";
import { StatGrid } from "@/components/panel/stat-card";
import { FrameBox, FrameGrid } from "@/components/shell/frame";
import { KpiCard } from "@/components/finance/kpi-card";
import { Money, MoneyStack } from "@/components/finance/money";
import { formatDate, formatHours, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AppError } from "@/server/errors";
import { getProjectFinance } from "@/server/modules/finance/ledger";
import type { PanelContext } from "@/server/page-context";
import { txFormOptions } from "../_lib/options";
import { BoxCell, FLUSH_LIST } from "./frame-bits";
import { InvoiceMiniList, MiniTotals } from "./invoice-mini-list";
import { KindIcon } from "./transaction-list";
import { TransactionFormDialog } from "./transaction-form";

/**
 * Finance block for the project page (wired in by the projects module), as
 * framed boxes at panel density.
 *
 *   <ProjectFinancePanel projectId={project.id} ctx={ctx} clientView={isClient} />
 *
 * - owner/admin: a stat grid (income, expenses, net, budget usage), then one
 *   box with the invoices and the recent transactions as two cells.
 * - clientView (client users — or admins previewing the portal): one box with
 *   the totals row, then the client's non-draft invoices and payments as two
 *   cells — only when the project has `shareFinance`.
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
      <FrameBox as="section" density="compact" ariaLabel={f.pf_clientTitle}>
        <FrameGrid cols={1}>
          <BoxCell title={f.pf_clientTitle} titleId="pf-client" flush>
            <MiniTotals
              items={[
                [f.pf_invoiced, data.totals.invoiced],
                [f.pf_paid, data.totals.paid],
                [f.pf_outstanding, data.totals.outstanding],
              ]}
              locale={locale}
              compact={false}
            />
          </BoxCell>
        </FrameGrid>
        <FrameGrid cols={1} className="lg:grid-cols-2">
          <BoxCell title={f.invoicesTitle} titleId="pf-client-invoices" flush>
            <InvoiceMiniList invoices={data.invoices} ctx={ctx} empty={f.pf_noInvoices} flush />
          </BoxCell>
          <BoxCell title={f.payments} titleId="pf-client-payments" flush>
            {data.payments.length === 0 ? (
              <p className="px-(--cell-pad) py-6 text-center text-sm text-muted-foreground">
                {f.noPayments}
              </p>
            ) : (
              <ul className={FLUSH_LIST}>
                {data.payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-(--cell-pad) py-3 text-sm">
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
          </BoxCell>
        </FrameGrid>
      </FrameBox>
    );
  }

  const { stats } = data;
  const approx = stats.approximate ? "≈ " : "";
  const net = stats.incomeMinor - stats.expenseMinor;
  const options = txFormOptions(ctx.actor);
  return (
    <section className="flex flex-col gap-6 lg:gap-8" aria-label={f.pf_title}>
      <StatGrid>
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
      </StatGrid>

      <FrameBox as="div" density="compact">
        <FrameGrid cols={1} className="lg:grid-cols-2">
          <BoxCell
            title={f.invoicesTitle}
            titleId="pf-invoices"
            icon={<ReceiptIcon className="size-4 text-muted-foreground" />}
            description={
              <>
                {f.colOutstanding}: <MoneyStack rows={stats.outstanding} locale={locale} compact />
              </>
            }
            flush
            action={
              <Button asChild variant="soft" size="sm">
                <Link href={href(`/panel/invoices/new?projectId=${projectId}`)}>
                  <PlusIcon /> {f.pf_newInvoice}
                </Link>
              </Button>
            }
          >
            <InvoiceMiniList invoices={data.invoices} ctx={ctx} empty={f.pf_noInvoices} flush />
          </BoxCell>
          <BoxCell
            title={f.pf_recent}
            titleId="pf-recent"
            flush
            action={
              <>
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
              </>
            }
          >
            {data.recent.length === 0 ? (
              <p className="px-(--cell-pad) py-6 text-center text-sm text-muted-foreground">
                {f.txEmpty}
              </p>
            ) : (
              <ul className={FLUSH_LIST}>
                {data.recent.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-(--cell-pad) py-3">
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
          </BoxCell>
        </FrameGrid>
      </FrameBox>
    </section>
  );
}
