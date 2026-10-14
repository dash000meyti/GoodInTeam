"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  AlertTriangleIcon,
  CoinsIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { LiveDuration } from "@/components/shared/live-duration";
import { ProjectSelect, type ProjectOption } from "@/components/time/project-select";
import { PulseDot } from "@/components/time/pulse-dot";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deleteEntryAction,
  stopTimerAction,
  updateEntryAction,
} from "@/server/modules/time/actions";
import type { EntryFormValues } from "./entry-dialog";
import { useTimeUI } from "./time-ui";

export interface RunningView {
  id: string;
  description: string | null;
  projectId: string | null;
  project: { name: string; color: string } | null;
  task: { title: string } | null;
  billable: boolean;
  startedAt: number;
  startLabel: string;
  long: boolean;
  values: EntryFormValues;
}

/** Live cards for every running timer (parallel timers are first-class). */
export function RunningTimers({
  timers,
  projects,
  serverNow,
}: {
  timers: RunningView[];
  projects: ProjectOption[];
  serverNow: number;
}) {
  const t = useT();
  const tt = t.time;
  const locale = useLocale();
  const [pending, start] = useTransition();
  const [list, removeOptimistic] = useOptimistic(timers, (state, id: string | "all") =>
    id === "all" ? [] : state.filter((x) => x.id !== id),
  );

  const stop = (id: string) =>
    start(async () => {
      removeOptimistic(id);
      const res = await stopTimerAction({ id });
      if (res.ok) toast.success(id === "all" ? tt.stoppedAll : tt.stopped);
      else toast.error(res.error.message);
    });

  const discard = (id: string) =>
    start(async () => {
      removeOptimistic(id);
      const res = await deleteEntryAction({ id });
      if (!res.ok) toast.error(res.error.message);
    });

  if (list.length === 0) return null;

  return (
    <section aria-labelledby="running-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="running-heading" className="flex items-center gap-2 text-base font-bold">
          <PulseDot />
          {tt.runningTimers}
          <span className="rounded-full bg-primary/12 px-2 text-xs text-primary-dark tabular-nums dark:text-primary-light">
            {formatNumber(list.length, locale)}
          </span>
        </h2>
        {list.length > 1 && (
          <Button variant="outline" size="sm" onClick={() => stop("all")} disabled={pending}>
            <SquareIcon className="fill-current" /> {tt.stopAll}
          </Button>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((timer) => (
          <RunningCard
            key={timer.id}
            timer={timer}
            projects={projects}
            serverNow={serverNow}
            onStop={() => stop(timer.id)}
            onDiscard={() => discard(timer.id)}
            busy={pending}
          />
        ))}
      </div>
    </section>
  );
}

function RunningCard({
  timer,
  projects,
  serverNow,
  onStop,
  onDiscard,
  busy,
}: {
  timer: RunningView;
  projects: ProjectOption[];
  serverNow: number;
  onStop: () => void;
  onDiscard: () => void;
  busy: boolean;
}) {
  const t = useT();
  const tt = t.time;
  const { openEdit } = useTimeUI();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(timer.description ?? "");
  const [saving, startSave] = useTransition();

  const save = (patch: { description?: string; projectId?: string; billable?: boolean }) =>
    startSave(async () => {
      const res = await updateEntryAction({ id: timer.id, ...patch });
      if (!res.ok) toast.error(res.error.message);
    });

  const commitDescription = () => {
    setEditing(false);
    if (draft.trim() !== (timer.description ?? "")) save({ description: draft.trim() });
  };

  return (
    <Card
      className={cn(
        "relative gap-4 overflow-hidden p-5 transition-shadow hover:shadow-dropdown",
        timer.long && "ring-2 ring-warning/50",
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 bg-primary"
        style={timer.project ? { backgroundColor: timer.project.color } : undefined}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <LiveDuration
            since={timer.startedAt}
            serverNow={serverNow}
            className="block font-mono text-3xl font-black tracking-tight tabular-nums"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {format(tt.startedAt, { time: timer.startLabel })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon-lg"
            className="rounded-full bg-destructive/12 text-destructive shadow-none hover:bg-destructive hover:text-white hover:shadow-none"
            onClick={onStop}
            disabled={busy}
            aria-label={tt.stop}
          >
            <SquareIcon className="size-4 fill-current" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t.common.actions}>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => openEdit(timer.values)}>
                <PencilIcon /> {t.common.edit}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <ConfirmDialog
                title={tt.discardTitle}
                description={tt.discardBody}
                confirmLabel={tt.discard}
                onConfirm={onDiscard}
                trigger={
                  <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                    <Trash2Icon /> {tt.discard}
                  </DropdownMenuItem>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDescription}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitDescription();
            if (e.key === "Escape") {
              setDraft(timer.description ?? "");
              setEditing(false);
            }
          }}
          aria-label={t.common.description}
          className="-mx-2 rounded-lg border border-input bg-transparent px-2 py-1 font-semibold outline-none focus:border-foreground"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            "-mx-2 cursor-text truncate rounded-lg px-2 py-1 text-start font-semibold transition-colors hover:bg-accent",
            !timer.description && "text-muted-foreground",
          )}
        >
          <bdi>{timer.description || timer.task?.title || tt.noDescription}</bdi>
        </button>
      )}

      <div className="flex items-center gap-2">
        <ProjectSelect
          projects={projects}
          value={timer.projectId ?? ""}
          onChange={(projectId) => save({ projectId })}
          noneLabel={t.common.noProject}
          placeholder={tt.selectProject}
          size="sm"
          className="min-w-0 flex-1"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              aria-pressed={timer.billable}
              aria-label={timer.billable ? tt.billable : tt.nonBillable}
              disabled={saving}
              onClick={() => save({ billable: !timer.billable })}
              className={cn(
                timer.billable &&
                  "border-success/40 bg-success/12 text-[#118d57] dark:text-[#77ed8b]",
              )}
            >
              <CoinsIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{timer.billable ? tt.billable : tt.nonBillable}</TooltipContent>
        </Tooltip>
      </div>

      {(timer.task || timer.long) && (
        <div className="flex flex-wrap items-center gap-2">
          {timer.task && (
            <Badge variant="neutral" className="max-w-full truncate">
              <bdi>{timer.task.title}</bdi>
            </Badge>
          )}
          {timer.long && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" onClick={() => openEdit(timer.values)}>
                  <Badge variant="warning">
                    <AlertTriangleIcon /> {tt.forgotToStop}
                  </Badge>
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-60">{tt.forgotToStopHint}</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </Card>
  );
}
