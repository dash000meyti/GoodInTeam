"use client";

import { useState, type ReactNode } from "react";
import { Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";
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
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { DatePicker, toDateValue } from "@/components/shared/date-picker";
import { SelectField } from "@/components/shared/select-field";
import { useAction, useActionForm } from "@/components/shared/use-action-form";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { currencies, currencyCodes, isCurrency } from "@/lib/money";
import { formatNumber } from "@/lib/format";
import { parseRateInput } from "@/server/modules/finance/calc";
import {
  deleteFxRateAction,
  setFxRateAction,
  updateFxRateAction,
} from "@/server/modules/finance/actions";

export interface RateFormValues {
  id: string;
  currency: string;
  rate: string;
  date: string;
}

export function RateFormDialog({
  trigger,
  base,
  rate,
  defaultCurrency,
}: {
  trigger: ReactNode;
  base: string;
  rate?: RateFormValues;
  defaultCurrency?: string;
}) {
  const t = useT();
  const f = t.finance;
  const locale = useLocale();
  // Most-used foreign currencies first (USD, USDT, EUR, AED…), Rial last.
  const preferred = ["USD", "USDT", "EUR", "AED", "GBP", "TRY", "IRT", "IRR"];
  const choices = currencyCodes
    .filter((c) => c !== base)
    .sort((a, b) => preferred.indexOf(a) - preferred.indexOf(b));
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState(
    rate?.currency ?? defaultCurrency ?? choices[0] ?? "USD",
  );
  const [value, setValue] = useState(rate?.rate ?? "");
  const [date, setDate] = useState<string | null>(rate?.date ?? null);
  const form = useActionForm(rate ? updateFxRateAction : setFxRateAction, {
    successMessage: t.common.saved,
    onSuccess: () => setOpen(false),
  });
  const parsed = parseRateInput(value);
  const baseSymbol = isCurrency(base) ? currencies[base].symbol[locale] : base;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        form.reset();
        if (o && !rate) setDate(toDateValue(new Date()));
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rate ? f.editRate : f.newRate}</DialogTitle>
          <DialogDescription>
            {format(f.rateHint, { currency, base: baseSymbol })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.submit} className="grid gap-4">
          {rate && <input type="hidden" name="id" value={rate.id} />}
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <Field label={t.common.currency} error={form.errors.currency?.[0]}>
              <SelectField
                name="currency"
                value={currency}
                onChange={setCurrency}
                options={choices.map((c) => ({
                  value: c,
                  label: <span className="font-mono font-semibold">{c}</span>,
                }))}
              />
            </Field>
            <Field
              label={`${format(f.rateFor, { currency })} … ${baseSymbol}`}
              htmlFor="fx-rate"
              error={form.errors.rate?.[0]}
              required
            >
              <Input
                id="fx-rate"
                name="rate"
                inputMode="decimal"
                dir="ltr"
                autoComplete="off"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="font-semibold tabular-nums"
                autoFocus
              />
              <p className="min-h-4 text-xs text-muted-foreground tabular-nums">
                {parsed
                  ? `${format(f.rateFor, { currency })} ${formatNumber(parsed, locale, { maximumFractionDigits: 6 })} ${baseSymbol}`
                  : null}
              </p>
            </Field>
          </div>
          <Field label={f.rateDate} error={form.errors.date?.[0]}>
            <DatePicker name="date" value={date} onChange={setDate} clearable={false} />
          </Field>
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

export function RateActions({ rate, base }: { rate: RateFormValues; base: string }) {
  const t = useT();
  const { exec, pending } = useAction();
  return (
    <div className="flex items-center justify-end gap-0.5">
      <RateFormDialog
        rate={rate}
        base={base}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={t.common.edit}>
            <PencilIcon />
          </Button>
        }
      />
      <ConfirmDialog
        description={t.finance.deleteRateHint}
        onConfirm={() => exec(deleteFxRateAction({ id: rate.id }), t.common.saved)}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={t.common.delete} disabled={pending}>
            <Trash2Icon className="text-destructive" />
          </Button>
        }
      />
    </div>
  );
}
