import { ArrowLeftRightIcon, DownloadIcon, PlusIcon, SearchXIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
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

/**
 * Transactions (framed): the page box carries the finance nav; the list is
 * one box — the filter toolbar row, the totals of the filter as a row of
 * cells, the edge-to-edge table (md+) or row list (phones), the pager row.
 */
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
      >
        <FinanceNav active="transactions" href={href} t={f} />
      </PageHeader>

      {list.total === 0 && !hasFilters ? (
        <EmptyState
          icon={ArrowLeftRightIcon}
          title={f.txEmpty}
          description={f.txEmptyHint}
          action={newButton}
        />
      ) : (
        <FrameBox as="section" density="compact" ariaLabel={f.transactionsTitle}>
          <TransactionFilters values={filters} options={options} basePath={base} />
          {list.total === 0 ? (
            <FrameGrid cols={1}>
              <FrameCell pad="none">
                <EmptyState icon={SearchXIcon} title={f.txNoMatch} />
              </FrameCell>
            </FrameGrid>
          ) : (
            <>
              {/* The totals of this filter: one row of cells sharing the box's hairlines. */}
              <FrameGrid as="dl" cols={1} className="sm:grid-cols-3">
                <Totals label={f.colIncome} caption={f.filteredTotals}>
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
              </FrameGrid>
              <FrameGrid cols={1}>
                <FrameCell pad="none">
                  <TransactionList rows={list.rows} ctx={ctx} options={options} />
                </FrameCell>
              </FrameGrid>
              <FrameGrid cols={1}>
                <FrameCell className="py-3">
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
                </FrameCell>
              </FrameGrid>
            </>
          )}
        </FrameBox>
      )}
    </>
  );
}

/** One total of the filter (a cell of the totals row); the first carries the row's caption. */
function Totals({
  label,
  caption,
  children,
}: {
  label: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <FrameCell className="flex min-w-0 items-start justify-between gap-3 py-3 sm:block">
      <dt className="text-xs font-semibold text-muted-foreground">
        {caption && <span className="sr-only">{caption}: </span>}
        {label}
      </dt>
      <dd className="text-base font-extrabold sm:mt-1 sm:text-lg">{children}</dd>
    </FrameCell>
  );
}
