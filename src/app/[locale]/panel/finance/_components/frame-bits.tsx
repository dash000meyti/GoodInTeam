import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CardAction, CardDescription, CardHeader } from "@/components/ui/card";
import { FrameCell, HEADING_CLASS, type FrameSpan } from "@/components/shell/frame";
import { cn } from "@/lib/utils";

/*
 * Finance's local pieces of the framed panel (docs/design-system.md "Panel
 * density"). No hooks and no server-only imports: server pages and client
 * islands (the analytics, the filters, the invoice editor) share them.
 */

/** The site's filter chip at panel density (as on the invoices list): 32px, 6px corners, hairline; the active one filled with ink. */
export function chipClass(on: boolean, className?: string) {
  return cn(
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] border px-3 text-sm font-semibold whitespace-nowrap transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
    on
      ? "border-foreground bg-foreground text-background"
      : "border-frame-line bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
    className,
  );
}

/** A ToggleGroup laid out as a row of chips (`TOGGLE_CHIP` on its items). */
export const TOGGLE_CHIPS = "gap-1.5 rounded-none border-0 p-0";
export const TOGGLE_CHIP =
  "h-8 rounded-[6px] border border-frame-line bg-background px-3 hover:border-foreground/40 hover:bg-background hover:text-foreground data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background dark:data-[state=on]:text-background";

/** Scrollable chip row (phones): the chips keep their size and the row scrolls inside its cell. */
export const CHIP_ROW =
  "-mx-1 flex max-w-[calc(100%+0.5rem)] scrollbar-thin gap-1.5 overflow-x-auto px-1 py-0.5";

/**
 * An edge-to-edge row list at the top of a `flush` BoxCell: hairlines between
 * rows and under the last one; `-mb-px` lays that last line on the cell's own
 * bottom hairline when the list is the tallest cell of its row (one line,
 * never two), like a nested FrameGrid.
 */
export const FLUSH_LIST = "-mb-px divide-y divide-frame-line border-b border-frame-line";

/** Dotted desktop texture: the leftover height of a taller row (the site's filler cells). */
export const DOTS_FILL =
  "bg-[radial-gradient(var(--dots)_1px,transparent_1.5px)] [background-size:12px_12px]";

/**
 * A cell with a header row (h2, description, inline-end action) over its body:
 * the Desktop's widget cell. `flush` drops the body padding (edge-to-edge
 * lists and nested grids) and textures the rest of a taller row with dots.
 */
export function BoxCell({
  title,
  titleId,
  description,
  action,
  icon,
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
  /** Small square tile before the title. */
  icon?: ReactNode;
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
      className={cn("flex flex-col", className)}
    >
      <CardHeader>
        <h2 id={titleId} className={cn(HEADING_CLASS.box, icon && "flex items-center gap-2.5")}>
          {icon}
          {title}
        </h2>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction className="flex items-center gap-1">{action}</CardAction>}
      </CardHeader>
      {flush ? (
        <div className={cn("flex flex-1 flex-col", bodyClassName)}>
          {children}
          <div aria-hidden className={cn("min-h-0 flex-1", DOTS_FILL)} />
        </div>
      ) : (
        <div className={cn("flex-1 p-(--cell-pad)", bodyClassName)}>{children}</div>
      )}
    </FrameCell>
  );
}

/** Square hairline icon tile (the StatIcon look) in an inline colour, e.g. an account's. */
export function GlyphTile({
  icon: Icon,
  color,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  /** Any CSS colour; tints the tile and colours the icon. */
  color?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const style: CSSProperties | undefined = color
    ? { backgroundColor: `color-mix(in srgb, ${color} 13%, transparent)`, color }
    : undefined;
  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        "flex shrink-0 items-center justify-center border border-frame-line",
        !color && "bg-card text-muted-foreground",
        size === "sm" ? "size-7" : size === "lg" ? "size-11" : "size-9",
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4"} />
    </span>
  );
}
