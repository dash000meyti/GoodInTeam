import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { FrameCell } from "@/components/shell/frame";
import { StatIcon, type StatTone } from "@/components/panel/stat-card";
import { cn } from "@/lib/utils";

/**
 * KPI cell for money: label row with icon on top, then a full-width value so
 * long amounts ("۱۲۴ میلیون تومان") and multi-currency stacks never collide
 * with the icon (unlike the side-by-side StatCard). A frame cell like
 * StatCard: it lives in a `StatRow` / `StatGrid` (components/panel/stat-card).
 */
export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <FrameCell className={cn("flex min-w-0 flex-col gap-2.5", className)}>
      <div className="flex items-center gap-2.5">
        {icon && <StatIcon icon={icon} tone={tone} className="rtl:-scale-x-100" />}
        <p className="min-w-0 text-sm font-semibold text-muted-foreground">{label}</p>
      </div>
      <div className="min-w-0 text-xl font-bold tabular-nums sm:text-2xl [:lang(en)_&]:tracking-[-0.02em] [:lang(fa)_&]:font-extrabold">
        {value}
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </FrameCell>
  );
}
