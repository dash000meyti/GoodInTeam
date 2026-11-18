"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, PlusIcon, SendIcon, TimerIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ColorDot } from "@/components/shared/color-dot";
import { DatePicker, parseDateValue, toDateValue } from "@/components/shared/date-picker";
import { SelectField } from "@/components/shared/select-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { localePath } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber, toLatinDigits } from "@/lib/format";
import { currencyCodes, formatMoney, isCurrency, parseMoneyInput } from "@/lib/money";
import { minorToMajor } from "@/server/modules/finance/calc";
import { createInvoiceAction, updateInvoiceAction } from "@/server/modules/finance/actions";
import { invoiceTotals } from "@/server/modules/finance/invoice-calc";
import type { InvoiceFormOptions } from "@/server/modules/finance/invoices";
import { BoxCell } from "../../finance/_components/frame-bits";
import { TimeImportDialog, type TimeLine } from "./time-import-dialog";

export interface EditorLine {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
  timeEntryIds: string[];
}

export interface EditorInvoice {
  id: string;
  number: string;
  status: string;
  clientId: string | null;
  projectId: string | null;
  currency: string;
  issueDate: string;
  dueDate: string | null;
  items: Omit<EditorLine, "key">[];
  discount: string;
  taxPercent: number;
  notes: string;
  terms: string;
}

let seq = 0;
const key = () => `l${++seq}`;
const blank = (): EditorLine => ({
  key: key(),
  description: "",
  quantity: "1",
  unitPrice: "",
  timeEntryIds: [],
});

function addDaysTo(day: string, n: number) {
  const d = parseDateValue(day) ?? new Date();
  d.setDate(d.getDate() + n);
  return toDateValue(d);
}

const num = (v: string) => {
  const n = Number.parseFloat(
    toLatinDigits(v)
      .replace(/[,\s٬]/g, "")
      .replace("٫", "."),
  );
  return Number.isFinite(n) ? n : 0;
};

/** Line grid (md+): description, quantity, unit price, amount, remove. */
const LINE_COLS = "md:grid-cols-[minmax(0,1fr)_90px_150px_140px_36px]";

/**
 * Invoice editor: parties, dates, currency, line items (manual or from tracked
 * time), discount & tax with live totals. Saves as draft or saves + sends.
 *
 * Framed: the form is one box (the details row, the line items as an
 * edge-to-edge list under a head row, notes | terms); the summary is a sticky
 * box beside it from xl (totals, the amount due row, the save buttons).
 */
