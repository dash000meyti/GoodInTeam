import Link from "next/link";
import { FolderKanbanIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { ColorDot } from "@/components/shared/color-dot";
import { isOverdue } from "@/lib/due";
import { formatDate, formatHours, formatPercent } from "@/lib/format";
import { markdownToText } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { isAdmin } from "@/server/auth/actor";
import { clientOptions } from "@/server/modules/clients/service";
import { listProjects } from "@/server/modules/projects/service";
import { panelContext } from "@/server/page-context";
import { ProjectFormDialog } from "./_components/project-form";
import { ProjectStatusBadge } from "./_components/project-status-badge";

export default async function ProjectsPage() {
  const { actor, t, fmt, href, locale, now, tz } = await panelContext();
  const list = await listProjects(actor);
  const admin = isAdmin(actor);
  const clients = admin ? clientOptions(actor) : [];
  const p = t.projects;

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
        description={p.subtitle}
        crumbs={[{ label: t.nav.dashboard, href: href("/panel") }, { label: p.title }]}
        actions={newButton}
      />
      {list.length === 0 ? (
        <EmptyState
          icon={FolderKanbanIcon}
          title={p.empty}
          description={p.emptyHint}
          action={newButton}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {list.map((proj) => {
            // A due day is overdue only after it ends (app timezone), not from 00:00.
            const late =
              proj.status === "active" && isOverdue(proj.dueDate, { allDay: true, now, tz });
            return (
              <Link key={proj.id} href={href(`/panel/projects/${proj.id}`)} className="group">
                <Card className="relative h-full gap-4 overflow-hidden p-6 transition-shadow group-hover:shadow-dropdown">
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ backgroundColor: proj.color }}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <ColorDot color={proj.color} />
                        <h2 className="truncate font-bold group-hover:text-primary">{proj.name}</h2>
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
                        <span>{formatPercent(proj.progress, locale)}</span>
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
                        "flex items-center justify-between border-t border-dashed pt-3 text-xs text-muted-foreground",
                        proj.progress == null && "mt-auto",
                      )}
                    >
                      {proj.trackedMs != null ? (
                        <span>
                          {p.timeSpent}:{" "}
                          <b className="text-foreground">{formatHours(proj.trackedMs, locale)}</b>{" "}
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
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
