/**
 * Pure placement maths of GoodInBot (no DOM): the engine reads the rects
 * (viewport px) and passes them in, so every rule here is unit-tested
 * (geometry.test.ts).
 *
 * Anchors: the bot never travels across the page. It lives at one edge of
 * the active box and emerges from behind that edge (the anchor line):
 * - `top`: stands on the box's top border, its inline-end edge INSET inside
 *   the box's, when that border is comfortably in view;
 * - `bottom`: hangs under the bottom border (head just below the line);
 * - `chrome`: hangs under the menu bar, for a tall box that covers the view;
 * - `dock`: compact mode, stands on the top edge of the dock / tab bar.
 *
 * The bubble sits beside the bot, toward inline-start, GAP px from it, with
 * a side tail at the bot's eye level; for a rising bot its bottom is 4px
 * above the line (it grows up into the gap), for a hanging one its top is on
 * the line (it grows down). With too little room beside, it falls back to
 * directly above (rising) or below (hanging) the bot with a vertical tail.
 * It is clamped inside the viewport, clear of the menu bar and the dock.
 */

/** Desktop sprite: 16 cells × 3px (compact: × 2px = 32). */
export const BOT = 48;
/** The bot's inline-end edge sits this far inside the box's inline-end edge. */
export const INSET = 24;
/** Space between the bubble and the bot. */
export const GAP = 10;
/** Widest bubble. */
export const MAX_W = 340;
/** Less room than this beside the bot → the bubble goes above / below it. */
export const MIN_BESIDE = 220;
/** A top border this far below the menu bar leaves room for a standing bot (the first box reserves 56px). */
export const TOP_MIN = 56;
/** A top border below this share of the viewport is too low to anchor on. */
export const TOP_MAX = 0.72;
/** A bottom border must sit this far inside the menu bar / dock band. */
export const ZONE = 64;

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
}

export type Anchor = "top" | "bottom" | "chrome" | "dock";

export interface Bot {
  anchor: Anchor;
  /** The anchor line (viewport y): the slot's clipping edge. */
  line: number;
  /** Sprite box top-left (viewport px) when it has emerged. */
  x: number;
  y: number;
  size: number;
}

/** The tail's physical direction: r/l beside the bot, d/u for the above/below fallback. */
export type Tail = "r" | "l" | "d" | "u";

export interface Placed {
  left: number;
  top: number;
  tail: Tail;
  /** Tail centre along its edge: y from the bubble's top (r/l) or x from its left (d/u). */
  t: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** A rising bot stands on its line; the others hang under it. */
export const rises = (a: Anchor) => a === "top" || a === "dock";

/** Clamp a box horizontally to the frame column (boxes always fit it; legacy full-bleed sections don't). */
export function inColumn(r: Box, col: { left: number; right: number }): Box {
  return { ...r, left: Math.max(r.left, col.left), right: Math.min(r.right, col.right) };
}

/** The 1200px column for a viewport width (mirrors `.frame-box` sizing). */
export function frameColumn(vw: number, gutter: number, max: number) {
  const w = Math.min(vw - 2 * gutter, max);
  const left = (vw - w) / 2;
  return { left, right: left + w };
}

/**
 * The anchor for a box: `top` when its top border is in the comfortable zone
 * (`chromeTop + TOP_MIN` … `TOP_MAX · vh`), else `bottom` when its bottom
 * border is (`chromeTop + ZONE` … `vh − dockSpace − ZONE`), else `chrome`.
 */
export function chooseAnchor(r: Box, f: Frame): Anchor {
  // 1px of slack: the first box's roof sits exactly on the minimum (sub-pixel layout)
  if (r.top > f.chromeTop + TOP_MIN - 1 && r.top <= f.vh * TOP_MAX) return "top";
  if (r.bottom >= f.chromeTop + ZONE && r.bottom <= f.vh - f.dockSpace - ZONE) return "bottom";
  return "chrome";
}

/**
 * The bot for an anchor. `edge` is the box (or the dock list) whose
 * inline-end side it sits on; `line` its anchor line. Rising: feet on the
 * line. Hanging: the head (row 4 of 16; rows 0–3 are empty) 2px under it.
 */
export function placeBot(
  anchor: Anchor,
  line: number,
  edge: { left: number; right: number },
  rtl: boolean,
  size = BOT,
  inset = INSET,
): Bot {
  return {
    anchor,
    line,
    x: rtl ? edge.left + inset : edge.right - inset - size,
    y: rises(anchor) ? line - size : line - size / 4 + 2,
    size,
  };
}

/** The bot's eye level (between rows 7 and 8): where a side tail points. */
export const eyeY = (b: Bot) => b.y + (b.size * 15) / 32;

/** Where a bubble may go: inside the viewport, clear of the menu bar and the dock. */
export function bounds(f: Frame): Box {
  return { left: 8, right: f.vw - 8, top: f.chromeTop + 8, bottom: f.vh - f.dockSpace };
}

/** Beside the bot when there is room (max width = that room, ≤ MAX_W), else the fallback width. */
export function bubbleWidth(b: Bot, f: Frame): { beside: boolean; max: number } {
  const B = bounds(f);
  const room = Math.floor(f.rtl ? B.right - (b.x + b.size + GAP) : b.x - GAP - B.left);
  return room >= MIN_BESIDE
    ? { beside: true, max: Math.min(MAX_W, room) }
    : { beside: false, max: Math.min(MAX_W, B.right - B.left) };
}

/** Place a measured `w × h` bubble for the bot (see the module comment). */
export function placeBubble(b: Bot, w: number, h: number, beside: boolean, f: Frame): Placed {
  const B = bounds(f);
  const up = rises(b.anchor);
  let left: number;
  let top: number;
  if (beside) {
    left = f.rtl ? b.x + b.size + GAP : b.x - GAP - w;
    top = up ? b.line - 4 - h : b.line;
  } else {
    // aligned to the bot's inline-end, above its head or below its feet
    left = f.rtl ? b.x : b.x + b.size - w;
    top = up ? b.y + b.size / 4 - 8 - h : b.y + b.size + 8;
  }
  left = clamp(left, B.left, B.right - w);
  top = clamp(top, B.top, B.bottom - h);
  if (beside) return { left, top, tail: f.rtl ? "l" : "r", t: clamp(eyeY(b) - top, 12, h - 12) };
  return { left, top, tail: up ? "d" : "u", t: clamp(b.x + b.size / 2 - left, 12, w - 12) };
}

/** Distance of a rect from the viewport's vertical centre (0 when it contains it). */
export function centreDistance(r: Box, vh: number): number {
  const c = vh / 2;
  return r.top > c ? r.top - c : r.bottom < c ? c - r.bottom : 0;
}

/** Tour scroll: the box's top lands low enough for the bubble above it (anchor `top`). */
export function tourScrollTop(absTop: number, chromeTop: number, bh: number): number {
  return Math.max(0, absTop - chromeTop - Math.max(TOP_MIN, bh + 20));
}
