import Link from "next/link";
import {
  ArrowUpRightIcon,
  CalendarCheck2Icon,
  FileSignatureIcon,
  HourglassIcon,
  LayoutTemplateIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  TimerIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { StatCard } from "@/components/panel/stat-card";
import { ContractKindBadge, ContractStatusBadge } from "@/components/contracts/contract-badges";
import { format } from "@/i18n/format-message";
import { formatDate, formatDateTime, formatNumber, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { clientOptions } from "@/server/modules/clients/service";
import {
  contractStats,
  listContracts,
  listStarterTemplates,
  listTemplates,
  type ContractListItem,
} from "@/server/modules/contracts/service";
import { panelContext, type PanelContext } from "@/server/page-context";
import { ContractsFilters } from "./_components/contracts-filters";
import { formatSpan } from "./_components/format";
import { DeleteTemplateButton, InstallStartersButton } from "./_components/template-actions";

const TABS = ["all", "draft", "awaiting", "signed", "closed", "templates"] as const;
type Tab = (typeof TABS)[number];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ContractsPage({
  searchParams,
}: PageProps<"/[locale]/panel/contracts">) {
  const ctx = await panelContext();
  const { actor, t } = ctx;
  if (actor.user.role === "client") return <ClientContracts ctx={ctx} />;
  if (actor.user.role === "member") {
    return (
      <>
        <PageHeader title={t.contracts.title} />
        <EmptyState
          icon={LockIcon}
          title={t.contracts.noAccessTitle}
          description={t.contracts.noAccessBody}
        />
      </>
    );
  }
  const sp = await searchParams;
  const tabParam = one(sp.tab);
  const tab: Tab = (TABS as readonly string[]).includes(tabParam) ? (tabParam as Tab) : "all";
  return <AdminContracts ctx={ctx} tab={tab} q={one(sp.q)} clientId={one(sp.client)} />;
}

async function AdminContracts({
  ctx,
  tab,
  q,
  clientId,
}: {
  ctx: PanelContext;
  tab: Tab;
  q: string;
  clientId: string;
}) {
  const { actor, t, fmt, href, locale, now, tz } = ctx;
  const c = t.contracts;
  const stats = contractStats(actor, { now, tz, calendar: fmt.calendar ?? "persian" });
  const clients = clientOptions(actor);
  const base = href("/panel/contracts");
  const tabHref = (k: Tab) => {
    const p = new URLSearchParams();
    if (k !== "all") p.set("tab", k);
    if (q) p.set("q", q);
    if (clientId) p.set("client", clientId);
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };

  const newButton = (
    <Button asChild>
      <Link
        href={href(
          tab === "templates" ? "/panel/contracts/new?asTemplate=1" : "/panel/contracts/new",
        )}
      >
        <PlusIcon /> {tab === "templates" ? c.newTemplate : c.new}
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader
        title={c.title}
        description={c.subtitle}
        crumbs={[{ label: t.nav.dashboard, href: href("/panel") }, { label: c.title }]}
        actions={newButton}
      />

      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard
          label={c.kpiAwaiting}
          value={formatNumber(stats.awaiting, locale)}
          hint={
            stats.viewedAwaiting > 0
              ? format(c.kpiAwaitingHint, { n: formatNumber(stats.viewedAwaiting, locale) })
              : undefined
          }
          icon={HourglassIcon}
          tone="warning"
        />
        <StatCard
          label={c.kpiSignedMonth}
          value={formatNumber(stats.signedThisMonth, locale)}
          icon={CalendarCheck2Icon}
          tone="success"
        />
        <StatCard
          label={c.kpiAvgTime}
          value={stats.avgTimeToSignMs != null ? formatSpan(stats.avgTimeToSignMs, locale, c) : "—"}
          hint={
            stats.avgTimeToSignMs != null
              ? format(c.kpiAvgTimeHint, { n: formatNumber(stats.signedCount, locale) })
              : c.kpiNoData
          }
          icon={TimerIcon}
          tone="info"
        />
      </div>

      <nav
        aria-label={c.title}
        className="-mx-4 mt-8 flex scrollbar-none gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        <div className="inline-flex h-10 items-center gap-1 rounded-xl bg-muted p-1">
          {TABS.map((k) => {
            const active = k === tab;
            return (
              <Link
                key={k}
                href={tabHref(k)}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-full items-center gap-1.5 rounded-lg px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                  active && "bg-background text-foreground shadow-card dark:bg-card",
                )}
              >
                {k === "templates" && <LayoutTemplateIcon className="size-4" />}
                {c[`tab_${k}`]}
                <span
                  className={cn(
                    "rounded-md px-1.5 text-xs tabular-nums",
                    active
                      ? "bg-primary/16 text-primary-dark dark:text-primary-light"
                      : "bg-grey-500/16",
                  )}
                >
                  {formatNumber(stats.tabs[k], locale)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {tab === "templates" ? (
        <TemplatesTab ctx={ctx} />
      ) : (
        <div className="mt-6 space-y-4">
          <ContractsFilters basePath={base} tab={tab} q={q} clientId={clientId} clients={clients} />
          <DocumentsList
            ctx={ctx}
            rows={await listContracts(actor, {
              status: tab === "all" ? undefined : tab,
              q: q || undefined,
              clientId: clientId || undefined,
            })}
            filtered={!!(q || clientId || tab !== "all")}
            clearHref={base}
            newButton={newButton}
          />
        </div>
      )}
    </>
  );
}

function DocumentsList({
  ctx,
  rows,
  filtered,
  clearHref,
  newButton,
}: {
  ctx: PanelContext;
  rows: ContractListItem[];
  filtered: boolean;
  clearHref: string;
  newButton: React.ReactNode;
}) {
  const { t, fmt, href, now, locale } = ctx;
  const c = t.contracts;
  if (rows.length === 0) {
    return filtered ? (
      <EmptyState
        icon={FileSignatureIcon}
        title={c.emptyFiltered}
        action={
          <Button asChild variant="outline">
            <Link href={clearHref}>{c.clearFilters}</Link>
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={FileSignatureIcon}
        title={c.empty}
        description={c.emptyHint}
        action={newButton}
      />
    );
  }
  const rel = (d: Date | null) =>
    d ? (
      <time dateTime={d.toISOString()} title={formatDateTime(d, fmt)}>
        {formatRelative(d, fmt, now)}
      </time>
    ) : (
      <span className="text-muted-foreground/60">—</span>
    );

  return (
    <>
      {/* Desktop table */}
      <Card className="hidden py-0 md:flex">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[34%]">{c.colDocument}</TableHead>
              <TableHead>{c.colClient}</TableHead>
              <TableHead>{c.colStatus}</TableHead>
              <TableHead>{c.colSent}</TableHead>
              <TableHead>{c.colViewed}</TableHead>
              <TableHead>{c.colSigned}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} className="group">
                <TableCell className="max-w-0">
                  <Link
                    href={href(`/panel/contracts/${r.id}`)}
                    className="block truncate font-semibold group-hover:text-primary"
                  >
                    {r.title}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <ContractKindBadge kind={r.kind} t={c} />
                    {r.version > 1 && (
                      <span>{format(c.versionN, { n: formatNumber(r.version, locale) })}</span>
                    )}
                    {r.project && (
                      <span className="flex min-w-0 items-center gap-1 truncate">
                        <ColorDot color={r.project.color} className="size-2" />
                        {r.project.name}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.client?.name ?? "—"}</TableCell>
                <TableCell>
                  <ContractStatusBadge
                    status={r.effectiveStatus}
                    requireSignature={r.requireSignature}
                    t={c}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">{rel(r.sentAt)}</TableCell>
                <TableCell className="text-muted-foreground">{rel(r.firstViewedAt)}</TableCell>
                <TableCell className="text-muted-foreground">{rel(r.signedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile cards */}
      <ul className="grid gap-3 md:hidden">
        {rows.map((r) => {
          const last = r.signedAt
            ? [c.colSigned, r.signedAt]
            : r.declinedAt
              ? [c.declinedAt, r.declinedAt]
              : r.firstViewedAt
                ? [c.colViewed, r.firstViewedAt]
                : r.sentAt
                  ? [c.colSent, r.sentAt]
                  : null;
          return (
            <li key={r.id}>
              <Link href={href(`/panel/contracts/${r.id}`)} className="block">
                <Card className="gap-3 p-4 transition-shadow hover:shadow-dropdown">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-semibold">{r.title}</p>
                    <ContractStatusBadge
                      status={r.effectiveStatus}
                      requireSignature={r.requireSignature}
                      t={c}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <ContractKindBadge kind={r.kind} t={c} />
                    {r.client && <span>{r.client.name}</span>}
                    {r.project && <span>· {r.project.name}</span>}
                    {last && (
                      <span className="ms-auto">
                        {last[0] as string} {rel(last[1] as Date)}
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function TemplatesTab({ ctx }: { ctx: PanelContext }) {
  const { actor, t, href, fmt, locale } = ctx;
  const c = t.contracts;
  const templates = listTemplates(actor);
  const starters = listStarterTemplates().sort(
    (a, b) => Number(b.locale === locale) - Number(a.locale === locale),
  );

  return (
    <div className="mt-6 space-y-8">
      {templates.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="gap-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <h3 className="font-bold">{tpl.title}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    <ContractKindBadge kind={tpl.kind} t={c} />
                    <Badge variant={tpl.requireSignature ? "info" : "violet"}>
                      {tpl.requireSignature ? c.signatureRequired : c.approvalOnly}
                    </Badge>
                    <Badge variant="neutral">{tpl.locale.toUpperCase()}</Badge>
                  </div>
                </div>
                <DeleteTemplateButton id={tpl.id} />
              </div>
              <p className="line-clamp-3 text-sm text-muted-foreground">{tpl.excerpt}</p>
              <div className="mt-auto flex items-center justify-between gap-2 border-t border-dashed pt-4">
                <span className="text-xs text-muted-foreground">
                  {format(c.placeholdersCount, {
                    n: formatNumber(tpl.placeholders.length, locale),
                  })}
                  {" · "}
                  {formatDate(tpl.updatedAt, fmt)}
                </span>
                <div className="flex gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={href(`/panel/contracts/${tpl.id}/edit`)}>
                      <PencilIcon /> {t.common.edit}
                    </Link>
                  </Button>
                  <Button asChild variant="soft" size="sm">
                    <Link href={href(`/panel/contracts/new?from=${tpl.id}`)}>
                      {c.useTemplate} <ArrowUpRightIcon className="rtl:-scale-x-100" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={LayoutTemplateIcon}
          title={c.templatesEmpty}
          description={c.templatesEmptyHint}
          action={<InstallStartersButton />}
        />
      )}

      {templates.length === 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">{c.startersTitle}</h2>
            <p className="text-sm text-muted-foreground">{c.startersHint}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {starters.map((s) => (
              <Card key={s.key} className="gap-3 p-6" dir={s.locale === "fa" ? "rtl" : "ltr"}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ContractKindBadge kind={s.kind} t={t.contracts} />
                  <Badge variant="neutral">{s.locale.toUpperCase()}</Badge>
                </div>
                <h3 className="font-bold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.summary}</p>
                <div className="mt-auto flex justify-end pt-2">
                  <Button asChild variant="soft" size="sm">
                    <Link href={href(`/panel/contracts/new?starter=${s.key}`)}>
                      {c.useTemplate} <ArrowUpRightIcon className="rtl:-scale-x-100" />
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Client portal: documents sent to the signed-in client (read-only). */
async function ClientContracts({ ctx }: { ctx: PanelContext }) {
  const { actor, t, fmt, href, now } = ctx;
  const c = t.contracts;
  const isPending = (s: string) => s === "sent" || s === "viewed";
  // Documents waiting for the client come first.
  const rows = (await listContracts(actor, {})).sort(
    (a, b) => Number(isPending(b.effectiveStatus)) - Number(isPending(a.effectiveStatus)),
  );
  return (
    <>
      <PageHeader title={c.portalTitle} description={c.portalSubtitle} />
      {rows.length === 0 ? (
        <EmptyState icon={FileSignatureIcon} title={c.portalEmpty} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => {
            const pending = r.effectiveStatus === "sent" || r.effectiveStatus === "viewed";
            const signed = r.effectiveStatus === "signed";
            return (
              <Card key={r.id} className="gap-4 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <h2 className="font-bold">{r.title}</h2>
                    <ContractKindBadge kind={r.kind} t={c} />
                  </div>
                  <ContractStatusBadge
                    status={r.effectiveStatus}
                    requireSignature={r.requireSignature}
                    t={c}
                  />
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  {r.project && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">{c.fieldProject}</dt>
                      <dd className="font-semibold">{r.project.name}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">{c.sentAt}</dt>
                    <dd className="font-semibold">{formatDate(r.sentAt, fmt)}</dd>
                  </div>
                  {(signed || pending || r.effectiveStatus === "declined") && (
                    <div>
                      <dt className="text-muted-foreground">
                        {signed
                          ? r.requireSignature
                            ? c.signedAt
                            : c.approvedAt
                          : pending
                            ? c.expiresAt
                            : c.declinedAt}
                      </dt>
                      <dd className="font-semibold">
                        {signed
                          ? formatDate(r.signedAt, fmt)
                          : pending
                            ? r.expiresAt
                              ? formatRelative(r.expiresAt, fmt, now)
                              : c.noExpiry
                            : formatDate(r.declinedAt, fmt)}
                      </dd>
                    </div>
                  )}
                </dl>
                {r.shareToken && (
                  <Button
                    asChild
                    variant={pending ? "default" : "outline"}
                    className="mt-auto w-full"
                  >
                    <Link href={href(`/sign/${r.shareToken}`)}>
                      {pending
                        ? r.requireSignature
                          ? c.reviewAndSign
                          : c.reviewAndApprove
                        : signed
                          ? c.viewSignedCopy
                          : c.viewDocument}
                    </Link>
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
