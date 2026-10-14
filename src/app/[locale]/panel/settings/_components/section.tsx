import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Heading of a settings sub-page (the area itself has the PageHeader). */
export function SettingsHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Card with an icon-led header — the building block of every settings page. */
export function SettingsCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  footer,
  className,
  contentClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("gap-5", className)}>
      <CardHeader className="flex flex-wrap items-start gap-3">
        {Icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action && <div className="flex w-full shrink-0 sm:w-auto sm:justify-end">{action}</div>}
      </CardHeader>
      {children && <CardContent className={contentClassName}>{children}</CardContent>}
      {footer && (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-dashed px-6 pt-5">
          {footer}
        </div>
      )}
    </Card>
  );
}
