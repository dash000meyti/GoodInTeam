"use client";

import { useState } from "react";
import { ClockIcon, Loader2Icon, MoonIcon } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DatePicker } from "@/components/shared/date-picker";
import { useActionForm } from "@/components/shared/use-action-form";
import {
  ProjectSelect,
  TaskSelect,
  type ProjectOption,
  type TaskOption,
} from "@/components/time/project-select";
import { useLocale, useT } from "@/i18n/client";
import { normalizeClock, parseDuration } from "@/lib/duration";
import { formatDuration } from "@/lib/format";
import { fromDateInput } from "@/lib/tz";
import { createEntryAction, updateEntryAction } from "@/server/modules/time/actions";

export interface EntryFormValues {
  id?: string;
  description: string;
  projectId: string;
  taskId: string;
  billable: boolean;
  /** "YYYY-MM-DD" (app timezone). */
  date: string;
  /** "HH:mm" */
  startTime: string;
  /** "HH:mm", empty while running. */
  endTime: string;
  running: boolean;
}

function previewMs(
  mode: "range" | "duration",
  v: { date: string; startTime: string; endTime: string; duration: string },
  tz: string,
) {
  if (mode === "duration") return parseDuration(v.duration);
  const s = normalizeClock(v.startTime);
  const e = normalizeClock(v.endTime);
  if (!v.date || !s || !e) return null;
  const start = fromDateInput(v.date, s, tz).getTime();
  let end = fromDateInput(v.date, e, tz).getTime();
  if (end < start) end += 86_400_000;
  return end > start ? end - start : null;
}

