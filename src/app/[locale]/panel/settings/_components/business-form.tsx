"use client";

import { useState } from "react";
import { CoinsIcon, PercentIcon, ReceiptTextIcon } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/shared/select-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { useI18n, useT } from "@/i18n/client";
import { format } from "@/i18n/format-message";
import { formatNumber } from "@/lib/format";
import { currencies, currencyCodes, isCurrency } from "@/lib/money";
import { updateBusinessAction } from "@/server/modules/settings/actions";
import { BilingualField } from "./bilingual-field";
import { SaveBar } from "./save-bar";
import { SettingsCard } from "./section";
import { TimezoneSelect } from "./timezone-select";

export interface BusinessValues {
  baseCurrency: string;
  timezone: string;
  invoicePrefix: string;
  defaultTaxPercent: number;
  defaultHourlyRate: number;
  paymentInstructions: { fa: string; en: string };
}

/** Settings → Business: currency, timezone and invoicing defaults. */
export function BusinessForm({ values }: { values: BusinessValues }) {
  const t = useT();
  const s = t.settings;
  const { locale } = useI18n();
  const [dirty, setDirty] = useState(false);
  const [currency, setCurrency] = useState(values.baseCurrency);
  const [prefix, setPrefix] = useState(values.invoicePrefix);
  const form = useActionForm(updateBusinessAction, {
    successMessage: t.common.saved,
    onSuccess: () => setDirty(false),
  });
  const e = form.errors;
  const symbol = isCurrency(currency) ? currencies[currency].symbol[locale] : currency;

  return (
    <form onSubmit={form.submit} onChange={() => setDirty(true)} className="space-y-6" noValidate>
      <SettingsCard icon={CoinsIcon} title={s.moneyAndTime}>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={s.baseCurrency} hint={s.baseCurrencyHint} error={e.baseCurrency?.[0]}>
            <SelectField
              name="baseCurrency"
              defaultValue={values.baseCurrency}
              onChange={(v) => {
                setCurrency(v);
                setDirty(true);
              }}
              options={currencyCodes.map((c) => ({
                value: c,
                label: (
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold" dir="ltr">
                      {c}
                    </span>
                    <span className="text-muted-foreground">{currencies[c].symbol[locale]}</span>
                  </span>
                ),
              }))}
            />
          </Field>
          <Field label={s.timezone} hint={s.timezoneHint} error={e.timezone?.[0]}>
            <TimezoneSelect name="timezone" defaultValue={values.timezone} />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard icon={ReceiptTextIcon} title={s.invoicing} contentClassName="grid gap-5">
        <div className="grid gap-5 md:grid-cols-3">
          <Field
            label={s.invoicePrefix}
            hint={format(s.invoicePrefixExample, { example: `${prefix}0042` })}
            error={e.invoicePrefix?.[0]}
            htmlFor="biz-prefix"
          >
            <Input
              id="biz-prefix"
              name="invoicePrefix"
              dir="ltr"
              maxLength={20}
              defaultValue={values.invoicePrefix}
              onChange={(ev) => setPrefix(ev.target.value.trim())}
              className="font-mono"
            />
          </Field>
          <Field
            label={s.defaultTax}
            hint={s.defaultTaxHint}
            error={e.defaultTaxPercent?.[0]}
            htmlFor="biz-tax"
          >
            <div className="relative" dir="ltr">
              <Input
                id="biz-tax"
                name="defaultTaxPercent"
                inputMode="decimal"
                defaultValue={String(values.defaultTaxPercent)}
                className="pe-9 tabular-nums"
              />
              <PercentIcon className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted-foreground" />
            </div>
          </Field>
          <Field
            label={s.defaultHourlyRate}
            hint={format(s.defaultHourlyRateHint, { currency: symbol })}
            error={e.defaultHourlyRate?.[0]}
            htmlFor="biz-rate"
          >
            <div className="relative" dir="ltr">
              <Input
                id="biz-rate"
                name="defaultHourlyRate"
                inputMode="decimal"
                defaultValue={formatNumber(values.defaultHourlyRate, "en", { useGrouping: true })}
                className="pe-16 tabular-nums"
              />
              <span className="pointer-events-none absolute inset-y-0 end-3 my-auto h-fit font-mono text-xs font-bold text-muted-foreground">
                {currency}
              </span>
            </div>
          </Field>
        </div>
        <BilingualField
          name="paymentInstructions"
          label={s.paymentInstructions}
          hint={s.paymentInstructionsHint}
          values={values.paymentInstructions}
          errors={e}
          multiline
          rows={3}
          maxLength={2000}
        />
      </SettingsCard>

      <SaveBar pending={form.pending} dirty={dirty} />
    </form>
  );
}
