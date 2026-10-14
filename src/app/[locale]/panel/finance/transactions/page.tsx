import { ArrowLeftRightIcon, DownloadIcon, PlusIcon, SearchXIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { MoneyStack } from "@/components/finance/money";
import { format } from "@/i18n/format-message";
import { formatNumber } from "@/lib/format";
import { subtractByCurrency } from "@/server/modules/finance/calc";
import { listTransactions } from "@/server/modules/finance/service";
import { panelContext } from "@/server/page-context";
import { FinanceNav } from "../_components/finance-nav";
import { ImportDialog } from "../_components/import-dialog";
import { TransactionFilters } from "../_components/transaction-filters";
import { TransactionFormDialog } from "../_components/transaction-form";
import { Pager, TransactionList } from "../_components/transaction-list";
import { filtersQuery, parseTxFilters } from "../_lib/filters";
import { txFormOptions } from "../_lib/options";

/**
 * Filters live in the URL: keep the page (and the focused search box) mounted
 * while new results load instead of flashing a skeleton → allowed to block.
 */
export const instant = false;

export default async function TransactionsPage({
  searchParams,
}: PageProps<"/[locale]/panel/finance/transactions">) {
  const ctx = await panelContext({ roles: ["owner", "admin"] });
  const { actor, t, href, locale } = ctx;
  const f = t.finance;
  const { filters, page } = parseTxFilters(await searchParams);
  const list = listTransactions(actor, { ...filters, page });
  const options = txFormOptions(actor);
  const hasFilters = Object.values(filters).some(Boolean);
  const base = href("/panel/finance/transactions");
  const qs = filtersQuery(filters);

  const newButton = (
    <TransactionFormDialog
      options={options}
      defaults={{
        kind: filters.kind,
        accountId: filters.accountId,
        projectId: filters.projectId,
        clientId: filters.clientId,
      }}
      trigger={
        <Button>
          <PlusIcon /> {f.newTransaction}
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader
        title={f.transactionsTitle}
        description={f.transactionsSubtitle}
        crumbs={[{ label: f.title, href: href("/panel/finance") }, { label: f.transactionsTitle }]}
        actions={
          <>
            <ImportDialog
              trigger={
                <Button variant="outline">
                  <UploadIcon /> {f.importCsv}
                </Button>
              }
            />
            <Button asChild variant="outline">
              <a href={`/api/finance/transactions?${qs ? `${qs}&` : ""}locale=${locale}`} download>
                <DownloadIcon /> {f.exportCsv}
              </a>
            </Button>
            {newButton}
          </>
        }
      />
      <FinanceNav active="transactions" href={href} t={f} />

      {list.total === 0 && !hasFilters ? (
        <EmptyState
          icon={ArrowLeftRightIcon}
          title={f.txEmpty}
          description={f.txEmptyHint}
          action={newButton}
        />
      ) : (
        <>
          <TransactionFilters values={filters} options={options} basePath={base} />
          {list.total === 0 ? (
            <EmptyState icon={SearchXIcon} title={f.txNoMatch} />
          ) : (
            <Card className="gap-0 overflow-hidden py-0">
              <div className="flex flex-wrap items-start gap-x-8 gap-y-3 border-b border-dashed px-5 py-4 text-sm">
                <span className="font-bold text-muted-foreground">{f.filteredTotals}</span>
                <Totals label={f.colIncome}>
                  <MoneyStack
                    rows={list.totals.income}
                    locale={locale}
                    base={options.base}
                    tone="income"
                  />
                </Totals>
                <Totals label={f.colExpense}>
                  <MoneyStack
                    rows={list.totals.expense}
                    locale={locale}
                    base={options.base}
                    tone="expense"
                  />
                </Totals>
                <Totals label={f.colNet}>
                  <MoneyStack
                    rows={subtractByCurrency(list.totals.income, list.totals.expense)}
                    locale={locale}
                    base={options.base}
                  />
                </Totals>
              </div>
              <TransactionList rows={list.rows} ctx={ctx} options={options} />
              <Pager
                ctx={ctx}
                page={list.page}
                pages={list.pages}
                summary={format(f.resultsCount, { n: formatNumber(list.total, locale) })}
                makeHref={(p) => {
                  const q = filtersQuery(filters, p);
                  return q ? `${base}?${q}` : base;
                }}
              />
            </Card>
          )}
        </>
      )}
    </>
  );
}

function Totals({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex items-start gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-bold">{children}</span>
    </span>
  );
}
