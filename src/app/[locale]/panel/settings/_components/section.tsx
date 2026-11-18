import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatIcon } from "@/components/panel/stat-card";
import { FrameBox, FrameCell, FrameGrid, HEADING_CLASS } from "@/components/shell/frame";
import { cn } from "@/lib/utils";

/**
 * Heading box of a settings sub-page (the area itself has the PageHeader): a
 * framed box whose header cell holds the h2, description and actions;
 * `children` are more rows of the same box (FrameGrids, e.g. a preview).
 */
export function SettingsHeader({
  title,
  description,
  actions,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <FrameBox as="div" density="compact">
      <FrameGrid cols={1}>
        <FrameCell
          header
          className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <h2 className={HEADING_CLASS.box}>{title}</h2>
            {description && (
              <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </FrameCell>
      </FrameGrid>
      {children}
    </FrameBox>
  );
}

/**
 * A framed box with an icon-led header row — the building block of every
 * settings page: square icon tile, title, description, an inline-end action;
 * the body; an optional footer row under a hairline.
 */
export function SettingsCard({
  title,
  description,
  icon,
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
    <Card className={className}>
      <CardHeader className="flex flex-wrap items-center gap-3">
        {icon && <StatIcon icon={icon} />}
        <div className="min-w-0 flex-1 space-y-0.5">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action && <div className="flex w-full shrink-0 sm:w-auto sm:justify-end">{action}</div>}
      </CardHeader>
      {children && <CardContent className={contentClassName}>{children}</CardContent>}
      {footer && (
        <div
          className={cn(
            "flex flex-wrap items-center justify-end gap-3 border-t border-frame-line px-(--cell-pad) pt-(--cell-pad)",
          )}
        >
          {footer}
        </div>
      )}
    </Card>
  );
}
