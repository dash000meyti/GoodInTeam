import Link from "next/link";
import { ArchiveIcon, EyeIcon, LandmarkIcon, PlusIcon, ScaleIcon, WalletIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { STAT_VALUE_CLASS, StatRow } from "@/components/panel/stat-card";
import { FrameBox, FrameCell, FrameFiller, FrameGrid } from "@/components/shell/frame";
import { packRows } from "@/components/site/frame-plan";
import { KpiCard } from "@/components/finance/kpi-card";
import { formatMoneySigned, Money, MoneyStack } from "@/components/finance/money";
import { format } from "@/i18n/format-message";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { minorToMajor, sumByCurrency, sumConverted } from "@/server/modules/finance/calc";
import { latestRates } from "@/server/modules/finance/fx";
import { listAccounts } from "@/server/modules/finance/service";
import { panelContext } from "@/server/page-context";
import { AccountActions } from "../_components/account-actions";
import { AccountFormDialog } from "../_components/account-form";
import { accountKindIcons } from "../_components/account-icons";
import { FinanceNav } from "../_components/finance-nav";
import { GlyphTile } from "../_components/frame-bits";

/**
 * Accounts (framed): the page box carries the finance nav and the totals as
 * a stat row; the accounts are one box of cells sharing hairlines (2 per row
 * at md, 3 at lg), the whole cell links to the statement and the last row is
 * completed with dots fillers.
 */
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
  const spans = list.map(() => undefined);

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
      >
        <FinanceNav active="accounts" href={href} t={f} />
        {list.length > 0 && (
          <StatRow>
            <KpiCard
              label={f.totalBalance}
              icon={WalletIcon}
              value={
                <MoneyStack
                  rows={totals}
                  locale={locale}
                  base={base}
                  secondaryClassName="text-sm"
                />
              }
            />
            {totals.length > 1 && (
              <KpiCard
                label={format(f.allInBase, { currency: base })}
                icon={ScaleIcon}
                tone="info"
                value={
                  <span title={f.approxHint}>
                    ≈ <Money minor={approx.minor} currency={base} locale={locale} />
                  </span>
                }
                hint={
                  approx.missing.length > 0 ? (
                    <span className="text-[#b76e00] dark:text-[#ffd666]">
                      {format(f.missingRates, {
                        list: approx.missing.join(locale === "fa" ? "، " : ", "),
                      })}
                    </span>
                  ) : (
                    f.approxHint
                  )
                }
              />
            )}
            <KpiCard
              label={f.accountsTitle}
              icon={LandmarkIcon}
              tone="violet"
              value={formatNumber(active.length, locale)}
              hint={
                showArchived && archivedCount > 0
                  ? `${f.archived}: ${formatNumber(archivedCount, locale)}`
                  : undefined
              }
            />
          </StatRow>
        )}
      </PageHeader>

      {list.length === 0 ? (
        <EmptyState
          icon={LandmarkIcon}
          title={f.accountsEmpty}
          description={f.accountsEmptyHint}
          action={newButton}
        />
      ) : (
        <FrameBox as="section" density="compact" ariaLabel={f.accountsTitle}>
          <FrameGrid cols={3}>
            {list.map((a) => (
              <FrameCell key={a.id} as="article" hover className="group flex flex-col">
                {/* Archived accounts fade their content, never the shared hairlines. */}
                <div className={cn("flex flex-1 flex-col gap-5", a.archived && "opacity-70")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <GlyphTile
                        icon={accountKindIcons[a.kind]}
                        color={a.color ?? "#00A76F"}
                        size="lg"
                      />
                      <span className="min-w-0">
                        <Link
                          href={href(`/panel/finance/accounts/${a.id}`)}
                          className="block truncate font-bold group-hover:text-primary-ink after:absolute after:inset-0"
                        >
                          {a.name}
                        </Link>
                        <span className="block text-xs text-muted-foreground">
                          {f[`accountKind_${a.kind}`]}
                        </span>
                      </span>
                    </div>
                    {/* Above the cell-wide link. */}
                    <div className="relative z-10">
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
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{f.balance}</p>
                    <p className={STAT_VALUE_CLASS}>
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
                          amount: formatMoneySigned(a.pending, a.currency, locale, {
                            signed: true,
                          }),
                        })}
                      </p>
                    )}
                  </div>
                  <div className="mt-auto flex items-center gap-2 border-t border-dashed border-frame-line pt-3 text-xs text-muted-foreground">
                    <Badge variant="neutral" className="font-mono">
                      {a.currency}
                    </Badge>
                    {a.archived && <Badge variant="warning">{f.archived}</Badge>}
                    <span className="ms-auto tabular-nums">
                      {format(f.txCount, { n: formatNumber(a.txCount, locale) })}
                    </span>
                  </div>
                </div>
              </FrameCell>
            ))}
            <FrameFiller
              units={{
                md: packRows(spans, 3, "md").trailing,
                lg: packRows(spans, 3, "lg").trailing,
              }}
            />
          </FrameGrid>
          {showArchived && archivedCount === 0 && (
            <FrameGrid cols={1}>
              <FrameCell className="py-6 text-center text-sm text-muted-foreground">
                {t.common.empty}
              </FrameCell>
            </FrameGrid>
          )}
        </FrameBox>
      )}
    </>
  );
}
