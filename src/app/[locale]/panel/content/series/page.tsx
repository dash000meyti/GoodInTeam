import { LayersIcon, PencilIcon, PlusIcon } from "lucide-react";
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
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { formatNumber } from "@/lib/format";
import { listSeriesAdmin } from "@/server/modules/content/service";
import { panelContext } from "@/server/page-context";
import { ContentNav } from "../_components/content-nav";
import { DeleteSeriesButton, SeriesFormDialog } from "../_components/series-form";

/**
 * Courses (framed): the page box with the CMS sub-navigation row, then one
 * list box — the table edge to edge (md+) or rows sharing hairlines (phones).
 */
export default async function SeriesPage() {
  const { actor, t, href, locale } = await panelContext({ roles: ["owner", "admin"] });
  const list = listSeriesAdmin(actor);
  const c = t.content;
  const newButton = (
    <SeriesFormDialog
      trigger={
        <Button>
          <PlusIcon /> {c.newSeries}
        </Button>
      }
    />
  );
  const actions = (s: (typeof list)[number]) => (
    <div className="flex shrink-0 justify-end gap-1">
      <SeriesFormDialog
        series={s}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={t.common.edit}>
            <PencilIcon />
          </Button>
        }
      />
      <DeleteSeriesButton id={s.id} />
    </div>
  );
  return (
    <>
      <PageHeader
        title={c.title}
        description={c.seriesSubtitle}
        crumbs={[
          { label: t.nav.dashboard, href: href("/panel") },
          { label: c.title, href: href("/panel/content") },
          { label: c.seriesTitle },
        ]}
        actions={newButton}
      >
        <ContentNav active="series" href={href} t={t} />
      </PageHeader>
      {list.length === 0 ? (
        <EmptyState icon={LayersIcon} title={c.seriesEmpty} action={newButton} />
      ) : (
        <FrameBox as="section" density="compact" ariaLabel={c.seriesTitle}>
          <FrameGrid cols={1}>
            <FrameCell pad="none">
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{c.colTitle}</TableHead>
                      <TableHead>{c.colLocale}</TableHead>
                      <TableHead>{c.level}</TableHead>
                      <TableHead>{c.lessons}</TableHead>
                      <TableHead>{c.colStatus}</TableHead>
                      <TableHead className="w-24">
                        <span className="sr-only">{t.common.actions}</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <span className="block font-semibold" dir="auto">
                            {s.title}
                          </span>
                          <span className="block font-mono text-xs text-muted-foreground" dir="ltr">
                            /learn/{s.slug}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c[`locale_${s.locale}`]}
                        </TableCell>
                        <TableCell>{s.level ? t.site[`level_${s.level}`] : "—"}</TableCell>
                        <TableCell className="tabular-nums">
                          {formatNumber(s.lessons, locale)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.status === "published" ? "success" : "neutral"}>
                            {c[`seriesStatus_${s.status}`]}
                          </Badge>
                        </TableCell>
                        <TableCell>{actions(s)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="divide-y divide-frame-line md:hidden">
                {list.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 px-(--cell-pad) py-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="truncate font-semibold" dir="auto">
                        {s.title}
                      </p>
                      <p className="truncate font-mono text-xs text-muted-foreground" dir="ltr">
                        /learn/{s.slug}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant={s.status === "published" ? "success" : "neutral"}>
                          {c[`seriesStatus_${s.status}`]}
                        </Badge>
                        <span>
                          {[
                            c[`locale_${s.locale}`],
                            s.level ? t.site[`level_${s.level}`] : null,
                            `${c.lessons}: ${formatNumber(s.lessons, locale)}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                    </div>
                    {actions(s)}
                  </li>
                ))}
              </ul>
            </FrameCell>
          </FrameGrid>
        </FrameBox>
      )}
    </>
  );
}
