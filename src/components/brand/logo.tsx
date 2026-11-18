import { cn } from "@/lib/utils";
import { PixelAvatar } from "./pixel-art";
import { PixelLogo } from "./pixel-logo";
import type { PixelCellSize } from "./pixel-svg";

/**
 * Good In Team mark: GoodInBot's small icon (the owner's
 * pick, 2026-11-17), used for the favicon, the menu bars, the home/desktop
 * dock tile, launchpads, the login screen and documents. Size comes ONLY from
 * `cell` (integer px per cell; 10×10 cells, so cell 2 = 20px, cell 3 = 30px,
 * cell 4 = 40px). Never pass `size-*`/`w-*`/`h-*` in `className`: Tailwind
 * utilities beat `.px-art` and would give fractional cells.
 */
export function LogoMark({ cell = 3, className }: { cell?: PixelCellSize; className?: string }) {
  return <PixelAvatar part="head" cell={cell} className={className} />;
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
