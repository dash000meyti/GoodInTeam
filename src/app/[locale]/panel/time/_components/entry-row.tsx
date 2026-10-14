"use client";

import { useTransition } from "react";
import {
  CoinsIcon,
  CopyIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlayIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ColorDot } from "@/components/shared/color-dot";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { LiveDuration } from "@/components/shared/live-duration";
import { PulseDot } from "@/components/time/pulse-dot";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import {
  continueEntryAction,
  deleteEntryAction,
  duplicateEntryAction,
} from "@/server/modules/time/actions";
import type { EntryFormValues } from "./entry-dialog";
import { useTimeUI } from "./time-ui";

export interface EntryRowView {
  id: string;
  description: string | null;
  project: { name: string; color: string } | null;
  task: { title: string } | null;
  userName: string | null;
  billable: boolean;
  running: boolean;
  startedAt: number;
  durationLabel: string;
  timeRange: string;
  earned: string | null;
  values: EntryFormValues;
}

export function EntryRow({ entry, serverNow }: { entry: EntryRowView; serverNow: number }) {
  const t = useT();
  const tt = t.time;
  const { openEdit } = useTimeUI();
  const [pending, start] = useTransition();

  const run = (p: Promise<{ ok: boolean; error?: { message: string } }>, success: string) =>
    start(async () => {
      const res = await p;
      if (res.ok) toast.success(success);
      else toast.error(res.error?.message);
    });

  const meta = [entry.project?.name ?? t.common.noProject, entry.task?.title, entry.userName]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      className={cn(
        "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40 sm:px-6",
        pending && "opacity-60",
      )}
    >
      <span
        aria-hidden
        className="h-10 w-1 shrink-0 rounded-full bg-grey-500/30"
        style={entry.project ? { backgroundColor: entry.project.color } : undefined}
      />
      <button
        type="button"
        onClick={() => openEdit(entry.values)}
        className="min-w-0 flex-1 cursor-pointer rounded-md text-start outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        <span
          className={cn(
            "block truncate font-semibold",
            !entry.description && "font-medium text-muted-foreground",
          )}
        >
          {entry.description || entry.task?.title || tt.noDescription}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {entry.project && <ColorDot color={entry.project.color} className="size-2" />}
          <span className="truncate">{meta}</span>
          <span className="shrink-0 tabular-nums sm:hidden" dir="ltr">
            · {entry.timeRange}
          </span>
        </span>
      </button>

      <div className="hidden items-center gap-3 md:flex">
        {entry.billable && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex size-7 items-center justify-center rounded-lg bg-success/12 text-[#118d57] dark:text-[#77ed8b]">
                <CoinsIcon className="size-3.5" aria-label={tt.billable} />
              </span>
            </TooltipTrigger>
            <TooltipContent>{tt.billable}</TooltipContent>
          </Tooltip>
        )}
        {entry.earned && (
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">
            {entry.earned}
          </span>
        )}
      </div>
      <span className="hidden text-xs text-muted-foreground tabular-nums sm:block" dir="ltr">
        {entry.timeRange}
      </span>
      <span className="flex min-w-14 items-center justify-end gap-1.5 font-mono text-[15px] font-bold tabular-nums">
        {entry.running ? (
          <>
            <PulseDot className="size-2" />
            <LiveDuration since={entry.startedAt} serverNow={serverNow} />
          </>
        ) : (
          entry.durationLabel
        )}
      </span>

      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-primary sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
              aria-label={tt.continue}
              disabled={pending}
              onClick={() => run(continueEntryAction({ id: entry.id }), tt.continued)}
            >
              <PlayIcon className="fill-current" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{tt.continueHint}</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t.common.actions}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => openEdit(entry.values)}>
              <PencilIcon /> {t.common.edit}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => run(duplicateEntryAction({ id: entry.id }), tt.duplicated)}
            >
              <CopyIcon /> {tt.duplicate}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <ConfirmDialog
              description={tt.deleteEntryBody}
              onConfirm={() => run(deleteEntryAction({ id: entry.id }), tt.deleted)}
              trigger={
                <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                  <Trash2Icon /> {t.common.delete}
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
