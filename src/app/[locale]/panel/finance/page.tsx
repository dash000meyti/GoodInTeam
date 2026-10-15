import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  LandmarkIcon,
  PlusIcon,
  ReceiptIcon,
  ScaleIcon,
  WalletIcon,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ColorDot } from "@/components/shared/color-dot";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { KpiCard } from "@/components/finance/kpi-card";
import { Approx, Money, MoneyStack } from "@/components/finance/money";
import { InvoiceStatusBadge } from "@/components/finance/invoice-status-badge";
import { format } from "@/i18n/format-message";
import { formatDate, formatHours, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { financeOverview } from "@/server/modules/finance/reports";
import { panelContext, type PanelContext } from "@/server/page-context";
import { accountKindIcons } from "./_components/account-icons";
import { FinanceAnalytics } from "./_components/finance-analytics";
import { FinanceNav } from "./_components/finance-nav";
import { TransactionFormDialog } from "./_components/transaction-form";
import { txFormOptions } from "./_lib/options";

type Overview = ReturnType<typeof financeOverview>;

export default async function FinanceOverviewPage() {
  const ctx = await panelContext({ roles: ["owner", "admin"] });
  const { actor, t, href, locale, now } = ctx;
  const f = t.finance;
  const o = financeOverview(actor, { now, locale });
  const options = txFormOptions(actor);
  const multi = (rows: { currency: string }[]) =>
    rows.length > 1 || rows.some((r) => r.currency !== o.base);

  const newButton = (
    <TransactionFormDialog
      options={options}
      trigger={
        <Button>
          <PlusIcon /> {f.newTransaction}
        </Button>
      }
    />
  );

  const trend = (cur: number, prev: number) => {
    if (!prev) return null;
    const pct = (cur - prev) / prev;
    return format(f.vsLastMonth, {
      pct: `${pct >= 0 ? "▲" : "▼"} ${formatNumber(Math.abs(pct), locale, { style: "percent", maximumFractionDigits: 0 })}`,
    });
  };

  const empty = o.accounts.length === 0 && o.analytics.rows.length === 0;

  return (
    <>
      <PageHeader
        title={f.title}
        description={f.subtitle}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={href("/panel/invoices")}>
                <ReceiptIcon /> {f.nav_invoices}
              </Link>
            </Button>
            {newButton}
          </>
        }
      />
      <FinanceNav active="overview" href={href} t={f} />

      {empty ? (
        <EmptyState
          icon={WalletIcon}
          title={f.getStarted}
          description={f.getStartedHint}
          action={
            <Button asChild>
              <Link href={href("/panel/finance/accounts")}>
                <LandmarkIcon /> {f.newAccount}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label={f.monthIncome}
              icon={ArrowDownLeftIcon}
              tone="success"
              value={
                <MoneyStack
                  rows={o.month.income}
                  locale={locale}
                  base={o.base}
                  compact
                  secondaryClassName="text-sm"
                />
              }
              hint={
                <Hint
                  approx={
                    multi(o.month.income) ? (
                      <Approx value={o.month.approx.income} base={o.base} locale={locale} t={f} />
                    ) : null
                  }
                  trend={trend(o.month.approx.income.minor, o.month.prevApprox.income.minor)}
                />
              }
            />
            <KpiCard
              label={f.monthExpense}
              icon={ArrowUpRightIcon}
              tone="destructive"
              value={
                <MoneyStack
                  rows={o.month.expense}
                  locale={locale}
                  base={o.base}
                  compact
                  secondaryClassName="text-sm"
                />
              }
              hint={
                <Hint
                  approx={
                    multi(o.month.expense) ? (
                      <Approx value={o.month.approx.expense} base={o.base} locale={locale} t={f} />
                    ) : null
                  }
                  trend={trend(o.month.approx.expense.minor, o.month.prevApprox.expense.minor)}
                />
              }
            />
            <KpiCard
              label={f.monthNet}
              icon={ScaleIcon}
              tone="info"
              value={
                <MoneyStack
                  rows={o.month.net}
                  locale={locale}
                  base={o.base}
                  compact
                  secondaryClassName="text-sm"
                />
              }
              hint={
                multi(o.month.net) ? (
                  <Approx value={o.month.approx.net} base={o.base} locale={locale} t={f} />
                ) : undefined
              }
            />
            <KpiCard
              label={f.receivables}
              icon={ReceiptIcon}
              tone="warning"
              value={
                <MoneyStack
                  rows={o.receivables.totals}
                  locale={locale}
                  base={o.base}
                  compact
                  secondaryClassName="text-sm"
                />
              }
              hint={format(f.openInvoicesCount, { n: formatNumber(o.receivables.count, locale) })}
            />
          </div>

          <FinanceAnalytics
            rows={o.analytics.rows}
            months={o.analytics.months}
            base={o.base}
            rates={o.rates}
            categories={o.analytics.categories}
            clients={o.analytics.clients}
            aside={<AccountsCard o={o} ctx={ctx} />}
            receivables={<ReceivablesCard o={o} ctx={ctx} />}
          />

          <ProfitabilityCard o={o} ctx={ctx} />
        </>
      )}
    </>
  );
}

function Hint({ approx, trend }: { approx: React.ReactNode; trend: string | null }) {
  if (!approx && !trend) return null;
  return (
    <span className="flex flex-col gap-0.5">
      {approx}
      {trend && <span>{trend}</span>}
    </span>
  );
}

function AccountsCard({ o, ctx }: { o: Overview; ctx: PanelContext }) {
  const { t, href, locale } = ctx;
  const f = t.finance;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{f.accountBalances}</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href={href("/panel/finance/accounts")}>{t.common.viewAll}</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {o.accounts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{f.accountsEmpty}</p>
        ) : (
          <ul className="space-y-3">
            {o.accounts.slice(0, 6).map((a) => {
              const Icon = accountKindIcons[a.kind];
              const color = a.color ?? "#00A76F";
              return (
                <li key={a.id}>
                  <Link
                    href={href(`/panel/finance/accounts/${a.id}`)}
                    className="group flex items-center gap-3"
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold group-hover:text-primary">
                        {a.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {f[`accountKind_${a.kind}`]}
                      </span>
                    </span>
                    <Money
                      minor={a.balance}
                      currency={a.currency}
                      locale={locale}
                      compact
                      tone={a.balance < 0 ? "expense" : "none"}
                      className="text-sm font-bold"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {o.balances.length > 0 && (
          <div className="space-y-1 rounded-xl bg-muted/50 p-3">
            <p className="text-xs font-semibold text-muted-foreground">{f.totalBalance}</p>
            <MoneyStack
              rows={o.balances}
              locale={locale}
              base={o.base}
              className="font-extrabold"
            />
            {o.balances.length > 1 && (
              <Approx
                value={o.balancesApprox}
                base={o.base}
                locale={locale}
                t={f}
                className="flex"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReceivablesCard({ o, ctx }: { o: Overview; ctx: PanelContext }) {
  const { t, href, locale, now } = ctx;
  const f = t.finance;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{f.unpaidInvoices}</CardTitle>
        <CardDescription>
          <MoneyStack
            rows={o.receivables.totals}
            locale={locale}
            base={o.base}
            compact
            className="text-sm"
          />
        </CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href={href("/panel/invoices?status=open")}>{f.viewInvoices}</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {o.receivables.list.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{f.allPaid}</p>
        ) : (
          <ul className="divide-y divide-dashed">
            {o.receivables.list.map((inv) => {
              const late = inv.dueDate && inv.dueDate.getTime() < now;
              return (
                <li key={inv.id}>
                  <Link
                    href={href(`/panel/invoices/${inv.id}`)}
                    className="group flex items-center gap-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold group-hover:text-primary">
                          {inv.clientName ?? inv.number}
                        </span>
                        <InvoiceStatusBadge status={inv.status} t={f} />
                      </span>
                      <span
                        className={cn(
                          "block text-xs text-muted-foreground",
                          late && "text-destructive",
                        )}
                      >
                        <span dir="ltr">{inv.number}</span>
                        {inv.dueDate ? ` · ${f.dueDate} ${formatDate(inv.dueDate, ctx.fmt)}` : ""}
                      </span>
                    </span>
                    <Money
                      minor={inv.dueMinor}
                      currency={inv.currency}
                      locale={locale}
                      compact
                      className="text-sm font-bold"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ProfitabilityCard({ o, ctx }: { o: Overview; ctx: PanelContext }) {
  const { t, href, locale } = ctx;
  const f = t.finance;
  const rows = o.profitability;
  return (
    <Card className="mt-6 gap-0 overflow-hidden pb-0">
      <CardHeader className="pb-5">
        <CardTitle>{f.profitability}</CardTitle>
        <CardDescription>{f.profitabilityHint}</CardDescription>
      </CardHeader>
      {rows.length === 0 ? (
        <p className="px-6 pb-10 text-center text-sm text-muted-foreground">{f.noProfitability}</p>
      ) : (
        <>
          <ul className="divide-y divide-dashed border-t border-dashed md:hidden">
            {rows.map((p) => {
              const approx = p.approximate ? "≈ " : "";
              const net = p.incomeMinor - p.expenseMinor;
              const cell = (label: string, value: React.ReactNode) => (
                <div className="min-w-0">
                  <dt className="text-[11px] text-muted-foreground">{label}</dt>
                  <dd className="truncate text-sm font-semibold">{value}</dd>
                </div>
              );
              return (
                <li key={p.id} className="space-y-3 px-5 py-4">
                  <Link
                    href={href(`/panel/finance/ledgers/project/${p.id}`)}
                    className="flex items-center gap-2.5"
                  >
                    <ColorDot color={p.color} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {p.clientName ?? t.projects.noClient}
                      </span>
                    </span>
                  </Link>
                  <dl className="grid grid-cols-3 gap-3">
                    {cell(
                      f.colIncome,
                      <>
                        {approx}
                        <Money
                          minor={p.incomeMinor}
                          currency={p.currency}
                          locale={locale}
                          compact
                        />
                      </>,
                    )}
                    {cell(
                      f.colExpense,
                      <>
                        {approx}
                        <Money
                          minor={p.expenseMinor}
                          currency={p.currency}
                          locale={locale}
                          compact
                        />
                      </>,
                    )}
                    {cell(
                      f.colNet,
                      <>
                        {approx}
                        <Money
                          minor={net}
                          currency={p.currency}
                          locale={locale}
                          compact
                          tone={net < 0 ? "expense" : "none"}
                        />
                      </>,
                    )}
                    {cell(f.colHours, formatHours(p.trackedMs, locale))}
                    {cell(
                      f.colEffectiveRate,
                      p.effectiveRateMinor != null ? (
                        <Money
                          minor={p.effectiveRateMinor}
                          currency={p.currency}
                          locale={locale}
                          compact
                        />
                      ) : (
                        "—"
                      ),
                    )}
                    {cell(
                      f.colBudgetUsed,
                      p.budgetUsedPct != null
                        ? formatNumber(p.budgetUsedPct / 100, locale, {
                            style: "percent",
                            maximumFractionDigits: 0,
                          })
                        : "—",
                    )}
                  </dl>
                </li>
              );
            })}
          </ul>
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.project}</TableHead>
                <TableHead className="text-end">{f.colIncome}</TableHead>
                <TableHead className="text-end">{f.colExpense}</TableHead>
                <TableHead className="text-end">{f.colNet}</TableHead>
                <TableHead className="text-end">{f.colHours}</TableHead>
                <TableHead className="text-end" title={f.effectiveRateHint}>
                  {f.colEffectiveRate}
                </TableHead>
                <TableHead title={f.budgetUsedHint}>{f.colBudgetUsed}</TableHead>
                <TableHead className="text-end">{f.colOutstanding}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const approx = p.approximate ? "≈ " : "";
                const net = p.incomeMinor - p.expenseMinor;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={href(`/panel/finance/ledgers/project/${p.id}`)}
                        className="group flex items-center gap-2.5"
                      >
                        <ColorDot color={p.color} />
                        <span className="min-w-0">
                          <span className="block max-w-44 truncate font-semibold group-hover:text-primary">
                            {p.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {p.clientName ?? t.projects.noClient}
                          </span>
                        </span>
                        {p.missing.length > 0 && (
                          <AlertTriangleIcon
                            className="size-4 text-warning"
                            aria-label={format(f.missingRates, { list: p.missing.join(", ") })}
                          />
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="text-end">
                      {approx}
                      <Money minor={p.incomeMinor} currency={p.currency} locale={locale} compact />
                    </TableCell>
                    <TableCell className="text-end">
                      {approx}
                      <Money minor={p.expenseMinor} currency={p.currency} locale={locale} compact />
                    </TableCell>
                    <TableCell className="text-end font-bold">
                      {approx}
                      <Money
                        minor={net}
                        currency={p.currency}
                        locale={locale}
                        compact
                        tone={net < 0 ? "expense" : "none"}
                      />
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {formatHours(p.trackedMs, locale)}
                    </TableCell>
                    <TableCell className="text-end">
                      {p.effectiveRateMinor != null ? (
                        <Money
                          minor={p.effectiveRateMinor}
                          currency={p.currency}
                          locale={locale}
                          compact
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {p.budgetUsedPct != null ? (
                        <div className="flex items-center gap-2">
                          <Progress
                            value={Math.min(100, p.budgetUsedPct)}
                            className="w-14"
                            indicatorClassName={cn(
                              p.budgetUsedPct > 100
                                ? "bg-destructive"
                                : p.budgetUsedPct > 80
                                  ? "bg-warning"
                                  : undefined,
                            )}
                          />
                          <span className="text-xs font-semibold tabular-nums">
                            {formatNumber(p.budgetUsedPct / 100, locale, {
                              style: "percent",
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      <MoneyStack rows={p.outstanding} locale={locale} compact />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}
    </Card>
  );
}
