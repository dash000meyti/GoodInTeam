import { describe, expect, it } from "vitest";
import {
  LIFT,
  SPRITE,
  TAIL,
  bubbleA,
  bubbleB,
  centreDistance,
  clearB,
  frameColumn,
  placeBubble,
  placeSprite,
  railProbe,
  tourScrollTop,
  type BubbleInput,
  type Box,
  type Frame,
} from "./geometry";

/** 1440×900 desktop: 32px menu bar, 84px dock space, 1200px column at 120–1320. */
const frame = (rtl = false, over: Partial<Frame> = {}): Frame => ({
  vw: 1440,
  vh: 900,
  chromeTop: 32,
  dockSpace: 84,
  rtl,
  col: frameColumn(1440, 32, 1200),
  ...over,
});
const rect = (top: number, height = 600, left = 120, right = 1320): Box => ({
  top,
  left,
  right,
  bottom: top + height,
});

const input = (over: Partial<BubbleInput> & { f: Frame; r: Box }): BubbleInput => ({
  kind: "auto",
  s: 36,
  bw: 300,
  bh: 110,
  sprite: placeSprite(over.r, over.f),
  ...over,
});

describe("frameColumn", () => {
  it("centres the 1200px column and respects the gutter below it", () => {
    expect(frameColumn(1440, 32, 1200)).toEqual({ left: 120, right: 1320 });
    expect(frameColumn(1024, 24, 1200)).toEqual({ left: 24, right: 1000 });
  });
});

describe("placeSprite", () => {
  it("stands on the roof at inline-end when the roof is in the band (LTR)", () => {
    const f = frame();
    expect(placeSprite(rect(400), f)).toEqual({ kind: "roof", x: 1320 - 12 - SPRITE, y: 400 - 47 });
  });

  it("stands on the roof at inline-end (the left corner) in RTL", () => {
    expect(placeSprite(rect(400), frame(true))).toEqual({ kind: "roof", x: 132, y: 353 });
  });

  it("keeps the roof perch on the band's top edge (first box at scrollY 0: chromeTop + 56)", () => {
    expect(placeSprite(rect(32 + 56), frame()).kind).toBe("roof");
    expect(placeSprite(rect(32 + 55), frame()).kind).toBe("rail");
  });

  it("has no perch when the roof is below the band (vh − dockSpace − 56)", () => {
    expect(placeSprite(rect(900 - 84 - 56), frame()).kind).toBe("roof");
    expect(placeSprite(rect(900 - 84 - 55), frame()).kind).toBe("none");
    // …so an explicit bubble falls back to C without a tail
    const f = frame();
    const r = rect(1200);
    expect(placeBubble(input({ f, r, kind: "explicit" }))).toMatchObject({ at: "C", tail: null });
  });

  it("clings to the inline-end border on the rail when the roof scrolled away", () => {
    const f = frame();
    expect(placeSprite(rect(40), f)).toEqual({ kind: "rail", x: 1320 - 24, y: 32 + 24 });
    expect(placeSprite(rect(40), frame(true))).toEqual({ kind: "rail", x: 120 - 24, y: 56 });
  });

  it("stands outside the border beside a pad=none cell when the margin is ≥52px (≥1304px)", () => {
    const f = frame(false, { vw: 1440 });
    expect(placeSprite(rect(-200), f, true)).toEqual({ kind: "out", x: 1324, y: 56 });
    const rtl = frame(true);
    expect(placeSprite(rect(-200), rtl, true)).toEqual({ kind: "out", x: 120 - 52, y: 56 });
    const at1304 = frame(false, { vw: 1304, col: frameColumn(1304, 32, 1200) });
    expect(placeSprite(rect(-200, 600, 52, 1252), at1304, true).kind).toBe("out");
  });

  it("has no perch beside a pad=none cell when the margin is under 52px", () => {
    const f = frame(false, { vw: 1280, col: frameColumn(1280, 32, 1200) });
    expect(placeSprite(rect(-200, 600, 40, 1240), f, true).kind).toBe("none");
  });

  it("probes the inline-end cell inside the box, at the rail perch's height", () => {
    expect(railProbe(rect(-100), frame())).toEqual({ x: 1308, y: 32 + 24 + 24 });
    expect(railProbe(rect(-100), frame(true))).toEqual({ x: 132, y: 80 });
  });
});

