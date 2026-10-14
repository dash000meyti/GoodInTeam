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

/** KPI tile (Minimals "widget summary"). */
export function StatCard({
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
    <Card className={cn("flex-row items-center justify-between gap-4 p-6", className)}>
      <div className="min-w-0 space-y-1.5">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <p className="text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {Icon && (
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl",
            tones[tone],
          )}
        >
          <Icon className="size-6" />
        </div>
      )}
    </Card>
  );
}
