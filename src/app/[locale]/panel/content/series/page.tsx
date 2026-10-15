import { LayersIcon, PencilIcon, PlusIcon } from "lucide-react";
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
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { formatNumber } from "@/lib/format";
import { listSeriesAdmin } from "@/server/modules/content/service";
import { panelContext } from "@/server/page-context";
import { ContentNav } from "../_components/content-nav";
import { DeleteSeriesButton, SeriesFormDialog } from "../_components/series-form";

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
      />
      <ContentNav active="series" href={href} t={t} />
      {list.length === 0 ? (
        <EmptyState icon={LayersIcon} title={c.seriesEmpty} action={newButton} />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{c.colTitle}</TableHead>
                <TableHead>{c.colLocale}</TableHead>
                <TableHead>{c.level}</TableHead>
                <TableHead>{c.lessons}</TableHead>
                <TableHead>{c.colStatus}</TableHead>
                <TableHead className="w-24" />
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
                  <TableCell className="text-muted-foreground">{c[`locale_${s.locale}`]}</TableCell>
                  <TableCell>{s.level ? t.site[`level_${s.level}`] : "—"}</TableCell>
                  <TableCell className="tabular-nums">{formatNumber(s.lessons, locale)}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "published" ? "success" : "neutral"}>
                      {c[`seriesStatus_${s.status}`]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
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
