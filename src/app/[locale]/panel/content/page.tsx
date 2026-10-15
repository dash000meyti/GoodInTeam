import Link from "next/link";
import {
  CalendarClockIcon,
  EyeIcon,
  FileTextIcon,
  NewspaperIcon,
  PencilLineIcon,
} from "lucide-react";
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
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { StatCard } from "@/components/panel/stat-card";
import { localePath } from "@/i18n/config";
import { postPath } from "@/lib/content";
import { formatDate, formatNumber } from "@/lib/format";
import { postStatuses, postTypes } from "@/server/db/schema";
import { contentCounts, listPosts } from "@/server/modules/content/service";
import { panelContext } from "@/server/page-context";
import { ContentNav } from "./_components/content-nav";
import { NewPostMenu, PostFilters } from "./_components/post-filters";
import { PostStatusBadge } from "./_components/status-badge";

const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

const pick = <T extends string>(v: string | string[] | undefined, allowed: readonly T[]) =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

export default async function ContentPage({ searchParams }: PageProps<"/[locale]/panel/content">) {
  const { actor, t, fmt, href, locale } = await panelContext({ roles: ["owner", "admin"] });
  const sp = await searchParams;
  const filters = {
    type: pick(sp.type, postTypes),
    locale: pick(sp.locale, ["fa", "en"] as const),
    status: pick(sp.status, postStatuses),
    q: typeof sp.q === "string" && sp.q.trim() ? sp.q.trim().slice(0, 200) : undefined,
  };
  const rows = listPosts(actor, filters);
  const counts = contentCounts(actor);
  const c = t.content;
  const filtered = Object.values(filters).some(Boolean);
  return (
    <>
      <PageHeader
        title={c.title}
        description={c.subtitle}
        crumbs={[{ label: t.nav.dashboard, href: href("/panel") }, { label: c.title }]}
        actions={<NewPostMenu />}
      />
      <ContentNav active="posts" href={href} t={t} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={c.kpiPublished}
          value={formatNumber(counts.published, locale)}
          icon={NewspaperIcon}
        />
        <StatCard
          label={c.kpiScheduled}
          value={formatNumber(counts.scheduled, locale)}
          icon={CalendarClockIcon}
          tone="info"
        />
        <StatCard
          label={c.kpiDrafts}
          value={formatNumber(counts.draft, locale)}
          icon={PencilLineIcon}
          tone="warning"
        />
        <StatCard
          label={c.kpiViews}
          value={formatNumber(counts.views, locale)}
          icon={EyeIcon}
          tone="violet"
        />
      </div>
      <PostFilters {...filters} />
      {rows.length === 0 ? (
        <EmptyState
          icon={FileTextIcon}
          title={filtered ? c.noResults : c.empty}
          description={filtered ? undefined : c.emptyHint}
          action={filtered ? undefined : <NewPostMenu />}
        />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{c.colTitle}</TableHead>
                <TableHead>{c.colType}</TableHead>
                <TableHead>{c.colLocale}</TableHead>
                <TableHead>{c.colStatus}</TableHead>
                <TableHead>{c.colDate}</TableHead>
                <TableHead className="text-end">{c.colViews}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="max-w-[28rem]">
                    <Link
                      href={href(`/panel/content/${p.id}`)}
                      className="block truncate font-semibold hover:text-primary"
                      dir="auto"
                    >
                      {p.title}
                    </Link>
                    <span
                      className="block truncate font-mono text-xs text-muted-foreground"
                      dir="ltr"
                    >
                      {safeDecode(localePath(p.locale, postPath(p)))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.site[`type_${p.type}`]}</Badge>
                    {p.featured && (
                      <Badge variant="warning" className="ms-1">
                        ★
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c[`locale_${p.locale}`]}</TableCell>
                  <TableCell>
                    <PostStatusBadge status={p.status} t={t} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {p.publishedAt ? formatDate(p.publishedAt, fmt) : "—"}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatNumber(p.views, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
