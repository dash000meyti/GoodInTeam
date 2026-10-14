"use client";

import type { CSSProperties } from "react";
import { toast } from "sonner";
import { useT } from "@/i18n/client";
import { format } from "@/i18n/format-message";
import { cn } from "@/lib/utils";

/** Color chip that copies its CSS variable / class / value on click. */
export function Swatch({
  color,
  label,
  value,
  copy,
  className,
  tall,
  style,
}: {
  /** Any CSS color (hex, rgb(), var(--x)). */
  color: string;
  label: string;
  value?: string;
  /** What to copy (defaults to the label). */
  copy?: string;
  className?: string;
  tall?: boolean;
  style?: CSSProperties;
}) {
  const t = useT();
  const text = copy ?? label;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast.success(t.common.copied, { description: text });
        } catch {
          toast.error(text);
        }
      }}
      title={format(t.designSystem.copyValue, { value: text })}
      className={cn(
        "group flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border text-start transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-[3px] focus-visible:ring-ring/40",
        className,
      )}
      style={style}
    >
      <span
        className={cn("block w-full border-b", tall ? "h-20" : "h-12")}
        style={{ background: color }}
      />
      <span className="block space-y-0.5 bg-card px-2.5 py-2">
        <span className="block truncate font-mono text-[11px] font-bold" dir="ltr">
          {label}
        </span>
        {value && (
          <span className="block truncate font-mono text-[10px] text-muted-foreground" dir="ltr">
            {value}
          </span>
        )}
      </span>
    </button>
  );
}
