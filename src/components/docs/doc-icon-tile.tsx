import { FileTextIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-9 text-lg [&>svg]:size-4",
  lg: "size-11 text-2xl [&>svg]:size-5",
} as const;

/**
 * A doc's emoji icon on a square hairline tile (the frame language's icon
 * tile, like StatIcon); a page without an emoji gets the file glyph.
 * Decorative: the title next to it names the page.
 */
export function DocIconTile({
  icon,
  size = "sm",
  className,
}: {
  icon: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center border border-frame-line bg-card leading-none",
        SIZES[size],
        className,
      )}
    >
      {icon ?? <FileTextIcon className="text-muted-foreground" />}
    </span>
  );
}
