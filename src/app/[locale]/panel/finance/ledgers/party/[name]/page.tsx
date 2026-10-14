import { BookUserIcon, InfoIcon } from "lucide-react";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { format } from "@/i18n/format-message";
import { getPartyLedger } from "@/server/modules/finance/ledger";
import { panelContext } from "@/server/page-context";
import { FinanceNav } from "../../../_components/finance-nav";
import { LedgerTables, LedgerTotals } from "../../../_components/ledger-view";

function decode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/** Ledger with a free-text counterparty (transactions that have no saved client). */
export default async function PartyLedgerPage({
  params,
}: PageProps<"/[locale]/panel/finance/ledgers/party/[name]">) {
  const { name: raw } = await params;
  const ctx = await panelContext({ roles: ["owner", "admin"] });
  const { actor, t, href } = ctx;
  const f = t.finance;
  const data = getPartyLedger(actor, decode(raw).slice(0, 200));

  return (
    <>
      <PageHeader
        title={format(f.ledgerOf, { name: data.name })}
        description={f.freeTextParty}
        crumbs={[
          { label: f.title, href: href("/panel/finance") },
          { label: f.ledgersTitle, href: href("/panel/finance/ledgers") },
          { label: data.name },
        ]}
      />
      <FinanceNav active="ledgers" href={href} t={f} />
      <p className="mb-4 flex items-start gap-2 text-xs leading-6 text-muted-foreground">
        <InfoIcon className="mt-1 size-3.5 shrink-0 text-info" />
        {f.ledgerHint}
      </p>
      <LedgerTotals totals={data.totals} ctx={ctx} />
      {data.groups.length === 0 ? (
        <EmptyState icon={BookUserIcon} title={f.noLedgerLines} />
      ) : (
        <LedgerTables groups={data.groups} ctx={ctx} mode="party" name={data.name} />
      )}
    </>
  );
}
