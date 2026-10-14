"use client";

import { useState, type ReactNode } from "react";
import { Loader2Icon, PenLineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { SignaturePad } from "@/components/contracts/signature-pad";
import { useActionForm } from "@/components/shared/use-action-form";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { countersignContractAction } from "@/server/modules/contracts/actions";

/** Owner/admin signature as the first party on the current version. */
export function CountersignDialog({
  id,
  version,
  defaultName,
  trigger,
}: {
  id: string;
  version: number;
  defaultName: string;
  trigger: ReactNode;
}) {
  const t = useT();
  const c = t.contracts;
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [typed, setTyped] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const form = useActionForm(countersignContractAction, {
    successMessage: c.countersigned,
    onSuccess: () => setOpen(false),
  });
  const hasSignature = !!image || typed.trim().length > 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        form.reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{c.countersign}</DialogTitle>
          <DialogDescription>
            {format(c.countersignHint, { n: formatNumber(version, locale) })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label={c.fullName} htmlFor="cs-name" error={form.errors.name?.[0]} required>
            <Input id="cs-name" value={name} onChange={(e) => setName(e.target.value)} dir="auto" />
          </Field>
          <SignaturePad
            label={c.signaturePadLabel}
            hint={c.drawHint}
            clearLabel={c.clearSignature}
            placeholder={c.signHere}
            onChange={setImage}
            height={160}
          />
          <Field label={c.typeSignature} htmlFor="cs-typed">
            <Input
              id="cs-typed"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={c.typedPlaceholder}
              dir="auto"
              className="font-serif text-lg italic"
            />
          </Field>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-muted/60 p-3 text-sm">
            <Checkbox
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              className="mt-0.5"
            />
            <span>{format(c.countersignConsent, { n: formatNumber(version, locale) })}</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button
            disabled={form.pending || !consent || !hasSignature || name.trim().length < 2}
            onClick={() =>
              form.run({
                id,
                name: name.trim(),
                typedName: typed.trim() || undefined,
                signatureImage: image ?? undefined,
                consent: true,
              })
            }
          >
            {form.pending ? <Loader2Icon className="animate-spin" /> : <PenLineIcon />}
            {c.countersign}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
