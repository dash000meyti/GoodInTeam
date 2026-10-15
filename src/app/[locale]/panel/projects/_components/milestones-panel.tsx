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
    <div className="space-y-4">
      <ol className="relative space-y-1 before:absolute before:inset-y-3 before:start-[15px] before:w-px before:bg-border">
        {items.map((m) => (
          <li
            key={m.id}
            className="group relative flex items-center gap-3 rounded-xl p-2 hover:bg-accent/50"
          >
            <button
              type="button"
              disabled={!editable || pending}
              onClick={() => exec(updateMilestoneAction({ id: m.id, status: next[m.status] }))}
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 bg-background transition-colors",
                m.status === "done" && "border-primary bg-primary text-primary-foreground",
                m.status === "in_progress" && "border-warning text-warning",
                m.status === "planned" && "border-border text-muted-foreground",
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
            {editable && !m.visibleToClient && <Badge variant="neutral">{t.common.optional}</Badge>}
            {editable && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => exec(deleteMilestoneAction({ id: m.id }))}
                aria-label={t.common.delete}
              >
                <Trash2Icon className="text-destructive" />
              </Button>
            )}
          </li>
        ))}
      </ol>
      {items.length === 0 && !adding && (
        <p className="py-4 text-center text-sm text-muted-foreground">{t.common.empty}</p>
      )}
      {editable &&
        (adding ? (
          <form
            onSubmit={form.submit}
            className="grid gap-4 rounded-xl border border-dashed p-4 sm:grid-cols-[1fr_180px_90px]"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <Field label={t.common.title} error={form.errors.title?.[0]}>
              <Input name="title" required autoFocus />
            </Field>
            <Field label={p.dueDate}>
              <DatePicker name="dueDate" />
            </Field>
            <Field label={p.weight}>
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
          <Button variant="soft" size="sm" onClick={() => setAdding(true)}>
            <PlusIcon /> {p.addMilestone}
          </Button>
        ))}
    </div>
  );
}
