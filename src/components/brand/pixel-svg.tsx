import type { CSSProperties, ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";
import type { PixelTone } from "./pixel-font";

/**
 * Shared SVG shell of every pixel component (spec §4.2): root
 * `<svg class="px-art">` with `shapeRendering="crispEdges"` and the grid size
 * in `--px-w`/`--px-h` (cells); `pixel.css` sizes it as
 * `--px-w × --cell` by `--px-h × --cell`, so cells are always integer px.
 */

/** Integer cell sizes only, through a literal class map (Tailwind can't see interpolated names). */
export const CELL_CLASS = {
  1: "[--cell:1px]",
  2: "[--cell:2px]",
  3: "[--cell:3px]",
  4: "[--cell:4px]",
  6: "[--cell:6px]",
  8: "[--cell:8px]",
  10: "[--cell:10px]",
  12: "[--cell:12px]",
} as const;

export type PixelCellSize = keyof typeof CELL_CLASS;

/**
 * Fills of the logo, mark, text and icons: variables, so they follow
 * light/dark and a tile can re-tone them (`--px-accent`, `--px-ink`; e.g. the
 * yellow Contact tile sets `--px-accent:#1C1C1E`).
 */
export const TONE_FILLS: Record<PixelTone, string> = {
  accent: "var(--px-accent, var(--brand-yellow))",
  ink: "var(--px-ink, var(--brand-ink))",
  corner: "var(--px-ink, var(--brand-ink))",
  soft: "var(--brand-soft)",
  frame: "var(--brand-frame)",
  face: "var(--brand-paper)",
  eye: "var(--px-ink, var(--brand-ink))",
};

/**
 * Fills of the avatar (PixelAvatar, PixelAvatarSprite): literal hex in both
 * modes, never a variable, so no tile, panel or dark mode re-tones it (D20).
 * The dark screen keeps its light frame on dark surfaces, and its ink edges
 * and limbs on light ones.
 */
export const AVATAR_FILLS = {
  ink: "#6A6A6C",
  frame: "#B3B5B9",
  face: "#1C1C1E",
  accent: "#FFC50D",
} as const satisfies Partial<Record<PixelTone, string>>;

export const PAPER_FILL = "var(--brand-paper)";

export function PixelSvg({
  w,
  h,
  viewBox,
  cell,
  title,
  className,
  style,
  children,
  ...rest
}: {
  w: number;
  h: number;
  viewBox?: string;
  /** Omit to inherit `--cell` from an ancestor (fallback 2px); no class is emitted then. */
  cell?: PixelCellSize;
  /** Accessible name (role=img); without it the art is aria-hidden. */
  title?: string;
  className?: string;
  style?: CSSProperties;
  /** Pixel lettering is Latin: text sets and logos render `dir="ltr"`. */
  dir?: "ltr" | "rtl";
  children: ReactNode;
} & Omit<SVGProps<SVGSVGElement>, "viewBox" | "className" | "style" | "children">) {
  return (
    <svg
      viewBox={viewBox ?? `0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={cn("px-art", cell && CELL_CLASS[cell], className)}
      style={{ "--px-w": w, "--px-h": h, ...style } as CSSProperties}
      {...rest}
    >
      {children}
    </svg>
  );
}

/** One `<path>` per tone with variable fills. */
export function TonePaths({ paths }: { paths: Partial<Record<PixelTone, string>> }) {
  return (
    <>
      {(Object.entries(paths) as [PixelTone, string][]).map(([tone, d]) => (
        <path key={tone} d={d} style={{ fill: TONE_FILLS[tone] }} />
      ))}
    </>
  );
}
