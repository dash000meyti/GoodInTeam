"use client";

import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { useFieldControl } from "@/components/ui/field";

function ToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  // Inside a <Field>: labelled by the field's label (aria-labelledby), not by id.
  const fieldProps = useFieldControl(props, "group");
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-xl border border-border p-1",
        className,
      )}
      {...fieldProps}
    />
  );
}

function ToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex h-8 min-w-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-muted-foreground transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-primary/12 data-[state=on]:text-primary-dark dark:data-[state=on]:text-primary-light [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
