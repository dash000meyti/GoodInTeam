/**
 * The Good In pixel alphabet (5×7 cells, "I" is 1 cell wide) and the logo
 * layout, reconstructed cell-for-cell from the brand logo
 * (docs/brand/logo-reference.webp: GOOD / IN / STUDIO). Pure data + layout
 * so every sub-brand ("Good In Studio", "Good In Code", …) renders from the
 * same grid — as SVG, favicon or OG image.
 */

/** Rows top → bottom; `#` = filled cell. */
export const PIXEL_GLYPHS: Record<string, readonly string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: [".##..", "#..#.", "#...#", "#...#", "#...#", "#..#.", ".##.."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.##.", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#", "#", "#", "#", "#", "#", "#"],
  J: ["....#", "....#", "....#", "....#", "#...#", "#...#", ".###."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".###.", "#...#", "#....", ".###.", "....#", "#...#", ".###."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": [".###.", "#...#", "....#", "..##.", "....#", "#...#", ".###."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  // Persian digits ۰–۹ (U+06F0–U+06F9), drawn from Vazirmatn's forms on the Latin
  // digits' 5×7 grid: ۰ a small ring at mid height, ۲/۳ one and two teeth on a
  // stem, the Persian ۴ ۵ ۶ (not the Arabic-Indic ٤ ٥ ٦). Used on fa pages
  // through `pixelDigits` (frame strip numbers, the 404).
  "۰": [".....", ".....", ".###.", ".#.#.", ".###.", ".....", "....."],
  "۱": ["..#..", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  "۲": ["#...#", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  "۳": ["#.#.#", "#.#.#", "#.#.#", "##.#.", "#....", "#....", "#...."],
  "۴": ["#.###", ".#...", ".#...", ".####", ".#...", ".#...", ".#..."],
  "۵": ["..#..", ".#.#.", "#...#", "#...#", "#.#.#", "#.#.#", ".#.#."],
  "۶": [".###.", "#....", "#....", ".####", "...#.", "..#..", ".#..."],
  "۷": ["#...#", "#...#", ".#.#.", ".#.#.", ".#.#.", "..#..", "..#.."],
  "۸": ["..#..", "..#..", ".#.#.", ".#.#.", ".#.#.", "#...#", "#...#"],
  "۹": [".###.", "#...#", "#...#", ".####", "....#", "....#", "....#"],
  "-": ["...", "...", "...", "###", "...", "...", "..."],
  " ": ["...", "...", "...", "...", "...", "...", "..."],
  // Path punctuation for window bars and frame strips (GOOD-IN-TEAM/WORK, SYSTEM.APP, 01 · ~).
  "/": ["..#", "..#", ".#.", ".#.", ".#.", "#..", "#.."],
  ".": [".", ".", ".", ".", ".", ".", "#"],
  ":": [".", ".", "#", ".", ".", "#", "."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "~": [".....", ".....", ".#..#", "#.##.", ".....", ".....", "....."],
};

export const GLYPH_HEIGHT = 7;

/** Brand palette sampled from the logo. */
export const BRAND_COLORS = {
  yellow: "#FFC50D",
  ink: "#6A6A6C",
  frame: "#B3B5B9",
  soft: "#CACCCE",
  paper: "#F3F3F3",
} as const;

/** Logo tones (accent, ink, soft, frame, corner) plus the avatar's face and eye tones. */
export type PixelTone = "accent" | "ink" | "soft" | "frame" | "corner" | "face" | "eye";

export interface PixelCell {
  x: number;
  y: number;
  tone: PixelTone;
}

/** Normalize to the supported alphabet (upper-case; unknown characters dropped). */
export function toPixelText(text: string) {
  return [...text.toUpperCase()].filter((ch) => ch in PIXEL_GLYPHS).join("");
}

/** The Persian digits ۰–۹, indexed by value. */
export const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/**
 * Locale-aware digits for pixel text: on `fa` every Latin digit becomes its
 * Persian form ("01" → "۰۱", "404" → "۴۰۴"); other characters and locales
 * are unchanged. Pixel text is drawn left to right (`dir="ltr"`), which is
 * also how Persian numbers read.
 */
export function pixelDigits(text: string, locale: string) {
  return locale === "fa" ? text.replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]!) : text;
}

/** Width in cells of a word (1-cell gap between glyphs). */
export function pixelTextWidth(text: string) {
  const chars = [...toPixelText(text)];
  if (!chars.length) return 0;
  return chars.reduce((w, ch) => w + PIXEL_GLYPHS[ch]![0]!.length, 0) + chars.length - 1;
}

/** Filled cells of a word starting at (x, y). */
export function pixelText(text: string, x: number, y: number, tone: PixelTone): PixelCell[] {
  const cells: PixelCell[] = [];
  let cx = x;
  for (const ch of toPixelText(text)) {
    const glyph = PIXEL_GLYPHS[ch]!;
    glyph.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++)
        if (row[rx] === "#") cells.push({ x: cx + rx, y: y + ry, tone });
    });
    cx += glyph[0]!.length + 1;
  }
  return cells;
}

