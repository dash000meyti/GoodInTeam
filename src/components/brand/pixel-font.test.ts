import { describe, expect, it } from "vitest";
import {
  brandLogoLayout,
  brandMarkLayout,
  layoutFromGrid,
  PERSIAN_DIGITS,
  pixelDigits,
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
    expect(toPixelText("Good In گ Code!")).toBe("GOOD IN  CODE");
    expect(toPixelText("Good In ٤ Code")).toBe("GOOD IN  CODE"); // Arabic-Indic, not Persian
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

  it("has the Persian digits ۰–۹ on the Latin digits' grid", () => {
    expect([...PERSIAN_DIGITS].map((d) => d.codePointAt(0))).toEqual(
      Array.from({ length: 10 }, (_, i) => 0x06f0 + i),
    );
    for (const [i, fa] of [...PERSIAN_DIGITS].entries()) {
      const rows = PIXEL_GLYPHS[fa]!;
      expect(rows, fa).toHaveLength(7);
      expect(new Set(rows.map((r) => r.length)), fa).toEqual(new Set([5])); // as wide as "0"–"9"
      expect(rows.join("").includes("#"), fa).toBe(true);
      expect(rows, fa).not.toEqual(PIXEL_GLYPHS[String(i)]); // its own form
    }
    // the Persian ۴ ۵ ۶ differ from each other and from the Latin 4 5 6
    expect(new Set(["۴", "۵", "۶"].map((d) => PIXEL_GLYPHS[d]!.join("/"))).size).toBe(3);
    // toPixelText upper-cases and filters: Persian digits pass through untouched
    expect(toPixelText("good-in-team/work ۰۳")).toBe("GOOD-IN-TEAM/WORK ۰۳");
    expect(toPixelText(PERSIAN_DIGITS)).toBe(PERSIAN_DIGITS);
  });

  it("renders a Persian number with the 1-cell gap", () => {
    expect(pixelTextWidth("۰۱")).toBe(pixelTextWidth("01"));
    expect(pixelTextWidth("۴۰۴")).toBe(5 * 3 + 2);
    const cells = pixelText("۰۱", 0, 0, "ink");
    // ۰ is the 3×3 ring at x 1–3, y 2–4; ۱ is the bar at x 8 (5 + gap + 2)
    expect(
      cells
        .filter((c) => c.x <= 4)
        .map((c) => `${c.x}:${c.y}`)
        .sort(),
    ).toEqual(["1:2", "2:2", "3:2", "1:3", "3:3", "1:4", "2:4", "3:4"].sort());
    expect(cells.filter((c) => c.x > 4).every((c) => c.x === 8)).toBe(true);
    expect(cells.filter((c) => c.x === 8)).toHaveLength(7);
    expect(toPaths(cells).ink).toContain("M1 2h3v1h-3z"); // the ring's top run, merged
  });

  it("pixelDigits localizes digits on fa only", () => {
    expect(pixelDigits("01", "fa")).toBe("۰۱");
    expect(pixelDigits("404", "fa")).toBe("۴۰۴");
    expect(pixelDigits("GOOD-IN-TEAM/WORK 03", "fa")).toBe("GOOD-IN-TEAM/WORK ۰۳");
    expect(pixelDigits("1234567890", "fa")).toBe("۱۲۳۴۵۶۷۸۹۰");
    expect(pixelDigits("07", "en")).toBe("07");
    expect(pixelDigits("۰۷", "en")).toBe("۰۷");
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
