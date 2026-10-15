import Link from "next/link";
import { ArchiveIcon, FileTextIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { VisibilityBadge } from "@/components/docs/visibility-badge";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { format } from "@/i18n/format-message";
import { formatDateTime } from "@/lib/format";
import { listArchivedDocs } from "@/server/modules/docs/service";
import { panelContext } from "@/server/page-context";
import { ArchiveRowActions } from "../_components/archive-row-actions";

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
      {rows.length === 0 ? (
        <EmptyState icon={ArchiveIcon} title={d.archiveEmpty} description={d.archiveEmptyHint} />
      ) : (
        <Card className="gap-0 py-0">
          <ul className="divide-y divide-dashed">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                  {r.icon ?? <FileTextIcon className="size-5 text-muted-foreground" />}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={href(`/panel/docs/${r.id}`)}
                    className="block truncate font-semibold hover:text-primary"
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
        </Card>
      )}
    </>
  );
}
