import { describe, expect, it } from "vitest";
import {
  brandLogoLayout,
  brandMarkLayout,
  layoutFromGrid,
  pixelText,
  pixelTextWidth,
  PIXEL_GLYPHS,
  toPaths,
  toPixelText,
  toRects,
  type PixelCell,
} from "./pixel-font";

/** Grid read from docs/brand/logo-reference.webp (D corner, F frame, Y yellow, I ink, L soft). */
const REFERENCE = [
  "DFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
  "F.................................",
  "F..YYY...YYY...YYY...YY...I.I...I.",
  "F.Y...Y.Y...Y.Y...Y.Y..Y..I.I...I.",
  "F.Y.....Y...Y.Y...Y.Y...Y.I.II..I.",
  "F.Y.YY..Y...Y.Y...Y.Y...Y.I.I.I.I.",
  "F.Y...Y.Y...Y.Y...Y.Y...Y.I.I..II.",
  "F.Y...Y.Y...Y.Y...Y.Y..Y..I.I...I.",
  "F..YYY...YYY...YYY...YY...I.I...I.",
  "F.................................",
  "F..LLL..LLLLL.L...L..LL...L..LLL..",
  "F.L...L...L...L...L.L..L..L.L...L.",
  "F.L.......L...L...L.L...L.L.L...L.",
  "F..LLL....L...L...L.L...L.L.L...L.",
  "F.....L...L...L...L.L...L.L.L...L.",
  "F.L...L...L...L...L.L..L..L.L...L.",
  "F..LLL....L....LLL...LL...L..LLL..",
  "F.................................",
];

const CODE = { corner: "D", frame: "F", accent: "Y", ink: "I", soft: "L" } as const;

function render(suffix: string) {
  const { width, height, cells } = brandLogoLayout(suffix);
  const grid = Array.from({ length: height }, () => Array(width).fill("."));
  for (const c of cells) grid[c.y]![c.x] = CODE[c.tone as keyof typeof CODE];
  return grid.map((r) => r.join(""));
}

describe("pixel logo", () => {
  it("reproduces the reference logo cell for cell", () => {
    expect(render("STUDIO")).toEqual(REFERENCE);
  });

  it("lays out any sub-brand inside the same frame", () => {
    const code = render("code");
    expect(code).toHaveLength(18);
    expect(code[0]).toHaveLength(34); // "GOOD IN" stays the widest line
    const longer = brandLogoLayout("ACADEMY");
    expect(longer.width).toBe(pixelTextWidth("ACADEMY") + 3);
  });

  it("keeps every glyph 7 rows tall with equal-width rows", () => {
    for (const [ch, rows] of Object.entries(PIXEL_GLYPHS)) {
      expect(rows, ch).toHaveLength(7);
      expect(new Set(rows.map((r) => r.length)).size, ch).toBe(1);
    }
  });

  it("drops unsupported characters and merges runs into rects", () => {
    expect(toPixelText("Good In ۱ Code!")).toBe("GOOD IN  CODE");
    const rects = toRects(brandLogoLayout().cells);
    const filled = rects.reduce((n, r) => n + r.w, 0);
    expect(filled).toBe(brandLogoLayout().cells.length);
    expect(rects.length).toBeLessThan(brandLogoLayout().cells.length);
  });
});

/** Cells covered by a path `d` made of `M{x} {y}h{w}v1h-{w}z` runs. */
function cellsOf(d: string) {
  const out: string[] = [];
  for (const m of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)) {
    const [x, y, w, w2] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
    expect(w2).toBe(w);
    for (let i = 0; i < w; i++) out.push(`${x + i}:${y}`);
  }
  return out;
}

describe("pixel font extensions", () => {
  it("has the path punctuation glyphs", () => {
    expect(PIXEL_GLYPHS["/"]).toEqual(["..#", "..#", ".#.", ".#.", ".#.", "#..", "#.."]);
    expect(PIXEL_GLYPHS["."]).toEqual([".", ".", ".", ".", ".", ".", "#"]);
    expect(PIXEL_GLYPHS[":"]).toEqual([".", ".", "#", ".", ".", "#", "."]);
    expect(PIXEL_GLYPHS["+"]![3]).toBe("#####");
    expect(PIXEL_GLYPHS["~"]![3]).toBe("#.##.");
    expect(toPixelText("good-in-team/work")).toBe("GOOD-IN-TEAM/WORK");
    expect(toPixelText("system.app")).toBe("SYSTEM.APP");
  });

  it("toPaths covers every cell exactly once, one d per tone", () => {
    for (const layout of [brandLogoLayout("TEAM"), brandLogoLayout("STUDIO"), brandMarkLayout()]) {
      const paths = toPaths(layout.cells);
      const tones = new Set(layout.cells.map((c) => c.tone));
      expect(Object.keys(paths).sort()).toEqual([...tones].sort());
      for (const tone of tones) {
        const expected = layout.cells
          .filter((c) => c.tone === tone)
          .map((c) => `${c.x}:${c.y}`)
          .sort();
        const got = cellsOf(paths[tone]!);
        expect(got.length, tone).toBe(new Set(got).size); // no cell twice
        expect(got.sort(), tone).toEqual(expected);
      }
    }
  });

  it("toPaths merges horizontal runs", () => {
    const cells: PixelCell[] = [0, 1, 2, 4].map((x) => ({ x, y: 3, tone: "ink" }));
    expect(toPaths(cells)).toEqual({ ink: "M0 3h3v1h-3zM4 3h1v1h-1z" });
  });

  it("every brand logo is 34×18", () => {
    for (const s of ["TEAM", "STUDIO", "CODE"]) {
      const l = brandLogoLayout(s);
      expect([l.width, l.height], s).toEqual([34, 18]);
    }
    expect([brandMarkLayout().width, brandMarkLayout().height]).toEqual([11, 11]);
  });

  it("layoutFromGrid maps characters to tones", () => {
    const l = layoutFromGrid(["#.y", "..#"], { "#": "ink", y: "accent" });
    expect([l.width, l.height]).toEqual([3, 2]);
    expect(l.cells).toEqual([
      { x: 0, y: 0, tone: "ink" },
      { x: 2, y: 0, tone: "accent" },
      { x: 2, y: 1, tone: "ink" },
    ]);
    expect(pixelText("01", 0, 0, "ink").length).toBeGreaterThan(0);
  });
});
