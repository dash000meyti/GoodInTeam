/**
 * Pure placement maths of the site guide (spec §10.5 "Placement"). No DOM:
 * the engine reads the rects and cell markers (viewport coordinates) and
 * passes them in, so every rule here is unit-tested (geometry.test.ts).
 *
 * Sprite perches
 * - roof: on the box's top border at inline-end, inside the section gap,
 *   when the roof is comfortably visible (`chromeTop + 56 ≤ r.top`).
 * - rail: the roof has scrolled under the menu bar; the sprite clings to the
 *   inline-end border at `chromeTop + 24`, 24px inside (cell padding only).
 *   Beside a `[data-pad=none]` cell it stands fully outside the border
 *   (`out`) when the margin is ≥ 52px, else it fades out (`none`).
 *
 * Bubble candidates (first that fits wins; "fits" = inside
 * `[chromeTop + 8, vh − dockSpace − 8]` and inside the frame column)
 * - A: above the roof sprite's head (tail down at its inline-end bottom); its
 *   inline-end edge is 8px beyond the sprite's inline-end edge and it extends
 *   toward inline-start. For a spot, above the spot's own top edge.
 * - B: inside the box below the strip, inline-end edge 12px inside the
 *   border; only when CLEAR (inside a `[data-decor]` cell, over no
 *   `[data-frame-header]` cell).
 * - C: pinned under the menu bar at the column's inline-end; no tail.
 */

/** Desktop sprite size (16 cells × 3px). */
export const SPRITE = 48;
/** Height of the pixel tail under/over a bubble. */
export const TAIL = 8;
/** Room A needs above a roof besides the bubble: sprite + tail gap (bottom = r.top − LIFT). */
export const LIFT = SPRITE + 6;

