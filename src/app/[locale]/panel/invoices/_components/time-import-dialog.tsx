"use client";

import { useState, useTransition } from "react";
import { ClockIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { DatePicker } from "@/components/shared/date-picker";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { unbilledTimeAction } from "@/server/modules/finance/actions";
import type { TimeGroup } from "@/server/modules/finance/invoice-calc";

export interface TimeLine {
  description: string;
  hours: number;
  rateMinor: number;
  currency: string;
  timeEntryIds: string[];
}

/** Pick unbilled, billable time of the invoice's project and add it as lines. */
export function TimeImportDialog({
  projectId,
  currency,
  takenIds,
  onAdd,
}: {
  projectId: string | null;
  currency: string;
  takenIds: Set<string>;
  onAdd: (lines: TimeLine[]) => void;
}) {
  const t = useT();
  const f = t.finance;
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [groups, setGroups] = useState<TimeGroup[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const load = () =>
    start(async () => {
      if (!projectId) return;
      const res = await unbilledTimeAction({
        projectId,
        from: from ?? undefined,
        to: to ?? undefined,
      });
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      const list = res.data.groups
        .map((g) => ({ ...g, entryIds: g.entryIds.filter((id) => !takenIds.has(id)) }))
        .filter((g) => g.entryIds.length > 0);
      setGroups(list);
      setPicked(new Set(list.filter((g) => g.currency === currency).map((g) => g.key)));
    });

  const chosen = (groups ?? []).filter((g) => picked.has(g.key) && g.currency === currency);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && projectId) load();
        if (!o) setGroups(null);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="soft" size="sm">
          <ClockIcon /> {f.addFromTime}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{f.fromTimeTitle}</DialogTitle>
          <DialogDescription>{f.fromTimeHint}</DialogDescription>
        </DialogHeader>
        {!projectId ? (
          <p className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
            {f.selectProjectFirst}
          </p>
        ) : (
          <>
            <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Field label={f.fromDate}>
                <DatePicker value={from} onChange={setFrom} placeholder={f.fromDate} />
              </Field>
              <Field label={f.toDate}>
                <DatePicker value={to} onChange={setTo} placeholder={f.toDate} />
              </Field>
              <Button type="button" variant="outline" onClick={load} disabled={pending}>
                {pending && <Loader2Icon className="animate-spin" />}
                {f.loadTime}
              </Button>
            </div>
            <div className="max-h-80 scrollbar-thin overflow-y-auto rounded-xl border">
              {groups == null ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  {pending ? t.common.loading : "—"}
                </p>
              ) : groups.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">{f.noUnbilled}</p>
              ) : (
                <ul className="divide-y divide-dashed">
                  {groups.map((g) => {
                    const other = g.currency !== currency;
                    return (
                      <li key={g.key}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-accent/50",
                            other && "cursor-not-allowed opacity-60",
                          )}
                        >
                          <Checkbox
                            checked={picked.has(g.key) && !other}
                            disabled={other}
                            onCheckedChange={(c) =>
                              setPicked((prev) => {
                                const next = new Set(prev);
                                if (c) next.add(g.key);
                                else next.delete(g.key);
                                return next;
                              })
                            }
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{g.label}</span>
                            <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {format(f.hoursN, {
                                n: formatNumber(g.hours, locale, { maximumFractionDigits: 2 }),
                              })}
                              {" × "}
                              {formatMoney(g.rateMinor, g.currency, locale)}
                              <Badge variant="neutral">
                                {format(f.billedEntries, {
                                  n: formatNumber(g.entryIds.length, locale),
                                })}
                              </Badge>
                              {other && (
                                <Badge variant="warning">
                                  {format(f.otherCurrency, { currency: g.currency })}
                                </Badge>
                              )}
                            </span>
                          </span>
                          <span className="text-sm font-bold whitespace-nowrap tabular-nums">
                            {formatMoney(g.amountMinor, g.currency, locale)}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={!chosen.length}
            onClick={() => {
              onAdd(
                chosen.map((g) => ({
                  description: g.label,
                  hours: g.hours,
                  rateMinor: g.rateMinor,
                  currency: g.currency,
                  timeEntryIds: g.entryIds,
                })),
              );
              setOpen(false);
            }}
          >
            {format(f.addSelected, { n: formatNumber(chosen.length, locale) })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
