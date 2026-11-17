import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Minimals-style "Label": soft tinted chips by default. */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md px-1.5 py-0.5 text-xs font-bold whitespace-nowrap transition-colors [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary/16 text-primary-dark dark:text-primary-light",
        solid: "bg-primary text-primary-foreground",
        neutral: "bg-grey-500/16 text-grey-700 dark:text-grey-300",
        success: "bg-success/16 text-success-ink",
        warning: "bg-warning/16 text-[#a04a00] dark:text-[#ff9f43]",
        info: "bg-info/16 text-info-ink",
        violet: "bg-violet/16 text-[#5119b7] dark:text-[#c684ff]",
        destructive: "bg-destructive/16 text-[#b0242a] dark:text-[#ff9592]",
        outline: "border border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
