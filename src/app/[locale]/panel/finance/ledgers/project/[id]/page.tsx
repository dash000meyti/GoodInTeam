import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ClockIcon,
  ExternalLinkIcon,
  FolderKanbanIcon,
  GaugeIcon,
  PlusIcon,
  ReceiptIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ColorDot } from "@/components/shared/color-dot";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { KpiCard } from "@/components/finance/kpi-card";
import { Money, MoneyStack } from "@/components/finance/money";
import { format } from "@/i18n/format-message";
import { formatHours, formatNumber } from "@/lib/format";
import { AppError } from "@/server/errors";
import { getProjectLedger } from "@/server/modules/finance/ledger";
import { panelContext } from "@/server/page-context";
import { FinanceNav } from "../../../_components/finance-nav";
import { InvoiceMiniList } from "../../../_components/invoice-mini-list";
import { LedgerTables } from "../../../_components/ledger-view";
import { TransactionFormDialog } from "../../../_components/transaction-form";
import { txFormOptions } from "../../../_lib/options";

export default async function ProjectLedgerPage({
  params,
}: PageProps<"/[locale]/panel/finance/ledgers/project/[id]">) {
  const { id } = await params;
  const ctx = await panelContext({ roles: ["owner", "admin"] });
  const { actor, t, href, locale } = ctx;
  const f = t.finance;
  const data = (() => {
    try {
      return getProjectLedger(actor, id);
    } catch (e) {
      if (e instanceof AppError && e.code === "not_found") notFound();
      throw e;
    }
  })();
  const { project, stats } = data;
  const options = txFormOptions(actor);
  const approx = stats.approximate ? "≈ " : "";

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <ColorDot color={project.color} className="size-3.5" />
            {format(f.projectLedgerOf, { name: project.name })}
          </span>
        }
        description={project.clientName ?? t.projects.noClient}
        crumbs={[
          { label: f.title, href: href("/panel/finance") },
          { label: f.ledgersTitle, href: href("/panel/finance/ledgers?tab=projects") },
          { label: project.name },
        ]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={href(`/panel/projects/${project.id}`)}>
                <ExternalLinkIcon /> {t.common.project}
              </Link>
            </Button>
            <TransactionFormDialog
              options={options}
              defaults={{ projectId: project.id, clientId: project.clientId ?? undefined }}
              trigger={
                <Button>
                  <PlusIcon /> {f.newTransaction}
                </Button>
              }
            />
          </>
        }
      />
      <FinanceNav active="ledgers" href={href} t={f} />

      <div className="mb-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
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
          label={f.colHours}
          icon={ClockIcon}
          tone="info"
          value={`${formatHours(stats.trackedMs, locale)} ${t.common.hours}`}
          hint={
            stats.effectiveRateMinor != null ? (
              <>
                {f.colEffectiveRate}:{" "}
                <Money minor={stats.effectiveRateMinor} currency={stats.currency} locale={locale} />{" "}
                {f.perHour}
              </>
            ) : undefined
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
              <span className="flex flex-col gap-2">
                <Progress value={Math.min(100, stats.budgetUsedPct)} />
                <span>
                  {f.pf_budget}:{" "}
                  <Money
                    minor={stats.budgetMinor ?? 0}
                    currency={stats.currency}
                    locale={locale}
                    compact
                  />
                  {" · "}
                  {f.budgetUsedHint}
                </span>
              </span>
            ) : undefined
          }
        />
      </div>

      <div className="grid gap-6 2xl:grid-cols-3">
        <div className="2xl:col-span-2">
          {data.groups.length === 0 ? (
            <EmptyState
              icon={FolderKanbanIcon}
              title={f.noLedgerLines}
              description={f.projectLedgerHint}
            />
          ) : (
            <LedgerTables groups={data.groups} ctx={ctx} mode="project" name={project.name} />
          )}
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptIcon className="size-4 text-muted-foreground" /> {f.invoicesTitle}
            </CardTitle>
            <CardAction>
              <Button asChild variant="soft" size="sm">
                <Link href={href(`/panel/invoices/new?projectId=${project.id}`)}>
                  <PlusIcon /> {f.newInvoice}
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">{f.colInvoiced}</p>
                <MoneyStack rows={stats.invoiced} locale={locale} compact className="font-bold" />
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">{f.colOutstanding}</p>
                <MoneyStack
                  rows={stats.outstanding}
                  locale={locale}
                  compact
                  className="font-bold"
                />
              </div>
            </div>
            <InvoiceMiniList invoices={data.invoices} ctx={ctx} empty={f.pf_noInvoices} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
