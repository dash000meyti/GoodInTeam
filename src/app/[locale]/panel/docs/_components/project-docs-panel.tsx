import Link from "next/link";
import { BookOpenIcon, ChevronLeftIcon, FileTextIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VisibilityBadge } from "@/components/docs/visibility-badge";
import { EmptyState } from "@/components/panel/empty-state";
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
      <CardHeader className="border-b border-dashed py-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpenIcon className="size-4 text-primary" /> {d.projectDocs}
        </CardTitle>
        <CardDescription>{d.projectDocsHint}</CardDescription>
        {staffUi && (
          <CardAction>
            <Button size="sm" variant="soft" asChild>
              <Link href={href(`/panel/docs/new?projectId=${projectId}`)}>
                <PlusIcon /> {d.newPage}
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      {rows.length === 0 ? (
        <div className="p-5">
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
        </div>
      ) : (
        <ul className="divide-y divide-dashed">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={href(`/panel/docs/${r.id}`)}
                className="flex items-center gap-3 py-3 pe-5 transition-colors hover:bg-accent/50"
                style={{ paddingInlineStart: 20 + r.depth * 20 }}
              >
                <span className="flex w-6 shrink-0 justify-center text-lg leading-none">
                  {r.icon ?? <FileTextIcon className="size-4 text-muted-foreground" />}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold" dir="auto">
                  {r.title}
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
