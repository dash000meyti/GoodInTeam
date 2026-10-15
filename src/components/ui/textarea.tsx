"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "@/components/ui/field";

/** Multi-line input. Inside a `<Field>` it picks up the label's id, hint/error and invalid state. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  const fieldProps = useFieldControl(props);
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base transition-[color,box-shadow,border-color] outline-none placeholder:text-muted-foreground hover:border-foreground/40 focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
        className,
      )}
      {...fieldProps}
    />
  );
}

export { Textarea };
