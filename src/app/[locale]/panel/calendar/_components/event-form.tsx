"use client";

import { useId, useMemo, useState } from "react";
import {
  ChevronDownIcon,
  Loader2Icon,
  PlusIcon,
  RepeatIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ColorDot } from "@/components/shared/color-dot";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { DatePicker } from "@/components/shared/date-picker";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { SelectField } from "@/components/shared/select-field";
import { SwitchInput } from "@/components/shared/switch-input";
import { useAction, useActionForm } from "@/components/shared/use-action-form";
import { dayKeyOf } from "@/components/calendar/grid";
import { eventKinds, eventPalette, kindMeta, reminderOptions } from "@/components/calendar/kinds";
import type { Attendee, EventStatus } from "@/components/calendar/types";
import { useT } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import { rrulePresets } from "@/lib/rrule";
import { zonedParts } from "@/lib/tz";
import { cn } from "@/lib/utils";
import type { EventKind } from "@/server/db/schema/work";
import {
  createEventAction,
  deleteEventAction,
  updateEventAction,
} from "@/server/modules/calendar/actions";
import { useCalendar, type EventDialogState, type EventPrefill } from "./calendar-context";
import { reminderLabel, statusOptions } from "./labels";

type CalMessages = Messages["calendar"];

const pad = (n: number) => String(n).padStart(2, "0");
function hhmm(ms: number, tz: string) {
  const p = zonedParts(ms, tz);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}
