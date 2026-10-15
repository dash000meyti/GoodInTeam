import { describe, expect, it } from "vitest";
import { brandLogoLayout, pixelTextWidth, PIXEL_GLYPHS, toPixelText, toRects } from "./pixel-font";

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
  for (const c of cells) grid[c.y]![c.x] = CODE[c.tone];
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
