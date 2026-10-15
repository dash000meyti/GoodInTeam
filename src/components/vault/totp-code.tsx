"use client";

import { useEffect, useMemo, useState } from "react";
import { CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { formatTotpCode, parseTotp, totp } from "@/lib/totp";
import { cn } from "@/lib/utils";
import { useVaultCopy } from "./clipboard";

const R = 15;
const C = 2 * Math.PI * R;

/** Live TOTP code with a countdown ring. Renders nothing for an invalid secret. */
export function TotpCode({
  secret,
  size = "default",
  className,
}: {
  secret: string;
  size?: "default" | "sm";
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const copy = useVaultCopy();
  const params = useMemo(() => parseTotp(secret), [secret]);
  const [state, setState] = useState<{ code: string; remaining: number; period: number } | null>(
    null,
  );

  useEffect(() => {
    if (!params) return;
    let alive = true;
    const tick = async () => {
      const next = await totp(params);
      if (alive) setState(next);
    };
    void tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [params]);

  if (!params || !state) return null;
  const urgent = state.remaining <= 5;
  const progress = state.remaining / state.period;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative size-9 shrink-0" aria-hidden>
        <svg viewBox="0 0 36 36" className="size-9 -rotate-90">
          <circle cx="18" cy="18" r={R} className="fill-none stroke-grey-500/20" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r={R}
            className={cn(
              "fill-none transition-[stroke-dashoffset] duration-1000 ease-linear",
              urgent ? "stroke-destructive" : "stroke-primary",
            )}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums",
            urgent && "text-destructive",
          )}
        >
          {formatNumber(state.remaining, locale)}
        </span>
      </div>
      <span
        dir="ltr"
        className={cn(
          "font-mono font-bold tracking-widest tabular-nums",
          size === "sm" ? "text-base" : "text-2xl",
          urgent && "text-destructive",
        )}
        aria-label={`${t.vault.oneTimeCode}: ${state.code}`}
      >
        {formatTotpCode(state.code)}
      </span>
      <span className="sr-only" aria-live="off">
        {format(t.vault.secondsLeft, { n: state.remaining })}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="ms-auto"
        aria-label={format(t.vault.copyValue, { field: t.vault.oneTimeCode })}
        onClick={() => copy.secret(state.code)}
      >
        <CopyIcon />
      </Button>
    </div>
  );
}
