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
 * The cell is a size container: the value scales with the cell (24px on a
 * wide cell, down to 18px in a 4-up row at 1024px) so exact amounts
 * ("Toman 402,200,000") stay on one line inside their cell.
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
    <FrameCell className={cn("@container flex min-w-0 flex-col gap-2.5", className)}>
      <div className="flex items-center gap-2.5">
        {icon && <StatIcon icon={icon} tone={tone} className="rtl:-scale-x-100" />}
        <p className="min-w-0 text-sm font-semibold text-muted-foreground">{label}</p>
      </div>
      <div className="min-w-0 text-[length:clamp(1.125rem,9cqi,1.5rem)] leading-[1.3] font-bold tabular-nums [:lang(en)_&]:tracking-[-0.02em] [:lang(fa)_&]:font-extrabold">
        {value}
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </FrameCell>
  );
}
