"use client";

import { useState, type ReactNode } from "react";
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
import { SelectField } from "@/components/shared/select-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { useT } from "@/i18n/client";
import { currencyCodes } from "@/lib/money";
import { clientKinds } from "@/server/db/schema/crm";
import { createClientAction, updateClientAction } from "@/server/modules/clients/actions";
import { ColorPicker } from "../../projects/_components/color-picker";

export interface ClientFormValues {
  id: string;
  name: string;
  kind: (typeof clientKinds)[number];
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  taxId: string | null;
  notes: string | null;
  color: string | null;
  defaultCurrency: string;
}

export function ClientFormDialog({
  trigger,
  client,
}: {
  trigger: ReactNode;
  client?: ClientFormValues;
}) {
  const t = useT();
  const c = t.clients;
  const [open, setOpen] = useState(false);
  const form = useActionForm(client ? updateClientAction : createClientAction, {
    successMessage: t.common.saved,
    onSuccess: () => setOpen(false),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => (setOpen(o), form.reset())}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{client ? c.edit : c.new}</DialogTitle>
        </DialogHeader>
        <form action={form.submit} className="grid gap-5 sm:grid-cols-2">
          {client && <input type="hidden" name="id" value={client.id} />}
          <Field label={t.common.name} error={form.errors.name?.[0]} required>
            <Input name="name" defaultValue={client?.name} required autoFocus />
          </Field>
          <Field label={c.kind}>
            <SelectField
              name="kind"
              defaultValue={client?.kind ?? "company"}
              options={clientKinds.map((k) => ({ value: k, label: c[`kind_${k}`] }))}
            />
          </Field>
          <Field label={t.common.email} error={form.errors.email?.[0]}>
            <Input name="email" type="email" dir="ltr" defaultValue={client?.email ?? ""} />
          </Field>
          <Field label={t.common.phone}>
            <Input name="phone" dir="ltr" defaultValue={client?.phone ?? ""} />
          </Field>
          <Field label={c.website}>
            <Input name="website" dir="ltr" defaultValue={client?.website ?? ""} />
          </Field>
          <Field label={c.defaultCurrency}>
            <SelectField
              name="defaultCurrency"
              defaultValue={client?.defaultCurrency ?? "IRT"}
              options={currencyCodes.map((x) => ({ value: x, label: x }))}
            />
          </Field>
          <Field label={c.taxId}>
            <Input name="taxId" dir="ltr" defaultValue={client?.taxId ?? ""} />
          </Field>
          <Field label={c.address}>
            <Input name="address" defaultValue={client?.address ?? ""} />
          </Field>
          <Field label={t.projects.color} className="sm:col-span-2">
            <ColorPicker name="color" defaultValue={client?.color ?? "#078DEE"} />
          </Field>
          <Field label={t.common.notes} className="sm:col-span-2">
            <Textarea name="notes" rows={3} defaultValue={client?.notes ?? ""} />
          </Field>
          <DialogFooter className="sm:col-span-2">
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
