"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DatePicker } from "@/components/shared/date-picker";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { RangePreset } from "@/server/modules/time/ranges";

const PRESETS: RangePreset[] = [
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "last_30",
  "custom",
];

function build(base: string, params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Range presets + custom from/to. Navigates via search params. */
export function ReportFilters({
  base,
  params,
  preset,
  fromKey,
  toKey,
}: {
  base: string;
  /** Other params to keep (user, project). */
  params: Record<string, string | undefined>;
  preset: RangePreset;
  fromKey: string;
  toKey: string;
}) {
  const t = useT();
  const tt = t.time;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<RangePreset>(preset);
  const [from, setFrom] = useState<string | null>(fromKey);
  const [to, setTo] = useState<string | null>(toKey);

  const go = (next: Record<string, string | undefined>) =>
    start(() => router.push(build(base, { ...params, ...next }), { scroll: false }));

  return (
    <div className={cn("flex flex-col gap-3 transition-opacity", pending && "opacity-70")}>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <ToggleGroup
          type="single"
          value={mode}
          aria-label={tt.range}
          className="w-max"
          onValueChange={(v) => {
            if (!v) return;
            setMode(v as RangePreset);
            if (v !== "custom") go({ range: v === "this_week" ? undefined : v });
          }}
        >
          {PRESETS.map((p) => (
            <ToggleGroupItem key={p} value={p} className="px-3">
              {tt[`range_${p}`]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {mode === "custom" && (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (from && to) go({ range: "custom", from, to });
          }}
        >
          <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
            {tt.from}
            <DatePicker value={from} onChange={setFrom} clearable={false} className="w-48" />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
            {tt.to}
            <DatePicker value={to} onChange={setTo} clearable={false} className="w-48" />
          </label>
          <Button type="submit" disabled={!from || !to || pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
            {tt.apply}
          </Button>
        </form>
      )}
    </div>
  );
}
