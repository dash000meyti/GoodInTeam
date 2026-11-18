import { describe, expect, it } from "vitest";
import {
  BOT,
  GAP,
  INSET,
  MAX_W,
  bounds,
  bubbleWidth,
  centreDistance,
  chooseAnchor,
  eyeY,
  frameColumn,
  inColumn,
  placeBot,
  placeBubble,
  rises,
  tourScrollTop,
  type Box,
  type Frame,
} from "./geometry";

/** 1440×900 desktop: 32px menu bar, 84px dock space; the 1200px column is 120–1320. */
const frame = (rtl = false, over: Partial<Frame> = {}): Frame => ({
  vw: 1440,
  vh: 900,
  chromeTop: 32,
  dockSpace: 84,
  rtl,
  ...over,
});
const rect = (top: number, height = 600, left = 120, right = 1320): Box => ({
  top,
  left,
  right,
  bottom: top + height,
});
const overlaps = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const botBox = (b: { x: number; y: number; size: number }): Box => ({
  left: b.x,
  top: b.y,
  right: b.x + b.size,
  bottom: b.y + b.size,
});

describe("frameColumn / inColumn", () => {
  it("centres the 1200px column and respects the gutter below it", () => {
    expect(frameColumn(1440, 32, 1200)).toEqual({ left: 120, right: 1320 });
    expect(frameColumn(1024, 24, 1200)).toEqual({ left: 24, right: 1000 });
  });

  it("clamps a full-bleed box to the column", () => {
    expect(inColumn(rect(100, 50, 0, 1440), { left: 120, right: 1320 })).toEqual(rect(100, 50));
  });
});

describe("chooseAnchor", () => {
  const f = frame();

  it("is `top` while the top border is in the comfortable zone", () => {
    expect(chooseAnchor(rect(450), f)).toBe("top"); // a box entering the activation band
    expect(chooseAnchor(rect(32 + 56), f)).toBe("top"); // the first box's reserved roof at scrollY 0
    expect(chooseAnchor(rect(32 + 55.6), f)).toBe("top"); // …even a sub-pixel above it
    expect(chooseAnchor(rect(900 * 0.72), f)).toBe("top");
  });

  it("is `bottom` when the top is out of the zone but the bottom border is in it", () => {
    expect(chooseAnchor(rect(-300, 600), f)).toBe("bottom"); // bottom at 300 (scrolling back up)
    expect(chooseAnchor(rect(32 + 54, 40), f)).toBe("bottom"); // roof under the 56px minimum
    expect(chooseAnchor(rect(-500, 500 + 32 + 64), f)).toBe("bottom"); // bottom on the zone's top edge
    expect(chooseAnchor(rect(-500, 500 + 900 - 84 - 64), f)).toBe("bottom"); // … and on its bottom edge
  });

  it("is `chrome` for a tall box that covers the viewport", () => {
    expect(chooseAnchor(rect(-400, 2000), f)).toBe("chrome");
    expect(chooseAnchor(rect(-500, 500 + 900 - 84 - 63), f)).toBe("chrome"); // bottom just under the zone
    expect(chooseAnchor(rect(-500, 500 + 32 + 63), f)).toBe("chrome"); // bottom just over it
  });

  it("does not depend on the direction", () => {
    for (const r of [rect(450), rect(-300), rect(-400, 2000)])
      expect(chooseAnchor(r, frame(true))).toBe(chooseAnchor(r, f));
  });
});

