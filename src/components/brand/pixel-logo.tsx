import { cn } from "@/lib/utils";
import {
  brandLogoLayout,
  brandMarkLayout,
  toRects,
  type BrandLogoLayout,
  type PixelTone,
} from "./pixel-font";

/**
 * Tone → colour. CSS variables (globals.css `--brand-*`) so the logo follows
 * light/dark; the fallbacks are the reference colours.
 */
const FILL: Record<PixelTone, string> = {
  accent: "var(--brand-yellow, #FFC50D)",
  ink: "var(--brand-ink, #6A6A6C)",
  soft: "var(--brand-soft, #CACCCE)",
  frame: "var(--brand-frame, #B3B5B9)",
  corner: "var(--brand-ink, #6A6A6C)",
};

function PixelSvg({
  layout,
  title,
  paper,
  className,
}: {
  layout: BrandLogoLayout;
  title?: string;
  paper: boolean;
  className?: string;
}) {
  const { width, height, cells } = layout;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("h-auto", className)}
    >
      {paper && (
        <rect
          x={1}
          y={1}
          width={width - 1}
          height={height - 1}
          fill="var(--brand-paper, #F3F3F3)"
        />
      )}
      {toRects(cells).map((r) => (
        <rect
          key={`${r.x}-${r.y}-${r.tone}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={1}
          fill={FILL[r.tone]}
        />
      ))}
    </svg>
  );
}

/** Framed "GOOD IN / <SUFFIX>" pixel logo (any sub-brand: STUDIO, CODE, TEAM…). */
export function PixelLogo({
  suffix = "TEAM",
  title,
  paper = true,
  className,
}: {
  suffix?: string;
  /** Accessible name; omit when a visible text label sits next to it. */
  title?: string;
  /** Fill the inner panel (#F3F3F3); off on coloured surfaces. */
  paper?: boolean;
  className?: string;
}) {
  return (
    <PixelSvg layout={brandLogoLayout(suffix)} title={title} paper={paper} className={className} />
  );
}

/** Square-ish "GI" mark for favicons, the menu bar and the dock. */
export function PixelMark({
  title,
  paper = true,
  className,
}: {
  title?: string;
  paper?: boolean;
  className?: string;
}) {
  return <PixelSvg layout={brandMarkLayout()} title={title} paper={paper} className={className} />;
}
