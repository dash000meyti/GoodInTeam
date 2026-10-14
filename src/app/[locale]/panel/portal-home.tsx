import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import { FolderKanbanIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ColorDot } from "@/components/shared/color-dot";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { formatDate, formatPercent } from "@/lib/format";
import { db } from "@/server/db/client";
import { projects } from "@/server/db/schema";
import type { PanelContext } from "@/server/page-context";

/** Client-role landing page: their shared projects with progress. */
export async function ClientPortalHome({ ctx }: { ctx: PanelContext }) {
  const { t, fmt, locale, actor, href } = ctx;
  const list = actor.user.clientId
    ? await db.query.projects.findMany({
        where: and(
          eq(projects.clientId, actor.user.clientId),
          eq(projects.portalEnabled, true),
          isNull(projects.archivedAt),
        ),
      })
    : [];
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
                  <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                )}
                {p.shareProgress && (
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