describe("placeBot", () => {
  it("top: feet on the border, inline-end edge INSET inside the box (LTR: right)", () => {
    const b = placeBot("top", 450, rect(450), false);
    expect(b).toEqual({ anchor: "top", line: 450, x: 1320 - INSET - BOT, y: 450 - BOT, size: BOT });
    expect(b.y + b.size).toBe(b.line);
  });

  it("mirrors to the left corner in RTL", () => {
    expect(placeBot("top", 450, rect(450), true).x).toBe(120 + INSET);
    expect(placeBot("bottom", 300, rect(-300), true).x).toBe(120 + INSET);
  });

  it("bottom / chrome: hangs under the line with its head (row 4) 2px below it", () => {
    for (const a of ["bottom", "chrome"] as const) {
      const b = placeBot(a, 300, rect(-300), false);
      expect(rises(a)).toBe(false);
      expect(b.y + BOT / 4).toBe(302);
      expect(b.x).toBe(1320 - INSET - BOT);
    }
  });

  it("dock (compact): a 32px bot standing on the tab bar's top edge", () => {
    const b = placeBot("dock", 776, { left: 12, right: 378 }, false, 32, 20);
    expect(b).toEqual({ anchor: "dock", line: 776, x: 378 - 20 - 32, y: 744, size: 32 });
    expect(placeBot("dock", 776, { left: 12, right: 378 }, true, 32, 20).x).toBe(32);
  });

  it("puts the eyes between rows 7 and 8", () => {
    expect(eyeY(placeBot("top", 450, rect(450), false))).toBeCloseTo(450 - 48 + 22.5);
  });
});

describe("bubble beside the bot", () => {
  const W = 300;
  const H = 110;

  it("top (LTR): GAP px left of the bot, bottom 4px above the line, tail right at eye level", () => {
    const f = frame();
    const b = placeBot("top", 450, rect(450), f.rtl);
    const w = bubbleWidth(b, f);
    expect(w).toEqual({ beside: true, max: MAX_W });
    const p = placeBubble(b, W, H, w.beside, f);
    expect(p.left + W).toBe(b.x - GAP);
    expect(p.top + H).toBe(450 - 4);
    expect(p.tail).toBe("r");
    expect(p.top + p.t).toBeCloseTo(eyeY(b));
    expect(
      overlaps({ left: p.left, top: p.top, right: p.left + W, bottom: p.top + H }, botBox(b)),
    ).toBe(false);
  });

  it("top (RTL): mirrored to the bot's right, tail on the left edge", () => {
    const f = frame(true);
    const b = placeBot("top", 450, rect(450), true);
    const p = placeBubble(b, W, H, true, f);
    expect(p.left).toBe(b.x + BOT + GAP);
    expect(p.top + H).toBe(446);
    expect(p.tail).toBe("l");
  });

  it("bottom / chrome: the bubble's top sits on the line and it grows down", () => {
    const f = frame();
    for (const [a, line] of [
      ["bottom", 300],
      ["chrome", 32],
    ] as const) {
      const b = placeBot(a, line, rect(-300), false);
      const p = placeBubble(b, W, H, true, f);
      expect(p.top).toBe(Math.max(line, 32 + 8)); // under the menu bar: clamped 8px clear of it
      expect(p.left + W).toBe(b.x - GAP);
      // the tail points at the eyes, or at least at the screen (rows 4–13) when clamped
      if (a === "bottom") expect(p.top + p.t).toBeCloseTo(eyeY(b));
      expect(p.top + p.t).toBeGreaterThanOrEqual(b.y + BOT / 4);
      expect(p.top + p.t).toBeLessThanOrEqual(b.y + (BOT * 14) / 16);
    }
  });

  it("never covers the bot, in either direction, for any anchor", () => {
    for (const rtl of [false, true])
      for (const [a, line] of [
        ["top", 88],
        ["top", 640],
        ["bottom", 120],
        ["bottom", 740],
        ["chrome", 32],
      ] as const) {
        const f = frame(rtl);
        const b = placeBot(a, line, rect(line), rtl);
        const p = placeBubble(b, MAX_W, 160, bubbleWidth(b, f).beside, f);
        const bub = { left: p.left, top: p.top, right: p.left + MAX_W, bottom: p.top + 160 };
        expect(overlaps(bub, botBox(b)), `${a}@${line} rtl=${rtl}`).toBe(false);
      }
  });
});

