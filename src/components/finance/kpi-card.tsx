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
    <Card className={cn("gap-3 p-5", className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
            <Icon className="size-5 rtl:-scale-x-100" />
          </span>
        )}
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      </div>
      <div className="text-2xl font-extrabold tracking-tight">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
