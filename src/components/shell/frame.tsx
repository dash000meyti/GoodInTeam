import type { CSSProperties, ReactNode } from "react";
import { PixelText } from "@/components/brand/pixel-art";
import { pixelDigits } from "@/components/brand/pixel-font";
import { fillerPlan, type FrameCols, type FrameSpan } from "@/components/site/frame-plan";
import { cn } from "@/lib/utils";
import { guideAttrs, spotAttrs } from "./guide-events";
import { OsLights } from "./os-lights";

/**
 * Framed grid primitives (spec §6.1), shared by the public site and the panel.
 * Client-safe: no hooks, no `server-only`, no request data (the site's
 * `components/site/frame.tsx` wraps them with the locale-aware strip). Every
 * literal class lives in a map here, so Tailwind sees whole strings. Rules
 * (frame.css): every FrameCell lives in a FrameGrid; stack grids for rows of
 * different shapes; a `tone="dots"` cell never holds text; boxes are square
 * (only Windows and overlays are rounded).
 *
 * Density: `site` (default; 24/32px cells, 36px strip, 9px markers, the
 * 1200px column) or `compact` (the panel: 16/20px cells, 32px strip, 7px
 * markers, full width of its container, no outer margin — the page's layout
 * sets the gaps). Cells and strips inherit it from their box (CSS variables).
 */

export type { FrameCols, FrameSpan } from "@/components/site/frame-plan";

export interface GuideLine {
  key: string;
  say: string;
}

export type FrameDensity = "site" | "compact";

/** "GOOD-IN-TEAM/WORK": Latin data for strips and window bars, never copy. */
export function framePath(...segments: string[]) {
  return segments
    .map((s) => s.trim().toUpperCase().replace(/\s+/g, "-"))
    .filter(Boolean)
    .join("/");
}

/** The strip's box number: two digits at least, Persian digits on fa ("۰۱", "۴۰۴"). */
export function stripIndex(index: number, locale: string) {
  return pixelDigits(String(index).padStart(2, "0"), locale);
}

export interface FrameStripBarProps {
  /** Resolves the digits (Persian on fa) of the index and the path. */
  locale: string;
  /** Box number shown as pixel digits (01, 02… on en; ۰۱, ۰۲… on fa). */
  index?: number;
  /** Latin pixel path, e.g. framePath("good-in-team", "work"). Hidden below md. */
  path?: string;
  /** Inline-end action (a link, a search form). */
  action?: ReactNode;
}

/**
 * The strip (36px on the site, 32px compact): lights (lit while the box is
 * centred on the site, idle in the panel), pixel index and path, action.
 * Digits in the path follow the locale like the index ("GT-۱۴۰۵-۰۰۲").
 */
export function FrameStripBar({ locale, index, path, action }: FrameStripBarProps) {
  return (
    <div className="frame-strip">
      <OsLights size={10} />
      {index !== undefined && <PixelText text={stripIndex(index, locale)} cell={2} />}
      {path && <PixelText text={pixelDigits(path, locale)} cell={2} className="frame-path" />}
      {action && <div className="frame-strip-action">{action}</div>}
    </div>
  );
}

/**
 * One framed box (a `.frame-box`). `strip` is a rendered strip (FrameStripBar,
 * or the site's async FrameStrip). The site's FrameSection wraps it.
 */
export function FrameBox({
  as: Tag = "section",
  id,
  labelledBy,
  ariaLabel,
  guide,
  strip,
  cv,
  first,
  density = "site",
  className,
  children,
}: {
  as?: "section" | "footer" | "header" | "div" | "article" | "aside";
  id?: string;
  /** id of the box's heading (sections only). */
  labelledBy?: string;
  ariaLabel?: string;
  /** Section narration (§9 coverage map); `say` paraphrases visible copy. */
  guide?: GuideLine;
  strip?: ReactNode;
  /** Wrap the body in `.frame-cv` (content-visibility) with this intrinsic height in px. Never with sticky children. */
  cv?: number;
  /** First box of a page (site): half gap below 1024px, a 56px roof for the guide sprite above. */
  first?: boolean;
  density?: FrameDensity;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      id={id}
      aria-labelledby={Tag === "section" ? labelledBy : undefined}
      aria-label={ariaLabel}
      className={cn("frame-box", className)}
      data-first={first ? "" : undefined}
      data-density={density === "compact" ? "compact" : undefined}
      {...(guide ? guideAttrs(guide.key, guide.say) : {})}
    >
      {strip}
      {cv ? (
        <div className="frame-cv" style={{ "--cis": `${cv}px` } as CSSProperties}>
          {children}
        </div>
      ) : (
        children
      )}
    </Tag>
  );
}

const GRID_COLS: Record<FrameCols, string> = {
  1: "grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  "2-1": "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
  hero: "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]",
};

/** A row (or rows) of cells. `reveal` fades rows in with a scroll-driven animation. */
export function FrameGrid({
  cols,
  reveal,
  as: Tag = "div",
  className,
  children,
}: {
  cols: FrameCols;
  reveal?: boolean;
  /** `dl` for stat cells, `ul`/`ol` for lists of cells. */
  as?: "div" | "dl" | "ul" | "ol";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={cn("frame-grid", GRID_COLS[cols], reveal && "gt-reveal", className)}>
      {children}
    </Tag>
  );
}

