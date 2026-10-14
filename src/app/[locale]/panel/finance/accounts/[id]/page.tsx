import { notFound } from "next/navigation";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ClockIcon,
  PlusIcon,
  ReceiptTextIcon,
  WalletIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { StatCard } from "@/components/panel/stat-card";
import { Money } from "@/components/finance/money";
import { format } from "@/i18n/format-message";
import { formatNumber } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { AppError } from "@/server/errors";
import { minorToMajor } from "@/server/modules/finance/calc";
import { accountStatement } from "@/server/modules/finance/service";
import { panelContext } from "@/server/page-context";
import { AccountActions } from "../../_components/account-actions";
import { accountKindIcons } from "../../_components/account-icons";
import { FinanceNav } from "../../_components/finance-nav";
import { TransactionFormDialog } from "../../_components/transaction-form";
import { Pager, TransactionList } from "../../_components/transaction-list";
import { txFormOptions } from "../../_lib/options";

export default async function AccountPage({
  params,
  searchParams,
}: PageProps<"/[locale]/panel/finance/accounts/[id]">) {
  const { id } = await params;
  const ctx = await panelContext({ roles: ["owner", "admin"] });
  const { actor, t, href, locale } = ctx;
  const f = t.finance;
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1);
  const data = (() => {
    try {
      return accountStatement(actor, id, { page });
    } catch (e) {
      if (e instanceof AppError && e.code === "not_found") notFound();
      throw e;
    }
  })();
  const { account } = data;
  const options = txFormOptions(actor);
  const Icon = accountKindIcons[account.kind];
  const color = account.color ?? "#00A76F";
  const money = (minor: number) => (
    <Money minor={minor} currency={account.currency} locale={locale} />
  );

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span
              className="flex size-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${color}22`, color }}
            >
              <Icon className="size-5" />
            </span>
            {account.name}
            <Badge variant="neutral" className="font-mono">
              {account.currency}
            </Badge>
            {account.archived && <Badge variant="warning">{f.archived}</Badge>}
          </span>
        }
        crumbs={[
          { label: f.title, href: href("/panel/finance") },
          { label: f.accountsTitle, href: href("/panel/finance/accounts") },
          { label: account.name },
        ]}
        description={account.notes ?? f[`accountKind_${account.kind}`]}
        actions={
          <>
            <TransactionFormDialog
              options={options}
              defaults={{ accountId: account.id }}
              trigger={
                <Button>
                  <PlusIcon /> {f.newTransaction}
                </Button>
              }
            />
            <AccountActions
              withEditButton
              redirectOnDelete
              archived={account.archived}
              defaultCurrency={options.base}
              account={{
                id: account.id,
                name: account.name,
                kind: account.kind,
                currency: account.currency,
                openingBalance: String(minorToMajor(account.openingBalanceMinor, account.currency)),
                color: account.color,
                notes: account.notes,
                hasTransactions: data.total > 0,
              }}
            />
          </>
        }
      />
      <FinanceNav active="accounts" href={href} t={f} />

      <div className="mb-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={f.balance} value={money(account.balance)} icon={WalletIcon} />
        <StatCard
          label={f.openingBalance}
          value={money(account.openingBalanceMinor)}
          icon={ClockIcon}
          tone="info"
          hint={
            account.pending
              ? format(f.pendingAmount, {
                  amount: formatMoney(account.pending, account.currency, locale),
                })
              : undefined
          }
        />
        <StatCard label={f.colIncome} value={money(account.income)} icon={ArrowDownLeftIcon} tone="success" />
        <StatCard label={f.colExpense} value={money(account.expense)} icon={ArrowUpRightIcon} tone="destructive" />
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b border-dashed py-5">
          <CardTitle>{f.statement}</CardTitle>
        </CardHeader>
        {data.total === 0 ? (
          <EmptyState icon={ReceiptTextIcon} title={f.txEmpty} className="m-5" />
        ) : (
          <>
            <TransactionList
              rows={data.rows}
              ctx={ctx}
              options={options}
              accountId={account.id}
              accountCurrency={account.currency}
              showBalance
            />
            <Pager
              ctx={ctx}
              page={data.page}
              pages={data.pages}
              summary={format(f.resultsCount, { n: formatNumber(data.total, locale) })}
              makeHref={(p) => href(`/panel/finance/accounts/${account.id}${p > 1 ? `?page=${p}` : ""}`)}
            />
          </>
        )}
      </Card>
    </>
  );
}
