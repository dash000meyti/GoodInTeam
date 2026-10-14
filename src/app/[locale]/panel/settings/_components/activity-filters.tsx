"use client";

import { useState } from "react";
import Form from "next/form";
import Link from "next/link";
import { ListFilterIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { DatePicker } from "@/components/shared/date-picker";
import { SelectField } from "@/components/shared/select-field";
import { useI18n, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { actionLabel, entityTypeLabel } from "./activity-labels";

export interface ActivityFilterValues {
  actor?: string;
  type?: string;
  action?: string;
  from?: string;
  to?: string;
}

/**
 * Admin filter bar for the activity log. A plain GET form (next/form) → the
 * filters live in the URL, so results are shareable and back/forward works.
 */
export function ActivityFilters({
  action: formAction,
  values,
  options,
}: {
  action: string;
  values: ActivityFilterValues;
  options: { actors: { id: string; name: string }[]; types: string[]; actions: string[] };
}) {
  const t = useT();
  const { locale } = useI18n();
  const s = t.settings;
  const active = Object.values(values).some(Boolean);
  // Re-mount on URL change so uncontrolled inputs reflect the current filters.
  const key = JSON.stringify(values);
  // Phones: filters collapse behind a toggle (open when some are active).
  const [open, setOpen] = useState(active);
  const count = Object.values(values).filter(Boolean).length;
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mb-3 sm:hidden"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <ListFilterIcon /> {t.common.filter}
        {count > 0 && <Badge>{formatNumber(count, locale)}</Badge>}
      </Button>
      <Form
        key={key}
        action={formAction}
        className={cn(
          "gap-4 rounded-2xl border border-dashed p-4 sm:grid sm:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]",
          open ? "grid" : "hidden",
        )}
      >
        <Field label={s.filterActor}>
          <SelectField
            name="actor"
            defaultValue={values.actor ?? ""}
            noneLabel={s.filterAny}
            placeholder={s.filterAny}
            options={options.actors.map((a) => ({ value: a.id, label: a.name }))}
          />
        </Field>
        <Field label={s.filterType}>
          <SelectField
            name="type"
            defaultValue={values.type ?? ""}
            noneLabel={s.filterAny}
            placeholder={s.filterAny}
            options={options.types.map((v) => ({ value: v, label: entityTypeLabel(v, s) }))}
          />
        </Field>
        <Field label={s.filterAction}>
          <SelectField
            name="action"
            defaultValue={values.action ?? ""}
            noneLabel={s.filterAny}
            placeholder={s.filterAny}
            options={options.actions.map((v) => ({ value: v, label: actionLabel(v, s) }))}
          />
        </Field>
        <Field label={s.filterFrom}>
          <DatePicker name="from" defaultValue={values.from} />
        </Field>
        <Field label={s.filterTo}>
          <DatePicker name="to" defaultValue={values.to} />
        </Field>
        <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-1">
          <Button type="submit" className="h-10 flex-1 xl:flex-none">
            <ListFilterIcon /> {s.applyFilters}
          </Button>
          {active && (
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-10"
              aria-label={s.clearFilters}
            >
              <Link href={formAction}>
                <XIcon />
              </Link>
            </Button>
          )}
        </div>
      </Form>
    </>
  );
}
