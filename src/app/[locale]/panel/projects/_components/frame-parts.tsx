import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CardAction, CardDescription, CardHeader } from "@/components/ui/card";
import {
  FrameBox,
  FrameCell,
  FrameGrid,
  HEADING_CLASS,
  type FrameSpan,
} from "@/components/shell/frame";
import { cn } from "@/lib/utils";

/*
 * Local frame pieces shared by the projects, clients, inbox and contracts
 * pages (the Desktop's WidgetCell and the invoice aside's AsideSection,
 * generalised). Candidates for components/panel once the rollout settles.
 */

/**
 * A section cell of a framed box: a header row (h2, description, inline-end
 * action) with a hairline under it, then the body padded by the box's
 * `--cell-pad` or, with `flush`, edge to edge (lists with their own rows).
 */
export function SectionCell({
  title,
  titleId,
  description,
  action,
  icon: Icon,
  flush,
  span,
  className,
  bodyClassName,
  children,
}: {
  title: ReactNode;
  titleId: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
  flush?: boolean;
  span?: FrameSpan;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
}) {
  return (
    <FrameCell
      as="section"
      pad="none"
      span={span}
      aria-labelledby={titleId}
      className={cn("flex min-w-0 flex-col", className)}
    >
      <CardHeader>
        <h2 id={titleId} className={cn(HEADING_CLASS.box, Icon && "flex items-center gap-2")}>
          {Icon && <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />}
          {title}
        </h2>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      {children != null &&
        (flush ? (
          <div className={cn("flex flex-1 flex-col", bodyClassName)}>{children}</div>
        ) : (
          <div className={cn("flex-1 p-(--cell-pad)", bodyClassName)}>{children}</div>
        ))}
    </FrameCell>
  );
}

/** One label / value row of a details list (dashed hairline between rows). */
export function KeyValueRow({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-dashed border-frame-line py-2.5 text-sm first:pt-0 last:border-0 last:pb-0",
        className,
      )}
    >
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-end font-semibold break-words">{children}</dd>
    </div>
  );
}

const noteTones = {
  warning: { cell: "bg-warning/10", icon: "text-warning-ink" },
  destructive: { cell: "bg-destructive/8", icon: "text-destructive" },
  info: { cell: "bg-info/10", icon: "text-info-ink" },
  success: { cell: "bg-success/10", icon: "text-success-ink" },
} as const;

/** A notice as its own framed box: one tinted cell, the icon in the tone's ink. */
export function FrameNote({
  icon: Icon,
  tone,
  className,
  children,
}: {
  icon: LucideIcon;
  tone: keyof typeof noteTones;
  className?: string;
  children: ReactNode;
}) {
  return (
    <FrameBox as="div" density="compact" className={className}>
      <FrameGrid cols={1}>
        <FrameCell className={cn("py-3.5", noteTones[tone].cell)}>
          <div role="note" className="flex gap-3 text-sm">
            <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", noteTones[tone].icon)} />
            <div className="min-w-0 break-words">{children}</div>
          </div>
        </FrameCell>
      </FrameGrid>
    </FrameBox>
  );
}
