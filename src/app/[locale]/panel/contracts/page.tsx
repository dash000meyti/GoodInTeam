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
import { StatCard, StatRow } from "@/components/panel/stat-card";
import {
  FrameBox,
  FrameCell,
  FrameFiller,
  FrameGrid,
  HEADING_CLASS,
} from "@/components/shell/frame";
import { packRows } from "@/components/site/frame-plan";
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

/**
 * Contracts (framed). Admins: the page box carries the three KPIs; the list
 * is one box whose rows are the view chips, the filters and the table (or
 * the template cells). Clients: their documents as one framed grid. Members
 * have no access.
 */
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
      >
        <StatRow>
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
            value={
              stats.avgTimeToSignMs != null ? formatSpan(stats.avgTimeToSignMs, locale, c) : "—"
            }
            hint={
              stats.avgTimeToSignMs != null
                ? format(c.kpiAvgTimeHint, { n: formatNumber(stats.signedCount, locale) })
                : c.kpiNoData
            }
            icon={TimerIcon}
            tone="info"
          />
        </StatRow>
      </PageHeader>

      <FrameBox as="section" density="compact" ariaLabel={c.title}>
        {/* First row: the view chips (the site's filter row). */}
        <FrameGrid cols={1}>
          <FrameCell className="py-3">
            <nav
              aria-label={c.title}
              className="-mx-1 flex max-w-[calc(100%+0.5rem)] scrollbar-thin gap-1.5 overflow-x-auto px-1 py-0.5"
            >
              {TABS.map((k) => {
                const active = k === tab;
                return (
                  <Link
                    key={k}
                    href={tabHref(k)}
                    scroll={false}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] border px-3 text-sm font-semibold whitespace-nowrap transition-colors",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-frame-line bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    {k === "templates" && <LayoutTemplateIcon className="size-4" />}
                    {c[`tab_${k}`]}
                    <span className={cn("text-xs tabular-nums", active && "opacity-80")}>
                      {formatNumber(stats.tabs[k], locale)}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </FrameCell>
        </FrameGrid>

        {tab === "templates" ? (
          <TemplatesRows ctx={ctx} />
        ) : (
          <>
            <FrameGrid cols={1}>
              <FrameCell className="py-3">
                <ContractsFilters
                  basePath={base}
                  tab={tab}
                  q={q}
                  clientId={clientId}
                  clients={clients}
                />
              </FrameCell>
            </FrameGrid>
            <FrameGrid cols={1}>
              <FrameCell pad="none">
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
              </FrameCell>
            </FrameGrid>
          </>
        )}
      </FrameBox>
    </>
  );
}

/** The documents cell's body: the table edge to edge (md+), hairline rows on phones. */
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
      <div className="hidden md:block">
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
                    className="block truncate font-semibold group-hover:text-primary-ink"
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
                        <ColorDot color={r.project.color} className="size-2 rounded-none" />
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
      </div>

      <ul className="divide-y divide-frame-line md:hidden">
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
              <Link
                href={href(`/panel/contracts/${r.id}`)}
                className="block space-y-2 px-(--cell-pad) py-3 transition-colors hover:bg-card"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0 font-semibold">{r.title}</span>
                  <ContractStatusBadge
                    status={r.effectiveStatus}
                    requireSignature={r.requireSignature}
                    t={c}
                  />
                </span>
                <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <ContractKindBadge kind={r.kind} t={c} />
                  {r.client && <span>{r.client.name}</span>}
                  {r.project && <span>· {r.project.name}</span>}
                  {last && (
                    <span className="ms-auto">
                      {last[0] as string} {rel(last[1] as Date)}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** The templates view: more rows of the list box (template cells, or the starters). */
function TemplatesRows({ ctx }: { ctx: PanelContext }) {
  const { actor, t, href, fmt, locale } = ctx;
  const c = t.contracts;
  const templates = listTemplates(actor);
  const starters = listStarterTemplates().sort(
    (a, b) => Number(b.locale === locale) - Number(a.locale === locale),
  );
  const templateSpans = templates.map(() => undefined);
  const starterSpans = starters.map(() => undefined);

  if (templates.length > 0) {
    return (
      <FrameGrid cols={3}>
        {templates.map((tpl) => (
          <FrameCell key={tpl.id} as="article" className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <h3 className={HEADING_CLASS.box}>{tpl.title}</h3>
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
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-frame-line pt-4">
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
                <Button asChild variant="outline" size="sm">
                  <Link href={href(`/panel/contracts/new?from=${tpl.id}`)}>
                    {c.useTemplate} <ArrowUpRightIcon className="rtl:-scale-x-100" />
                  </Link>
                </Button>
              </div>
            </div>
          </FrameCell>
        ))}
        <FrameFiller
          units={{
            md: packRows(templateSpans, 3, "md").trailing,
            lg: packRows(templateSpans, 3, "lg").trailing,
          }}
        />
      </FrameGrid>
    );
  }

  return (
    <>
      <FrameGrid cols={1}>
        <FrameCell>
          <EmptyState
            icon={LayoutTemplateIcon}
            title={c.templatesEmpty}
            description={c.templatesEmptyHint}
            action={<InstallStartersButton />}
          />
        </FrameCell>
      </FrameGrid>
      <FrameGrid cols={1}>
        <FrameCell header className="space-y-1">
          <h2 className={HEADING_CLASS.box}>{c.startersTitle}</h2>
          <p className="text-sm text-muted-foreground">{c.startersHint}</p>
        </FrameCell>
      </FrameGrid>
      <FrameGrid cols={2}>
        {starters.map((s) => (
          <FrameCell key={s.key} as="article" className="flex flex-col gap-3">
            <div dir={s.locale === "fa" ? "rtl" : "ltr"} className="flex flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <ContractKindBadge kind={s.kind} t={t.contracts} />
                <Badge variant="neutral">{s.locale.toUpperCase()}</Badge>
              </div>
              <h3 className={HEADING_CLASS.box}>{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.summary}</p>
              <div className="mt-auto flex justify-end pt-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={href(`/panel/contracts/new?starter=${s.key}`)}>
                    {c.useTemplate} <ArrowUpRightIcon className="rtl:-scale-x-100" />
                  </Link>
                </Button>
              </div>
            </div>
          </FrameCell>
        ))}
        <FrameFiller
          units={{
            md: packRows(starterSpans, 2, "md").trailing,
            lg: packRows(starterSpans, 2, "lg").trailing,
          }}
        />
      </FrameGrid>
    </>
  );
}

/** Client portal: documents sent to the signed-in client, as one framed grid (read-only). */
async function ClientContracts({ ctx }: { ctx: PanelContext }) {
  const { actor, t, fmt, href, now } = ctx;
  const c = t.contracts;
  const isPending = (s: string) => s === "sent" || s === "viewed";
  // Documents waiting for the client come first.
  const rows = (await listContracts(actor, {})).sort(
    (a, b) => Number(isPending(b.effectiveStatus)) - Number(isPending(a.effectiveStatus)),
  );
  const spans = rows.map(() => undefined);
  return (
    <>
      <PageHeader title={c.portalTitle} description={c.portalSubtitle} />
      {rows.length === 0 ? (
        <EmptyState icon={FileSignatureIcon} title={c.portalEmpty} />
      ) : (
        <FrameBox as="section" density="compact" ariaLabel={c.portalTitle}>
          <FrameGrid cols={3}>
            {rows.map((r) => {
              const pending = r.effectiveStatus === "sent" || r.effectiveStatus === "viewed";
              const signed = r.effectiveStatus === "signed";
              return (
                <FrameCell key={r.id} as="article" className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <h2 className={HEADING_CLASS.box}>{r.title}</h2>
                      <ContractKindBadge kind={r.kind} t={c} />
                    </div>
                    <ContractStatusBadge
                      status={r.effectiveStatus}
                      requireSignature={r.requireSignature}
                      t={c}
                    />
                  </div>
                  <dl className="grid grid-cols-2 gap-2 border-t border-dashed border-frame-line pt-3 text-xs">
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
                </FrameCell>
              );
            })}
            <FrameFiller
              units={{
                md: packRows(spans, 3, "md").trailing,
                lg: packRows(spans, 3, "lg").trailing,
              }}
            />
          </FrameGrid>
        </FrameBox>
      )}
    </>
  );
}
