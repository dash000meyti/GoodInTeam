"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/** Range slider (Radix, RTL-aware via DirectionProvider). */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min]),
    [value, defaultValue, min],
  );
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-grey-900/10 dark:bg-white/12"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute h-full bg-primary shadow-[inset_0_0_0_1px_var(--primary-dark)]"
        />
      </SliderPrimitive.Track>
      {values.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          data-slot="slider-thumb"
          className="block size-5 shrink-0 cursor-grab rounded-full border-2 border-primary-ink bg-background shadow-card transition-shadow outline-none hover:ring-4 hover:ring-primary/16 focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