describe("candidate A", () => {
  it("LTR: its inline-end (right) edge is 8px beyond the sprite's, extending left", () => {
    const f = frame();
    const i = input({ f, r: rect(450) });
    const a = bubbleA(i);
    expect(a.right).toBe(i.sprite.x + SPRITE + 8);
    expect(a.left).toBe(a.right - 300);
    expect(a.bottom).toBe(450 - LIFT);
    expect(a.bottom).toBeLessThan(i.sprite.y); // above the sprite's head, never over it
  });

  it("RTL: its inline-end (left) edge is 8px beyond the sprite's, extending right", () => {
    const f = frame(true);
    const i = input({ f, r: rect(450) });
    const a = bubbleA(i);
    expect(a.left).toBe(i.sprite.x - 8);
    expect(a.right).toBe(a.left + 300);
  });

  it("is clamped to the frame column", () => {
    const f = frame(false, { col: { left: 120, right: 420 } });
    const a = bubbleA(input({ f, r: rect(450, 600, 120, 420), bw: 300 }));
    expect(a.left).toBe(120);
    expect(a.right).toBe(420);
  });

  it("opens for an automatic line when the roof has room above it", () => {
    const p = placeBubble(input({ f: frame(), r: rect(400) }));
    expect(p).toMatchObject({ at: "A", tail: "down" });
    expect(p!.top + 110).toBeLessThan(400);
  });

  it("does not fit when the roof is too close to the menu bar", () => {
    const f = frame();
    const need = f.chromeTop + 8 + 110 + LIFT;
    expect(placeBubble(input({ f, r: rect(need) }))?.at).toBe("A");
    expect(placeBubble(input({ f, r: rect(need - 1) }))).toBeNull();
  });

  it("is never used from the rail perch", () => {
    expect(placeBubble(input({ f: frame(), r: rect(40) }))).toBeNull();
  });

  it("anchors a spot on the spot's own top edge (tail down) and skips it when it doesn't fit", () => {
    const f = frame();
    const spot = rect(500, 300, 520, 920);
    const p = placeBubble(input({ f, r: spot, kind: "spot" }));
    expect(p).toMatchObject({ at: "A", tail: "down" });
    expect(p!.top + 110).toBe(500 - TAIL);
    expect(p!.left + 300).toBe(920 - 4);
    expect(placeBubble(input({ f, r: rect(100, 300, 520, 920), kind: "spot" }))).toBeNull();
  });

  it("never covers a header cell (spots in a lower row)", () => {
    const f = frame();
    const header: Box = { top: 300, bottom: 480, left: 120, right: 1320 };
    expect(
      placeBubble(input({ f, r: rect(500, 300, 520, 920), kind: "spot", headers: [header] })),
    ).toBeNull();
  });
});

describe("candidate B", () => {
  /** First box at scrollY 0: roof at chromeTop + 56, a decor end cell 400×420 under the strip. */
  const first = rect(88, 560);
  const decor = (rtl = false): Box =>
    rtl
      ? { top: 88 + 36, bottom: 88 + 36 + 420, left: 120, right: 520 }
      : { top: 88 + 36, bottom: 88 + 36 + 420, left: 920, right: 1320 };
  const header = (rtl = false): Box =>
    rtl
      ? { top: 124, bottom: 544, left: 520, right: 1320 }
      : { top: 124, bottom: 544, left: 120, right: 920 };

  it("sits below the strip, 12px inside the inline-end border (LTR and RTL)", () => {
    const b = bubbleB(input({ f: frame(), r: first }));
    expect(b.top).toBe(88 + 36 + 8);
    expect(b.right).toBe(1320 - 12);
    const rb = bubbleB(input({ f: frame(true), r: first }));
    expect(rb.left).toBe(120 + 12);
  });

  it("is clear only inside a [data-decor] cell and over no header", () => {
    const b = bubbleB(input({ f: frame(), r: first }));
    expect(clearB(b, decor(), [header()])).toBe(true);
    expect(clearB(b, null, [header()])).toBe(false); // the cell under its corner is not decor
    const fullHeader: Box = { top: 124, bottom: 300, left: 120, right: 1320 }; // span=full header row
    expect(clearB(b, decor(), [fullHeader])).toBe(false);
    const narrow: Box = { ...decor(), left: 1100 }; // B not inside the decor cell
    expect(clearB(b, narrow, [])).toBe(false);
  });

  it("first box: A, else a clear B, else the badge (null)", () => {
    const f = frame();
    // roof too high for A → B inside the decor cell
    expect(
      placeBubble(input({ f, r: first, kind: "first", decor: decor(), headers: [header()] })),
    ).toMatchObject({ at: "B", tail: "up" });
    expect(
      placeBubble(
        input({
          f: frame(true),
          r: first,
          kind: "first",
          decor: decor(true),
          headers: [header(true)],
        }),
      ),
    ).toMatchObject({ at: "B" });
    // no decor cell → badge
    expect(placeBubble(input({ f, r: first, kind: "first", decor: null }))).toBeNull();
    // roof with room → A wins
    expect(placeBubble(input({ f, r: rect(420), kind: "first", decor: decor() }))?.at).toBe("A");
  });

  it("automatic lines never use B", () => {
    expect(placeBubble(input({ f: frame(), r: first, decor: decor() }))).toBeNull();
  });

  it("beside a rail sprite it opens level with it, clear of the sprite", () => {
    const f = frame();
    const r = rect(20, 900);
    const sprite = placeSprite(r, f);
    const b = bubbleB(input({ f, r, sprite }));
    expect(b.top).toBe(sprite.y);
    expect(b.right).toBeLessThanOrEqual(sprite.x - 8);
    const tall: Box = { top: 0, bottom: 900, left: 800, right: 1320 };
    expect(placeBubble(input({ f, r, sprite, kind: "explicit", decor: tall }))).toMatchObject({
      at: "B",
      tail: "side",
    });
  });
});

