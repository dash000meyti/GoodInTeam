import Link from "next/link";
import { BookUserIcon, FolderKanbanIcon, InfoIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Money, MoneyStack } from "@/components/finance/money";
import { initials } from "@/lib/utils";
import { subtractByCurrency } from "@/server/modules/finance/calc";
import { listCounterparties, listProjectLedgers } from "@/server/modules/finance/ledger";
import { panelContext } from "@/server/page-context";
import { FinanceNav } from "../_components/finance-nav";
import { CHIP_ROW, chipClass } from "../_components/frame-bits";
import { BalanceBadge } from "../_components/ledger-view";

/**
 * Ledgers (framed): the page box carries the finance nav; one box holds the
 * view chips (counterparties / projects, in the URL like the invoice status
 * chips) with the view's hint as its first row and the edge-to-edge table
 * (md+) or row list (phones) as its second.
 */
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

  const views = [
    { key: "parties", label: f.tabCounterparties, icon: BookUserIcon, path: "" },
    { key: "projects", label: f.tabProjects, icon: FolderKanbanIcon, path: "?tab=projects" },
  ] as const;

  return (
    <>
      <PageHeader
        title={f.ledgersTitle}
        description={f.ledgersSubtitle}
        crumbs={[{ label: f.title, href: href("/panel/finance") }, { label: f.ledgersTitle }]}
      >
        <FinanceNav active="ledgers" href={href} t={f} />
      </PageHeader>

      <FrameBox as="section" density="compact" ariaLabel={f.ledgersTitle}>
        <FrameGrid cols={1}>
          <FrameCell className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
            <nav aria-label={f.ledgerViews} className={CHIP_ROW}>
              {views.map((v) => {
                const Icon = v.icon;
                const on = v.key === tab;
                return (
                  <Link
                    key={v.key}
                    href={href(`/panel/finance/ledgers${v.path}`)}
                    aria-current={on ? "page" : undefined}
                    scroll={false}
                    className={chipClass(on)}
                  >
                    <Icon />
                    {v.label}
                  </Link>
                );
              })}
            </nav>
            <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground lg:max-w-xl">
              <InfoIcon className="mt-1 size-3.5 shrink-0 text-info-ink" />
              {tab === "parties" ? f.ledgerHint : f.projectLedgerHint}
            </p>
          </FrameCell>
        </FrameGrid>

        <FrameGrid cols={1}>
          <FrameCell pad="none">
            {tab === "parties" ? (
              parties.length === 0 ? (
                <EmptyState
                  icon={BookUserIcon}
                  title={f.ledgersEmpty}
                  description={f.ledgersEmptyHint}
                />
              ) : (
                <>
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
                              <PartyName
                                p={p}
                                href={partyHref(p)}
                                kindLabel={
                                  p.clientKind ? t.clients[`kind_${p.clientKind}`] : f.freeTextParty
                                }
                              />
                            </TableCell>
                            <TableCell className="text-end align-top">
                              {cells(p, "invoiced")}
                            </TableCell>
                            <TableCell className="text-end align-top">
                              {cells(p, "received")}
                            </TableCell>
                            <TableCell className="text-end align-top">{cells(p, "paid")}</TableCell>
                            <TableCell className="align-top">
                              <span className="flex flex-col gap-1">
                                {p.currencies.map((c) => (
                                  <BalanceBadge
                                    key={c.currency}
                                    minor={c.balance}
                                    currency={c.currency}
                                    ctx={ctx}
                                  />
                                ))}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <ul className="divide-y divide-frame-line md:hidden">
                    {parties.map((p) => (
                      <li
                        key={`${p.type}:${p.id ?? p.name}`}
                        className="space-y-2 px-(--cell-pad) py-3"
                      >
                        <PartyName
                          p={p}
                          href={partyHref(p)}
                          kindLabel={
                            p.clientKind ? t.clients[`kind_${p.clientKind}`] : f.freeTextParty
                          }
                        />
                        <div className="flex flex-col gap-1 ps-12">
                          {p.currencies.map((c) => (
                            <BalanceBadge
                              key={c.currency}
                              minor={c.balance}
                              currency={c.currency}
                              ctx={ctx}
                            />
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )
            ) : projectRows.length === 0 ? (
              <EmptyState icon={FolderKanbanIcon} title={f.projectsLedgerEmpty} />
            ) : (
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
                            <span className="block max-w-56 truncate font-semibold group-hover:text-primary-ink">
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
                        <MoneyStack
                          rows={subtractByCurrency(p.stats.income, p.stats.expense)}
                          locale={locale}
                          compact
                        />
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
            )}
          </FrameCell>
        </FrameGrid>
      </FrameBox>
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
      <Avatar className="size-9 rounded-none">
        <AvatarFallback
          className="rounded-none text-white"
          style={{ backgroundColor: p.color ?? (p.type === "party" ? "#919EAB" : "#078DEE") }}
        >
          {initials(p.name)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block max-w-60 truncate font-semibold group-hover:text-primary-ink">
          {p.name}
        </span>
        <Badge variant="neutral" className="mt-0.5">
          {kindLabel}
        </Badge>
      </span>
    </Link>
  );
}
