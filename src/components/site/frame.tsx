import "server-only";
import type { ReactNode } from "react";
import { FrameBox, FrameStripBar, type GuideLine } from "@/components/shell/frame";
import { getLocale } from "@/i18n/server";

/**
 * Framed grid primitives (spec §6.1): the Cloudflare-style boxes of the
 * public site. Server-only entry: the shared, client-safe primitives live in
 * `components/shell/frame.tsx` (the panel uses them at `density="compact"`);
 * this module re-exports them and adds the locale-aware `FrameStrip` and
 * `FrameSection`. Rules (frame.css): every FrameCell lives in a FrameGrid;
 * stack grids for rows of different shapes; a `tone="dots"` cell never holds
 * text; boxes are square (only Windows are rounded).
 */

export {
  framePath,
  stripIndex,
  FrameGrid,
  FrameCell,
  FrameEyebrow,
  FrameFiller,
  FrameHeaderCell,
  HEADING_CLASS,
  type FrameCols,
  type FrameSpan,
  type FrameTone,
  type FramePad,
  type GuideLine,
} from "@/components/shell/frame";

export interface FrameStripProps {
  /** Box number shown as pixel digits (01, 02… on en; ۰۱, ۰۲… on fa). */
  index?: number;
  /** Latin pixel path, e.g. framePath("good-in-team", "work"). Hidden below md. */
  path?: string;
  /** Inline-end action (a link, a search form). */
  action?: ReactNode;
}

/** One framed box: `<section class="frame-box">` (or the site `<footer>`). */
export function FrameSection({
  as = "section",
  strip,
  ...props
}: {
  as?: "section" | "footer";
  id?: string;
  /** id of the box's heading (sections only). */
  labelledBy?: string;
  ariaLabel?: string;
  /** Section narration (§9 coverage map); `say` paraphrases visible copy. */
  guide?: GuideLine;
  strip?: FrameStripProps | false;
  /** Wrap the body in `.frame-cv` (content-visibility) with this intrinsic height in px. Never with sticky children. */
  cv?: number;
  /** First box of a page: half gap below 1024px, a 56px roof for the guide sprite above. */
  first?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return <FrameBox as={as} strip={strip ? <FrameStrip {...strip} /> : undefined} {...props} />;
}

/**
 * 36px strip: lights (lit while the box is centred), pixel index and path,
 * action. Async only to read the locale (a root param, so it stays static and
 * is part of any cache key): fa strips number their boxes ۰۱, ۰۲….
 */
export async function FrameStrip(props: FrameStripProps) {
  const locale = await getLocale();
  return <FrameStripBar locale={locale} {...props} />;
}