export interface BrandLogoLayout {
  width: number;
  height: number;
  cells: PixelCell[];
}

/**
 * The framed two-line logo: "GOOD" (accent) + "IN" (ink) on the first line,
 * the sub-brand (soft) on the second, inside a frame with a dark corner —
 * exactly the reference grid for "STUDIO" (34 × 18 cells).
 */
export function brandLogoLayout(suffix = "STUDIO"): BrandLogoLayout {
  const word = toPixelText(suffix) || "TEAM";
  const line1 = pixelTextWidth("GOOD") + 1 + pixelTextWidth("IN");
  const inner = Math.max(line1, pixelTextWidth(word));
  const width = inner + 3; // frame + 1-cell padding on both sides
  const height = 2 * GLYPH_HEIGHT + 4; // frame + padding + line + gap + line + padding
  const cells: PixelCell[] = [{ x: 0, y: 0, tone: "corner" }];
  for (let x = 1; x < width; x++) cells.push({ x, y: 0, tone: "frame" });
  for (let y = 1; y < height; y++) cells.push({ x: 0, y, tone: "frame" });
  cells.push(...pixelText("GOOD", 2, 2, "accent"));
  cells.push(...pixelText("IN", 2 + pixelTextWidth("GOOD") + 1, 2, "ink"));
  cells.push(...pixelText(word, 2, 3 + GLYPH_HEIGHT, "soft"));
  return { width, height, cells };
}

/** Compact square mark (favicon/app icon): framed "G" + "I". */
export function brandMarkLayout(): BrandLogoLayout {
  const width = 2 + 5 + 1 + 1 + 2; // frame, pad, G, gap, I, pad
  const height = GLYPH_HEIGHT + 4;
  const cells: PixelCell[] = [{ x: 0, y: 0, tone: "corner" }];
  for (let x = 1; x < width; x++) cells.push({ x, y: 0, tone: "frame" });
  for (let y = 1; y < height; y++) cells.push({ x: 0, y, tone: "frame" });
  cells.push(...pixelText("G", 2, 2, "accent"));
  cells.push(...pixelText("I", 8, 2, "ink"));
  return { width, height, cells };
}

/** Merge horizontal runs of same-tone cells into rects (fewer SVG nodes). */
export function toRects(cells: PixelCell[]) {
  const key = (c: PixelCell) => `${c.y}:${c.tone}`;
  const rows = new Map<string, number[]>();
  for (const c of cells) {
    const k = key(c);
    if (!rows.has(k)) rows.set(k, []);
    rows.get(k)!.push(c.x);
  }
  const rects: { x: number; y: number; w: number; tone: PixelTone }[] = [];
  for (const [k, xs] of rows) {
    const [y, tone] = k.split(":") as [string, PixelTone];
    xs.sort((a, b) => a - b);
    let start = xs[0]!;
    let prev = start;
    for (const x of xs.slice(1).concat(Number.NaN)) {
      if (x === prev + 1) {
        prev = x;
        continue;
      }
      rects.push({ x: start, y: Number(y), w: prev - start + 1, tone });
      start = x;
      prev = x;
    }
  }
  return rects;
}

/**
 * Layout from a character grid (icons, the avatar): every character mapped in
 * `tones` becomes a cell of that tone; anything else (`.`) is empty.
 */
export function layoutFromGrid(
  rows: readonly string[],
  tones: Record<string, PixelTone>,
): BrandLogoLayout {
  const cells: PixelCell[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const tone = tones[row[x]!];
      if (tone) cells.push({ x, y, tone });
    }
  });
  return { width: Math.max(0, ...rows.map((r) => r.length)), height: rows.length, cells };
}

/**
 * One SVG path `d` per tone (spec D5/P6): horizontal runs merged like
 * `toRects`, each emitted as `M{x} {y}h{w}v1h-{w}z`. Tones keep the order of
 * their first cell, so the output is stable.
 */
export function toPaths(cells: readonly PixelCell[]): Partial<Record<PixelTone, string>> {
  const out: Partial<Record<PixelTone, string>> = {};
  const rects = toRects([...cells]).sort((a, b) => a.y - b.y || a.x - b.x);
  const order: PixelTone[] = [];
  for (const c of cells) if (!order.includes(c.tone)) order.push(c.tone);
  for (const tone of order)
    out[tone] = rects
      .filter((r) => r.tone === tone)
      .map((r) => `M${r.x} ${r.y}h${r.w}v1h-${r.w}z`)
      .join("");
  return out;
}
