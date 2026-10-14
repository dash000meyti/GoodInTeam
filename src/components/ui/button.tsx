import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Primary brand action */
        default:
          "bg-primary text-primary-foreground hover:bg-primary-dark hover:shadow-primary dark:hover:bg-primary-dark",
        /** Minimals "contained inherit": high-contrast neutral button */
        inherit:
          "bg-grey-800 text-white hover:bg-grey-700 dark:bg-white dark:text-grey-800 dark:hover:bg-grey-300",
        /** Soft tinted surface */
        soft: "bg-primary/12 text-primary-dark hover:bg-primary/24 dark:text-primary-light",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30",
        outline:
          "border border-input bg-transparent hover:border-foreground/30 hover:bg-accent dark:hover:border-foreground/40",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 rounded-md px-3 text-[13px] has-[>svg]:px-2.5",
        lg: "h-12 rounded-xl px-6 text-[15px] has-[>svg]:px-5",
        icon: "size-9",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-11 rounded-xl",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
