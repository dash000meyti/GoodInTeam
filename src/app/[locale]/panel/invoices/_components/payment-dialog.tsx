"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Loader2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { ColorDot } from "@/components/shared/color-dot";
import { DatePicker, toDateValue } from "@/components/shared/date-picker";
import { SelectField } from "@/components/shared/select-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { localePath } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatMoney } from "@/lib/money";
import { minorToMajor } from "@/server/modules/finance/calc";
import { recordPaymentAction } from "@/server/modules/finance/actions";
import { AmountPreview } from "../../finance/_components/transaction-form";

export interface PaymentAccount {
  id: string;
  name: string;
  currency: string;
  color: string | null;
}

/** Record a payment: creates an income transaction linked to the invoice. */
export function PaymentDialog({
  trigger,
  invoiceId,
  currency,
  dueMinor,
  accounts,
}: {
  trigger: ReactNode;
  invoiceId: string;
  currency: string;
  dueMinor: number;
  accounts: PaymentAccount[];
}) {
  const t = useT();
  const f = t.finance;
  const locale = useLocale();
  const matching = accounts.filter((a) => a.currency === currency);
  const full = String(minorToMajor(dueMinor, currency));
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(full);
  const [accountId, setAccountId] = useState(matching[0]?.id ?? "");
  const [date, setDate] = useState<string | null>(null);
  const form = useActionForm(recordPaymentAction, {
    successMessage: f.paymentRecorded,
    onSuccess: () => setOpen(false),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        form.reset();
        if (o) {
          setAmount(full);
          setDate(toDateValue(new Date()));
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{f.recordPayment}</DialogTitle>
          <DialogDescription>
            {format(f.amountDueHint, { amount: formatMoney(dueMinor, currency, locale) })}
          </DialogDescription>
        </DialogHeader>
        {matching.length === 0 ? (
          <div className="space-y-4 py-2 text-center">
            <p className="text-sm text-muted-foreground">
              {format(f.noMatchingAccount, { currency })}
            </p>
            <Button asChild variant="soft">
              <Link href={localePath(locale, "/panel/finance/accounts")}>
                {f.createAccountFirst}
              </Link>
            </Button>
          </div>
        ) : (
          <form action={form.submit} className="grid gap-4">
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <Field
              label={`${f.paymentAmount} (${currency})`}
              htmlFor="pay-amount"
              error={form.errors.amount?.[0]}
              required
            >
              <div className="flex gap-2">
                <Input
                  id="pay-amount"
                  name="amount"
                  inputMode="decimal"
                  dir="ltr"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-semibold tabular-nums"
                  autoFocus
                />
                <Button type="button" variant="outline" onClick={() => setAmount(full)}>
                  {f.payFull}
                </Button>
              </div>
              <AmountPreview value={amount} currency={currency} />
            </Field>
            <Field label={f.paymentAccount} error={form.errors.accountId?.[0]} required>
              <SelectField
                name="accountId"
                value={accountId}
                onChange={setAccountId}
                options={matching.map((a) => ({
                  value: a.id,
                  label: (
                    <span className="flex items-center gap-2">
                      <ColorDot color={a.color} /> {a.name}
                      <Badge variant="neutral" className="font-mono">
                        {a.currency}
                      </Badge>
                    </span>
                  ),
                }))}
              />
            </Field>
            <Field label={f.paymentDate} error={form.errors.date?.[0]}>
              <DatePicker name="date" value={date} onChange={setDate} clearable={false} />
            </Field>
            <Field label={t.common.description}>
              <Input name="description" />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={form.pending}>
                {form.pending && <Loader2Icon className="animate-spin" />}
                {f.recordPayment}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
