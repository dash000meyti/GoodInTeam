"use client";

import { useState } from "react";
import {
  CalendarClockIcon,
  CheckIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
  XIcon,
  BanIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePicker } from "@/components/shared/date-picker";
import { useAction, useActionForm } from "@/components/shared/use-action-form";
import { addDaysKey, dayKeyOf } from "@/components/calendar/grid";
import type { CalendarEventData, CommitmentState } from "@/components/calendar/types";
import { useT } from "@/i18n/client";
import {
  rescheduleCommitmentAction,
  setCommitmentStatusAction,
} from "@/server/modules/calendar/actions";
import { useCalendar } from "./calendar-context";

/** Row actions on the commitments page: kept / missed / reschedule / edit / delete. */
export function CommitmentActions({
  event,
  state,
}: {
  event: CalendarEventData;
  state: CommitmentState;
}) {
  const t = useT();
  const c = t.calendar;
  const cal = useCalendar();
  const { exec, pending } = useAction();
  const open = state === "pending";
  const set = (status: CommitmentState, msg: string) =>
    exec(setCommitmentStatusAction({ id: event.id, status }), msg);

  if (!event.canEdit) return null;

  return (
    <div className="flex shrink-0 items-center gap-1">
      {open && (
        <>
          <Button
            size="sm"
            variant="soft"
            disabled={pending}
            onClick={() => set("kept", c.markedKept)}
            aria-label={c.markKept}
            title={c.markKept}
          >
            <CheckIcon /> <span className="hidden sm:inline">{c.markKept}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => set("missed", c.markedMissed)}
            className="text-destructive"
            aria-label={c.markMissed}
            title={c.markMissed}
          >
            <XIcon /> <span className="hidden sm:inline">{c.markMissed}</span>
          </Button>
          <ReschedulePopover event={event} />
        </>
      )}
      {/* Non-modal so the edit/delete dialogs it opens keep focus and pointer events. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t.common.actions} disabled={pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : <MoreHorizontalIcon />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => cal.openEdit(event)}>
            <PencilIcon /> {t.common.edit}
          </DropdownMenuItem>
          {open ? (
            <DropdownMenuItem onSelect={() => set("canceled", c.statusSaved)}>
              <BanIcon /> {c.markCanceled}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => set("pending", c.statusSaved)}>
              <RotateCcwIcon /> {c.markPending}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => cal.requestDelete(event)}>
            <Trash2Icon /> {t.common.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ReschedulePopover({ event }: { event: CalendarEventData }) {
  const t = useT();
  const c = t.calendar;
  const cal = useCalendar();
  const [open, setOpen] = useState(false);
  const current = dayKeyOf(event.startAt, cal.tz);
  const [due, setDue] = useState<string | null>(
    current < cal.todayKey ? addDaysKey(cal.todayKey, 1) : current,
  );
  const form = useActionForm(rescheduleCommitmentAction, {
    successMessage: c.rescheduled,
    onSuccess: () => setOpen(false),
  });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label={c.reschedule} title={c.reschedule}>
          <CalendarClockIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void form.run(new FormData(e.currentTarget));
          }}
        >
          <input type="hidden" name="id" value={event.id} />
          <p className="text-sm font-bold">{c.reschedule}</p>
          <div className="grid gap-1.5">
            <Label>{c.newDue}</Label>
            <DatePicker name="due" value={due} onChange={setDue} clearable={false} />
          </div>
          {!event.allDay && (
            <div className="grid gap-1.5">
              <Label htmlFor={`rs-${event.id}`}>{c.dueTime}</Label>
              <Input id={`rs-${event.id}`} name="dueTime" type="time" dir="ltr" step={300} />
            </div>
          )}
          {form.message && (
            <p role="alert" className="text-xs text-destructive">
              {form.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={form.pending || !due}>
              {form.pending && <Loader2Icon className="animate-spin" />}
              {t.common.save}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
