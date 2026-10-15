import Link from "next/link";
import { notFound } from "next/navigation";
import { BookUserIcon, ExternalLinkIcon, InfoIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { format } from "@/i18n/format-message";
import { AppError } from "@/server/errors";
import { getClientLedger } from "@/server/modules/finance/ledger";
import { panelContext } from "@/server/page-context";
import { FinanceNav } from "../../../_components/finance-nav";
import { LedgerTables, LedgerTotals } from "../../../_components/ledger-view";
import { TransactionFormDialog } from "../../../_components/transaction-form";
import { txFormOptions } from "../../../_lib/options";

export default async function ClientLedgerPage({
  params,
}: PageProps<"/[locale]/panel/finance/ledgers/client/[id]">) {
  const { id } = await params;
  const ctx = await panelContext({ roles: ["owner", "admin"] });
  const { actor, t, href } = ctx;
  const f = t.finance;
  const data = (() => {
    try {
      return getClientLedger(actor, id);
    } catch (e) {
      if (e instanceof AppError && e.code === "not_found") notFound();
      throw e;
    }
  })();
  const options = txFormOptions(actor);

  return (
    <>
      <PageHeader
        title={format(f.ledgerOf, { name: data.client.name })}
        crumbs={[
          { label: f.title, href: href("/panel/finance") },
          { label: f.ledgersTitle, href: href("/panel/finance/ledgers") },
          { label: data.client.name },
        ]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={href(`/panel/clients/${data.client.id}`)}>
                <ExternalLinkIcon /> {t.common.client}
              </Link>
            </Button>
            <TransactionFormDialog
              options={options}
              defaults={{ clientId: data.client.id }}
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
      <p className="mb-4 flex items-start gap-2 text-xs leading-6 text-muted-foreground">
        <InfoIcon className="mt-1 size-3.5 shrink-0 text-info" />
        {f.ledgerHint}
      </p>
      <LedgerTotals totals={data.totals} ctx={ctx} />
      {data.groups.length === 0 ? (
        <EmptyState icon={BookUserIcon} title={f.noLedgerLines} />
      ) : (
        <LedgerTables groups={data.groups} ctx={ctx} mode="party" name={data.client.name} />
      )}
    </>
  );
}
