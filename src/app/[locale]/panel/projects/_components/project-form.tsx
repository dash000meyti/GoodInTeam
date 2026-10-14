"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/shared/date-picker";
import { SelectField } from "@/components/shared/select-field";
import { SwitchInput } from "@/components/shared/switch-input";
import { useActionForm } from "@/components/shared/use-action-form";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { currencyCodes, fromMinor, isCurrency } from "@/lib/money";
import { billingTypes, progressModes, projectStatuses } from "@/server/db/schema/projects";
import { createProjectAction, updateProjectAction } from "@/server/modules/projects/actions";
import { ColorPicker } from "./color-picker";

export interface ProjectFormValues {
  id: string;
  name: string;
  clientId: string | null;
  description: string | null;
  status: (typeof projectStatuses)[number];
  color: string;
  startDate: string | null;
  dueDate: string | null;
  billingType: (typeof billingTypes)[number];
  currency: string;
  budgetMinor: number | null;
  hourlyRateMinor: number | null;
  estimateHours: number | null;
  progress: number;
  progressMode: (typeof progressModes)[number];
  websiteUrl: string | null;
  repoUrl: string | null;
  portalEnabled: boolean;
  shareProgress: boolean;
  shareTime: boolean;
  shareTasks: boolean;
  shareFinance: boolean;
  shareDocs: boolean;
}

export function ProjectFormDialog({
  trigger,
  clients,
  project,
}: {
  trigger: ReactNode;
  clients: { id: string; name: string }[];
  project?: ProjectFormValues;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(project?.progressMode ?? "milestones");
  const isEdit = !!project;
  const cur = project?.currency && isCurrency(project.currency) ? project.currency : "IRT";
  const form = useActionForm(isEdit ? updateProjectAction : createProjectAction, {
    successMessage: t.common.saved,
    onSuccess: (data) => {
      setOpen(false);
      if (!isEdit && data) router.push(localePath(locale, `/panel/projects/${data.id}`));
    },
  });
  const p = t.projects;

  return (
    <Dialog open={open} onOpenChange={(o) => (setOpen(o), form.reset())}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? p.edit : p.new}</DialogTitle>
        </DialogHeader>
        <form action={form.submit} className="grid gap-5">
          {isEdit && <input type="hidden" name="id" value={project.id} />}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={p.name}
              htmlFor="name"
              error={form.errors.name?.[0]}
              required
              className="sm:col-span-2"
            >
              <Input id="name" name="name" defaultValue={project?.name} required autoFocus />
            </Field>
            <Field label={p.client} error={form.errors.clientId?.[0]}>
              <SelectField
                name="clientId"
                defaultValue={project?.clientId ?? ""}
                noneLabel={p.noClient}
                options={clients.map((c) => ({ value: c.id, label: c.name }))}
                placeholder={p.noClient}
              />
            </Field>
            <Field label={p.status}>
              <SelectField
                name="status"
                defaultValue={project?.status ?? "active"}
                options={projectStatuses.map((s) => ({ value: s, label: p[`status_${s}`] }))}
              />
            </Field>
            <Field label={p.startDate}>
              <DatePicker name="startDate" defaultValue={project?.startDate} />
            </Field>
            <Field label={p.dueDate}>
              <DatePicker name="dueDate" defaultValue={project?.dueDate} />
            </Field>
            <Field label={p.billingType}>
              <SelectField
                name="billingType"
                defaultValue={project?.billingType ?? "hourly"}
                options={billingTypes.map((b) => ({ value: b, label: p[`billing_${b}`] }))}
              />
            </Field>
            <Field label={t.common.currency}>
              <SelectField
                name="currency"
                defaultValue={cur}
                options={currencyCodes.map((c) => ({ value: c, label: c }))}
              />
            </Field>
            <Field label={p.budget} error={form.errors.budget?.[0]}>
              <Input
                name="budget"
                inputMode="decimal"
                dir="ltr"
                defaultValue={
                  project?.budgetMinor != null ? fromMinor(project.budgetMinor, cur) : ""
                }
              />
            </Field>
            <Field label={p.hourlyRate} error={form.errors.hourlyRate?.[0]}>
              <Input
                name="hourlyRate"
                inputMode="decimal"
                dir="ltr"
                defaultValue={
                  project?.hourlyRateMinor != null ? fromMinor(project.hourlyRateMinor, cur) : ""
                }
              />
            </Field>
            <Field label={p.estimateHours}>
              <Input
                name="estimateHours"
                inputMode="decimal"
                dir="ltr"
                defaultValue={project?.estimateHours ?? ""}
              />
            </Field>
            <Field label={p.progressMode}>
              <SelectField
                name="progressMode"
                value={mode}
                onChange={(v) => setMode(v as typeof mode)}
                options={progressModes.map((m) => ({ value: m, label: p[`progress_${m}`] }))}
              />
            </Field>
            {mode === "manual" && (
              <Field label={`${p.progress} (0–100)`}>
                <Input
                  name="progress"
                  type="number"
                  min={0}
                  max={100}
                  dir="ltr"
                  defaultValue={project?.progress ?? 0}
                />
              </Field>
            )}
            <Field label={p.websiteUrl} error={form.errors.websiteUrl?.[0]}>
              <Input
                name="websiteUrl"
                type="url"
                dir="ltr"
                defaultValue={project?.websiteUrl ?? ""}
              />
            </Field>
            <Field label={p.repoUrl} error={form.errors.repoUrl?.[0]}>
              <Input name="repoUrl" type="url" dir="ltr" defaultValue={project?.repoUrl ?? ""} />
            </Field>
            <Field label={p.color} className="sm:col-span-2">
              <ColorPicker name="color" defaultValue={project?.color} />
            </Field>
            <Field label={t.common.description} className="sm:col-span-2">
              <Textarea name="description" rows={3} defaultValue={project?.description ?? ""} />
            </Field>
          </div>

          <fieldset className="grid gap-3 rounded-xl border border-dashed p-4">
            <legend className="px-1 text-sm font-bold">{p.portal}</legend>
            <p className="text-xs text-muted-foreground">{p.portalHint}</p>
            {(
              [
                "portalEnabled",
                "shareProgress",
                "shareTime",
                "shareTasks",
                "shareFinance",
                "shareDocs",
              ] as const
            ).map((k) => (
              <label
                key={k}
                className="flex cursor-pointer items-center justify-between gap-3 text-sm"
              >
                <span>{p[k]}</span>
                <SwitchInput
                  name={k}
                  defaultChecked={project ? project[k] : k === "shareProgress"}
                />
              </label>
            ))}
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
