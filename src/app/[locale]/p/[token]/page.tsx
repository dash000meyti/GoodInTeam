import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CheckIcon, CircleDashedIcon, TimerIcon } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { PixelIcon } from "@/components/brand/pixel-art";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Markdown } from "@/components/shared/markdown";
import {
  FrameBox,
  FrameCell,
  FrameEyebrow,
  FrameGrid,
  FrameStripBar,
  HEADING_CLASS,
  framePath,
} from "@/components/shell/frame";
import { Window } from "@/components/shell/window";
import { localeMeta, type Locale } from "@/i18n/config";
import { getLocale, getMessages } from "@/i18n/server";
import { formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getPublicProjectByToken } from "@/server/modules/projects/service";
import { appTimezone } from "@/server/modules/settings/service";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const path = (...s: string[]) => framePath("GOOD-IN-TEAM", "STATUS", ...s);

/** The status page's first box: heading cell + the dots decor cell (a STATUS.APP window). */
function HeadBox({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <FrameBox first strip={<FrameStripBar locale={locale} index={1} path={path()} />}>
      <FrameGrid cols="2-1">
        {children}
        <FrameCell
          tone="dots"
          aria-hidden
          className="hidden min-h-[200px] items-center justify-center lg:flex"
        >
          <Window path="STATUS.APP" className="w-full max-w-64">
            <div className="grid h-[88px] place-items-center bg-[radial-gradient(var(--dots)_1px,transparent_1.5px)] [background-size:12px_12px]">
              <PixelIcon name="projects" cell={4} />
            </div>
          </Window>
        </FrameCell>
      </FrameGrid>
    </FrameBox>
  );
}

async function StatusView({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const data = await getPublicProjectByToken(token);
  if (!data) notFound();
  const locale = await getLocale();
  const t = getMessages(locale);
  const fmt = { locale, timeZone: appTimezone(), calendar: localeMeta[locale].calendar };
  const { project, milestones, updates } = data;
  const p = t.projects;
  let index = 1;
  return (
    <>
      <HeadBox locale={locale}>
        <FrameCell header className="flex flex-col justify-center gap-4 lg:min-h-[240px]">
          <LogoMark cell={3} />
          {project.client?.name && (
            <FrameEyebrow className="self-start">{project.client.name}</FrameEyebrow>
          )}
          <h1 className={HEADING_CLASS.h2}>{project.name}</h1>
          {project.dueDate && (
            <p className="text-sm text-muted-foreground">
              {p.dueDate}: {formatDate(project.dueDate, fmt, "long")}
            </p>
          )}
        </FrameCell>
      </HeadBox>

      {project.shareProgress && (
        <FrameBox
          labelledBy="status-progress"
          strip={<FrameStripBar locale={locale} index={++index} path={path("PROGRESS")} />}
        >
          <FrameGrid cols={milestones.length > 0 ? "2-1" : 1}>
            {milestones.length > 0 && (
              <FrameCell pad="none">
                <h2
                  className={cn(
                    HEADING_CLASS.box,
                    "border-b border-frame-line px-(--cell-pad) py-3",
                  )}
                >
                  {p.milestones}
                </h2>
                <ul className="divide-y divide-dashed divide-frame-line">
                  {milestones.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 px-(--cell-pad) py-3 text-sm">
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center border",
                          m.status === "done"
                            ? "border-[var(--primary-dark)] bg-primary text-primary-foreground"
                            : m.status === "in_progress"
                              ? "border-warning text-warning-ink"
                              : "border-frame-line text-muted-foreground",
                        )}
                        aria-label={p[`milestone_${m.status}`]}
                        role="img"
                      >
                        {m.status === "done" ? (
                          <CheckIcon className="size-4" strokeWidth={3} />
                        ) : m.status === "in_progress" ? (
                          <TimerIcon className="size-4" />
                        ) : (
                          <CircleDashedIcon className="size-4" />
                        )}
                      </span>
                      <span
                        className={
                          m.status === "done"
                            ? "text-muted-foreground line-through"
                            : "font-semibold"
                        }
                      >
                        {m.title}
                      </span>
                      {m.dueDate && (
                        <span className="ms-auto shrink-0 text-xs text-muted-foreground">
                          {formatDate(m.dueDate, fmt)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </FrameCell>
            )}
            <FrameCell header className="flex flex-col justify-center gap-3">
              <h2 id="status-progress" className="text-sm font-semibold text-muted-foreground">
                {p.progress}
              </h2>
              <p className="text-[40px] leading-none font-bold tabular-nums [:lang(fa)_&]:font-extrabold">
                {formatPercent(project.progress, locale)}
              </p>
              <Progress value={project.progress} className="h-2.5" />
            </FrameCell>
          </FrameGrid>
        </FrameBox>
      )}

      {updates.length > 0 && (
        <FrameBox
          labelledBy="status-updates"
          strip={<FrameStripBar locale={locale} index={++index} path={path("UPDATES")} />}
        >
          <FrameGrid cols={1}>
            <FrameCell header className="py-4">
              <h2 id="status-updates" className={HEADING_CLASS.box}>
                {p.updates}
              </h2>
            </FrameCell>
          </FrameGrid>
          <FrameGrid cols={1}>
            {updates.map((u) => (
              <FrameCell key={u.id} as="article" className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info">{formatDate(u.createdAt, fmt)}</Badge>
                  <h3 className="font-bold">{u.title}</h3>
                </div>
                {u.bodyMd && <Markdown source={u.bodyMd} />}
              </FrameCell>
            ))}
          </FrameGrid>
        </FrameBox>
      )}
    </>
  );
}

/** While the token resolves: the first box with a skeleton heading. */
function StatusSkeleton() {
  return (
    <FrameBox first as="div" strip={<div className="frame-strip" />}>
      <FrameGrid cols="2-1">
        <FrameCell className="flex flex-col justify-center gap-4 lg:min-h-[240px]">
          <Skeleton className="size-[33px] rounded-none" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-80 max-w-full" />
          <Skeleton className="h-4 w-48" />
        </FrameCell>
        <FrameCell tone="dots" aria-hidden className="hidden min-h-[200px] lg:block" />
      </FrameGrid>
    </FrameBox>
  );
}

/**
 * Public project status (/p/<token>): the site's frame language outside the
 * panel — framed boxes with strips on the desktop wallpaper: the heading box,
 * progress with milestones, then the shared updates.
 */
export default function PublicProjectStatus({ params }: PageProps<"/[locale]/p/[token]">) {
  return (
    <div className="os-desktop min-h-dvh pb-16">
      <main id="main" className="overflow-x-clip">
        <Suspense fallback={<StatusSkeleton />}>
          <StatusView params={params} />
        </Suspense>
      </main>
    </div>
  );
}
