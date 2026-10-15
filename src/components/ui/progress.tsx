"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  indicatorClassName,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-primary/16", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          // Width-based fill so it grows from the inline-start edge in both LTR and RTL.
          "h-full rounded-full bg-primary transition-[width] duration-500",
          indicatorClassName,
        )}
        style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
