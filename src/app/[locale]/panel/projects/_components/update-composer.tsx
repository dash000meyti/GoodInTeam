"use client";

import { useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/shared/select-field";
import { SwitchInput } from "@/components/shared/switch-input";
import { useActionForm } from "@/components/shared/use-action-form";
import { useT } from "@/i18n/client";
import { projectUpdateKinds } from "@/server/db/schema/projects";
import { addProjectUpdateAction } from "@/server/modules/projects/actions";
import { kindLabels } from "./update-kinds";

export function UpdateComposer({ projectId, locale }: { projectId: string; locale: "fa" | "en" }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const form = useActionForm(addProjectUpdateAction, {
    onSuccess: () => setOpen(false),
    successMessage: t.common.saved,
  });
  if (!open)
    return (
      <Button variant="soft" size="sm" onClick={() => setOpen(true)}>
        <PlusIcon /> {t.projects.addUpdate}
      </Button>
    );
  return (
    <form action={form.submit} className="grid gap-4 rounded-xl border border-dashed p-4">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label={t.projects.updateTitle} error={form.errors.title?.[0]}>
          <Input name="title" required autoFocus />
        </Field>
        <Field label={t.common.status}>
          <SelectField
            name="kind"
            defaultValue="update"
            options={projectUpdateKinds.map((k) => ({ value: k, label: kindLabels[locale][k] }))}
          />
        </Field>
      </div>
      <Field label={t.projects.updateBody}>
        <Textarea name="bodyMd" rows={5} />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-3 text-sm">
          <SwitchInput name="visibleToClient" defaultChecked /> {t.projects.visibleToClient}
        </label>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button type="submit" size="sm" disabled={form.pending}>
            {form.pending && <Loader2Icon className="animate-spin" />}
            {t.common.save}
          </Button>
        </div>
      </div>
    </form>
  );
}
