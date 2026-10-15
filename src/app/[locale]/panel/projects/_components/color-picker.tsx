"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "@/components/ui/field";

export const palette = [
  "#00A76F",
  "#078DEE",
  "#7635DC",
  "#0C68E9",
  "#FDA92D",
  "#FF3030",
  "#8E33FF",
  "#00B8D9",
  "#22C55E",
  "#FFAB00",
  "#FF5630",
  "#637381",
];

/** Swatch picker that also writes a hidden input for <form action>. */
export function ColorPicker({
  name,
  defaultValue = palette[0]!,
  onChange,
}: {
  name: string;
  defaultValue?: string;
  onChange?: (c: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  // Inside a <Field>: the swatches form a group named by the field's label.
  const groupProps = useFieldControl({}, "group");
  return (
    <div role="group" className="flex flex-wrap gap-2" {...groupProps}>
      <input type="hidden" name={name} value={value} />
      {palette.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          aria-pressed={value.toLowerCase() === c.toLowerCase()}
          onClick={() => {
            setValue(c);
            onChange?.(c);
          }}
          className={cn(
            "flex size-7 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110",
            value.toLowerCase() === c.toLowerCase() && "ring-2 ring-foreground/30",
          )}
          style={{ backgroundColor: c }}
        >
          {value.toLowerCase() === c.toLowerCase() && (
            <CheckIcon className="size-3.5 text-white" strokeWidth={3} />
          )}
        </button>
      ))}
    </div>
  );
}