describe("narrow room: above / below the bot", () => {
  // A 400px-wide viewport whose box puts the bot near the inline-start edge.
  const f = frame(false, { vw: 400 });
  const box = rect(450, 300, 16, 260);

  it("falls back when the room beside is under the minimum, at full width", () => {
    const b = placeBot("top", 450, box, false);
    expect(bubbleWidth(b, f)).toEqual({ beside: false, max: MAX_W });
  });

  it("top: above the head, aligned to the bot's inline-end, tail pointing down at it", () => {
    const b = placeBot("top", 450, box, false);
    const p = placeBubble(b, 160, 100, false, f);
    expect(p.top + 100).toBe(b.y + BOT / 4 - 8);
    expect(p.left + 160).toBe(b.x + BOT);
    expect(p.tail).toBe("d");
    expect(p.left + p.t).toBe(b.x + BOT / 2);
  });

  it("a wider fallback bubble is clamped into the viewport; the tail still points at the bot", () => {
    const b = placeBot("top", 450, box, false);
    const p = placeBubble(b, 300, 100, false, f);
    expect(p.left).toBe(bounds(f).left);
    expect(p.left + p.t).toBe(b.x + BOT / 2);
  });

  it("bottom: below the feet, tail pointing up", () => {
    const b = placeBot("bottom", 300, box, false);
    const p = placeBubble(b, 300, 100, false, f);
    expect(p.top).toBe(b.y + BOT + 8);
    expect(p.tail).toBe("u");
  });

  it("RTL: aligned to the bot's inline-end (its left edge)", () => {
    const g = frame(true, { vw: 400 });
    const b = placeBot("top", 450, rect(450, 300, 140, 384), true);
    expect(bubbleWidth(b, g).beside).toBe(false);
    const p = placeBubble(b, 200, 100, false, g);
    expect(p.left).toBe(b.x);
    expect(p.left + p.t).toBe(b.x + BOT / 2);
  });
});

describe("clamping", () => {
  it("keeps the first box's greeting clear of the menu bar (it may overlap the box instead)", () => {
    const f = frame();
    const b = placeBot("top", 32 + 56, rect(88), false);
    const p = placeBubble(b, 300, 130, true, f);
    expect(p.top).toBe(32 + 8);
    expect(p.top + p.t).toBeCloseTo(eyeY(b)); // the tail still points at the eyes
  });

  it("keeps a hanging bubble clear of the dock", () => {
    const f = frame();
    const b = placeBot("bottom", 900 - 84 - 64, rect(-300), false);
    const p = placeBubble(b, 300, 160, true, f);
    expect(p.top + 160).toBe(900 - 84);
    expect(p.t).toBeLessThanOrEqual(160 - 12);
  });

  it("compact (390×844): beside the bot, inside the viewport, above the tab bar's reserved space", () => {
    const f = frame(false, { vw: 390, vh: 844, chromeTop: 44, dockSpace: 76 });
    const b = placeBot("dock", 776, { left: 12, right: 378 }, false, 32, 20);
    const w = bubbleWidth(b, f);
    expect(w).toEqual({ beside: true, max: 326 - GAP - 8 });
    const p = placeBubble(b, w.max, 120, true, f);
    expect(p.left).toBe(bounds(f).left);
    expect(p.left + w.max).toBe(b.x - GAP);
    expect(p.top + 120).toBe(844 - 76);
  });

  it("keeps the tail inside the bubble's edge", () => {
    const f = frame();
    const b = placeBot("top", 88, rect(88), false);
    const p = placeBubble(b, 300, 60, true, f);
    expect(p.t).toBeGreaterThanOrEqual(12);
    expect(p.t).toBeLessThanOrEqual(48);
  });
});

describe("centreDistance", () => {
  it("is 0 when a rect spans the viewport centre, else the distance to it", () => {
    expect(centreDistance(rect(100, 600), 900)).toBe(0);
    expect(centreDistance(rect(500, 100), 900)).toBe(50);
    expect(centreDistance(rect(100, 300), 900)).toBe(50);
  });
});

describe("tourScrollTop", () => {
  it("lands the box's top low enough for the bubble above it, and at least the roof minimum", () => {
    expect(tourScrollTop(2000, 32, 120)).toBe(2000 - 32 - 140);
    expect(tourScrollTop(2000, 32, 10)).toBe(2000 - 32 - 56);
    expect(tourScrollTop(100, 32, 120)).toBe(0);
    // the landed box then anchors on its top border
    expect(chooseAnchor(rect(32 + 140), frame())).toBe("top");
  });
});
