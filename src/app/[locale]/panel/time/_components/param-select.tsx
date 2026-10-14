"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { SelectField, type SelectOption } from "@/components/shared/select-field";
import { cn } from "@/lib/utils";

/**
 * Select that navigates by changing one search param (keeps the others).
 * `base` is the localized pathname; `params` the current search params.
 */
export function ParamSelect({
  base,
  params,
  param,
  value,
  options,
  noneLabel,
  placeholder,
  className,
  ariaLabel,
}: {
  base: string;
  params: Record<string, string | undefined>;
  param: string;
  value: string;
  options: SelectOption[];
  noneLabel?: string;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className={cn("transition-opacity", pending && "opacity-60")} aria-label={ariaLabel}>
      <SelectField
        value={value}
        options={options}
        noneLabel={noneLabel}
        placeholder={placeholder}
        className={className}
        onChange={(next) => {
          const sp = new URLSearchParams();
          for (const [k, v] of Object.entries({ ...params, [param]: next || undefined }))
            if (v) sp.set(k, v);
          const qs = sp.toString();
          start(() => router.push(qs ? `${base}?${qs}` : base, { scroll: false }));
        }}
      />
    </div>
  );
}
