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
import { useLocale, useT } from "@/i18n/client";
import { currencies, currencyCodes } from "@/lib/money";
import { accountKinds } from "@/server/db/enums";
import { createAccountAction, updateAccountAction } from "@/server/modules/finance/actions";
import { ColorPicker } from "../../projects/_components/color-picker";
import { accountKindIcons } from "./account-icons";
import { AmountPreview } from "./transaction-form";

export interface AccountFormValues {
  id: string;
  name: string;
  kind: (typeof accountKinds)[number];
  currency: string;
  openingBalance: string;
  color: string | null;
  notes: string | null;
  hasTransactions: boolean;
}

export function AccountFormDialog({
  trigger,
  account,
  defaultCurrency,
}: {
  trigger: ReactNode;
  account?: AccountFormValues;
  defaultCurrency: string;
}) {
  const t = useT();
  const f = t.finance;
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState(account?.currency ?? defaultCurrency);
  const [opening, setOpening] = useState(account?.openingBalance ?? "");
  const form = useActionForm(account ? updateAccountAction : createAccountAction, {
    successMessage: t.common.saved,
    onSuccess: () => setOpen(false),
  });
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
          <DialogTitle>{account ? f.editAccount : f.newAccount}</DialogTitle>
        </DialogHeader>
        <form action={form.submit} className="grid gap-4 sm:grid-cols-2">
          {account && <input type="hidden" name="id" value={account.id} />}
          <Field
            label={f.accountName}
            htmlFor="acc-name"
            error={form.errors.name?.[0]}
            required
            className="sm:col-span-2"
          >
            <Input
              id="acc-name"
              name="name"
              defaultValue={account?.name}
              placeholder={f.accountNamePlaceholder}
              required
              autoFocus
            />
          </Field>
          <Field label={f.accountKind}>
            <SelectField
              name="kind"
              defaultValue={account?.kind ?? "bank"}
              options={accountKinds.map((k) => {
                const Icon = accountKindIcons[k];
                return {
                  value: k,
                  label: (
                    <span className="flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" /> {f[`accountKind_${k}`]}
                    </span>
                  ),
                };
              })}
            />
          </Field>
          <Field
            label={t.common.currency}
            error={form.errors.currency?.[0]}
            hint={account?.hasTransactions ? f.currencyLockedHint : undefined}
          >
            {account?.hasTransactions ? (
              <>
                <input type="hidden" name="currency" value={currency} />
                <Input value={currency} disabled dir="ltr" />
              </>
            ) : (
              <SelectField
                name="currency"
                value={currency}
                onChange={setCurrency}
                options={currencyCodes.map((c) => ({
                  value: c,
                  label: (
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold">{c}</span>
                      <span className="text-muted-foreground">{currencies[c].symbol[locale]}</span>
                    </span>
                  ),
                }))}
              />
            )}
          </Field>
          <Field
            label={f.openingBalance}
            htmlFor="acc-opening"
            hint={f.openingBalanceHint}
            error={form.errors.openingBalance?.[0]}
            className="sm:col-span-2"
          >
            <Input
              id="acc-opening"
              name="openingBalance"
              inputMode="decimal"
              dir="ltr"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              className="tabular-nums"
            />
            <AmountPreview value={opening.replace(/^[-−]/, "")} currency={currency} />
          </Field>
          <Field label={t.projects.color} className="sm:col-span-2">
            <ColorPicker name="color" defaultValue={account?.color ?? undefined} />
          </Field>
          <Field label={t.common.notes} className="sm:col-span-2">
            <Textarea name="notes" rows={2} defaultValue={account?.notes ?? ""} />
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
