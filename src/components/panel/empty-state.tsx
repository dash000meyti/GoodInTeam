import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Friendly empty state (dashed box, icon, title, description, CTA). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mb-1 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-8" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
