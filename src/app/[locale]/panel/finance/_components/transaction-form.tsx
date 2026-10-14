"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDownLeftIcon,
  ArrowLeftRightIcon,
  ArrowUpRightIcon,
  Loader2Icon,
  UserPenIcon,
  UsersIcon,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ColorDot } from "@/components/shared/color-dot";
import { DatePicker, toDateValue } from "@/components/shared/date-picker";
import { SelectField } from "@/components/shared/select-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { localePath } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatMoney, isCurrency, parseMoneyInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import { convertMinor, minorToMajor } from "@/server/modules/finance/calc";
import { createTransactionAction, updateTransactionAction } from "@/server/modules/finance/actions";
import type { TxFormOptions, TxFormValues } from "../_lib/options";

type Kind = "income" | "expense" | "transfer";

const kindStyles: Record<Kind, string> = {
  income:
    "data-[state=on]:bg-success/14 data-[state=on]:text-[#118d57] dark:data-[state=on]:text-[#77ed8b]",
  expense:
    "data-[state=on]:bg-destructive/12 data-[state=on]:text-[#b71d18] dark:data-[state=on]:text-[#ffac82]",
  transfer:
    "data-[state=on]:bg-info/14 data-[state=on]:text-[#006c9c] dark:data-[state=on]:text-[#61f3f3]",
};
const kindIcons = {
  income: ArrowDownLeftIcon,
  expense: ArrowUpRightIcon,
  transfer: ArrowLeftRightIcon,
};

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Parsed preview of a typed amount ("۱۲٬۰۰۰٬۰۰۰" → "۱۲٬۰۰۰٬۰۰۰ تومان"). */
export function AmountPreview({ value, currency }: { value: string; currency: string }) {
  const locale = useLocale();
  const minor = value && isCurrency(currency) ? parseMoneyInput(value, currency) : null;
  return (
    <p className="min-h-4 text-xs text-muted-foreground tabular-nums" aria-live="polite">
      {minor != null && minor > 0 ? formatMoney(minor, currency, locale) : null}
    </p>
  );
}

