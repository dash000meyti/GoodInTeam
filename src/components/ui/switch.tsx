"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:shadow-[inset_0_0_0_1px_var(--primary-dark)] data-[state=unchecked]:bg-grey-200 data-[state=unchecked]:shadow-[inset_0_0_0_1px_var(--color-grey-600)] dark:data-[state=unchecked]:bg-grey-800 dark:data-[state=unchecked]:shadow-[inset_0_0_0_1px_var(--color-grey-500)]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-full bg-white shadow-[0_0_0_1px_var(--color-grey-600)] ring-0 transition-transform data-[state=checked]:bg-[#1c1c1e] data-[state=checked]:shadow-none data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0.5 rtl:data-[state=checked]:-translate-x-[calc(100%-2px)] rtl:data-[state=unchecked]:-translate-x-0.5"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
