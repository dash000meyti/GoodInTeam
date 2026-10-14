"use client";

import { useMemo } from "react";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { estimateStrength, type StrengthResult } from "./strength";

const BAR = ["bg-destructive", "bg-destructive", "bg-warning", "bg-success", "bg-success"] as const;
const TEXT = [
  "text-destructive",
  "text-destructive",
  "text-[#b76e00] dark:text-warning",
  "text-[#118d57] dark:text-success",
  "text-[#118d57] dark:text-success",
] as const;

/** 4-segment strength bar with label, entropy estimate and the main warning. */
export function StrengthMeter({
  password,
  strength,
  showWarning = true,
  className,
}: {
  password: string;
  strength?: StrengthResult;
  showWarning?: boolean;
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const s = useMemo(() => strength ?? estimateStrength(password), [strength, password]);
  if (!password) return null;
  const warning = s.warnings[0];
  return (
    <div className={cn("space-y-1.5", className)} aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              s.score >= i || (i === 1 && s.score === 0) ? BAR[s.score] : "bg-grey-500/20",
            )}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 text-xs">
        <span className={cn("font-bold", TEXT[s.score])}>{t.vault[`strength_${s.score}`]}</span>
        <span className="text-muted-foreground">
          {format(t.vault.strengthBits, { n: formatNumber(s.bits, locale) })}
        </span>
      </div>
      {showWarning && warning && (
        <p className="text-xs text-muted-foreground">{t.vault[`warn_${warning}`]}</p>
      )}
    </div>
  );
}
