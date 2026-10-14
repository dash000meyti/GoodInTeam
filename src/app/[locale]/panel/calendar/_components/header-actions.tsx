"use client";

import { useState } from "react";
import { CalendarSyncIcon, Loader2Icon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { CopyButton } from "@/components/shared/copy-button";
import { useActionForm } from "@/components/shared/use-action-form";
import { useT } from "@/i18n/client";
import { ensureFeedAction, regenerateFeedAction } from "@/server/modules/calendar/actions";
import { useCalendar, type EventPrefill } from "./calendar-context";

export function NewEventButton({
  label,
  prefill,
  variant = "default",
}: {
  label: string;
  prefill?: EventPrefill;
  variant?: "default" | "outline" | "soft";
}) {
  const cal = useCalendar();
  return (
    <Button variant={variant} onClick={() => cal.openCreate(prefill)}>
      <PlusIcon /> {label}
    </Button>
  );
}

/** "Subscribe" dialog: private ICS feed URL + instructions for Google/Apple/Outlook. */
export function SubscribeDialog() {
  const t = useT();
  const c = t.calendar;
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [withTasks, setWithTasks] = useState(false);
  const ensure = useActionForm(ensureFeedAction, { onSuccess: (d) => setUrl(d.url) });
  const regen = useActionForm(regenerateFeedAction, {
    successMessage: c.regenerated,
    onSuccess: (d) => setUrl(d.url),
  });
  const full = url ? `${url}${withTasks ? "?tasks=1" : ""}` : "";
  const webcal = full.replace(/^https?:\/\//, "webcal://");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && !url) void ensure.run({});
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarSyncIcon /> {c.subscribe}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{c.subscribeTitle}</DialogTitle>
          <DialogDescription>{c.subscribeIntro}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="cal-feed-url">{c.feedUrl}</Label>
          <div className="flex gap-2">
            <Input
              id="cal-feed-url"
              readOnly
              dir="ltr"
              value={full}
              placeholder={ensure.pending ? t.common.loading : ""}
              className="font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
            {full ? (
              <CopyButton value={full} />
            ) : (
              <Button variant="outline" size="sm" disabled>
                <Loader2Icon className="animate-spin" />
              </Button>
            )}
          </div>
          <label className="mt-1 flex cursor-pointer items-center gap-3 text-sm">
            <Switch checked={withTasks} onCheckedChange={setWithTasks} />
            {c.includeTasks}
          </label>
        </div>

        <ol className="grid gap-3 text-sm">
          {(
            [
              [c.howGoogle, c.howGoogleSteps],
              [c.howApple, c.howAppleSteps],
              [c.howOutlook, c.howOutlookSteps],
            ] as const
          ).map(([title, steps], i) => (
            <li key={title} className="flex gap-3 rounded-xl border border-dashed p-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary-dark dark:text-primary-light">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-muted-foreground">{steps}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">{c.syncNote}</p>

        <div className="flex flex-col-reverse gap-2 border-t border-dashed pt-4 sm:flex-row sm:items-center sm:justify-between">
          <ConfirmDialog
            title={c.regenerateTitle}
            description={c.regenerateHint}
            confirmLabel={c.regenerate}
            onConfirm={() => void regen.run({})}
            trigger={
              <Button variant="ghost" className="text-destructive" disabled={regen.pending || !url}>
                {regen.pending ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
                {c.regenerate}
              </Button>
            }
          />
          {full && (
            <Button asChild variant="soft">
              <a href={webcal}>
                <CalendarSyncIcon /> {c.openInCalendarApp}
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
