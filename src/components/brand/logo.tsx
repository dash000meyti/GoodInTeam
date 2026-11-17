import { cn } from "@/lib/utils";
import { PixelLogo, PixelMark } from "./pixel-logo";
import type { PixelCellSize } from "./pixel-svg";

/**
 * Good In Team mark — compatibility layer over the pixel logo (spec §2 "Logo
 * usage map"). Size comes ONLY from `cell` (integer px per cell; 11×11 cells,
 * so cell 3 = 33px, cell 4 = 44px). Never pass `size-*`/`w-*`/`h-*` in
 * `className`: Tailwind utilities beat `.px-art` and would give fractional cells.
 */
export function LogoMark({ cell = 3, className }: { cell?: PixelCellSize; className?: string }) {
  return <PixelMark cell={cell} className={className} />;
}

/** The framed GOOD IN / TEAM logo with a screen-reader label (34×18 cells). */
export function Logo({
  label,
  cell = 3,
  className,
}: {
  label: string;
  cell?: PixelCellSize;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <PixelLogo suffix="TEAM" cell={cell} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
