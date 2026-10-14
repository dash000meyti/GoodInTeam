"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CheckIcon,
  ClockIcon,
  CornerUpLeftIcon,
  FlagIcon,
  Loader2Icon,
  PlayIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { DatePicker } from "@/components/shared/date-picker";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { SelectField } from "@/components/shared/select-field";
import { SwitchInput } from "@/components/shared/switch-input";
import { useActionForm } from "@/components/shared/use-action-form";
import { ProjectSelect, type ProjectOption } from "@/components/time/project-select";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatDuration } from "@/lib/format";
import { rrulePresets } from "@/lib/rrule";
import { toDateInputValue, toTimeInputValue } from "@/lib/tz";
import { cn } from "@/lib/utils";
import { taskStatuses } from "@/server/db/schema/work";
import {
  addSubtaskAction,
  completeTaskAction,
  deleteTaskAction,
  getTaskAction,
  reopenTaskAction,
  startTaskTimerAction,
  updateTaskAction,
} from "@/server/modules/tasks/actions";
import type { TaskDetail } from "@/server/modules/tasks/service";
import { priorityTone } from "./task-bits";

type PresetKey = keyof typeof rrulePresets;
const PRESETS = Object.keys(rrulePresets) as PresetKey[];

/** Side sheet with the full task editor, subtasks checklist and quick actions. */
export function TaskSheet({
  taskId,
  onClose,
  onOpenTask,
  projects,
  assignees,
  tz,
}: {
  taskId: string | null;
  onClose: () => void;
  onOpenTask: (id: string) => void;
  projects: ProjectOption[];
  assignees: { id: string; name: string }[];
  tz: string;
}) {
  const t = useT();
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [version, setVersion] = useState(0);
  const [, startLoad] = useTransition();

  const load = (id: string) =>
    startLoad(async () => {
      const res = await getTaskAction({ id });
      if (res.ok) {
        setDetail(res.data);
        setVersion((v) => v + 1);
      } else {
        toast.error(res.error.message);
        onClose();
      }
    });

  useEffect(() => {
    if (taskId) load(taskId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the id changes
  }, [taskId]);

  const ready = !!detail && detail.id === taskId;

  return (
    <Sheet open={!!taskId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="end" className="w-full gap-0 p-0 sm:max-w-xl">
        {ready ? (
          <TaskEditor
            key={`${detail.id}-${version}`}
            detail={detail}
            projects={projects}
            assignees={assignees}
            tz={tz}
            onClose={onClose}
            onReload={() => load(detail.id)}
            onOpenTask={onOpenTask}
          />
        ) : (
          <>
            <SheetHeader className="border-b border-dashed p-5">
              <SheetTitle>{t.tasks.details}</SheetTitle>
              <SheetDescription className="sr-only">{t.common.loading}</SheetDescription>
            </SheetHeader>
            <div className="space-y-5 p-5" aria-busy>
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
              <Skeleton className="h-48 w-full" />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TaskEditor({
  detail,
  projects,
  assignees,
  tz,
  onClose,
  onReload,
  onOpenTask,
}: {
  detail: TaskDetail;
  projects: ProjectOption[];
  assignees: { id: string; name: string }[];
  tz: string;
  onClose: () => void;
  onReload: () => void;
  onOpenTask: (id: string) => void;
}) {
  const t = useT();
  const tk = t.tasks;
  const locale = useLocale();
  const [pending, start] = useTransition();
  const [projectId, setProjectId] = useState(detail.projectId ?? "");
  const presetOf = (rule: string | null): PresetKey | "none" | "custom" =>
    !rule ? "none" : (PRESETS.find((k) => rrulePresets[k] === rule) ?? "custom");
  const [recMode, setRecMode] = useState(presetOf(detail.recurrence));
  const [customRule, setCustomRule] = useState(detail.recurrence ?? "");
  const [subtask, setSubtask] = useState("");

  const form = useActionForm(updateTaskAction, {
    successMessage: t.common.saved,
    onSuccess: (data) => {
      if (data.nextId) toast.success(tk.completed);
      onClose();
    },
  });

  const run = <T,>(
    p: () => Promise<{ ok: true; data: T } | { ok: false; error: { message: string } }>,
    opts: { success?: string; reload?: boolean; close?: boolean } = {},
  ) =>
    start(async () => {
      const res = await p();
      if (!res.ok) return void toast.error(res.error.message);
      if (opts.success) toast.success(opts.success);
      if (opts.close) onClose();
      else if (opts.reload) onReload();
    });

  const recurrence =
    recMode === "none" ? "" : recMode === "custom" ? customRule : rrulePresets[recMode];
  const err = (k: string) => form.errors[k]?.[0];

  return (
    <>
      <SheetHeader className="gap-1 border-b border-dashed p-5 pe-12">
        <SheetTitle>{tk.details}</SheetTitle>
        <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {detail.parent && (
            <button
              type="button"
              onClick={() => onOpenTask(detail.parent!.id)}
              className="inline-flex cursor-pointer items-center gap-1 font-semibold text-primary hover:underline"
            >
              <CornerUpLeftIcon className="size-3 rtl:-scale-x-100" />
              {format(tk.parentTask, { title: detail.parent.title })}
            </button>
          )}
          {detail.trackedMs > 0 && (
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="size-3" /> {tk.tracked}:{" "}
              <b className="font-mono">{formatDuration(detail.trackedMs, locale)}</b>
            </span>
          )}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto">
        <form id="task-form" action={form.submit} className="grid gap-5 p-5">
          <input type="hidden" name="id" value={detail.id} />
          <input type="hidden" name="recurrence" value={recurrence} />
          <Field error={err("title")}>
            <Input
              name="title"
              defaultValue={detail.title}
              aria-label={t.common.title}
              required
              className="h-12 border-0 bg-muted/60 px-4 text-lg font-bold"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tk.status}>
              <SelectField
                name="status"
                defaultValue={detail.status}
                options={taskStatuses.map((s) => ({ value: s, label: tk[`status_${s}`] }))}
              />
            </Field>
            <Field label={tk.priority}>
              <SelectField
                name="priority"
                defaultValue={String(detail.priority)}
                options={[0, 1, 2, 3, 4].map((p) => ({
                  value: String(p),
                  label: tk[`priority_${p}` as "priority_0"],
                  icon: (
                    <FlagIcon
                      className={cn("size-3.5", p >= 3 && "fill-current", priorityTone[p])}
                    />
                  ),
                }))}
              />
            </Field>
            <Field
              label={t.common.project}
              error={err("projectId")}
              className={assignees.length > 1 ? undefined : "sm:col-span-2"}
            >
              <ProjectSelect
                name="projectId"
                projects={projects}
                value={projectId}
                onChange={setProjectId}
                noneLabel={t.common.noProject}
                placeholder={t.common.noProject}
              />
            </Field>
            {assignees.length > 1 && (
              <Field label={tk.assignee} error={err("assigneeId")}>
                <SelectField
                  name="assigneeId"
                  defaultValue={detail.assigneeId ?? ""}
                  noneLabel={tk.unassigned}
                  placeholder={tk.unassigned}
                  options={assignees.map((a) => ({ value: a.id, label: a.name }))}
                />
              </Field>
            )}
          </div>

          <fieldset className="grid gap-4 rounded-xl border border-dashed p-4 sm:grid-cols-[1fr_8rem]">
            <Field label={tk.dueDate} error={err("dueDate")}>
              <DatePicker
                name="dueDate"
                defaultValue={detail.dueAt ? toDateInputValue(detail.dueAt, tz) : null}
                placeholder={tk.noDue}
              />
            </Field>
            <Field label={tk.dueTime} error={err("dueTime")}>
              <Input
                name="dueTime"
                type="time"
                dir="ltr"
                defaultValue={
                  detail.dueAt && !detail.dueAllDay ? toTimeInputValue(detail.dueAt, tz) : ""
                }
              />
            </Field>
            <Field label={tk.reminderDate} error={err("remindDate") ?? err("remindAt")}>
              <DatePicker
                name="remindDate"
                defaultValue={detail.remindAt ? toDateInputValue(detail.remindAt, tz) : null}
                placeholder="—"
              />
            </Field>
            <Field label={tk.reminderTime} error={err("remindTime")}>
              <Input
                name="remindTime"
                type="time"
                dir="ltr"
                defaultValue={detail.remindAt ? toTimeInputValue(detail.remindAt, tz) : "09:00"}
              />
            </Field>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tk.recurrence} error={err("recurrence")}>
              <SelectField
                value={recMode}
                onChange={(v) => setRecMode(v as typeof recMode)}
                options={[
                  { value: "none", label: tk.rec_none },
                  ...PRESETS.map((k) => ({ value: k, label: tk[`rec_${k}`] })),
                  { value: "custom", label: tk.rec_custom },
                ]}
              />
            </Field>
            <Field label={tk.estimate} error={err("estimateMinutes")}>
              <Input
                name="estimateMinutes"
                type="number"
                min={0}
                inputMode="numeric"
                dir="ltr"
                defaultValue={detail.estimateMinutes ?? ""}
              />
            </Field>
            {recMode === "custom" && (
              <Field label="RRULE" error={err("recurrence")} className="sm:col-span-2">
                <Input
                  value={customRule}
                  onChange={(e) => setCustomRule(e.target.value)}
                  dir="ltr"
                  placeholder="FREQ=WEEKLY;BYDAY=SA"
                  className="font-mono text-xs"
                />
              </Field>
            )}
          </div>

          <Field label={t.common.tags} hint={tk.tagsHint} error={err("tags")}>
            <Input name="tags" defaultValue={detail.tags.join("، ")} />
          </Field>

          {projectId && (
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3 text-sm font-medium">
              {tk.visibleToClient}
              <SwitchInput name="visibleToClient" defaultChecked={detail.visibleToClient} />
            </label>
          )}

          <Field label={t.common.notes}>
            <MarkdownEditor
              name="notes"
              defaultValue={detail.notes ?? ""}
              rows={6}
              placeholder={tk.notesPlaceholder}
            />
          </Field>
        </form>

        {!detail.parentId && (
          <section className="grid gap-3 border-t border-dashed p-5" aria-labelledby="subtasks-h">
            <h3 id="subtasks-h" className="text-sm font-bold">
              {tk.subtasks}
            </h3>
            {detail.subtasks.length > 0 && (
              <ul className="grid gap-1">
                {detail.subtasks.map((s) => {
                  const done = s.status === "done";
                  return (
                    <li
                      key={s.id}
                      className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent/50"
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={done}
                        aria-label={done ? tk.markUndone : tk.markDone}
                        disabled={pending}
                        onClick={() =>
                          run(
                            () =>
                              done
                                ? reopenTaskAction({ id: s.id, status: "todo" })
                                : completeTaskAction({ id: s.id }),
                            { reload: true },
                          )
                        }
                        className={cn(
                          "flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] border-2 transition-colors",
                          done
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-grey-500",
                        )}
                      >
                        {done && <CheckIcon className="size-3" strokeWidth={3.5} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenTask(s.id)}
                        className={cn(
                          "min-w-0 flex-1 cursor-pointer truncate text-start text-sm",
                          done && "text-muted-foreground line-through",
                        )}
                      >
                        <bdi>{s.title}</bdi>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label={t.common.delete}
                        onClick={() => run(() => deleteTaskAction({ id: s.id }), { reload: true })}
                      >
                        <XIcon className="size-3.5" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const title = subtask.trim();
                if (!title) return;
                setSubtask("");
                run(() => addSubtaskAction({ parentId: detail.id, title }), { reload: true });
              }}
            >
              <PlusIcon className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={subtask}
                onChange={(e) => setSubtask(e.target.value)}
                placeholder={tk.subtaskPlaceholder}
                aria-label={tk.addSubtask}
                className="h-9 min-w-0 flex-1 rounded-lg bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground focus:bg-muted/50"
              />
            </form>
          </section>
        )}
      </div>

      <SheetFooter className="mt-0 flex-row flex-wrap items-center gap-2 border-t border-dashed p-4">
        <Button
          type="button"
          variant="soft"
          disabled={pending || detail.timerRunning}
          onClick={() =>
            run(() => startTaskTimerAction({ id: detail.id }), {
              success: t.time.started,
              reload: true,
            })
          }
        >
          {detail.timerRunning ? (
            <>
              <span className="size-2 animate-pulse rounded-full bg-primary" /> {tk.timerRunning}
            </>
          ) : (
            <>
              <PlayIcon className="fill-current" /> {tk.startTimer}
            </>
          )}
        </Button>
        <ConfirmDialog
          description={tk.deleteBody}
          onConfirm={() =>
            run(() => deleteTaskAction({ id: detail.id }), { success: t.time.deleted, close: true })
          }
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/12 hover:text-destructive"
              aria-label={t.common.delete}
            >
              <Trash2Icon />
            </Button>
          }
        />
        <div className="ms-auto flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="task-form" disabled={form.pending}>
            {form.pending && <Loader2Icon className="animate-spin" />}
            {t.common.save}
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}
