import Link from "next/link";
import { FolderKanbanIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ColorDot } from "@/components/shared/color-dot";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import {
  FrameBox,
  FrameCell,
  FrameFiller,
  FrameGrid,
  HEADING_CLASS,
} from "@/components/shell/frame";
import { packRows } from "@/components/site/frame-plan";
import { formatDate, formatPercent } from "@/lib/format";
import { markdownToText } from "@/lib/markdown";
import { listProjects } from "@/server/modules/projects/service";
import type { PanelContext } from "@/server/page-context";

/**
 * Client-role landing page: the page box, then their shared projects as one
 * framed grid (cells sharing hairlines, the whole cell links to the
 * project), progress when shared.
 */
export async function ClientPortalHome({ ctx }: { ctx: PanelContext }) {
  const { t, fmt, locale, actor, href } = ctx;
  // Access (own client's portal projects) and share flags are applied by the service.
  const list = await listProjects(actor);
  const spans = list.map(() => undefined);
  return (
    <>
      <PageHeader
        title={t.panel.portalWelcome}
        description={t.panel.portalSubtitle}
        path={["PORTAL"]}
        app="PORTAL"
        icon="portal"
      />
      {list.length === 0 ? (
        <EmptyState icon={FolderKanbanIcon} title={t.common.empty} />
      ) : (
        <FrameBox as="div" density="compact">
          <FrameGrid cols={3}>
            {list.map((p) => (
              <FrameCell key={p.id} hover className="group flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <ColorDot color={p.color} />
                  <h2 className={HEADING_CLASS.box}>
                    <Link
                      href={href(`/panel/projects/${p.id}`)}
                      className="group-hover:text-primary-ink after:absolute after:inset-0"
                    >
                      {p.name}
                    </Link>
                  </h2>
                </div>
                {p.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {markdownToText(p.description, 200)}
                  </p>
                )}
                {p.progress != null && (
                  <div className="mt-auto flex items-center gap-3">
                    <Progress value={p.progress} className="flex-1" />
                    <span className="text-sm font-bold tabular-nums">
                      {formatPercent(p.progress, locale)}
                    </span>
                  </div>
                )}
                {p.dueDate && (
                  <p className="text-xs text-muted-foreground">{formatDate(p.dueDate, fmt)}</p>
                )}
              </FrameCell>
            ))}
            <FrameFiller
              units={{
                md: packRows(spans, 3, "md").trailing,
                lg: packRows(spans, 3, "lg").trailing,
              }}
            />
          </FrameGrid>
        </FrameBox>
      )}
    </>
  );
}
