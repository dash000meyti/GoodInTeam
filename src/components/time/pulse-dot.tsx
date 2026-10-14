import { cn } from "@/lib/utils";

/** "Live" indicator: a dot with a soft ping ring (respects reduced motion globally). */
export function PulseDot({ className, color }: { className?: string; color?: string | null }) {
  return (
    <span aria-hidden className={cn("relative flex size-2.5 shrink-0", className)}>
      <span
        className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60"
        style={color ? { backgroundColor: color } : undefined}
      />
      <span
        className="relative inline-flex size-full rounded-full bg-primary"
        style={color ? { backgroundColor: color } : undefined}
      />
    </span>
  );
}
