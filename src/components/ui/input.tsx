"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "@/components/ui/field";

/** Text input. Inside a `<Field>` it picks up the label's id, hint/error and invalid state. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const wired = useFieldControl(props);
  // A hidden input is never what the label names.
  const fieldProps = type === "hidden" ? props : wired;
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-base transition-[color,box-shadow,border-color] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "hover:border-foreground/40 focus-visible:border-foreground focus-visible:ring-0",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...fieldProps}
    />
  );
}

export { Input };
