"use client";

import { useState } from "react";
import { Loader2Icon, UserPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/shared/copy-button";
import { SelectField } from "@/components/shared/select-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { useT } from "@/i18n/client";
import { inviteClientUserAction } from "@/server/modules/clients/actions";

export function InviteClientUser({ clientId }: { clientId: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const form = useActionForm(inviteClientUserAction, { onSuccess: (d) => setResult(d) });
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setResult(null);
        form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="soft" size="sm">
          <UserPlusIcon /> {t.clients.invite}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.clients.invite}</DialogTitle>
          <DialogDescription>{t.clients.portalUsersHint}</DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-3">
            <p className="text-sm">{t.clients.inviteDone}</p>
            <div className="rounded-xl bg-muted p-4 font-mono text-sm" dir="ltr">
              <div>{result.email}</div>
              <div className="mt-1 font-bold">{result.tempPassword}</div>
            </div>
            <CopyButton value={`${result.email}\n${result.tempPassword}`} />
          </div>
        ) : (
          <form onSubmit={form.submit} className="grid gap-4">
            <input type="hidden" name="clientId" value={clientId} />
            <Field label={t.common.name} error={form.errors.name?.[0]}>
              <Input name="name" required />
            </Field>
            <Field label={t.common.email} error={form.errors.email?.[0]}>
              <Input name="email" type="email" dir="ltr" required />
            </Field>
            <Field label={t.common.language}>
              <SelectField
                name="locale"
                defaultValue="fa"
                options={[
                  { value: "fa", label: "فارسی" },
                  { value: "en", label: "English" },
                ]}
              />
            </Field>
            <DialogFooter>
              <Button type="submit" disabled={form.pending}>
                {form.pending && <Loader2Icon className="animate-spin" />}
                {t.clients.invite}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
