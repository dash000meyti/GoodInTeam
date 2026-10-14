import Link from "next/link";
import { BookUserIcon, FolderKanbanIcon, InfoIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColorDot } from "@/components/shared/color-dot";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { Money, MoneyStack } from "@/components/finance/money";
import { initials } from "@/lib/utils";
import { subtractByCurrency } from "@/server/modules/finance/calc";
import { listCounterparties, listProjectLedgers } from "@/server/modules/finance/ledger";
import { panelContext } from "@/server/page-context";
import { FinanceNav } from "../_components/finance-nav";
import { BalanceBadge } from "../_components/ledger-view";

export default async function LedgersPage({
  searchParams,
}: PageProps<"/[locale]/panel/finance/ledgers">) {
  const ctx = await panelContext({ roles: ["owner", "admin"] });
  const { actor, t, href, locale } = ctx;
  const f = t.finance;
  const tab = (await searchParams).tab === "projects" ? "projects" : "parties";
  const parties = listCounterparties(actor);
  const projectRows = listProjectLedgers(actor);

  const partyHref = (p: (typeof parties)[number]) =>
    p.type === "client"
      ? href(`/panel/finance/ledgers/client/${p.id}`)
      : href(`/panel/finance/ledgers/party/${encodeURIComponent(p.name)}`);

  const cells = (p: (typeof parties)[number], k: "invoiced" | "received" | "paid") => (
    <span className="inline-flex flex-col items-end gap-0.5">
      {p.currencies.map((c) => (
        <span key={c.currency} className="text-sm">
          {c[k] ? <Money minor={c[k]} currency={c.currency} locale={locale} compact /> : "—"}
        </span>
      ))}
    </span>
  );

  return (
    <>
      <PageHeader
        title={f.ledgersTitle}
        description={f.ledgersSubtitle}
        crumbs={[{ label: f.title, href: href("/panel/finance") }, { label: f.ledgersTitle }]}
      />
      <FinanceNav active="ledgers" href={href} t={f} />

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="parties">
            <BookUserIcon /> {f.tabCounterparties}
          </TabsTrigger>
          <TabsTrigger value="projects">
            <FolderKanbanIcon /> {f.tabProjects}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parties" className="space-y-4">
          <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
            <InfoIcon className="mt-1 size-3.5 shrink-0 text-info" />
            {f.ledgerHint}
          </p>
          {parties.length === 0 ? (
            <EmptyState icon={BookUserIcon} title={f.ledgersEmpty} description={f.ledgersEmptyHint} />
          ) : (
            <Card className="gap-0 overflow-hidden py-0">
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{f.colCounterparty}</TableHead>
                      <TableHead className="text-end">{f.colInvoiced}</TableHead>
                      <TableHead className="text-end">{f.colReceived}</TableHead>
                      <TableHead className="text-end">{f.colPaid}</TableHead>
                      <TableHead>{f.colBalance}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parties.map((p) => (
                      <TableRow key={`${p.type}:${p.id ?? p.name}`}>
                        <TableCell className="align-top">
                          <PartyName p={p} href={partyHref(p)} kindLabel={p.clientKind ? t.clients[`kind_${p.clientKind}`] : f.freeTextParty} />
                        </TableCell>
                        <TableCell className="text-end align-top">{cells(p, "invoiced")}</TableCell>
                        <TableCell className="text-end align-top">{cells(p, "received")}</TableCell>
                        <TableCell className="text-end align-top">{cells(p, "paid")}</TableCell>
                        <TableCell className="align-top">
                          <span className="flex flex-col gap-1">
                            {p.currencies.map((c) => (
                              <BalanceBadge key={c.currency} minor={c.balance} currency={c.currency} ctx={ctx} />
                            ))}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="divide-y divide-dashed md:hidden">
                {parties.map((p) => (
                  <li key={`${p.type}:${p.id ?? p.name}`} className="space-y-2 px-4 py-3">
                    <PartyName p={p} href={partyHref(p)} kindLabel={p.clientKind ? t.clients[`kind_${p.clientKind}`] : f.freeTextParty} />
                    <div className="flex flex-col gap-1 ps-12">
                      {p.currencies.map((c) => (
                        <BalanceBadge key={c.currency} minor={c.balance} currency={c.currency} ctx={ctx} />
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
            <InfoIcon className="mt-1 size-3.5 shrink-0 text-info" />
            {f.projectLedgerHint}
          </p>
          {projectRows.length === 0 ? (
            <EmptyState icon={FolderKanbanIcon} title={f.projectsLedgerEmpty} />
          ) : (
            <Card className="gap-0 overflow-hidden py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.common.project}</TableHead>
                    <TableHead className="text-end">{f.colIncome}</TableHead>
                    <TableHead className="text-end">{f.colExpense}</TableHead>
                    <TableHead className="text-end">{f.netCash}</TableHead>
                    <TableHead className="text-end">{f.colInvoiced}</TableHead>
                    <TableHead className="text-end">{f.colOutstanding}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectRows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link
                          href={href(`/panel/finance/ledgers/project/${p.id}`)}
                          className="group flex items-center gap-2.5"
                        >
                          <ColorDot color={p.color} />
                          <span className="min-w-0">
                            <span className="block max-w-56 truncate font-semibold group-hover:text-primary">
                              {p.name}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {p.clientName ?? t.projects.noClient}
                            </span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-end">
                        <MoneyStack rows={p.stats.income} locale={locale} compact />
                      </TableCell>
                      <TableCell className="text-end">
                        <MoneyStack rows={p.stats.expense} locale={locale} compact />
                      </TableCell>
                      <TableCell className="text-end font-bold">
                        <MoneyStack rows={subtractByCurrency(p.stats.income, p.stats.expense)} locale={locale} compact />
                      </TableCell>
                      <TableCell className="text-end">
                        <MoneyStack rows={p.stats.invoiced} locale={locale} compact />
                      </TableCell>
                      <TableCell className="text-end">
                        <MoneyStack rows={p.stats.outstanding} locale={locale} compact />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function PartyName({
  p,
  href,
  kindLabel,
}: {
  p: { name: string; color: string | null; type: "client" | "party" };
  href: string;
  kindLabel: string;
}) {
  return (
    <Link href={href} className="group flex items-center gap-3">
      <Avatar className="size-9 rounded-xl">
        <AvatarFallback
          className="rounded-xl text-white"
          style={{ backgroundColor: p.color ?? (p.type === "party" ? "#919EAB" : "#078DEE") }}
        >
          {initials(p.name)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block max-w-60 truncate font-semibold group-hover:text-primary">{p.name}</span>
        <Badge variant="neutral" className="mt-0.5">
          {kindLabel}
        </Badge>
      </span>
    </Link>
  );
}
