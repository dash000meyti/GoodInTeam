import { CopyButton } from "@/components/shared/copy-button";
import { cn } from "@/lib/utils";

/** Monospace, LTR, copyable value (endpoints, snippets, one-time secrets). */
export function CodeField({
  value,
  label,
  className,
  multiline = false,
  emphasis = false,
}: {
  value: string;
  label?: string;
  className?: string;
  multiline?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <p className="text-xs font-semibold text-muted-foreground">{label}</p>}
      <div
        className={cn(
          "flex items-start gap-2 rounded-xl border bg-muted/50 p-1.5 ps-3",
          emphasis && "border-primary/40 bg-primary/6",
        )}
      >
        <code
          dir="ltr"
          className={cn(
            "min-w-0 flex-1 py-1.5 text-start font-mono text-[12.5px] leading-5",
            multiline ? "[overflow-wrap:anywhere] whitespace-pre-wrap" : "truncate",
            emphasis && "font-bold text-foreground",
          )}
        >
          {value}
        </code>
        <CopyButton value={value} size="icon-sm" />
      </div>
    </div>
  );
}