export function InvoiceEditor({
  options,
  invoice,
  defaults,
}: {
  options: InvoiceFormOptions;
  invoice?: EditorInvoice;
  defaults?: { clientId?: string; projectId?: string };
}) {
  const t = useT();
  const f = t.finance;
  const locale = useLocale();
  const router = useRouter();
  const isEdit = !!invoice;
  const isDraft = !invoice || invoice.status === "draft";

  const defaultProject = options.projects.find((p) => p.id === defaults?.projectId);
  const defaultClient = options.clients.find(
    (c) => c.id === (defaults?.clientId ?? defaultProject?.clientId),
  );
  const [clientId, setClientId] = useState(invoice?.clientId ?? defaultClient?.id ?? "");
  const [projectId, setProjectId] = useState(invoice?.projectId ?? defaultProject?.id ?? "");
  const [currency, setCurrency] = useState(
    invoice?.currency ??
      defaultProject?.currency ??
      defaultClient?.defaultCurrency ??
      options.baseCurrency,
  );
  const [number, setNumber] = useState(invoice?.number ?? "");
  const [issueDate, setIssueDate] = useState<string>(invoice?.issueDate ?? toDateValue(new Date()));
  const [dueDate, setDueDate] = useState<string | null>(
    invoice ? invoice.dueDate : addDaysTo(toDateValue(new Date()), 14),
  );
  const [lines, setLines] = useState<EditorLine[]>(() =>
    invoice?.items.length ? invoice.items.map((i) => ({ ...i, key: key() })) : [blank()],
  );
  const [discount, setDiscount] = useState(invoice?.discount ?? "");
  const [tax, setTax] = useState(String(invoice?.taxPercent ?? options.defaultTaxPercent));
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [terms, setTerms] = useState(invoice?.terms ?? "");
  const [sendAfter, setSendAfter] = useState(false);

  const form = useActionForm(isEdit ? updateInvoiceAction : createInvoiceAction, {
    onSuccess: async (data) => {
      if (data.url) {
        try {
          await navigator.clipboard.writeText(data.url);
          toast.success(f.linkReady);
        } catch {
          toast.success(t.common.saved);
        }
      } else toast.success(t.common.saved);
      router.push(localePath(locale, `/panel/invoices/${data.id}`));
    },
  });

  const cur = isCurrency(currency) ? currency : "IRT";
  const parsed = lines.map((l) => ({
    quantity: num(l.quantity),
    unitPriceMinor: parseMoneyInput(l.unitPrice, cur) ?? 0,
  }));
  const totals = invoiceTotals({
    items: parsed,
    discountMinor: discount ? (parseMoneyInput(discount, cur) ?? 0) : 0,
    taxBps: Math.round(num(tax) * 100),
  });
  const money = (minor: number) => formatMoney(minor, cur, locale);
  const takenIds = useMemo(() => new Set(lines.flatMap((l) => l.timeEntryIds)), [lines]);
  const projects = options.projects.filter(
    (p) => !clientId || !p.clientId || p.clientId === clientId,
  );
  const hasItems = lines.some((l) => l.description.trim() || l.unitPrice.trim());

  const setLine = (k: string, patch: Partial<EditorLine>) =>
    setLines((prev) => prev.map((l) => (l.key === k ? { ...l, ...patch } : l)));

  const addTime = (time: TimeLine[]) =>
    setLines((prev) => [
      ...prev.filter((l) => l.description.trim() || l.unitPrice.trim()),
      ...time.map((g) => ({
        key: key(),
        description: g.description,
        quantity: String(g.hours),
        unitPrice: String(minorToMajor(g.rateMinor, g.currency)),
        timeEntryIds: g.timeEntryIds,
      })),
    ]);

  const submit = (send: boolean) => {
    const items = lines
      .filter((l) => l.description.trim() || l.unitPrice.trim())
      .map((l) => ({
        description: l.description.trim(),
        quantity: num(l.quantity),
        unitPrice: l.unitPrice.trim() || "0",
        timeEntryIds: l.timeEntryIds,
      }));
    if (!items.length || items.some((i) => !i.description)) {
      toast.error(f.itemsRequired);
      return;
    }
    setSendAfter(send);
    const payload = {
      clientId: clientId || null,
      projectId: projectId || null,
      number: number.trim() || undefined,
      issueDate,
      dueDate: dueDate || null,
      currency: cur,
      items,
      discount: discount.trim() || "0",
      taxPercent: num(tax),
      notes: notes.trim() || null,
      terms: terms.trim() || null,
      send,
    };
    void form.run(isEdit ? { id: invoice.id, ...payload } : payload);
  };

  const err = (k: string) => form.errors[k]?.[0];

  return (
    <div className="grid items-start gap-6 lg:gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <FrameBox as="div" density="compact" className="min-w-0">
        <FrameGrid cols={1}>
          <FrameCell className="grid items-start gap-5 sm:grid-cols-2">
            <Field label={f.client} error={err("clientId")}>
              <SelectField
                value={clientId}
                onChange={(v) => {
                  setClientId(v);
                  const p = options.projects.find((x) => x.id === projectId);
                  if (p?.clientId && v && p.clientId !== v) setProjectId("");
                  const c = options.clients.find((x) => x.id === v);
                  if (c && !hasItems && isCurrency(c.defaultCurrency))
                    setCurrency(c.defaultCurrency);
                }}
                noneLabel={f.noClient}
                placeholder={f.noClient}
                options={options.clients.map((c) => ({
                  value: c.id,
                  label: (
                    <span className="flex items-center gap-2">
                      <ColorDot color={c.color} /> {c.name}
                    </span>
                  ),
                }))}
              />
            </Field>
            <Field label={f.project} error={err("projectId")}>
              <SelectField
                value={projectId}
                onChange={(v) => {
                  setProjectId(v);
                  const p = options.projects.find((x) => x.id === v);
                  if (p?.clientId && !clientId) setClientId(p.clientId);
                  if (p && !hasItems && isCurrency(p.currency)) setCurrency(p.currency);
                }}
                noneLabel={f.noProject}
                placeholder={f.noProject}
                options={projects.map((p) => ({
                  value: p.id,
                  label: (
                    <span className="flex items-center gap-2">
                      <ColorDot color={p.color} /> {p.name}
                    </span>
                  ),
                }))}
              />
            </Field>
            <Field label={f.issueDate} error={err("issueDate")}>
              <DatePicker
                value={issueDate}
                onChange={(v) => v && setIssueDate(v)}
                clearable={false}
              />
            </Field>
            <Field label={f.dueDate} error={err("dueDate")}>
              <DatePicker value={dueDate} onChange={setDueDate} placeholder={f.noDueDate} />
              <div className="flex flex-wrap gap-1.5">
                {[7, 14, 30].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDueDate(addDaysTo(issueDate, n))}
                    className="h-6 cursor-pointer rounded-[6px] border border-frame-line bg-background px-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                  >
                    {format(f.dueInN, { n: formatNumber(n, locale) })}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={f.currency} error={err("currency")}>
              <SelectField
                value={currency}
                onChange={setCurrency}
                options={currencyCodes.map((c) => ({
                  value: c,
                  label: <span className="font-mono font-semibold">{c}</span>,
                }))}
              />
            </Field>
            <Field
              label={f.number}
              htmlFor="inv-number"
              error={err("number")}
              hint={isEdit ? undefined : format(f.numberHint, { number: options.nextNumber })}
            >
              <Input
                id="inv-number"
                dir="ltr"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder={isEdit ? invoice.number : options.nextNumber}
                className="font-mono"
              />
            </Field>
          </FrameCell>
        </FrameGrid>

        <FrameGrid cols={1}>
          <BoxCell title={f.items} titleId="inv-items" flush>
            {err("items") && (
              <p
                className="border-b border-frame-line px-(--cell-pad) py-2 text-xs font-medium text-destructive"
                role="alert"
              >
                {err("items")}
              </p>
            )}
            <div
              className={`hidden gap-3 border-b border-frame-line px-(--cell-pad) py-2.5 text-[13px] font-semibold text-muted-foreground md:grid ${LINE_COLS}`}
            >
              <span>{f.itemDescription}</span>
              <span>{f.quantity}</span>
              <span>{f.unitPrice}</span>
              <span className="text-end">{f.lineAmount}</span>
              <span />
            </div>
            <ul className="divide-y divide-frame-line">
              {lines.map((l, i) => {
                const amount = Math.round(parsed[i]!.quantity * parsed[i]!.unitPriceMinor);
                const priceErr = err(`items.${i}.unitPrice`);
                return (
                  <li
                    key={l.key}
                    className={`grid grid-cols-[1fr_1fr] gap-3 px-(--cell-pad) py-3 md:items-start ${LINE_COLS}`}
                  >
                    <div className="col-span-2 space-y-1 md:col-span-1">
                      <Textarea
                        value={l.description}
                        onChange={(e) => setLine(l.key, { description: e.target.value })}
                        placeholder={f.itemPlaceholder}
                        aria-label={f.itemDescription}
                        rows={1}
                        className="min-h-10 resize-y py-2"
                      />
                      {l.timeEntryIds.length > 0 && (
                        <Badge variant="info">
                          <TimerIcon />
                          {format(f.billedEntries, {
                            n: formatNumber(l.timeEntryIds.length, locale),
                          })}
                        </Badge>
                      )}
                    </div>
                    <Input
                      value={l.quantity}
                      onChange={(e) => setLine(l.key, { quantity: e.target.value })}
                      inputMode="decimal"
                      dir="ltr"
                      aria-label={f.quantity}
                      placeholder={f.quantity}
                      className="tabular-nums"
                    />
                    <div className="space-y-1">
                      <Input
                        value={l.unitPrice}
                        onChange={(e) => setLine(l.key, { unitPrice: e.target.value })}
                        inputMode="decimal"
                        dir="ltr"
                        aria-label={f.unitPrice}
                        placeholder={f.unitPrice}
                        aria-invalid={!!priceErr || undefined}
                        className="tabular-nums"
                      />
                      {priceErr && <p className="text-xs text-destructive">{priceErr}</p>}
                    </div>
                    <p className="flex h-10 items-center text-sm font-bold tabular-nums md:justify-end">
                      {money(amount)}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="justify-self-end"
                      onClick={() =>
                        setLines((prev) =>
                          prev.length > 1 ? prev.filter((x) => x.key !== l.key) : [blank()],
                        )
                      }
                      aria-label={f.removeLine}
                    >
                      <Trash2Icon className="text-destructive" />
                    </Button>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-2 border-t border-frame-line px-(--cell-pad) py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLines((p) => [...p, blank()])}
              >
                <PlusIcon /> {f.addLine}
              </Button>
              <TimeImportDialog
                projectId={projectId || null}
                currency={cur}
                takenIds={takenIds}
                onAdd={addTime}
              />
            </div>
          </BoxCell>
        </FrameGrid>

        <FrameGrid cols={2}>
          <FrameCell>
            <Field label={f.notesLabel}>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
            </Field>
          </FrameCell>
          <FrameCell>
            <Field label={f.termsLabel}>
              <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={4} />
            </Field>
          </FrameCell>
        </FrameGrid>
      </FrameBox>

      <FrameBox
        as="aside"
        density="compact"
        ariaLabel={f.summary}
        className="xl:sticky xl:below-chrome"
      >
        <FrameGrid cols={1}>
          <BoxCell title={f.summary} titleId="inv-summary" bodyClassName="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{f.subtotal}</span>
              <span className="font-semibold tabular-nums">{money(totals.subtotal)}</span>
            </div>
            <Field label={f.discount} htmlFor="inv-discount" error={err("discount")}>
              <Input
                id="inv-discount"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                inputMode="decimal"
                dir="ltr"
                placeholder="0"
                className="tabular-nums"
              />
            </Field>
            <Field label={f.taxPercent} htmlFor="inv-tax" error={err("taxPercent")}>
              <Input
                id="inv-tax"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                inputMode="decimal"
                dir="ltr"
                className="tabular-nums"
              />
            </Field>
            {totals.tax > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {format(f.taxLine, {
                    pct: formatNumber(totals.taxBps / 10_000, locale, {
                      style: "percent",
                      maximumFractionDigits: 2,
                    }),
                  })}
                </span>
                <span className="font-semibold tabular-nums">{money(totals.tax)}</span>
              </div>
            )}
          </BoxCell>
        </FrameGrid>
        {/* The amount due as its own row, in the document's soft yellow. */}
        <FrameGrid cols={1}>
          <FrameCell className="flex items-center justify-between gap-3 bg-primary/12 py-3 text-primary-dark dark:text-primary-light">
            <span className="font-bold">{f.totalDue}</span>
            <span className="text-lg font-black tabular-nums">{money(totals.total)}</span>
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell className="grid gap-2">
            {isDraft ? (
              <>
                <Button type="button" onClick={() => submit(true)} disabled={form.pending}>
                  {form.pending && sendAfter ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <SendIcon className="rtl:-scale-x-100" />
                  )}
                  {f.saveAndSend}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => submit(false)}
                  disabled={form.pending}
                >
                  {form.pending && !sendAfter && <Loader2Icon className="animate-spin" />}
                  {f.saveDraft}
                </Button>
              </>
            ) : (
              <Button type="button" onClick={() => submit(false)} disabled={form.pending}>
                {form.pending && <Loader2Icon className="animate-spin" />}
                {f.saveChanges}
              </Button>
            )}
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
