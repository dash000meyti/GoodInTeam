import Link from "next/link";
import {
  AlarmClockIcon,
  BanknoteIcon,
  FilePenLineIcon,
  PlusIcon,
  ReceiptIcon,
  SearchXIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { InvoiceStatusBadge } from "@/components/finance/invoice-status-badge";
import { KpiCard } from "@/components/finance/kpi-card";
import { Money, MoneyStack } from "@/components/finance/money";
import { format } from "@/i18n/format-message";
import { formatDate, formatNumber } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import { isAdmin } from "@/server/auth/actor";
import { invoiceKpis, invoiceStatusCounts, listInvoices } from "@/server/modules/finance/invoices";
import { baseCurrency, todayStart } from "@/server/modules/finance/internal";
import { panelContext, type PanelContext } from "@/server/page-context";

const tabs = ["all", "draft", "sent", "partial", "overdue", "paid", "void"] as const;
type Tab = (typeof tabs)[number];

export default async function InvoicesPage({
  searchParams,
}: PageProps<"/[locale]/panel/invoices">) {
  const ctx = await panelContext({ roles: ["owner", "admin", "client"] });
  const { actor, t, href, locale, now } = ctx;
  const f = t.finance;
  const admin = isAdmin(actor);
  const raw = (await searchParams).status;
  const status = (
    typeof raw === "string" && ((tabs as readonly string[]).includes(raw) || raw === "open")
      ? raw
      : "all"
  ) as Tab | "open";
  const list = listInvoices(actor, { status: status === "all" ? undefined : status });
  const counts = invoiceStatusCounts(actor);
  const kpis = invoiceKpis(actor, { now, locale });
  const base = baseCurrency();
  const today = todayStart(now);
  const visibleTabs = admin ? tabs : tabs.filter((s) => s !== "draft" && s !== "void");
  const count = (s: Tab) =>
    s === "all"
      ? counts.all
      : s === "sent"
        ? (counts.sent ?? 0) + (counts.viewed ?? 0)
        : (counts[s] ?? 0);

  const newButton = admin ? (
    <Button asChild>
      <Link href={href("/panel/invoices/new")}>
        <PlusIcon /> {f.newInvoice}
      </Link>
    </Button>
  ) : null;

  return (
    <>
      <PageHeader
        title={f.invoicesTitle}
        description={admin ? f.invoicesSubtitle : f.clientInvoicesSubtitle}
        crumbs={
          admin
            ? [{ label: f.title, href: href("/panel/finance") }, { label: f.invoicesTitle }]
            : undefined
        }
        actions={newButton}
      />

      {admin && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-4">
          <KpiCard
            label={f.outstanding}
            icon={ReceiptIcon}
            tone="warning"
            value={
              <MoneyStack
                rows={kpis.outstanding}
                locale={locale}
                base={base}
                compact
                secondaryClassName="text-sm"
              />
            }
            hint={format(f.openInvoicesCount, { n: formatNumber(kpis.openCount, locale) })}
          />
          <KpiCard
            label={f.overdueAmount}
            icon={AlarmClockIcon}
            tone="destructive"
            value={
              <MoneyStack
                rows={kpis.overdue}
                locale={locale}
                base={base}
                compact
                secondaryClassName="text-sm"
              />
            }
            hint={format(f.overdueCount, { n: formatNumber(kpis.overdueCount, locale) })}
          />
          <KpiCard
            label={f.paidThisMonth}
            icon={BanknoteIcon}
            tone="success"
            value={
              <MoneyStack
                rows={kpis.paidThisMonth}
                locale={locale}
                base={base}
                compact
                secondaryClassName="text-sm"
              />
            }
          />
          <KpiCard
            label={f.drafts}
            icon={FilePenLineIcon}
            tone="info"
            value={formatNumber(kpis.drafts, locale)}
          />
        </div>
      )}

      {counts.all === 0 ? (
        <EmptyState
          icon={ReceiptIcon}
          title={admin ? f.invoicesEmpty : f.clientInvoicesEmpty}
          description={admin ? f.invoicesEmptyHint : undefined}
          action={newButton}
        />
      ) : (
        <>
          <nav
            aria-label={t.common.status}
            className="mb-4 flex max-w-full scrollbar-thin gap-1 overflow-x-auto rounded-xl bg-muted p-1 sm:w-fit"
          >
            {visibleTabs.map((s) => {
              const on = s === status || (s === "all" && status === "open");
              return (
                <Link
                  key={s}
                  href={href(`/panel/invoices${s === "all" ? "" : `?status=${s}`}`)}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                    on && "bg-background text-foreground shadow-card dark:bg-card",
                  )}
                >
                  {f[`tab_${s}`]}
                  <span
                    className={cn(
                      "rounded-md px-1.5 text-xs tabular-nums",
                      on
                        ? "bg-primary/12 text-primary-dark dark:text-primary-light"
                        : "bg-grey-500/12",
                    )}
                  >
                    {formatNumber(count(s), locale)}
                  </span>
                </Link>
              );
            })}
          </nav>

          {list.length === 0 ? (
            <EmptyState icon={SearchXIcon} title={f.invoicesNoMatch} />
          ) : (
            <Card className="gap-0 overflow-hidden py-0">
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{f.number}</TableHead>
                      <TableHead>{f.client}</TableHead>
                      <TableHead>{f.issueDate}</TableHead>
                      <TableHead>{f.dueDate}</TableHead>
                      <TableHead className="text-end">{f.total}</TableHead>
                      <TableHead className="text-end">{f.due}</TableHead>
                      <TableHead>{t.common.status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <Link
                            href={href(`/panel/invoices/${inv.id}`)}
                            className="font-mono font-bold hover:text-primary"
                            dir="ltr"
                          >
                            {inv.number}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <ClientCell inv={inv} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(inv.issueDate, ctx.fmt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <DueCell inv={inv} today={today} ctx={ctx} />
                        </TableCell>
                        <TableCell className="text-end">
                          <Money
                            minor={inv.totalMinor}
                            currency={inv.currency}
                            locale={locale}
                            className="font-semibold"
                          />
                        </TableCell>
                        <TableCell className="text-end">
                          {inv.dueMinor > 0 && inv.status !== "draft" ? (
                            <Money
                              minor={inv.dueMinor}
                              currency={inv.currency}
                              locale={locale}
                              className="font-bold"
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <InvoiceStatusBadge status={inv.status} t={f} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="divide-y divide-dashed md:hidden">
                {list.map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href={href(`/panel/invoices/${inv.id}`)}
                      className="flex items-start gap-3 px-4 py-3"
                    >
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold" dir="ltr">
                            {inv.number}
                          </span>
                          <InvoiceStatusBadge status={inv.status} t={f} />
                        </span>
                        <span className="block truncate text-sm">{inv.client?.name ?? "—"}</span>
                        <span className="block text-xs text-muted-foreground">
                          <DueCell inv={inv} today={today} ctx={ctx} />
                        </span>
                      </span>
                      <span className="text-end">
                        <Money
                          minor={inv.totalMinor}
                          currency={inv.currency}
                          locale={locale}
                          className="block text-sm font-bold"
                        />
                        {inv.dueMinor > 0 && inv.dueMinor !== inv.totalMinor && (
                          <span className="block text-xs text-muted-foreground">
                            {f.due}:{" "}
                            <Money minor={inv.dueMinor} currency={inv.currency} locale={locale} />
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </>
  );
}

type Row = ReturnType<typeof listInvoices>[number];

function ClientCell({ inv }: { inv: Row }) {
  return (
    <span className="flex items-center gap-2.5">
      <Avatar className="size-8 rounded-lg">
        <AvatarFallback
          className="rounded-lg text-xs text-white"
          style={{ backgroundColor: inv.client?.color ?? "#919EAB" }}
        >
          {inv.client ? initials(inv.client.name) : "—"}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block max-w-52 truncate text-sm font-semibold">
          {inv.client?.name ?? "—"}
        </span>
        {inv.project && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ColorDot color={inv.project.color} className="size-2" />
            <span className="max-w-44 truncate">{inv.project.name}</span>
          </span>
        )}
      </span>
    </span>
  );
}

function DueCell({ inv, today, ctx }: { inv: Row; today: number; ctx: PanelContext }) {
  const f = ctx.t.finance;
  if (!inv.dueDate) return <span className="text-muted-foreground">{f.noDueDate}</span>;
  const days = Math.round((inv.dueDate.getTime() - today) / 86_400_000);
  const open = inv.status !== "paid" && inv.status !== "void" && inv.status !== "draft";
  return (
    <span className="flex flex-wrap items-center gap-x-2">
      <span>{formatDate(inv.dueDate, ctx.fmt)}</span>
      {open && (
        <span
          className={cn(
            "text-xs",
            days < 0 ? "font-semibold text-destructive" : "text-muted-foreground",
          )}
        >
          {days < 0
            ? format(f.overdueDays, { n: formatNumber(-days, ctx.locale) })
            : days === 0
              ? f.dueToday
              : format(f.dueInDays, { n: formatNumber(days, ctx.locale) })}
        </span>
      )}
    </span>
  );
}
