import Link from "next/link";
import { InboxIcon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { messages } from "@/i18n/messages";
import { budgetRanges } from "@/lib/content";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { leadStatuses } from "@/server/db/schema";
import { listServices } from "@/server/modules/content/queries";
import { leadCounts, listLeads } from "@/server/modules/leads/service";
import { panelContext } from "@/server/page-context";
import { LeadsBoard, type LeadRow } from "./_components/leads-board";

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
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors",
          active
            ? "border-transparent bg-grey-800 text-white dark:bg-white dark:text-grey-800"
            : "border-border text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        <span className="text-xs tabular-nums opacity-70">{formatNumber(n, locale)}</span>
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
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="-mx-1 flex scrollbar-none gap-2 overflow-x-auto px-1 pb-1">
          {tab(undefined, t.common.all, total)}
          {leadStatuses.map((s) => tab(s, c[`leadStatus_${s}`], counts[s] ?? 0))}
        </div>
        <form method="get" className="relative lg:ms-auto lg:w-72">
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
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={InboxIcon} title={c.inboxEmpty} description={c.inboxEmptyHint} />
      ) : (
        <LeadsBoard rows={rows} />
      )}
    </>
  );
}
