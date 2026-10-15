import Link from "next/link";
import {
  BookOpenIcon,
  FileTextIcon,
  LockIcon,
  PlusIcon,
  SearchXIcon,
  Share2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Highlighted } from "@/components/docs/highlight";
import { VisibilityBadge } from "@/components/docs/visibility-badge";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { StatCard } from "@/components/panel/stat-card";
import { format } from "@/i18n/format-message";
import { formatDate, formatNumber, formatRelative } from "@/lib/format";
import { isStaff } from "@/server/auth/actor";
import {
  buildDocTree,
  docStats,
  listDocRows,
  recentDocs,
  searchDocs,
} from "@/server/modules/docs/service";
import { panelContext, type PanelContext } from "@/server/page-context";

export default async function DocsPage({ searchParams }: PageProps<"/[locale]/panel/docs">) {
  const ctx = await panelContext();
  const { actor, t, href } = ctx;
  const d = t.docs;
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 200) ?? "";
  const staff = isStaff(actor);

  const newButton = staff ? (
    <Button asChild>
      <Link href={href("/panel/docs/new")}>
        <PlusIcon /> {d.newPage}
      </Link>
    </Button>
  ) : null;

  return (
    <>
      <PageHeader
        title={staff ? d.title : d.portalTitle}
        description={staff ? d.subtitle : d.portalSubtitle}
        crumbs={[{ label: t.nav.dashboard, href: href("/panel") }, { label: d.title }]}
        actions={newButton}
      />
      {q ? (
        <SearchResults ctx={ctx} q={q} />
      ) : staff ? (
        <StaffHome ctx={ctx} newButton={newButton} />
      ) : (
        <PortalHome ctx={ctx} />
      )}
    </>
  );
}

