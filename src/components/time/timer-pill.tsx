"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRightIcon, Loader2Icon, PlayIcon, SquareIcon, TimerIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LiveDuration } from "@/components/shared/live-duration";
import { localePath } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber, formatTime } from "@/lib/format";
import { localeMeta } from "@/i18n/config";
import { cn } from "@/lib/utils";
import type { HeaderTimer } from "@/server/modules/notifications/header";
import { startTimerAction, stopTimerAction } from "@/server/modules/time/actions";
import { ProjectSelect, type ProjectOption } from "./project-select";
import { PulseDot } from "./pulse-dot";

type OptimisticOp =
  { type: "stop"; id: string } | { type: "stopAll" } | { type: "start"; timer: HeaderTimer };

/**
 * Header widget: pulsing pill with the number of running timers and the live
 * elapsed time of the latest one; the popover lists all timers (stop buttons)
 * and has a compact quick-start form.
 */
export function TimerPill({
  running,
  projects,
  serverNow,
  tz,
}: {
  running: HeaderTimer[];
  projects: ProjectOption[];
  serverNow: number;
  tz: string;
}) {
  const t = useT();
  const locale = useLocale();
  const tt = t.time;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [timers, apply] = useOptimistic(running, (state, op: OptimisticOp) => {
    if (op.type === "stop") return state.filter((x) => x.id !== op.id);
    if (op.type === "stopAll") return [];
    return [...state, op.timer];
  });
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const latest = timers.at(-1);
  const fmt = { locale, timeZone: tz, calendar: localeMeta[locale].calendar };

  const stop = (id: string) =>
    startTransition(async () => {
      apply({ type: "stop", id });
      const res = await stopTimerAction({ id });
      if (res.ok) toast.success(tt.stopped);
      else toast.error(res.error.message);
    });

  const stopAll = () =>
    startTransition(async () => {
      apply({ type: "stopAll" });
      const res = await stopTimerAction({ id: "all" });
      if (res.ok) toast.success(tt.stoppedAll);
      else toast.error(res.error.message);
    });

  const start = () =>
    startTransition(async () => {
      const project = projects.find((p) => p.id === projectId) ?? null;
      apply({
        type: "start",
        timer: {
          id: `pending-${Date.now()}`,
          description: description.trim() || null,
          startedAt: Date.now(),
          project: project ? { id: project.id, name: project.name, color: project.color } : null,
          task: null,
        },
      });
      const res = await startTimerAction({
        description: description.trim(),
        projectId: projectId || undefined,
      });
      if (res.ok) {
        toast.success(tt.started);
        setDescription("");
      } else toast.error(res.error.message);
    });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {timers.length ? (
          <button
            type="button"
            aria-label={format(tt.runningCount, { n: formatNumber(timers.length, locale) })}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-full bg-primary/12 px-3 text-sm font-bold text-primary-dark transition-colors outline-none hover:bg-primary/20 focus-visible:ring-[3px] focus-visible:ring-ring/40 dark:text-primary-light"
          >
            <PulseDot />
            {timers.length > 1 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground tabular-nums">
                {formatNumber(timers.length, locale)}
              </span>
            )}
            {latest && (
              <LiveDuration
                since={latest.startedAt}
                serverNow={serverNow}
                className="hidden font-mono text-[13px] tabular-nums sm:inline"
              />
            )}
          </button>
        ) : (
          <Button variant="ghost" size="icon" className="rounded-full" aria-label={tt.quickStart}>
            <TimerIcon className="size-[18px]" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={12}
        className="w-[calc(100vw-1.5rem)] max-w-sm overflow-hidden p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b border-dashed bg-primary/6 px-4 py-3">
          <div className="flex items-center gap-2">
            <TimerIcon className="size-4 text-primary" />
            <p className="text-sm font-bold">{tt.runningTimers}</p>
            {timers.length > 0 && (
              <span className="rounded-full bg-primary/16 px-2 text-xs font-bold text-primary-dark tabular-nums dark:text-primary-light">
                {formatNumber(timers.length, locale)}
              </span>
            )}
          </div>
          {timers.length > 1 && (
            <Button variant="ghost" size="sm" onClick={stopAll} disabled={pending}>
              <SquareIcon className="fill-current" /> {tt.stopAll}
            </Button>
          )}
        </div>

        {timers.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm font-semibold">{tt.noRunning}</p>
            <p className="mt-1 text-xs text-muted-foreground">{tt.noRunningHint}</p>
          </div>
        ) : (
          <ul className="max-h-72 divide-y divide-dashed overflow-y-auto">
            {timers.map((timer) => (
              <li key={timer.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  aria-hidden
                  className="h-9 w-1 shrink-0 rounded-full bg-primary"
                  style={timer.project ? { backgroundColor: timer.project.color } : undefined}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    <bdi>
                      {timer.description ||
                        timer.task?.title ||
                        timer.project?.name ||
                        tt.noDescription}
                    </bdi>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    <bdi>{timer.project?.name ?? t.common.noProject}</bdi> ·{" "}
                    {format(tt.startedAt, { time: formatTime(timer.startedAt, fmt) })}
                  </p>
                </div>
                <LiveDuration
                  since={timer.startedAt}
                  serverNow={serverNow}
                  className="font-mono text-sm font-bold tabular-nums"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full text-destructive hover:bg-destructive/12 hover:text-destructive"
                  onClick={() => stop(timer.id)}
                  disabled={pending || timer.id.startsWith("pending-")}
                  aria-label={tt.stop}
                >
                  <SquareIcon className="size-3.5 fill-current" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="grid gap-2 border-t border-dashed bg-muted/40 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <p className="text-xs font-bold text-muted-foreground">{tt.quickStart}</p>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={tt.whatAreYouWorkingOn}
            aria-label={tt.whatAreYouWorkingOn}
            className="h-9 bg-background"
          />
          <div className="flex gap-2">
            <ProjectSelect
              projects={projects}
              value={projectId}
              onChange={setProjectId}
              noneLabel={t.common.noProject}
              placeholder={tt.selectProject}
              size="sm"
              className="h-9 min-w-0 flex-1 bg-background"
            />
            <Button type="submit" size="sm" className="h-9" disabled={pending}>
              {pending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <PlayIcon className="fill-current" />
              )}
              {tt.start}
            </Button>
          </div>
        </form>
        <Link
          href={localePath(locale, "/panel/time")}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center justify-center gap-1 border-t border-dashed px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          )}
        >
          {tt.openTimePage}
          <ArrowUpRightIcon className="size-3.5 rtl:-scale-x-100" />
        </Link>
      </PopoverContent>
    </Popover>
  );
}
