import Link from "next/link";
import { BookOpenIcon, ChevronLeftIcon, FileTextIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader } from "@/components/ui/card";
import { DocIconTile } from "@/components/docs/doc-icon-tile";
import { VisibilityBadge } from "@/components/docs/visibility-badge";
import { EmptyState } from "@/components/panel/empty-state";
import { HEADING_CLASS } from "@/components/shell/frame";
import { formatDate } from "@/lib/format";
import { isStaff } from "@/server/auth/actor";
import { flattenDocTree, projectDocs } from "@/server/modules/docs/service";
import type { PanelContext } from "@/server/page-context";

/**
 * Docs linked to a project, for the project page (async server component).
 *
 *   <ProjectDocsPanel projectId={project.id} ctx={ctx} clientView={isClient} />
 *
 * Visibility rules are enforced by the docs service: portal clients only get
 * `client` pages (and only when the project shares docs). `clientView` also
 * hides staff-only UI (badges, "new page") and limits the list to client pages,
 * so staff can preview what the client sees.
 *
 * Framed: one box (a Card) — the header row (h2, hint, "new page"), then the
 * page tree as rows sharing hairlines, edge to edge.
 */
export async function ProjectDocsPanel({
  projectId,
  ctx,
  clientView = false,
}: {
  projectId: string;
  ctx: PanelContext;
  clientView?: boolean;
}) {
  const { actor, t, href, fmt } = ctx;
  const d = t.docs;
  const staffUi = isStaff(actor) && !clientView;
  const rows = flattenDocTree(
    projectDocs(actor, projectId, { clientOnly: clientView || !isStaff(actor) }),
  );

  return (
    <Card className="gap-0 py-0">
      <CardHeader>
        <h2 className={`flex items-center gap-2 ${HEADING_CLASS.box}`}>
          <BookOpenIcon className="size-4 shrink-0 text-primary-ink" /> {d.projectDocs}
        </h2>
        <CardDescription>{d.projectDocsHint}</CardDescription>
        {staffUi && (
          <CardAction>
            <Button size="sm" variant="outline" asChild>
              <Link href={href(`/panel/docs/new?projectId=${projectId}`)}>
                <PlusIcon /> {d.newPage}
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      {rows.length === 0 ? (
        <EmptyState
          icon={FileTextIcon}
          title={d.projectDocsEmpty}
          className="py-10"
          action={
            staffUi && (
              <Button variant="outline" asChild>
                <Link href={href(`/panel/docs/new?projectId=${projectId}`)}>
                  <PlusIcon /> {d.addProjectDoc}
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-frame-line">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={href(`/panel/docs/${r.id}`)}
                className="flex items-center gap-3 py-2.5 pe-(--cell-pad) transition-colors hover:bg-card"
                style={{ paddingInlineStart: `calc(var(--cell-pad) + ${r.depth * 20}px)` }}
              >
                <DocIconTile icon={r.icon} />
                <span className="min-w-0 flex-1 truncate font-semibold">
                  <bdi>{r.title}</bdi>
                </span>
                {staffUi && (
                  <VisibilityBadge
                    visibility={r.visibility}
                    t={d}
                    className="hidden sm:inline-flex"
                  />
                )}
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {formatDate(r.updatedAt, fmt)}
                </span>
                <ChevronLeftIcon className="size-4 text-muted-foreground ltr:rotate-180" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
