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
import { Progress } from "@/components/ui/progress";
import { ColorDot } from "@/components/shared/color-dot";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { StatRow } from "@/components/panel/stat-card";
import { FrameBox, FrameGrid } from "@/components/shell/frame";
import { KpiCard } from "@/components/finance/kpi-card";
import { Money } from "@/components/finance/money";
import { format } from "@/i18n/format-message";
import { formatHours, formatNumber } from "@/lib/format";
import { AppError } from "@/server/errors";
import { getProjectLedger } from "@/server/modules/finance/ledger";
import { panelContext } from "@/server/page-context";
import { FinanceNav } from "../../../_components/finance-nav";
import { BoxCell } from "../../../_components/frame-bits";
import { InvoiceMiniList, MiniTotals } from "../../../_components/invoice-mini-list";
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
      >
        <FinanceNav active="ledgers" href={href} t={f} />
        <StatRow>
          <KpiCard
            label={f.colIncome}
            icon={ArrowDownLeftIcon}
            tone="success"
            value={
              <>
                {approx}
                <Money
                  minor={stats.incomeMinor}
                  currency={stats.currency}
                  locale={locale}
                  compact
                />
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
                <Money
                  minor={stats.expenseMinor}
                  currency={stats.currency}
                  locale={locale}
                  compact
                />
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
                  <Money
                    minor={stats.effectiveRateMinor}
                    currency={stats.currency}
                    locale={locale}
                  />{" "}
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
        </StatRow>
      </PageHeader>

      {/* The ledger box and, beside it from 2xl, the project's invoices box. */}
      <div className="grid items-start gap-6 lg:gap-8 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {data.groups.length === 0 ? (
          <EmptyState
            icon={FolderKanbanIcon}
            title={f.noLedgerLines}
            description={f.projectLedgerHint}
          />
        ) : (
          <LedgerTables
            groups={data.groups}
            ctx={ctx}
            mode="project"
            name={project.name}
            hint={f.projectLedgerHint}
          />
        )}
        <FrameBox as="aside" density="compact" ariaLabel={f.invoicesTitle}>
          <FrameGrid cols={1}>
            <BoxCell
              title={f.invoicesTitle}
              titleId="ledger-invoices"
              icon={<ReceiptIcon className="size-4 text-muted-foreground" />}
              flush
              action={
                <Button asChild variant="soft" size="sm">
                  <Link href={href(`/panel/invoices/new?projectId=${project.id}`)}>
                    <PlusIcon /> {f.newInvoice}
                  </Link>
                </Button>
              }
            >
              <MiniTotals
                items={[
                  [f.colInvoiced, stats.invoiced],
                  [f.colOutstanding, stats.outstanding],
                ]}
                locale={locale}
              />
              <InvoiceMiniList invoices={data.invoices} ctx={ctx} empty={f.pf_noInvoices} flush />
            </BoxCell>
          </FrameGrid>
        </FrameBox>
      </div>
    </>
  );
}