const SPAN_CLASS: Record<FrameSpan, string> = {
  2: "md:col-span-2", // 2 tracks at md and lg
  3: "md:col-span-2 lg:col-span-3", // a full row in FrameGrid 3
  md2: "md:col-span-2 lg:col-span-1", // full row at md, one track at lg (header cells)
  lg2: "lg:col-span-2", // one track at md, two at lg
  full: "col-span-full",
  row2: "lg:row-span-2",
};

export type FrameTone = "default" | "card" | "dots" | "ink" | "yellow";
export type FramePad = "none" | "md" | "lg";

/**
 * One cell. Always renders `data-pad` and `data-tone` (guide markers, §15.1):
 * `decor` → `data-decor` (decoration only; automatic for `tone="dots"`),
 * `header` → `data-frame-header` (the cell holding the box's h1/h2),
 * `spot` → `data-guide-spot` + `data-guide-say`, `hover` → card hover.
 */
export function FrameCell({
  span,
  tone = "default",
  pad = "md",
  hover,
  spot,
  decor,
  header,
  as: Tag = "div",
  className,
  children,
  ...rest
}: {
  span?: FrameSpan;
  tone?: FrameTone;
  pad?: FramePad;
  hover?: boolean;
  spot?: GuideLine;
  decor?: boolean;
  header?: boolean;
  as?: "div" | "article" | "aside" | "li" | "header" | "figure" | "section";
  className?: string;
  children?: ReactNode;
  "aria-hidden"?: boolean;
  "aria-labelledby"?: string;
  id?: string;
}) {
  return (
    <Tag
      className={cn("frame-cell", span && SPAN_CLASS[span], className)}
      data-pad={pad}
      data-tone={tone}
      data-hover={hover ? "" : undefined}
      data-decor={decor || tone === "dots" ? "" : undefined}
      data-frame-header={header ? "" : undefined}
      {...(spot ? spotAttrs(spot.key, spot.say) : {})}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Dashed accent chip (6px square dot, 12px/600, 26px tall). */
export function FrameEyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("frame-eyebrow", className)}>{children}</span>;
}

/**
 * Heading scale of the frame system (spec §3.5); site-pages' `TitleCell`
 * extends it. `panel` is the compact page title (panel density: 26/30px en,
 * 24/28px fa) and `box` a box or cell title inside the panel (17px en, 16px fa).
 */
export const HEADING_CLASS = {
  h1: "text-[36px] leading-[1.08] font-bold text-balance md:text-[56px] md:leading-[1.02] [:lang(en)_&]:tracking-[-0.035em] [:lang(fa)_&]:text-[32px] [:lang(fa)_&]:leading-[1.35] [:lang(fa)_&]:font-extrabold md:[:lang(fa)_&]:text-[48px] md:[:lang(fa)_&]:leading-[1.3]",
  h2: "text-[28px] leading-[1.15] font-bold text-balance md:text-[40px] md:leading-[1.08] [:lang(en)_&]:tracking-[-0.03em] [:lang(fa)_&]:leading-[1.4] [:lang(fa)_&]:font-extrabold md:[:lang(fa)_&]:text-[36px] md:[:lang(fa)_&]:leading-[1.35]",
  panel:
    "text-[26px] leading-[1.15] font-bold text-balance md:text-[30px] md:leading-[1.1] [:lang(en)_&]:tracking-[-0.03em] [:lang(fa)_&]:text-[24px] [:lang(fa)_&]:leading-[1.45] [:lang(fa)_&]:font-extrabold md:[:lang(fa)_&]:text-[28px] md:[:lang(fa)_&]:leading-[1.4]",
  box: "text-[17px] leading-[1.3] font-bold [:lang(en)_&]:tracking-[-0.015em] [:lang(fa)_&]:text-[16px] [:lang(fa)_&]:leading-[1.6] [:lang(fa)_&]:font-extrabold",
} as const;

/**
 * The header cell of a box: always
 * `data-frame-header`; eyebrow, the h1/h2 (with `titleId` for the box's
 * aria-labelledby), subtitle, then `children` (breadcrumbs, a facets line)
 * and an optional action.
 */
export function FrameHeaderCell({
  eyebrow,
  title,
  titleId,
  subtitle,
  action,
  as: H = "h2",
  span,
  tone,
  className,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  titleId: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2";
  span?: FrameSpan;
  tone?: FrameTone;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <FrameCell header span={span} tone={tone} className={cn("flex flex-col gap-4", className)}>
      {eyebrow && <FrameEyebrow className="self-start">{eyebrow}</FrameEyebrow>}
      <H id={titleId} className={HEADING_CLASS[H]}>
        {title}
      </H>
      {subtitle && (
        <p className="max-w-2xl text-lg leading-[1.6] text-pretty text-muted-foreground [:lang(fa)_&]:leading-[1.9]">
          {subtitle}
        </p>
      )}
      {children}
      {action && <div className="mt-auto pt-2">{action}</div>}
    </FrameCell>
  );
}

/**
 * Trailing filler cells (`tone="dots"`, aria-hidden) that complete the last
 * row at md and lg. Feed it `packRows(spans, cols, bp).trailing` per breakpoint.
 */
export function FrameFiller({ units }: { units: { md?: number; lg?: number } }) {
  return (
    <>
      {fillerPlan(units.md ?? 0, units.lg ?? 0).map((cls, i) => (
        <FrameCell key={i} tone="dots" aria-hidden className={cls} />
      ))}
    </>
  );
}
