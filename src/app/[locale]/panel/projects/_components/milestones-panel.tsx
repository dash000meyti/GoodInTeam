"use client";

import { useState } from "react";
import {
  CheckIcon,
  CircleDashedIcon,
  Loader2Icon,
  PlusIcon,
  TimerIcon,
  Trash2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { DatePicker } from "@/components/shared/date-picker";
import { SwitchInput } from "@/components/shared/switch-input";
import { useAction, useActionForm } from "@/components/shared/use-action-form";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import {
  addMilestoneAction,
  deleteMilestoneAction,
  updateMilestoneAction,
} from "@/server/modules/projects/actions";

export interface MilestoneView {
  id: string;
  title: string;
  status: "planned" | "in_progress" | "done";
  dueLabel: string | null;
  weight: number;
  visibleToClient: boolean;
}

const next = { planned: "in_progress", in_progress: "done", done: "planned" } as const;

/**
 * Milestones as hairline rows edge to edge (the body of a flush section
 * cell): a square status tile (yellow fill when done) cycles the status; the
 * add form is the last row.
 */
export function MilestonesPanel({
  projectId,
  items,
  editable,
}: {
  projectId: string;
  items: MilestoneView[];
  editable: boolean;
}) {
  const t = useT();
  const p = t.projects;
  const [adding, setAdding] = useState(false);
  const { exec, pending } = useAction();
  const form = useActionForm(addMilestoneAction, { onSuccess: () => setAdding(false) });

  return (
    <div className="flex flex-1 flex-col divide-y divide-frame-line">
      {items.length > 0 && (
        <ol className="divide-y divide-dashed divide-frame-line">
          {items.map((m) => (
            <li
              key={m.id}
              className="group flex items-center gap-3 px-(--cell-pad) py-3 transition-colors hover:bg-card"
            >
              <button
                type="button"
                disabled={!editable || pending}
                onClick={() => exec(updateMilestoneAction({ id: m.id, status: next[m.status] }))}
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center border bg-background transition-colors",
                  m.status === "done" &&
                    "border-[var(--primary-dark)] bg-primary text-primary-foreground",
                  m.status === "in_progress" && "border-warning text-warning-ink",
                  m.status === "planned" && "border-frame-line text-muted-foreground",
                  editable && "cursor-pointer",
                )}
                aria-label={p[`milestone_${m.status}`]}
              >
                {m.status === "done" ? (
                  <CheckIcon className="size-4" strokeWidth={3} />
                ) : m.status === "in_progress" ? (
                  <TimerIcon className="size-4" />
                ) : (
                  <CircleDashedIcon className="size-4" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate font-semibold",
                    m.status === "done" && "text-muted-foreground line-through",
                  )}
                >
                  {m.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p[`milestone_${m.status}`]}
                  {m.dueLabel && ` · ${m.dueLabel}`}
                  {editable && m.weight > 1 && ` · ${p.weight} ${m.weight}`}
                </p>
              </div>
              {editable && !m.visibleToClient && (
                <Badge variant="neutral">{t.common.optional}</Badge>
              )}
              {editable && (
                <ConfirmDialog
                  trigger={
                    // Revealed on hover/keyboard focus with a fine pointer; always shown on touch.
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100"
                      aria-label={`${t.common.delete}: ${m.title}`}
                    >
                      <Trash2Icon className="text-destructive" />
                    </Button>
                  }
                  description={
                    <>
                      <span className="font-semibold text-foreground">{m.title}</span>
                      <br />
                      {t.common.deleteConfirmBody}
                    </>
                  }
                  onConfirm={() => exec(deleteMilestoneAction({ id: m.id }))}
                />
              )}
            </li>
          ))}
        </ol>
      )}
      {items.length === 0 && !adding && (
        <p className="px-(--cell-pad) py-8 text-center text-sm text-muted-foreground">
          {t.common.empty}
        </p>
      )}
      {editable && (
        <div className="p-(--cell-pad)">
          {adding ? (
            <form onSubmit={form.submit} className="grid gap-4 sm:grid-cols-[1fr_180px_90px]">
              <input type="hidden" name="projectId" value={projectId} />
              <Field label={t.common.title} error={form.errors.title?.[0]}>
                <Input name="title" required autoFocus />
              </Field>
              <Field label={p.dueDate} error={form.errors.dueDate?.[0]}>
                <DatePicker name="dueDate" />
              </Field>
              <Field label={p.weight} error={form.errors.weight?.[0]}>
                <Input name="weight" type="number" min={1} max={100} defaultValue={1} dir="ltr" />
              </Field>
              <label className="flex items-center gap-3 text-sm sm:col-span-2">
                <SwitchInput name="visibleToClient" defaultChecked /> {p.visibleToClient}
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" size="sm" disabled={form.pending}>
                  {form.pending && <Loader2Icon className="animate-spin" />}
                  {t.common.add}
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <PlusIcon /> {p.addMilestone}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
