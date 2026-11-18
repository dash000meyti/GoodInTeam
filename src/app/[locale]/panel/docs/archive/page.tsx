import Link from "next/link";
import { ArchiveIcon } from "lucide-react";
import { DocIconTile } from "@/components/docs/doc-icon-tile";
import { VisibilityBadge } from "@/components/docs/visibility-badge";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { format } from "@/i18n/format-message";
import { formatDateTime } from "@/lib/format";
import { listArchivedDocs } from "@/server/modules/docs/service";
import { panelContext } from "@/server/page-context";
import { ArchiveRowActions } from "../_components/archive-row-actions";
import { DocsPagesBarSlot } from "../_components/pages-bar";

/** Archived pages (framed): the page box, then one box of rows sharing hairlines. */
export default async function DocsArchivePage() {
  const { actor, t, href, fmt } = await panelContext({ roles: ["owner", "admin", "member"] });
  const d = t.docs;
  const rows = listArchivedDocs(actor);
  return (
    <>
      <PageHeader
        title={d.archiveTitle}
        description={d.archiveSubtitle}
        crumbs={[{ label: d.title, href: href("/panel/docs") }, { label: d.archive }]}
      />
      <DocsPagesBarSlot actor={actor} />
      {rows.length === 0 ? (
        <EmptyState icon={ArchiveIcon} title={d.archiveEmpty} description={d.archiveEmptyHint} />
      ) : (
        <FrameBox as="section" density="compact" ariaLabel={d.archiveTitle}>
          <FrameGrid cols={1}>
            <FrameCell pad="none">
              <ul className="divide-y divide-frame-line">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-3 px-(--cell-pad) py-3 transition-colors hover:bg-card"
                  >
                    <DocIconTile icon={r.icon} />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={href(`/panel/docs/${r.id}`)}
                        className="block truncate font-semibold hover:text-primary-ink"
                      >
                        <bdi>{r.title}</bdi>
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {r.archivedAt &&
                          format(d.archivedOn, { date: formatDateTime(r.archivedAt, fmt) })}
                        {r.projectName ? ` · ${r.projectName}` : ""}
                      </p>
                    </div>
                    <VisibilityBadge visibility={r.visibility} t={d} />
                    <ArchiveRowActions id={r.id} canManage={r.canManage} />
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