describe("candidate C and the chains", () => {
  it("greeting: A, else a clear B on the first box, else C", () => {
    const f = frame();
    expect(placeBubble(input({ f, r: rect(420), kind: "greet" }))?.at).toBe("A");
    const first = rect(88, 560);
    const decor: Box = { top: 124, bottom: 544, left: 920, right: 1320 };
    expect(placeBubble(input({ f, r: first, kind: "greet", decor }))?.at).toBe("B");
    const c = placeBubble(input({ f, r: first, kind: "greet", decor: null }));
    // under the menu bar, stepping 8px clear of the roof sprite at the corner
    expect(c).toEqual({ at: "C", left: 1260 - 8 - 300, top: 32 + 12, tail: null });
  });

  it("C sits at the column's inline-end (LTR and RTL) and never covers the sprite", () => {
    const far = { kind: "roof", x: 600, y: 600 } as const; // a sprite far below C
    expect(placeBubble(input({ f: frame(), r: rect(40), sprite: far, kind: "explicit" }))).toEqual({
      at: "C",
      left: 1320 - 12 - 300,
      top: 44,
      tail: null,
    });
    expect(
      placeBubble(input({ f: frame(true), r: rect(40), sprite: far, kind: "explicit" })),
    ).toEqual({
      at: "C",
      left: 132,
      top: 44,
      tail: null,
    });
    // rail sprite at chromeTop + 24 in RTL: C starts 8px past its inline-start edge
    const c = placeBubble(input({ f: frame(true), r: rect(40), kind: "explicit" }));
    expect(c).toEqual({ at: "C", left: 96 + SPRITE + 8, top: 44, tail: null });
  });

  it("explicit: A, else clear B, else C; no perch → C without a tail", () => {
    const f = frame(false, { vw: 1280, col: frameColumn(1280, 32, 1200) });
    const r = rect(-100, 900, 40, 1240);
    const none = placeSprite(r, f, true);
    expect(none.kind).toBe("none");
    expect(
      placeBubble(input({ f, r, sprite: none, kind: "explicit", decor: rect(0, 900, 800, 1240) })),
    ).toMatchObject({
      at: "C",
      tail: null,
    });
    expect(placeBubble(input({ f: frame(), r: rect(420), kind: "explicit" }))?.at).toBe("A");
  });

  it("no automatic bubble: rail perch, no room, or a spot that would cover content", () => {
    const f = frame();
    expect(placeBubble(input({ f, r: rect(40) }))).toBeNull();
    expect(placeBubble(input({ f, r: rect(120) }))).toBeNull();
    expect(placeBubble(input({ f, r: rect(-300), kind: "spot" }))).toBeNull();
    // the dock band: a bubble whose bottom would pass vh − dockSpace − 8 does not fit
    const short = frame(false, { vh: 300 });
    const roofAt = (top: number) => ({ kind: "roof", x: 1260, y: top - 47 }) as const;
    // bottom 208 = 300 − 84 − 8
    expect(placeBubble(input({ f: short, r: rect(262), sprite: roofAt(262) }))?.at).toBe("A");
    expect(placeBubble(input({ f: short, r: rect(263), sprite: roofAt(263) }))).toBeNull();
  });
});

describe("helpers", () => {
  it("measures the distance to the viewport centre", () => {
    expect(centreDistance(rect(100, 500), 900)).toBe(0);
    expect(centreDistance(rect(600, 100), 900)).toBe(150);
    expect(centreDistance(rect(0, 300), 900)).toBe(150);
  });

  it("scrolls a tour step so candidate A fits above the roof", () => {
    const f = frame();
    const top = tourScrollTop(3000, f.chromeTop, 140);
    const roof = 3000 - top;
    expect(placeBubble(input({ f, r: rect(roof), bh: 140, kind: "explicit" }))?.at).toBe("A");
    expect(tourScrollTop(10, 32, 140)).toBe(0);
  });
});
