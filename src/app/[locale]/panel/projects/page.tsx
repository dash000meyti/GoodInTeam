import Link from "next/link";
import { FolderKanbanIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { ColorDot } from "@/components/shared/color-dot";
import {
  FrameBox,
  FrameCell,
  FrameFiller,
  FrameGrid,
  HEADING_CLASS,
} from "@/components/shell/frame";
import { packRows } from "@/components/site/frame-plan";
import { isOverdue } from "@/lib/due";
import { formatDate, formatHours, formatPercent } from "@/lib/format";
import { markdownToText } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { isAdmin, isStaff } from "@/server/auth/actor";
import { clientOptions } from "@/server/modules/clients/service";
import { listProjects } from "@/server/modules/projects/service";
import { panelContext } from "@/server/page-context";
import { ProjectFormDialog } from "./_components/project-form";
import { ProjectStatusBadge } from "./_components/project-status-badge";

/**
 * Projects (framed): the page box, then every project as a cell of one
 * framed grid (cells share hairlines; the whole cell links to the project).
 * Clients get the same grid with what their portal shares (the service nulls
 * progress / tracked time that isn't shared).
 */
export default async function ProjectsPage() {
  const { actor, t, fmt, href, locale, now, tz } = await panelContext();
  const list = await listProjects(actor);
  const admin = isAdmin(actor);
  const staff = isStaff(actor);
  const clients = admin ? clientOptions(actor) : [];
  const p = t.projects;
  const spans = list.map(() => undefined);

  const newButton = admin ? (
    <ProjectFormDialog
      clients={clients}
      trigger={
        <Button>
          <PlusIcon /> {p.new}
        </Button>
      }
    />
  ) : null;

  return (
    <>
      <PageHeader
        title={p.title}
        description={staff ? p.subtitle : p.subtitleClient}
        crumbs={[{ label: t.nav.dashboard, href: href("/panel") }, { label: p.title }]}
        actions={newButton}
      />
      {list.length === 0 ? (
        <EmptyState
          icon={FolderKanbanIcon}
          title={p.empty}
          description={staff ? p.emptyHint : p.emptyClient}
          action={newButton}
        />
      ) : (
        <FrameBox as="section" density="compact" ariaLabel={p.title}>
          <FrameGrid cols={3}>
            {list.map((proj) => {
              // A due day is overdue only after it ends (app timezone), not from 00:00.
              const late =
                proj.status === "active" && isOverdue(proj.dueDate, { allDay: true, now, tz });
              return (
                <FrameCell key={proj.id} as="article" hover className="group flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <ColorDot color={proj.color} className="rounded-none" />
                        <h2 className={cn(HEADING_CLASS.box, "truncate")}>
                          <Link
                            href={href(`/panel/projects/${proj.id}`)}
                            className="group-hover:text-primary-ink after:absolute after:inset-0"
                          >
                            {proj.name}
                          </Link>
                        </h2>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {proj.client?.name ?? p.noClient}
                      </p>
                    </div>
                    <ProjectStatusBadge status={proj.status} t={p} />
                  </div>
                  {proj.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {markdownToText(proj.description, 200)}
                    </p>
                  )}
                  {/* progress / trackedMs are null when the client portal doesn't share them */}
                  {proj.progress != null && (
                    <div className="mt-auto space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">{p.progress}</span>
                        <span className="tabular-nums">{formatPercent(proj.progress, locale)}</span>
                      </div>
                      <Progress
                        value={proj.progress}
                        indicatorClassName="bg-[var(--c)]"
                        style={{ "--c": proj.color } as React.CSSProperties}
                      />
                    </div>
                  )}
                  {(proj.trackedMs != null || proj.dueDate) && (
                    <div
                      className={cn(
                        "flex items-center justify-between gap-3 border-t border-dashed border-frame-line pt-3 text-xs text-muted-foreground",
                        proj.progress == null && "mt-auto",
                      )}
                    >
                      {proj.trackedMs != null ? (
                        <span>
                          {p.timeSpent}:{" "}
                          <b className="text-foreground tabular-nums">
                            {formatHours(proj.trackedMs, locale)}
                          </b>{" "}
                          {t.common.hours}
                        </span>
                      ) : (
                        <span />
                      )}
                      {proj.dueDate && (
                        <span className={late ? "font-bold text-destructive" : undefined}>
                          {formatDate(proj.dueDate, fmt)}
                        </span>
                      )}
                    </div>
                  )}
                </FrameCell>
              );
            })}
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
