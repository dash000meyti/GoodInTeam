import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A framed box at panel density (the site's `.frame-box`, docs/design-system.md
 * "Frame"): square, one even `--frame-line` hairline, the ringed marker on
 * every corner, no shadow. Spacing follows the box's `--cell-pad` (16/20px).
 * A `CardHeader` that comes first sits flush at the top as a header row with a
 * hairline under it. Inside another box or an overlay the markers drop out.
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      data-density="compact"
      className={cn(
        "frame-box flex flex-col gap-(--cell-pad) py-(--cell-pad) text-card-foreground has-[>[data-slot=card-header]:first-child]:pt-0",
        className,
      )}
      {...props}
    />
  );
}

/** The box's header row: title (+ description) and an inline-end action, hairline below. */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid min-h-13 auto-rows-min grid-rows-[auto_auto] content-center items-start gap-x-3 gap-y-0.5 border-b border-frame-line px-(--cell-pad) py-3 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className,
      )}
      {...props}
    />
  );
}

/** Box title in the frame heading style (bold, tight tracking on en). */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-[17px] leading-[1.3] font-bold [:lang(en)_&]:tracking-[-0.015em] [:lang(fa)_&]:text-[16px] [:lang(fa)_&]:leading-[1.6] [:lang(fa)_&]:font-extrabold",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-center justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-(--cell-pad)", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center px-(--cell-pad) [.border-t]:border-frame-line [.border-t]:pt-(--cell-pad)",
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
