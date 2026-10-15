import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tones = {
  primary: "bg-primary/12 text-primary",
  info: "bg-info/12 text-info",
  warning: "bg-warning/16 text-[#b76e00] dark:text-warning",
  violet: "bg-violet/12 text-violet",
  destructive: "bg-destructive/12 text-destructive",
  success: "bg-success/12 text-success",
} as const;

/**
 * KPI tile for money: label row with icon on top, then a full-width value so
 * long amounts ("۱۲۴ میلیون تومان") and multi-currency stacks never collide
 * with the icon (unlike the side-by-side StatCard).
 */
export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0 gap-3 p-4 sm:p-5", className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-10",
              tones[tone],
            )}
          >
            <Icon className="size-5 rtl:-scale-x-100" />
          </span>
        )}
        <p className="min-w-0 text-sm font-semibold text-muted-foreground">{label}</p>
      </div>
      <div className="min-w-0 text-xl font-extrabold tracking-tight sm:text-2xl">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
