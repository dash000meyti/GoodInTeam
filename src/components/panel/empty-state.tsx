import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Empty state (the site's EmptyCell at panel density): an icon on a dotted
 * hairline tile, title, description, CTA. On its own it is a framed box;
 * inside a box or a cell (a Card, a FrameCell) it drops its frame and only
 * centres its content (panel-shell.css).
 */
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
      data-slot="empty-state"
      data-density="compact"
      className={cn(
        "frame-box flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && (
        <span
          aria-hidden
          className="mb-1 flex size-14 items-center justify-center border border-frame-line bg-card bg-[radial-gradient(var(--dots)_1px,transparent_1.5px)] [background-size:12px_12px] text-muted-foreground"
        >
          <Icon className="size-7" strokeWidth={1.5} />
        </span>
      )}
      <h3 className="text-lg font-bold [:lang(en)_&]:tracking-[-0.015em] [:lang(fa)_&]:font-extrabold">
        {title}
      </h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