export function TransactionFormDialog({
  trigger,
  options,
  transaction,
  defaults,
}: {
  trigger: ReactNode;
  options: TxFormOptions;
  transaction?: TxFormValues;
  defaults?: { kind?: Kind; accountId?: string; projectId?: string; clientId?: string };
}) {
  const t = useT();
  const f = t.finance;
  const locale = useLocale();
  const isEdit = !!transaction;
  const linked = !!transaction?.invoiceNumber;
  const accounts = options.accounts;

  const initial = () => ({
    kind: transaction?.kind ?? defaults?.kind ?? ("income" as Kind),
    accountId: transaction?.accountId ?? defaults?.accountId ?? accounts[0]?.id ?? "",
    toAccountId:
      transaction?.transferAccountId ??
      accounts.find((a) => a.id !== (defaults?.accountId ?? accounts[0]?.id))?.id ??
      "",
    amount: transaction?.amount ?? "",
    received: transaction?.transferAmount ?? "",
    categoryId: transaction?.categoryId ?? "",
    projectId: transaction?.projectId ?? defaults?.projectId ?? "",
    clientId: transaction?.clientId ?? defaults?.clientId ?? "",
    freeParty: !!transaction?.counterparty,
    pending: transaction?.status === "pending",
    date: transaction?.date ?? toDateValue(new Date()),
    time: transaction?.time ?? nowTime(),
  });
  const [open, setOpen] = useState(false);
  const [s, setS] = useState(initial);
  const set = <K extends keyof ReturnType<typeof initial>>(
    k: K,
    v: ReturnType<typeof initial>[K],
  ) => setS((p) => ({ ...p, [k]: v }));

  const form = useActionForm(isEdit ? updateTransactionAction : createTransactionAction, {
    successMessage: t.common.saved,
    onSuccess: () => setOpen(false),
  });

  const account = accounts.find((a) => a.id === s.accountId);
  const toAccount = accounts.find((a) => a.id === s.toAccountId);
  const currency = account?.currency ?? options.base;
  const crossCurrency = s.kind === "transfer" && !!toAccount && toAccount.currency !== currency;
  const categories = options.categories.filter((c) => c.kind === s.kind);

  const suggestion = useMemo(() => {
    if (!crossCurrency || !toAccount || !isCurrency(currency)) return null;
    const minor = parseMoneyInput(s.amount, currency);
    if (minor == null || minor <= 0) return null;
    const v = convertMinor(minor, currency, toAccount.currency, options.rates, options.base);
    return v == null ? null : { minor: v, major: String(minorToMajor(v, toAccount.currency)) };
  }, [crossCurrency, toAccount, currency, s.amount, options.rates, options.base]);

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: (
      <span className="flex items-center gap-2">
        <ColorDot color={a.color} />
        {a.name}
        <Badge variant="neutral" className="font-mono">
          {a.currency}
        </Badge>
      </span>
    ),
  }));

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    form.reset();
    if (o) setS(initial());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? f.editTransaction : f.newTransaction}</DialogTitle>
          {linked && (
            <DialogDescription>
              {format(f.linkedInvoice, { number: transaction!.invoiceNumber! })}
            </DialogDescription>
          )}
        </DialogHeader>

        {accounts.length === 0 && !isEdit ? (
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm text-muted-foreground">{f.noAccountsYet}</p>
            <Button asChild>
              <Link href={localePath(locale, "/panel/finance/accounts")}>
                {f.createAccountFirst}
              </Link>
            </Button>
          </div>
        ) : (
          <form action={form.submit} className="grid gap-4">
            {isEdit && <input type="hidden" name="id" value={transaction.id} />}
            <input type="hidden" name="kind" value={s.kind} />
            <input type="hidden" name="status" value={s.pending ? "pending" : "cleared"} />

            <ToggleGroup
              type="single"
              value={s.kind}
              onValueChange={(v) => {
                if (!v || linked) return;
                setS((p) => ({
                  ...p,
                  kind: v as Kind,
                  categoryId: options.categories.some((c) => c.id === p.categoryId && c.kind === v)
                    ? p.categoryId
                    : "",
                }));
              }}
              className="grid w-full grid-cols-3"
              aria-label={t.common.status}
            >
              {(["income", "expense", "transfer"] as const).map((k) => {
                const Icon = kindIcons[k];
                return (
                  <ToggleGroupItem
                    key={k}
                    value={k}
                    disabled={linked && k !== s.kind}
                    className={cn("h-9", kindStyles[k])}
                  >
                    <Icon className="rtl:-scale-x-100" />
                    {f[`kind_${k}`]}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={s.kind === "transfer" ? f.fromAccount : f.account}
                error={form.errors.accountId?.[0]}
                required
              >
                <SelectField
                  name="accountId"
                  value={s.accountId}
                  onChange={(v) =>
                    setS((p) => ({
                      ...p,
                      accountId: v,
                      // Keep the transfer destination different from the source.
                      toAccountId:
                        p.toAccountId === v
                          ? (accounts.find((a) => a.id !== v)?.id ?? "")
                          : p.toAccountId,
                    }))
                  }
                  options={accountOptions}
                  placeholder={f.chooseAccount}
                />
              </Field>
              <Field
                label={format(f.amountIn, { currency })}
                htmlFor="tx-amount"
                error={form.errors.amount?.[0]}
                required
              >
                <Input
                  id="tx-amount"
                  name="amount"
                  inputMode="decimal"
                  dir="ltr"
                  autoComplete="off"
                  value={s.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  className="font-semibold tabular-nums"
                  autoFocus
                />
                <AmountPreview value={s.amount} currency={currency} />
              </Field>

              {s.kind === "transfer" && (
                <>
                  <Field label={f.toAccount} error={form.errors.transferAccountId?.[0]} required>
                    <SelectField
                      name="transferAccountId"
                      value={s.toAccountId}
                      onChange={(v) => set("toAccountId", v)}
                      options={accountOptions.filter((o) => o.value !== s.accountId)}
                      placeholder={f.chooseAccount}
                    />
                  </Field>
                  {crossCurrency && toAccount ? (
                    <Field
                      label={`${f.amountReceived} (${toAccount.currency})`}
                      htmlFor="tx-received"
                      error={form.errors.transferAmount?.[0]}
                      required
                    >
                      <Input
                        id="tx-received"
                        name="transferAmount"
                        inputMode="decimal"
                        dir="ltr"
                        autoComplete="off"
                        value={s.received}
                        onChange={(e) => set("received", e.target.value)}
                        placeholder={suggestion?.major}
                        className="font-semibold tabular-nums"
                      />
                      {suggestion && s.received !== suggestion.major ? (
                        <button
                          type="button"
                          onClick={() => set("received", suggestion.major)}
                          className="w-fit cursor-pointer text-start text-xs font-semibold text-primary hover:underline"
                        >
                          {format(f.fxSuggest, {
                            amount: formatMoney(suggestion.minor, toAccount.currency, locale),
                          })}{" "}
                          · {f.useSuggestion}
                        </button>
                      ) : (
                        <AmountPreview value={s.received} currency={toAccount.currency} />
                      )}
                    </Field>
                  ) : (
                    <input type="hidden" name="transferAmount" value="" />
                  )}
                </>
              )}

              <Field label={t.common.date} error={form.errors.date?.[0]}>
                <DatePicker
                  name="date"
                  value={s.date}
                  onChange={(v) => set("date", v ?? "")}
                  clearable={false}
                />
              </Field>
              <Field label={f.time} htmlFor="tx-time">
                <Input
                  id="tx-time"
                  name="time"
                  type="time"
                  dir="ltr"
                  value={s.time}
                  onChange={(e) => set("time", e.target.value)}
                />
              </Field>

              {s.kind !== "transfer" && (
                <>
                  <Field label={f.category} error={form.errors.categoryId?.[0]}>
                    <SelectField
                      name="categoryId"
                      value={s.categoryId}
                      onChange={(v) => set("categoryId", v)}
                      noneLabel={f.noCategory}
                      placeholder={f.noCategory}
                      options={categories.map((c) => ({
                        value: c.id,
                        label: (
                          <span className="flex items-center gap-2">
                            <ColorDot color={c.color} /> {c.name}
                          </span>
                        ),
                      }))}
                    />
                  </Field>
                  <Field label={t.common.project}>
                    <SelectField
                      name="projectId"
                      value={s.projectId}
                      onChange={(v) => {
                        const p = options.projects.find((x) => x.id === v);
                        setS((prev) => ({
                          ...prev,
                          projectId: v,
                          clientId:
                            !prev.clientId && !prev.freeParty && p?.clientId
                              ? p.clientId
                              : prev.clientId,
                        }));
                      }}
                      noneLabel={t.common.noProject}
                      placeholder={t.common.noProject}
                      options={options.projects.map((p) => ({
                        value: p.id,
                        label: (
                          <span className="flex items-center gap-2">
                            <ColorDot color={p.color} /> {p.name}
                          </span>
                        ),
                      }))}
                    />
                  </Field>
                  <Field
                    label={
                      <span className="flex w-full items-center justify-between gap-2">
                        {f.counterparty}
                        <button
                          type="button"
                          onClick={() => set("freeParty", !s.freeParty)}
                          className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          {s.freeParty ? (
                            <UsersIcon className="size-3.5" />
                          ) : (
                            <UserPenIcon className="size-3.5" />
                          )}
                          {s.freeParty ? t.common.clients : f.freeCounterparty}
                        </button>
                      </span>
                    }
                    hint={f.counterpartyHint}
                    className="sm:col-span-2"
                  >
                    {s.freeParty ? (
                      <>
                        <input type="hidden" name="clientId" value="" />
                        <Input
                          name="counterparty"
                          defaultValue={transaction?.counterparty ?? ""}
                          placeholder={f.counterpartyPlaceholder}
                          aria-label={f.counterpartyName}
                        />
                      </>
                    ) : (
                      <>
                        <input type="hidden" name="counterparty" value="" />
                        <SelectField
                          name="clientId"
                          value={s.clientId}
                          onChange={(v) => set("clientId", v)}
                          noneLabel={f.noCounterparty}
                          placeholder={f.noCounterparty}
                          options={options.clients.map((c) => ({
                            value: c.id,
                            label: (
                              <span className="flex items-center gap-2">
                                <ColorDot color={c.color} /> {c.name}
                              </span>
                            ),
                          }))}
                        />
                      </>
                    )}
                  </Field>
                </>
              )}

              <Field label={t.common.description} className="sm:col-span-2">
                <Textarea
                  name="description"
                  rows={2}
                  defaultValue={transaction?.description ?? ""}
                  className="min-h-16"
                />
              </Field>
              <Field label={t.common.tags} hint={f.tagsHint}>
                <Input name="tags" defaultValue={transaction?.tags ?? ""} />
              </Field>
              <label className="flex cursor-pointer items-center gap-3 self-center pt-2 text-sm sm:pt-6">
                <Switch checked={s.pending} onCheckedChange={(c) => set("pending", c)} />
                {f.pendingSwitch}
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={form.pending}>
                {form.pending && <Loader2Icon className="animate-spin" />}
                {t.common.save}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
