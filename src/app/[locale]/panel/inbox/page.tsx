import Link from "next/link";
import { InboxIcon, SearchIcon, SearchXIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { messages } from "@/i18n/messages";
import { budgetRanges } from "@/lib/content";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { leadStatuses } from "@/server/db/schema";
import { listServices } from "@/server/modules/content/queries";
import { leadCounts, listLeads } from "@/server/modules/leads/service";
import { panelContext } from "@/server/page-context";
import { LeadsBoard, type LeadRow } from "./_components/leads-board";

/**
 * Inbox (framed): the page box, then one box whose first row holds the status
 * chips and the search and whose second row lists the leads edge to edge.
 */
export default async function InboxPage({ searchParams }: PageProps<"/[locale]/panel/inbox">) {
  const { actor, t, href, fmt, locale, now } = await panelContext({ roles: ["owner", "admin"] });
  const sp = await searchParams;
  const status = (leadStatuses as readonly string[]).includes(String(sp.status))
    ? (sp.status as (typeof leadStatuses)[number])
    : undefined;
  const q = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim().slice(0, 200) : undefined;
  const leads = listLeads(actor, { status, q });
  const counts = leadCounts(actor);
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const c = t.content;

  // Human labels for service slugs / budget keys (both form languages).
  const services = new Map<string, string>();
  for (const l of ["fa", "en"] as const) {
    for (const s of await listServices(l))
      if (!services.has(s.slug) || l === locale) services.set(s.slug, s.title);
  }
  const budgetLabel = (b: string | null) =>
    b && (budgetRanges as readonly string[]).includes(b)
      ? messages[locale].site[`budget_${b as (typeof budgetRanges)[number]}`]
      : b;

  const rows: LeadRow[] = leads.map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    company: l.company,
    service: l.service,
    serviceLabel: l.service
      ? (services.get(l.service) ??
        (l.service === "other" ? messages[locale].site.formServiceOther : l.service))
      : null,
    budget: l.budget,
    budgetLabel: budgetLabel(l.budget),
    message: l.message,
    locale: l.locale,
    source: l.source,
    status: l.status,
    clientId: l.clientId,
    received: formatRelative(l.createdAt, fmt, now),
    receivedFull: formatDateTime(l.createdAt, fmt),
  }));

  /** A status chip (the site's filter chip: 32px, hairline, the active one filled with ink). */
  const tab = (s: string | undefined, label: string, n: number) => {
    const active = s === status;
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    if (q) params.set("q", q);
    const qs = params.toString();
    return (
      <Link
        key={s ?? "all"}
        href={href(`/panel/inbox${qs ? `?${qs}` : ""}`)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] border px-3 text-sm font-semibold whitespace-nowrap transition-colors",
          active
            ? "border-foreground bg-foreground text-background"
            : "border-frame-line bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
        )}
      >
        {label}
        <span className={cn("text-xs tabular-nums", active && "opacity-80")}>
          {formatNumber(n, locale)}
        </span>
      </Link>
    );
  };

  return (
    <>
      <PageHeader
        title={c.inboxTitle}
        description={c.inboxSubtitle}
        crumbs={[{ label: t.nav.dashboard, href: href("/panel") }, { label: c.inboxTitle }]}
      />
      {total === 0 && !q ? (
        <EmptyState icon={InboxIcon} title={c.inboxEmpty} description={c.inboxEmptyHint} />
      ) : (
        <FrameBox as="section" density="compact" ariaLabel={c.inboxTitle}>
          <FrameGrid cols={1}>
            <FrameCell className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center">
              <nav
                aria-label={t.common.status}
                className="-mx-1 flex max-w-[calc(100%+0.5rem)] min-w-0 scrollbar-thin gap-1.5 overflow-x-auto px-1 py-0.5"
              >
                {tab(undefined, t.common.all, total)}
                {leadStatuses.map((s) => tab(s, c[`leadStatus_${s}`], counts[s] ?? 0))}
              </nav>
              <form method="get" className="relative shrink-0 lg:ms-auto lg:w-72">
                {status && <input type="hidden" name="status" value={status} />}
                <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder={c.searchLeads}
                  className="ps-9"
                  aria-label={t.common.search}
                />
              </form>
            </FrameCell>
          </FrameGrid>
          <FrameGrid cols={1}>
            <FrameCell pad="none">
              {rows.length === 0 ? (
                <EmptyState icon={SearchXIcon} title={t.common.noMatches} className="py-10" />
              ) : (
                <LeadsBoard rows={rows} />
              )}
            </FrameCell>
          </FrameGrid>
        </FrameBox>
      )}
    </>
  );
}