function SearchResults({ ctx, q }: { ctx: PanelContext; q: string }) {
  const { actor, t, href, locale } = ctx;
  const d = t.docs;
  const results = searchDocs(actor, { q, limit: 30 });
  const staff = isStaff(actor);
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-dashed py-5">
        <CardTitle className="text-base">{format(d.searchResults, { q: `\u2068${q}\u2069` })}</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="neutral">
            {format(d.resultsCount, { n: formatNumber(results.length, locale) })}
          </Badge>
          <Button variant="ghost" size="sm" asChild>
            <Link href={href("/panel/docs")}>
              <XIcon /> {d.clearSearch}
            </Link>
          </Button>
        </div>
      </CardHeader>
      {results.length === 0 ? (
        <CardContent className="py-6">
          <EmptyState
            icon={SearchXIcon}
            title={format(d.searchEmpty, { q })}
            description={d.searchEmptyHint}
            className="border-0 bg-transparent"
          />
        </CardContent>
      ) : (
        <ul className="divide-y divide-dashed">
          {results.map((r) => (
            <li key={r.id}>
              <Link
                href={href(`/panel/docs/${r.id}`)}
                className="flex gap-4 px-6 py-4 transition-colors hover:bg-accent/50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                  {r.icon ?? <FileTextIcon className="size-5 text-muted-foreground" />}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">
                      <bdi>
                        <Highlighted text={r.title} ranges={r.titleRanges} />
                      </bdi>
                    </p>
                    {staff && <VisibilityBadge visibility={r.visibility} t={d} />}
                    {r.projectName && <Badge variant="outline">{r.projectName}</Badge>}
                  </div>
                  {r.snippet && (
                    <p className="line-clamp-2 text-sm leading-6 text-muted-foreground" dir="auto">
                      <Highlighted text={r.snippet} ranges={r.ranges} />
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function StaffHome({ ctx, newButton }: { ctx: PanelContext; newButton: React.ReactNode }) {
  const { actor, t, href, locale, fmt, now } = ctx;
  const d = t.docs;
  const stats = docStats(actor);
  if (stats.total === 0) {
    return (
      <EmptyState
        icon={BookOpenIcon}
        title={d.emptyTitle}
        description={d.emptyHint}
        action={newButton}
      />
    );
  }
  const recent = recentDocs(actor, 6);
  const roots = buildDocTree(listDocRows(actor));
  const n = (v: number) => formatNumber(v, locale);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 sm:hidden">
        <Badge variant="default" className="px-2 py-1">
          <BookOpenIcon /> {d.statPages}: {n(stats.total)}
        </Badge>
        <Badge variant="info" className="px-2 py-1">
          <UsersIcon /> {d.statTeam}: {n(stats.team)}
        </Badge>
        <Badge variant="violet" className="px-2 py-1">
          <Share2Icon /> {d.statClient}: {n(stats.client)}
        </Badge>
        <Badge variant="warning" className="px-2 py-1">
          <LockIcon /> {d.statPrivate}: {n(stats.private)}
        </Badge>
      </div>
      <div className="hidden gap-4 sm:grid sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard label={d.statPages} value={n(stats.total)} icon={BookOpenIcon} tone="primary" />
        <StatCard label={d.statTeam} value={n(stats.team)} icon={UsersIcon} tone="info" />
        <StatCard label={d.statClient} value={n(stats.client)} icon={Share2Icon} tone="violet" />
        <StatCard label={d.statPrivate} value={n(stats.private)} icon={LockIcon} tone="warning" />
      </div>
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-dashed py-5">
            <CardTitle className="text-base">{d.recentlyUpdated}</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-dashed">
            {recent.map((r) => (
              <li key={r.id}>
                <Link
                  href={href(`/panel/docs/${r.id}`)}
                  className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-accent/50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
                    {r.icon ?? <FileTextIcon className="size-4 text-muted-foreground" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      <bdi>{r.title}</bdi>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[r.updatedByName, formatRelative(r.updatedAt, fmt, now), r.projectName]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <VisibilityBadge
                    visibility={r.visibility}
                    t={d}
                    className="hidden sm:inline-flex"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-muted-foreground">{d.sections}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {roots.map((r) => (
              <Link key={r.id} href={href(`/panel/docs/${r.id}`)} className="group">
                <Card className="h-full gap-3 p-5 transition-shadow group-hover:shadow-dropdown">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-3xl leading-none">
                      {r.icon ?? <FileTextIcon className="size-7 text-muted-foreground" />}
                    </span>
                    <VisibilityBadge visibility={r.visibility} t={d} />
                  </div>
                  <p className="font-bold group-hover:text-primary">
                    <bdi>{r.title}</bdi>
                  </p>
                  <p className="mt-auto text-xs text-muted-foreground">
                    {[
                      r.children.length ? format(d.childCount, { n: n(r.children.length) }) : null,
                      r.projectName,
                    ]
                      .filter(Boolean)
                      .join(" · ") || " "}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function PortalHome({ ctx }: { ctx: PanelContext }) {
  const { actor, t, href, fmt } = ctx;
  const d = t.docs;
  const rows = listDocRows(actor);
  if (rows.length === 0) {
    return <EmptyState icon={BookOpenIcon} title={d.portalEmpty} description={d.portalEmptyHint} />;
  }
  const roots = buildDocTree(rows);
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {roots.map((r) => (
        <Card key={r.id} className="gap-3 p-5">
          <Link href={href(`/panel/docs/${r.id}`)} className="group flex items-center gap-3">
            <span className="text-3xl leading-none">
              {r.icon ?? <FileTextIcon className="size-7 text-muted-foreground" />}
            </span>
            <span className="font-bold group-hover:text-primary" dir="auto">
              {r.title}
            </span>
          </Link>
          {r.projectName && <p className="text-xs text-muted-foreground">{r.projectName}</p>}
          {r.children.length > 0 && (
            <ul className="space-y-1 border-t border-dashed pt-3 text-sm">
              {r.children.map((c) => (
                <li key={c.id}>
                  <Link
                    href={href(`/panel/docs/${c.id}`)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-accent"
                  >
                    <span>{c.icon ?? "📄"}</span>
                    <span className="truncate" dir="auto">
                      {c.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-auto text-[11px] text-muted-foreground">
            {t.common.updated}: {formatDate(r.updatedAt, fmt)}
          </p>
        </Card>
      ))}
    </div>
  );
}
