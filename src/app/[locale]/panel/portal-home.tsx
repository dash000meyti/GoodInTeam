import Link from "next/link";
import { FolderKanbanIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ColorDot } from "@/components/shared/color-dot";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { formatDate, formatPercent } from "@/lib/format";
import { markdownToText } from "@/lib/markdown";
import { listProjects } from "@/server/modules/projects/service";
import type { PanelContext } from "@/server/page-context";

/** Client-role landing page: their shared projects with progress (when shared). */
export async function ClientPortalHome({ ctx }: { ctx: PanelContext }) {
  const { t, fmt, locale, actor, href } = ctx;
  // Access (own client's portal projects) and share flags are applied by the service.
  const list = await listProjects(actor);
  return (
    <>
      <PageHeader title={t.panel.portalWelcome} description={t.panel.portalSubtitle} />
      {list.length === 0 ? (
        <EmptyState icon={FolderKanbanIcon} title={t.common.empty} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <Link key={p.id} href={href(`/panel/projects/${p.id}`)}>
              <Card className="gap-4 p-6 transition-shadow hover:shadow-dropdown">
                <div className="flex items-center gap-2">
                  <ColorDot color={p.color} />
                  <h2 className="font-bold">{p.name}</h2>
                </div>
                {p.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {markdownToText(p.description, 200)}
                  </p>
                )}
                {p.progress != null && (
                  <div className="flex items-center gap-3">
                    <Progress value={p.progress} className="flex-1" />
                    <span className="text-sm font-bold">{formatPercent(p.progress, locale)}</span>
                  </div>
                )}
                {p.dueDate && (
                  <p className="text-xs text-muted-foreground">{formatDate(p.dueDate, fmt)}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