/** Add (manual) or edit a time entry: date + start/end or date + duration. */
export function EntryDialog({
  open,
  onOpenChange,
  entry,
  defaults,
  projects,
  tasks,
  tz,
  todayKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: EntryFormValues | null;
  defaults: Partial<EntryFormValues>;
  projects: ProjectOption[];
  tasks: TaskOption[];
  tz: string;
  todayKey: string;
}) {
  const t = useT();
  const tt = t.time;
  const locale = useLocale();
  const isEdit = !!entry?.id;
  const running = !!entry?.running;
  const defaultProject = projects.find((x) => x.id === defaults.projectId);
  const initial: EntryFormValues = entry ?? {
    description: "",
    projectId: "",
    taskId: "",
    billable: !!defaultProject && defaultProject.billingType !== "internal",
    date: todayKey,
    startTime: "",
    endTime: "",
    running: false,
    ...defaults,
  };

  const [v, setV] = useState({ ...initial, duration: "" });
  const [mode, setMode] = useState<"range" | "duration">(
    isEdit || initial.startTime ? "range" : "duration",
  );
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) =>
    setV((prev) => ({ ...prev, [k]: value }));

  const form = useActionForm(isEdit ? updateEntryAction : createEntryAction, {
    successMessage: isEdit ? t.common.saved : tt.added,
    onSuccess: () => onOpenChange(false),
  });

  const ms = running ? null : previewMs(mode, v, tz);
  const s = normalizeClock(v.startTime);
  const e = normalizeClock(v.endTime);
  const overnight = mode === "range" && !!s && !!e && e < s;
  const err = (k: string) => form.errors[k]?.[0];

  const submit = () => {
    const payload: Record<string, unknown> = {
      description: v.description,
      projectId: v.projectId,
      taskId: v.taskId,
      billable: v.billable,
      date: v.date,
    };
    if (isEdit) payload.id = entry!.id;
    if (running) payload.startTime = v.startTime;
    else if (mode === "range")
      Object.assign(payload, { startTime: v.startTime, endTime: v.endTime });
    else Object.assign(payload, { startTime: v.startTime || undefined, duration: v.duration });
    void form.run(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (onOpenChange(o), form.reset())}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? tt.editEntry : tt.addTime}</DialogTitle>
          {running && <DialogDescription>{tt.runningNoEnd}</DialogDescription>}
        </DialogHeader>
        <form
          className="grid gap-5"
          onSubmit={(ev) => {
            ev.preventDefault();
            submit();
          }}
        >
          <Field label={t.common.description} htmlFor="entry-description">
            <Input
              id="entry-description"
              value={v.description}
              onChange={(ev) => set("description", ev.target.value)}
              placeholder={tt.whatAreYouWorkingOn}
              autoFocus
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t.common.project} error={err("projectId")}>
              <ProjectSelect
                projects={projects}
                value={v.projectId}
                onChange={(id) => {
                  const p = projects.find((x) => x.id === id);
                  setV((prev) => ({
                    ...prev,
                    projectId: id,
                    taskId: "",
                    billable: p ? p.billingType !== "internal" : false,
                  }));
                }}
                noneLabel={t.common.noProject}
                placeholder={tt.selectProject}
              />
            </Field>
            <Field label={tt.task} error={err("taskId")}>
              <TaskSelect
                tasks={tasks}
                projectId={v.projectId || null}
                value={v.taskId}
                onChange={(id) => set("taskId", id)}
                noneLabel={tt.noTask}
                placeholder={tt.selectTask}
              />
            </Field>
          </div>

          <div className="grid gap-4 rounded-xl border border-dashed p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <Field label={t.common.date} error={err("date")} className="min-w-48 flex-1">
                <DatePicker
                  value={v.date}
                  onChange={(d) => set("date", d ?? todayKey)}
                  clearable={false}
                />
              </Field>
              {!running && (
                <ToggleGroup
                  type="single"
                  value={mode}
                  onValueChange={(m) => m && setMode(m as typeof mode)}
                  aria-label={tt.duration}
                >
                  <ToggleGroupItem value="range">{tt.modeRange}</ToggleGroupItem>
                  <ToggleGroupItem value="duration">{tt.modeDuration}</ToggleGroupItem>
                </ToggleGroup>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label={tt.startTime}
                htmlFor="entry-start"
                error={err("startTime") ?? err("startedAt")}
                hint={mode === "duration" && !running ? t.common.optional : undefined}
              >
                <Input
                  id="entry-start"
                  type="time"
                  dir="ltr"
                  value={v.startTime}
                  onChange={(ev) => set("startTime", ev.target.value)}
                  required={mode === "range" || running}
                />
              </Field>
              {!running &&
                (mode === "range" ? (
                  <Field
                    label={tt.endTime}
                    htmlFor="entry-end"
                    error={err("endTime") ?? err("endedAt")}
                    hint={
                      overnight ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-violet">
                          <MoonIcon className="size-3" /> {tt.nextDay}
                        </span>
                      ) : undefined
                    }
                  >
                    <Input
                      id="entry-end"
                      type="time"
                      dir="ltr"
                      value={v.endTime}
                      onChange={(ev) => set("endTime", ev.target.value)}
                      required
                    />
                  </Field>
                ) : (
                  <Field
                    label={tt.duration}
                    htmlFor="entry-duration"
                    error={err("duration")}
                    hint={tt.durationHint}
                  >
                    <Input
                      id="entry-duration"
                      dir="ltr"
                      inputMode="decimal"
                      value={v.duration}
                      onChange={(ev) => set("duration", ev.target.value)}
                      placeholder={tt.durationPlaceholder}
                      required
                    />
                  </Field>
                ))}
            </div>
            {!running && (
              <p
                className="flex items-center gap-2 text-sm text-muted-foreground"
                aria-live="polite"
              >
                <ClockIcon className="size-4" />
                {tt.duration}:{" "}
                <b className="font-mono text-foreground tabular-nums">
                  {ms ? formatDuration(ms, locale) : "—"}
                </b>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="entry-billable"
              checked={v.billable}
              onCheckedChange={(c) => set("billable", c)}
            />
            <Label htmlFor="entry-billable">{tt.billable}</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={form.pending}>
              {form.pending && <Loader2Icon className="animate-spin" />}
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
