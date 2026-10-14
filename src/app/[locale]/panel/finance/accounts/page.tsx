import Link from "next/link";
import { ArchiveIcon, EyeIcon, LandmarkIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { Approx, formatMoneySigned, Money, MoneyStack } from "@/components/finance/money";
import { format } from "@/i18n/format-message";
import { formatNumber } from "@/lib/format";
import { minorToMajor, sumByCurrency, sumConverted } from "@/server/modules/finance/calc";
import { latestRates } from "@/server/modules/finance/fx";
import { listAccounts } from "@/server/modules/finance/service";
import { panelContext } from "@/server/page-context";
import { AccountActions } from "../_components/account-actions";
import { AccountFormDialog } from "../_components/account-form";
import { accountKindIcons } from "../_components/account-icons";
import { FinanceNav } from "../_components/finance-nav";

export default async function AccountsPage({
  searchParams,
}: PageProps<"/[locale]/panel/finance/accounts">) {
  const ctx = await panelContext({ roles: ["owner", "admin"] });
  const { actor, t, href, locale } = ctx;
  const f = t.finance;
  const showArchived = (await searchParams).archived === "1";
  const list = listAccounts(actor, { includeArchived: showArchived });
  const { base, rates } = latestRates();
  const active = list.filter((a) => !a.archived);
  const totals = sumByCurrency(active.map((a) => ({ currency: a.currency, minor: a.balance })));
  const approx = sumConverted(totals, base, rates, base);
  const archivedCount = showArchived ? list.length - active.length : 0;

  const newButton = (
    <AccountFormDialog
      defaultCurrency={base}
      trigger={
        <Button>
          <PlusIcon /> {f.newAccount}
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader
        title={f.accountsTitle}
        description={f.accountsSubtitle}
        crumbs={[{ label: f.title, href: href("/panel/finance") }, { label: f.accountsTitle }]}
        actions={
          <>
            <Button asChild variant="ghost">
              <Link
                href={href(`/panel/finance/accounts${showArchived ? "" : "?archived=1"}`)}
                scroll={false}
              >
                {showArchived ? <EyeIcon /> : <ArchiveIcon />}
                {showArchived ? f.hideArchived : f.showArchived}
              </Link>
            </Button>
            {newButton}
          </>
        }
      />
      <FinanceNav active="accounts" href={href} t={f} />

      {list.length === 0 ? (
        <EmptyState
          icon={LandmarkIcon}
          title={f.accountsEmpty}
          description={f.accountsEmptyHint}
          action={newButton}
        />
      ) : (
        <>
          <Card className="mb-6 flex-row flex-wrap items-center gap-x-10 gap-y-3 px-6 py-5">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-muted-foreground">{f.totalBalance}</p>
              <MoneyStack
                rows={totals}
                locale={locale}
                base={base}
                className="text-2xl font-extrabold"
                secondaryClassName="text-base"
              />
            </div>
            {totals.length > 1 && (
              <Approx value={approx} base={base} locale={locale} t={f} compact={false} className="text-sm" />
            )}
          </Card>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {list.map((a) => {
              const Icon = accountKindIcons[a.kind];
              const color = a.color ?? "#00A76F";
              return (
                <Card
                  key={a.id}
                  className={`relative gap-5 overflow-hidden p-6 ${a.archived ? "opacity-70" : ""}`}
                >
                  <span
                    aria-hidden
                    className="absolute -start-12 -top-12 size-36 rounded-full opacity-[0.07]"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={href(`/panel/finance/accounts/${a.id}`)}
                      className="group flex min-w-0 items-center gap-3"
                    >
                      <span
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${color}22`, color }}
                      >
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-bold group-hover:text-primary">
                          {a.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {f[`accountKind_${a.kind}`]}
                        </span>
                      </span>
                    </Link>
                    <AccountActions
                      archived={a.archived}
                      defaultCurrency={base}
                      account={{
                        id: a.id,
                        name: a.name,
                        kind: a.kind,
                        currency: a.currency,
                        openingBalance: String(minorToMajor(a.openingBalanceMinor, a.currency)),
                        color: a.color,
                        notes: a.notes,
                        hasTransactions: a.txCount > 0,
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{f.balance}</p>
                    <p className="text-2xl font-extrabold tracking-tight">
                      <Money
                        minor={a.balance}
                        currency={a.currency}
                        locale={locale}
                        tone={a.balance < 0 ? "expense" : "none"}
                      />
                    </p>
                    {a.pending !== 0 && (
                      <p className="mt-1 text-xs text-[#b76e00] dark:text-[#ffd666]">
                        {format(f.pendingAmount, {
                          amount: formatMoneySigned(a.pending, a.currency, locale, { signed: true }),
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 border-t border-dashed pt-3 text-xs text-muted-foreground">
                    <Badge variant="neutral" className="font-mono">
                      {a.currency}
                    </Badge>
                    {a.archived && <Badge variant="warning">{f.archived}</Badge>}
                    <span className="ms-auto">
                      {format(f.txCount, { n: formatNumber(a.txCount, locale) })}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
          {showArchived && archivedCount === 0 && (
            <p className="mt-6 text-center text-sm text-muted-foreground">{t.common.empty}</p>
          )}
        </>
      )}
    </>
  );
}