export interface Box {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface Frame {
  vw: number;
  vh: number;
  chromeTop: number;
  dockSpace: number;
  rtl: boolean;
  /** The 1200px frame column (horizontal extent, viewport px). */
  col: { left: number; right: number };
}

export type PerchKind = "roof" | "rail" | "out" | "none";
export interface Perch {
  kind: PerchKind;
  /** Sprite top-left, viewport px. */
  x: number;
  y: number;
}

/** auto = section line · first = the page's first box · greet · spot · explicit (click, explain, tour). */
export type BubbleKind = "auto" | "first" | "greet" | "spot" | "explicit";
export type Candidate = "A" | "B" | "C";
/** Where the stepped tail sits: down (A, at the inline-end bottom), up (B under a roof sprite), side (B beside a rail sprite). */
export type Tail = "down" | "up" | "side" | null;

export interface Placed {
  at: Candidate;
  left: number;
  top: number;
  tail: Tail;
}

export interface BubbleInput {
  kind: BubbleKind;
  /** Target rect: the `[data-guide]` box, or the spot for `kind: "spot"`. */
  r: Box;
  /** Strip height of the box (36 with a `.frame-strip`, else 0). */
  s: number;
  /** The sprite's perch (ignored for spots, which anchor on their own top edge). */
  sprite: Perch;
  /** Measured bubble size. */
  bw: number;
  bh: number;
  f: Frame;
  /** The `[data-decor]` cell under B's top inline-end corner, or null when that cell is not decor. */
  decor?: Box | null;
  /** The box's `[data-frame-header]` cell rects. */
  headers?: readonly Box[];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Clamp a box horizontally to the frame column (boxes always are; full-bleed legacy sections are not). */
export function inColumn(r: Box, f: Frame): Box {
  return { ...r, left: Math.max(r.left, f.col.left), right: Math.min(r.right, f.col.right) };
}

/** The roof is low enough for the roof perch (`chromeTop + 56 ≤ r.top`; placeSprite also checks the band's bottom). */
export function onRoof(r: Box, f: Frame): boolean {
  return r.top >= f.chromeTop + 56;
}

/** Where the engine probes the inline-end cell under a rail perch (the inside half of the sprite). */
export function railProbe(r: Box, f: Frame): { x: number; y: number } {
  return { x: f.rtl ? r.left + 12 : r.right - 12, y: f.chromeTop + 24 + SPRITE / 2 };
}

/**
 * The sprite's perch for a box. `padNone`: the inline-end cell under the rail
 * perch is `[data-pad=none]`. A roof below the band (`vh − dockSpace − 56`,
 * e.g. an explain on a box far down the page) gets no perch.
 */
export function placeSprite(r: Box, f: Frame, padNone = false): Perch {
  if (r.top > f.vh - f.dockSpace - 56) {
    return { kind: "none", x: f.rtl ? r.left + 12 : r.right - 12 - SPRITE, y: r.top - SPRITE + 1 };
  }
  if (onRoof(r, f)) {
    return { kind: "roof", x: f.rtl ? r.left + 12 : r.right - 12 - SPRITE, y: r.top - SPRITE + 1 };
  }
  const y = f.chromeTop + 24;
  if (!padNone) return { kind: "rail", x: f.rtl ? r.left - 24 : r.right - 24, y };
  const margin = f.rtl ? r.left : f.vw - r.right;
  if (margin >= SPRITE + 4) return { kind: "out", x: f.rtl ? r.left - SPRITE - 4 : r.right + 4, y };
  return { kind: "none", x: f.rtl ? r.left - 24 : r.right - 24, y };
}

const box = (left: number, top: number, w: number, h: number): Box => ({
  left,
  top,
  right: left + w,
  bottom: top + h,
});

/** Vertical band and column test. */
export function fits(b: Box, f: Frame): boolean {
  return (
    b.top >= f.chromeTop + 8 &&
    b.bottom <= f.vh - f.dockSpace - 8 &&
    b.left >= f.col.left - 0.5 &&
    b.right <= f.col.right + 0.5
  );
}

const overlaps = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const inside = (a: Box, b: Box) =>
  a.left >= b.left - 0.5 &&
  a.right <= b.right + 0.5 &&
  a.top >= b.top - 0.5 &&
  a.bottom <= b.bottom + 0.5;

/**
 * Candidate A: above the roof sprite (or the spot's top edge). The bubble's
 * inline-end edge sits 8px beyond the anchor's inline-end edge and the bubble
 * extends toward inline-start, then is clamped to the column.
 */
export function bubbleA(i: BubbleInput): Box {
  const { r, f, bw, bh } = i;
  const spot = i.kind === "spot";
  // Anchor: the sprite on the roof, or a virtual roof perch on the spot.
  const end = spot
    ? f.rtl
      ? r.left + 12
      : r.right - 12
    : f.rtl
      ? i.sprite.x
      : i.sprite.x + SPRITE;
  const bottom = spot ? r.top - TAIL : r.top - LIFT;
  const left = clamp(f.rtl ? end - 8 : end + 8 - bw, f.col.left, f.col.right - bw);
  return box(left, bottom - bh, bw, bh);
}

/** Candidate B: inside the box below the strip (or level with a rail sprite), inline-end edge 12px inside. */
export function bubbleB(i: BubbleInput): Box {
  const { r, f, bw, bh, sprite } = i;
  const rail = sprite.kind === "rail" || sprite.kind === "out";
  const top = rail ? sprite.y : r.top + i.s + 8;
  if (f.rtl) {
    let left = r.left + 12;
    if (sprite.kind === "rail") left = Math.max(left, sprite.x + SPRITE + 8);
    return box(left, top, bw, bh);
  }
  let right = r.right - 12;
  if (sprite.kind === "rail") right = Math.min(right, sprite.x - 8);
  return box(right - bw, top, bw, bh);
}

/**
 * Candidate C: under the menu bar at the column's inline-end. A rail sprite
 * stands right there (`chromeTop + 24`), so C steps 8px clear of it rather
 * than covering it.
 */
export function bubbleC(i: BubbleInput): Box {
  const { f, bw, bh, sprite } = i;
  const top = f.chromeTop + 12;
  let left = f.rtl ? f.col.left + 12 : f.col.right - 12 - bw;
  if (sprite.kind !== "none" && sprite.y < top + bh && sprite.y + SPRITE > top) {
    left = f.rtl ? Math.max(left, sprite.x + SPRITE + 8) : Math.min(left, sprite.x - 8 - bw);
  }
  return box(clamp(left, f.col.left, f.col.right - bw), top, bw, bh);
}

/** B is used only when it lies inside a `[data-decor]` cell and over no `[data-frame-header]` cell. */
export function clearB(
  b: Box,
  decor: Box | null | undefined,
  headers: readonly Box[] = [],
): boolean {
  return !!decor && inside(b, decor) && !headers.some((h) => overlaps(b, h));
}

/** Which candidates each kind of bubble may use, in order (spec §10.5). */
export const CANDIDATES: Record<BubbleKind, readonly Candidate[]> = {
  auto: ["A"],
  first: ["A", "B"],
  greet: ["A", "B", "C"],
  spot: ["A"],
  explicit: ["A", "B", "C"],
};

/**
 * Place a bubble, or return null: for automatic and first-box lines that
 * means "show the badge, don't mark the line seen"; for spots, skip.
 */
export function placeBubble(i: BubbleInput): Placed | null {
  const headers = i.headers ?? [];
  const k = i.sprite.kind;
  for (const at of CANDIDATES[i.kind]) {
    if (at === "A") {
      if (i.kind !== "spot" && k !== "roof") continue;
      const a = bubbleA(i);
      if (fits(a, i.f) && !headers.some((h) => overlaps(a, h))) {
        return { at, left: a.left, top: a.top, tail: "down" };
      }
    } else if (at === "B") {
      if (k === "none") continue;
      const b = bubbleB(i);
      if (fits(b, i.f) && clearB(b, i.decor, headers)) {
        return { at, left: b.left, top: b.top, tail: k === "roof" ? "up" : "side" };
      }
    } else {
      // C may overlay content (greeting, explicit); it must appear, so it is clamped, never rejected.
      const c = bubbleC(i);
      return { at, left: c.left, top: c.top, tail: null };
    }
  }
  return null;
}

/** Distance of a rect from the viewport's vertical centre (0 when it contains it). */
export function centreDistance(r: Box, vh: number): number {
  const c = vh / 2;
  return r.top > c ? r.top - c : r.bottom < c ? c - r.bottom : 0;
}

/** The 1200px column for a viewport width (mirrors `.frame-box` sizing). */
export function frameColumn(
  vw: number,
  gutter: number,
  max: number,
): { left: number; right: number } {
  const w = Math.min(vw - 2 * gutter, max);
  const left = (vw - w) / 2;
  return { left, right: left + w };
}

/** Tour scroll: the roof lands `bh + LIFT + 16` below the menu bar, so candidate A fits. */
export function tourScrollTop(absTop: number, chromeTop: number, bh: number): number {
  return Math.max(0, absTop - chromeTop - bh - LIFT - 16);
}
