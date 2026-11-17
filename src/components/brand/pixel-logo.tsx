import { brands } from "./brands";
import {
  brandLogoLayout,
  brandMarkLayout,
  GLYPH_HEIGHT,
  pixelText,
  toPaths,
  type BrandLogoLayout,
} from "./pixel-font";
import { PAPER_FILL, PixelSvg, TONE_FILLS, TonePaths, type PixelCellSize } from "./pixel-svg";

/**
 * The Latin pixel logo, rendered as one `<path>` per tone on an optional paper
 * rect (spec §4.2). Sizes come only from `cell` (integer px per cell) or an
 * inherited `--cell`; never put `size-*`/`w-*`/`h-*` on these.
 * Element counts: PixelMark 6, PixelLogo 7, PixelLogoCycle/Swap 12.
 */

function Paper({ layout }: { layout: Pick<BrandLogoLayout, "width" | "height"> }) {
  return (
    <rect
      x={1}
      y={1}
      width={layout.width - 1}
      height={layout.height - 1}
      style={{ fill: PAPER_FILL }}
    />
  );
}

function LogoSvg({
  layout,
  title,
  paper,
  cell,
  className,
}: {
  layout: BrandLogoLayout;
  title?: string;
  paper: boolean;
  cell?: PixelCellSize;
  className?: string;
}) {
  return (
    <PixelSvg w={layout.width} h={layout.height} cell={cell} title={title} className={className}>
      {paper && <Paper layout={layout} />}
      <TonePaths paths={toPaths(layout.cells)} />
    </PixelSvg>
  );
}

/** Framed "GOOD IN / <SUFFIX>" pixel logo (any sub-brand: STUDIO, CODE, TEAM…). */
export function PixelLogo({
  suffix = "TEAM",
  title,
  paper = true,
  cell,
  className,
}: {
  suffix?: string;
  /** Accessible name; omit when a visible text label sits next to it. */
  title?: string;
  /** Fill the inner panel (`--brand-paper`); off on coloured surfaces. */
  paper?: boolean;
  cell?: PixelCellSize;
  className?: string;
}) {
  return (
    <LogoSvg
      layout={brandLogoLayout(suffix)}
      title={title}
      paper={paper}
      cell={cell}
      className={className}
    />
  );
}

/** Square "GI" mark (11×11) for the favicon, the menu bar and the dock. */
export function PixelMark({
  title,
  paper = true,
  cell,
  className,
}: {
  title?: string;
  paper?: boolean;
  cell?: PixelCellSize;
  className?: string;
}) {
  return (
    <LogoSvg
      layout={brandMarkLayout()}
      title={title}
      paper={paper}
      cell={cell}
      className={className}
    />
  );
}

/** The frame and GOOD IN once, plus one `<g class="gi-sfx" data-sfx>` path per suffix. */
function MultiSuffixLogo({
  suffixes,
  title,
  cell,
  className,
  id,
  play,
}: {
  suffixes: readonly string[];
  title?: string;
  cell?: PixelCellSize;
  className?: string;
  id?: string;
  play?: boolean;
}) {
  const widest = suffixes
    .map((s) => brandLogoLayout(s))
    .reduce((a, b) => (b.width > a.width ? b : a));
  const base = toPaths(widest.cells.filter((c) => c.tone !== "soft"));
  return (
    <PixelSvg
      w={widest.width}
      h={widest.height}
      cell={cell}
      title={title}
      className={className}
      dir="ltr"
      id={id}
      data-play={play ? "" : undefined}
    >
      <Paper layout={widest} />
      <TonePaths paths={base} />
      {suffixes.map((s) => (
        <g key={s} className="gi-sfx" data-sfx={s}>
          <path
            d={toPaths(pixelText(s, 2, 3 + GLYPH_HEIGHT, "soft")).soft ?? ""}
            style={{ fill: TONE_FILLS.soft }}
          />
        </g>
      ))}
    </PixelSvg>
  );
}

/**
 * TEAM → STUDIO → CODE → TEAM, **once**, in 4.2s (WCAG 2.2.2), each entrance a
 * 3-step wipe (`pixel.css` `.gi-cycle[data-play]`). Static TEAM without
 * `play` and under reduced motion.
 */
export function PixelLogoCycle({
  suffixes = ["TEAM", "STUDIO", "CODE"],
  play = true,
  cell,
  className,
  title,
}: {
  suffixes?: readonly string[];
  play?: boolean;
  cell?: PixelCellSize;
  className?: string;
  title?: string;
}) {
  return (
    <MultiSuffixLogo
      suffixes={suffixes}
      title={title}
      cell={cell}
      className={["gi-cycle", className].filter(Boolean).join(" ")}
      play={play}
    />
  );
}

/**
 * All brand suffixes in registry order, TEAM visible; consumers swap the
 * suffix with `:has()` rules on `.gi-sfx[data-sfx=…]` in their own partial
 * (spec §4.4), e.g. hovering a brand cell shows STUDIO.
 */
export function PixelLogoSwap({
  id,
  cell,
  className,
  title,
}: {
  id?: string;
  cell?: PixelCellSize;
  className?: string;
  title?: string;
}) {
  return (
    <MultiSuffixLogo
      id={id}
      suffixes={brands.map((b) => b.suffix)}
      title={title}
      cell={cell}
      className={["gi-swap", className].filter(Boolean).join(" ")}
    />
  );
}