function plusHour(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${pad(((h ?? 0) + 1) % 24)}:${pad(m ?? 0)}`;
}

const presetKeys = ["daily", "weekdays", "weekly", "biweekly", "monthly", "yearly"] as const;
type PresetKey = (typeof presetKeys)[number];

function presetRule(key: PresetKey, locale: "fa" | "en") {
  if (key === "weekdays")
    return locale === "fa" ? rrulePresets.weekdaysIran : rrulePresets.weekdays;
  return rrulePresets[key];
}

interface Initial {
  title: string;
  kind: EventKind;
  status: EventStatus;
  allDay: boolean;
  date: string;
  startTime: string;
  endTime: string;
  endDate: string | null;
  showEndDate: boolean;
  location: string;
  meetingUrl: string;
  projectId: string;
  clientId: string;
  promisedAt: string | null;
  description: string;
  color: string | null;
  recurrence: string;
  remind: string;
  visibleToClient: boolean;
  attendees: Attendee[];
}

function initialValues(
  state: NonNullable<EventDialogState>,
  cal: { tz: string; todayKey: string; now: number; locale: "fa" | "en" },
): Initial {
  const { tz } = cal;
  if (state.mode === "edit") {
    const e = state.event;
    const date = dayKeyOf(e.startAt, tz);
    const endKey = e.endAt ? dayKeyOf(e.endAt, tz) : null;
    return {
      title: e.title,
      kind: e.kind,
      status: e.status,
      allDay: e.allDay,
      date,
      startTime: e.allDay ? "09:00" : hhmm(e.startAt, tz),
      endTime: !e.allDay && e.endAt ? hhmm(e.endAt, tz) : "",
      endDate: endKey && endKey !== date ? endKey : null,
      showEndDate: !!(endKey && endKey !== date),
      location: e.location ?? "",
      meetingUrl: e.meetingUrl ?? "",
      projectId: e.projectId ?? "",
      clientId: e.clientId ?? "",
      promisedAt: e.promisedAt ? dayKeyOf(e.promisedAt, tz) : null,
      description: e.description ?? "",
      color: e.color,
      recurrence: e.recurrence ?? "",
      remind: e.remindMinutesBefore != null ? String(e.remindMinutesBefore) : "",
      visibleToClient: e.visibleToClient,
      attendees: e.attendees,
    };
  }
  const p: EventPrefill = state.prefill;
  const date = p.date ?? cal.todayKey;
  let start = p.startTime;
  if (!start) {
    // Next full hour today, 09:00 on other days.
    const h = zonedParts(cal.now, tz).hour + 1;
    start = date === cal.todayKey && h < 24 ? `${pad(h)}:00` : "09:00";
  }
  const kind = p.kind ?? "meeting";
  return {
    title: "",
    kind,
    status: "confirmed",
    allDay: p.allDay ?? false,
    date,
    startTime: start,
    endTime: p.endTime ?? plusHour(start),
    endDate: null,
    showEndDate: false,
    location: "",
    meetingUrl: "",
    projectId: p.projectId ?? "",
    clientId: "",
    promisedAt: cal.todayKey,
    description: "",
    color: null,
    recurrence: "",
    remind: kind === "meeting" ? "10" : "",
    visibleToClient: false,
    attendees: [],
  };
}

export function EventFormDialog({
  state,
  onClose,
}: {
  state: EventDialogState;
  onClose: () => void;
}) {
  // Keep showing the last state while the close animation runs.
  const [last, setLast] = useState(state);
  if (state && state !== last) setLast(state);
  const current = state ?? last;
  const formKey =
    current?.mode === "edit"
      ? `edit:${current.event.id}`
      : current
        ? `new:${JSON.stringify(current.prefill)}`
        : "none";
  return (
    <Dialog open={state !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {current && <EventForm key={formKey} state={current} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function EventForm({
  state,
  onDone,
}: {
  state: NonNullable<EventDialogState>;
  onDone: () => void;
}) {
  const t = useT();
  const c = t.calendar;
  const cal = useCalendar();
  const uid = useId();
  const editing = state.mode === "edit" ? state.event : null;
  const [init] = useState(() => initialValues(state, cal));
  const [kind, setKind] = useState<EventKind>(init.kind);
  const [status, setStatus] = useState<string>(init.status);
  const [allDay, setAllDay] = useState(init.allDay);
  const [projectId, setProjectId] = useState(init.projectId);
  const [clientId, setClientId] = useState(init.clientId);
  const [color, setColor] = useState<string | null>(init.color);
  const [attendees, setAttendees] = useState<Attendee[]>(init.attendees);
  const showEndDate = init.showEndDate;
  const initialPreset = useMemo(() => {
    if (!init.recurrence) return "";
    const hit = presetKeys.find((k) => presetRule(k, cal.locale) === init.recurrence);
    return hit ?? "custom";
  }, [init.recurrence, cal.locale]);
  const [preset, setPreset] = useState<string>(initialPreset);
  const [customRule, setCustomRule] = useState(initialPreset === "custom" ? init.recurrence : "");
  const [more, setMore] = useState(
    !!editing &&
      !!(
        editing.description ||
        editing.attendees.length ||
        editing.color ||
        editing.visibleToClient
      ),
  );
  const { exec, pending: deleting } = useAction();
  const form = useActionForm(editing ? updateEventAction : createEventAction, {
    successMessage: t.common.saved,
    onSuccess: onDone,
  });
  const err = (k: string) => form.errors[k]?.[0];
  const isCommitment = kind === "commitment";
  const recurrence =
    preset === "custom" ? customRule : preset ? presetRule(preset as PresetKey, cal.locale) : "";
  const id = (k: string) => `${uid}-${k}`;

  const onProjectChange = (v: string) => {
    setProjectId(v);
    if (cal.isAdmin && !clientId) {
      const p = cal.projects.find((x) => x.id === v);
      if (p?.clientId) setClientId(p.clientId);
    }
  };

  const onKindChange = (k: EventKind) => {
    setKind(k);
    const allowed = statusOptions(k, c).map((o) => o.value as string);
    if (!allowed.includes(status)) setStatus("confirmed");
    if ((k === "deadline" || k === "commitment") && !editing) setAllDay(k === "deadline");
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {editing
            ? isCommitment
              ? c.editCommitment
              : c.editEvent
            : isCommitment
              ? c.newCommitment
              : c.newEvent}
        </DialogTitle>
        {editing?.recurrence && (
          <DialogDescription className="flex items-center gap-1.5">
            <RepeatIcon className="size-3.5" /> {c.recurringNote}
          </DialogDescription>
        )}
      </DialogHeader>
      <form
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void form.run(new FormData(e.currentTarget));
        }}
      >
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="recurrence" value={recurrence} />
        <input type="hidden" name="color" value={color ?? ""} />
        <input
          type="hidden"
          name="attendees"
          value={JSON.stringify(attendees.filter((a) => a.name.trim()))}
        />

        <Field label={c.eventTitle} htmlFor={id("title")} error={err("title")} required>
          <Input
            id={id("title")}
            name="title"
            defaultValue={init.title}
            placeholder={isCommitment ? c.whatPlaceholder : c.eventTitlePlaceholder}
            required
            maxLength={300}
            autoFocus
          />
        </Field>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-semibold">{c.kind}</legend>
          <div role="radiogroup" aria-label={c.kind} className="flex flex-wrap gap-2">
            {eventKinds.map((k) => {
              const Icon = kindMeta[k].icon;
              const active = k === kind;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onKindChange(k)}
                  className={cn(
                    "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
                    active
                      ? "border-transparent text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                  style={
                    active
                      ? {
                          backgroundColor: `color-mix(in oklab, ${kindMeta[k].color} 18%, transparent)`,
                          boxShadow: `inset 0 0 0 1.5px ${kindMeta[k].color}`,
                        }
                      : undefined
                  }
                >
                  <Icon className="size-3.5" style={{ color: kindMeta[k].color }} />
                  {c[`kind_${k}`]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:col-span-2 sm:grid-cols-2 sm:gap-5">
            <Field label={isCommitment ? c.due : c.date} htmlFor={id("date")} error={err("date")}>
              <DatePicker id={id("date")} name="date" defaultValue={init.date} clearable={false} />
            </Field>
            <label
              htmlFor={id("allDay")}
              className="flex cursor-pointer items-center gap-3 pb-2.5 text-sm font-semibold"
            >
              <input type="hidden" name="allDay" value={allDay ? "true" : "false"} />
              <Switch id={id("allDay")} checked={allDay} onCheckedChange={setAllDay} />
              {c.allDay}
            </label>
          </div>
          {!allDay ? (
            <div className="grid grid-cols-2 gap-4 sm:col-span-2 sm:gap-5">
              <Field label={c.startTime} htmlFor={id("start")} error={err("startTime")}>
                <Input
                  id={id("start")}
                  name="startTime"
                  type="time"
                  dir="ltr"
                  step={300}
                  defaultValue={init.startTime}
                  required
                />
              </Field>
              <Field label={c.endTime} htmlFor={id("end")} error={err("endTime")}>
                <Input
                  id={id("end")}
                  name="endTime"
                  type="time"
                  dir="ltr"
                  step={300}
                  defaultValue={init.endTime}
                />
              </Field>
              {showEndDate && (
                <Field label={c.endDate} error={err("endDate")} className="col-span-2">
                  <DatePicker name="endDate" defaultValue={init.endDate} />
                </Field>
              )}
            </div>
          ) : (
            <Field
              label={c.endDate}
              hint={c.endDateHint}
              error={err("endDate")}
              className="sm:col-span-2"
            >
              <DatePicker name="endDate" defaultValue={init.endDate} />
            </Field>
          )}
          {!allDay && !showEndDate && <input type="hidden" name="endDate" value="" />}

          {isCommitment && (
            <Field label={c.promisedAt} hint={c.promisedAtHint} error={err("promisedAt")}>
              <DatePicker name="promisedAt" defaultValue={init.promisedAt} />
            </Field>
          )}
          <Field label={c.status} htmlFor={id("status")}>
            <SelectField
              id={id("status")}
              name="status"
              value={status}
              onChange={setStatus}
              options={statusOptions(kind, c, init.status)}
            />
          </Field>

          <Field label={c.project} htmlFor={id("project")} error={err("projectId")}>
            <SelectField
              id={id("project")}
              name="projectId"
              value={projectId}
              onChange={onProjectChange}
              noneLabel={c.noProject}
              placeholder={c.noProject}
              options={cal.projects.map((p) => ({
                value: p.id,
                label: p.name,
                icon: <ColorDot color={p.color} />,
              }))}
            />
          </Field>
          {cal.isAdmin && (
            <Field
              label={isCommitment ? c.toWhom : c.client}
              htmlFor={id("client")}
              error={err("clientId")}
            >
              <SelectField
                id={id("client")}
                name="clientId"
                value={clientId}
                onChange={setClientId}
                noneLabel={c.noClient}
                placeholder={c.noClient}
                options={cal.clients.map((cl) => ({
                  value: cl.id,
                  label: cl.name,
                  icon: <ColorDot color={cl.color} />,
                }))}
              />
            </Field>
          )}

          <Field label={c.location} htmlFor={id("location")} error={err("location")}>
            <Input
              id={id("location")}
              name="location"
              defaultValue={init.location}
              placeholder={c.locationPlaceholder}
              maxLength={300}
            />
          </Field>
          <Field label={c.meetingUrl} htmlFor={id("url")} error={err("meetingUrl")}>
            <Input
              id={id("url")}
              name="meetingUrl"
              type="url"
              dir="ltr"
              defaultValue={init.meetingUrl}
              placeholder="https://meet.google.com/…"
            />
          </Field>

          <Field label={c.recurrence} htmlFor={id("rec")} error={err("recurrence")}>
            <SelectField
              id={id("rec")}
              value={preset}
              onChange={setPreset}
              noneLabel={c.rec_none}
              placeholder={c.rec_none}
              options={[
                ...presetKeys.map((k) => ({ value: k, label: c[`rec_${k}`] })),
                { value: "custom", label: c.rec_custom },
              ]}
            />
          </Field>
          <Field label={c.reminder} htmlFor={id("remind")} error={err("remindMinutesBefore")}>
            <SelectField
              id={id("remind")}
              name="remindMinutesBefore"
              defaultValue={init.remind}
              noneLabel={c.remind_none}
              placeholder={c.remind_none}
              options={reminderOptions.map((m) => ({
                value: String(m),
                label: reminderLabel(m, c, cal.locale),
              }))}
            />
          </Field>
          {preset === "custom" && (
            <Field
              label={c.customRule}
              htmlFor={id("rrule")}
              hint={c.customRuleHint}
              error={err("recurrence")}
              className="sm:col-span-2"
            >
              <Input
                id={id("rrule")}
                dir="ltr"
                className="font-mono text-[13px]"
                value={customRule}
                onChange={(e) => setCustomRule(e.target.value)}
                placeholder="FREQ=WEEKLY;BYDAY=SA"
              />
            </Field>
          )}
        </div>

        <div className="rounded-xl border border-dashed">
          <button
            type="button"
            onClick={() => setMore((m) => !m)}
            aria-expanded={more}
            className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm font-semibold"
          >
            {c.moreOptions}
            <ChevronDownIcon className={cn("size-4 transition-transform", more && "rotate-180")} />
          </button>
          <div className={cn("grid gap-5 border-t border-dashed p-4", !more && "hidden")}>
            <Field label={c.description}>
              <MarkdownEditor name="description" defaultValue={init.description} rows={4} />
            </Field>
            <Field label={c.color}>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setColor(null)}
                  className={cn(
                    "h-7 cursor-pointer rounded-full border px-3 text-xs font-semibold transition-colors",
                    color === null
                      ? "border-foreground/30 bg-accent"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                  aria-pressed={color === null}
                >
                  {c.colorAuto}
                </button>
                {eventPalette.map((sw) => (
                  <button
                    key={sw}
                    type="button"
                    aria-label={sw}
                    aria-pressed={color?.toLowerCase() === sw.toLowerCase()}
                    onClick={() => setColor(sw)}
                    className={cn(
                      "size-7 cursor-pointer rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110",
                      color?.toLowerCase() === sw.toLowerCase() && "ring-2 ring-foreground/40",
                    )}
                    style={{ backgroundColor: sw }}
                  />
                ))}
              </div>
            </Field>
            <AttendeesEditor value={attendees} onChange={setAttendees} c={c} />
            <label className="flex cursor-pointer items-start justify-between gap-4 text-sm">
              <span>
                <span className="font-semibold">{c.visibleToClient}</span>
                <span className="block text-xs text-muted-foreground">{c.visibleToClientHint}</span>
              </span>
              <SwitchInput name="visibleToClient" defaultChecked={init.visibleToClient} />
            </label>
          </div>
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <div className="flex gap-2">
            {editing && editing.canEdit && (
              <ConfirmDialog
                description={editing.recurrence ? c.deleteRecurringHint : c.deleteHint}
                onConfirm={() =>
                  exec(
                    deleteEventAction({ id: editing.id }).then((r) => {
                      if (r.ok) onDone();
                      return r;
                    }),
                    c.deleted,
                  )
                }
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive"
                    disabled={deleting}
                  >
                    <Trash2Icon /> {t.common.delete}
                  </Button>
                }
              />
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onDone}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={form.pending}>
              {form.pending && <Loader2Icon className="animate-spin" />}
              {t.common.save}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}

function AttendeesEditor({
  value,
  onChange,
  c,
}: {
  value: Attendee[];
  onChange: (v: Attendee[]) => void;
  c: CalMessages;
}) {
  const set = (i: number, patch: Partial<Attendee>) =>
    onChange(value.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-semibold">{c.attendees}</legend>
      {value.map((a, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            aria-label={c.attendeeName}
            placeholder={c.attendeeName}
            value={a.name}
            onChange={(e) => set(i, { name: e.target.value })}
            maxLength={200}
          />
          <Input
            aria-label={c.attendeeEmail}
            placeholder={c.attendeeEmail}
            type="email"
            dir="ltr"
            value={a.email ?? ""}
            onChange={(e) => set(i, { email: e.target.value || undefined })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={c.removeAttendee}
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="soft"
        size="sm"
        className="w-fit"
        onClick={() => onChange([...value, { name: "" }])}
      >
        <PlusIcon /> {c.addAttendee}
      </Button>
    </fieldset>
  );
}
