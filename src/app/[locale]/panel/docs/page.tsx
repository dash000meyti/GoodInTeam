import Link from "next/link";
import {
  BookOpenIcon,
  LockIcon,
  PlusIcon,
  SearchXIcon,
  Share2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardAction, CardHeader } from "@/components/ui/card";
import { DocIconTile } from "@/components/docs/doc-icon-tile";
import { Highlighted } from "@/components/docs/highlight";
import { VisibilityBadge } from "@/components/docs/visibility-badge";
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
import { DocsPagesBarSlot } from "./_components/pages-bar";

/**
 * Docs home (framed): the page box carries the four page counters as its
 * second row (staff); below it one box holds "Recently updated" (rows sharing
 * hairlines) and "Sections" (the top-level pages as one framed grid). `?q=`
 * swaps the body for one search-results box; portal users get the shared
 * pages as one framed grid.
 */
export default async function DocsPage({ searchParams }: PageProps<"/[locale]/panel/docs">) {
  const ctx = await panelContext();
  const { actor, t, href, locale } = ctx;
  const d = t.docs;
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 200) ?? "";
  const staff = isStaff(actor);
  const stats = staff && !q ? docStats(actor) : null;
  const n = (v: number) => formatNumber(v, locale);

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
      >
        {stats && stats.total > 0 && (
          <StatRow>
            <StatCard label={d.statPages} value={n(stats.total)} icon={BookOpenIcon} />
            <StatCard label={d.statTeam} value={n(stats.team)} icon={UsersIcon} tone="info" />
            <StatCard
              label={d.statClient}
              value={n(stats.client)}
              icon={Share2Icon}
              tone="violet"
            />
            <StatCard
              label={d.statPrivate}
              value={n(stats.private)}
              icon={LockIcon}
              tone="warning"
            />
          </StatRow>
        )}
      </PageHeader>
      <DocsPagesBarSlot actor={actor} />
      {q ? (
        <SearchResults ctx={ctx} q={q} />
      ) : staff ? (
        stats && stats.total === 0 ? (
          <EmptyState
            icon={BookOpenIcon}
            title={d.emptyTitle}
            description={d.emptyHint}
            action={newButton}
          />
        ) : (
          <StaffHome ctx={ctx} />
        )
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
    <FrameBox as="section" density="compact" labelledBy="docs-search-title">
      <FrameGrid cols={1}>
        <FrameCell pad="none">
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="docs-search-title" className={HEADING_CLASS.box}>
              {format(d.searchResults, { q: `⁨${q}⁩` })}
            </h2>
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
            <EmptyState
              icon={SearchXIcon}
              title={format(d.searchEmpty, { q })}
              description={d.searchEmptyHint}
            />
          ) : (
            <ul className="divide-y divide-frame-line">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={href(`/panel/docs/${r.id}`)}
                    className="flex gap-3 px-(--cell-pad) py-3.5 transition-colors hover:bg-card"
                  >
                    <DocIconTile icon={r.icon} size="lg" />
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
                        <p
                          className="line-clamp-2 text-sm leading-6 text-muted-foreground"
                          dir="auto"
                        >
                          <Highlighted text={r.snippet} ranges={r.ranges} />
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </FrameCell>
      </FrameGrid>
    </FrameBox>
  );
}

function StaffHome({ ctx }: { ctx: PanelContext }) {
  const { actor, t, href, locale, fmt, now } = ctx;
  const d = t.docs;
  const recent = recentDocs(actor, 6);
  const roots = buildDocTree(listDocRows(actor));
  const spans = roots.map(() => undefined);

  return (
    <FrameBox as="div" density="compact">
      <FrameGrid cols={1}>
        <FrameCell as="section" pad="none" aria-labelledby="docs-recent">
          <CardHeader>
            <h2 id="docs-recent" className={HEADING_CLASS.box}>
              {d.recentlyUpdated}
            </h2>
          </CardHeader>
          <ul className="divide-y divide-frame-line">
            {recent.map((r) => (
              <li key={r.id}>
                <Link
                  href={href(`/panel/docs/${r.id}`)}
                  className="flex items-center gap-3 px-(--cell-pad) py-3 transition-colors hover:bg-card"
                >
                  <DocIconTile icon={r.icon} />
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
        </FrameCell>
      </FrameGrid>
      <FrameGrid cols={1}>
        <FrameCell as="section" pad="none" aria-labelledby="docs-sections">
          <CardHeader>
            <h2 id="docs-sections" className={HEADING_CLASS.box}>
              {d.sections}
            </h2>
            <CardAction>
              <Badge variant="neutral">{formatNumber(roots.length, locale)}</Badge>
            </CardAction>
          </CardHeader>
          {/* top-level pages: cells of one grid sharing the box's hairlines */}
          <FrameGrid cols={2}>
            {roots.map((r) => (
              <FrameCell key={r.id} hover className="group flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <DocIconTile icon={r.icon} size="lg" />
                  <VisibilityBadge visibility={r.visibility} t={d} />
                </div>
                <Link
                  href={href(`/panel/docs/${r.id}`)}
                  className="font-bold group-hover:text-primary-ink after:absolute after:inset-0"
                >
                  <bdi>{r.title}</bdi>
                </Link>
                <p className="mt-auto text-xs text-muted-foreground">
                  {[
                    r.children.length
                      ? format(d.childCount, { n: formatNumber(r.children.length, locale) })
                      : null,
                    r.projectName,
                  ]
                    .filter(Boolean)
                    .join(" · ") || " "}
                </p>
              </FrameCell>
            ))}
            <FrameFiller
              units={{
                md: packRows(spans, 2, "md").trailing,
                lg: packRows(spans, 2, "lg").trailing,
              }}
            />
          </FrameGrid>
        </FrameCell>
      </FrameGrid>
    </FrameBox>
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
  const spans = roots.map(() => undefined);
  return (
    <FrameBox as="section" density="compact" ariaLabel={d.portalTitle}>
      <FrameGrid cols={2}>
        {roots.map((r) => (
          <FrameCell key={r.id} className="flex flex-col gap-3">
            <Link href={href(`/panel/docs/${r.id}`)} className="group flex items-center gap-3">
              <DocIconTile icon={r.icon} size="lg" />
              <span className="font-bold group-hover:text-primary-ink">
                <bdi>{r.title}</bdi>
              </span>
            </Link>
            {r.projectName && <p className="text-xs text-muted-foreground">{r.projectName}</p>}
            {r.children.length > 0 && (
              <ul className="divide-y divide-dashed divide-frame-line border-t border-dashed border-frame-line text-sm">
                {r.children.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={href(`/panel/docs/${c.id}`)}
                      className="flex items-center gap-2 py-2 transition-colors hover:text-primary-ink"
                    >
                      <span aria-hidden>{c.icon ?? "📄"}</span>
                      <span className="truncate">
                        <bdi>{c.title}</bdi>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-auto text-[11px] text-muted-foreground">
              {t.common.updated}: {formatDate(r.updatedAt, fmt)}
            </p>
          </FrameCell>
        ))}
        <FrameFiller
          units={{ md: packRows(spans, 2, "md").trailing, lg: packRows(spans, 2, "lg").trailing }}
        />
      </FrameGrid>
    </FrameBox>
  );
}
