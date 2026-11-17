/**
 * 12×12 pixel icons (spec §4.3). `#` = ink, `y` = accent, `.` = empty.
 * Drawing rules: art inside the inner 10×10 (empty outer ring), 1-cell
 * strokes where the motif allows, at most two tones, legible at cell 2
 * (24px) and cell 1 (12px). Only `arrow` is directional: render it with
 * `<PixelIcon name="arrow" mirror />` so it points to inline-end in RTL too.
 * The owner reviews this set in Panel → Design system → Brand.
 */
export const pixelIcons = {
  /** Briefcase: body, handle, accent clasp. */
  work: [
    "............",
    "............",
    "....####....",
    "....#..#....",
    ".##########.",
    ".#........#.",
    ".#...yy...#.",
    ".####yy####.",
    ".#........#.",
    ".#........#.",
    ".##########.",
    "............",
  ],
  /** Gear: toothed ring, accent hub. */
  services: [
    "............",
    "....#..#....",
    "..#.####.#..",
    "...##..##...",
    ".##......##.",
    "..#..yy..#..",
    "..#..yy..#..",
    ".##......##.",
    "...##..##...",
    "..#.####.#..",
    "....#..#....",
    "............",
  ],
  /** Page with a folded top-end corner and three text lines, the first accent. */
  blog: [
    "............",
    "..#####.....",
    "..#...##....",
    "..#...#.#...",
    "..#...####..",
    "..#.yyyy.#..",
    "..#......#..",
    "..#.####.#..",
    "..#......#..",
    "..#.###..#..",
    "..########..",
    "............",
  ],
  /** Mortarboard with an accent tassel. */
  learn: [
    "............",
    "............",
    ".....##.....",
    "...##..##...",
    ".##......##.",
    "...##..##.y.",
    "...#.##.#.y.",
    "...#....#yy.",
    "...#....#...",
    "....####....",
    "............",
    "............",
  ],
  /** Head-and-shoulders bust with an accent shirt (echoes the sprite). */
  about: [
    "............",
    "....####....",
    "...#....#...",
    "...#....#...",
    "...#....#...",
    "....####....",
    "...######...",
    "..#.yyyy.#..",
    ".#..yyyy..#.",
    ".#........#.",
    ".##########.",
    "............",
  ],
  /** Pen nib with an accent slit (Good In Studio). */
  studio: [
    "............",
    "...######...",
    "...#....#...",
    "..#......#..",
    "..#..##..#..",
    "..#......#..",
    "...#.yy.#...",
    "...#.yy.#...",
    "....#yy#....",
    ".....##.....",
    ".....##.....",
    "............",
  ],
  /** `</>`, the slash in accent (Good In Code). */
  code: [
    "............",
    "............",
    "...#....#...",
    "..##..y.##..",
    ".##...y..##.",
    ".#....y...#.",
    ".#...y....#.",
    ".##..y...##.",
    "..##.y..##..",
    "...#....#...",
    "............",
    "............",
  ],
  /** Envelope with an accent seal. */
  contact: [
    "............",
    "............",
    ".##########.",
    ".##......##.",
    ".#.##..##.#.",
    ".#...yy...#.",
    ".#...yy...#.",
    ".#........#.",
    ".#........#.",
    ".##########.",
    "............",
    "............",
  ],
  /** Key with an accent bit (a key, not an arrow: never mirrored). */
  "sign-in": [
    "............",
    "............",
    "............",
    ".####.......",
    ".#..#.......",
    ".#..#######.",
    ".#..#....yy.",
    ".####....yy.",
    "............",
    "............",
    "............",
    "............",
  ],
  /** 2×2 grid of 3×3 squares, one accent (mobile dock "More"). */
  more: [
    "............",
    "............",
    "..###..###..",
    "..###..###..",
    "..###..###..",
    "............",
    "............",
    "..###..yyy..",
    "..###..yyy..",
    "..###..yyy..",
    "............",
    "............",
  ],
  /** Magnifier, handle toward bottom-end (never mirrored, like macOS). */
  search: [
    "............",
    "...###......",
    "..#...#.....",
    ".#.....#....",
    ".#.....#....",
    ".#.....#....",
    "..#...#.....",
    "...####.....",
    "......###...",
    ".......###..",
    "........##..",
    "............",
  ],
  /** Circle with an equator and one meridian (panel "View site"). */
  globe: [
    "............",
    "....####....",
    "..##.##.##..",
    ".#..#..#..#.",
    ".#..#..#..#.",
    ".##########.",
    ".#..#..#..#.",
    ".#..#..#..#.",
    "..##.##.##..",
    "....####....",
    "............",
    "............",
  ],
  /** Points to inline-end in LTR; vertically symmetric, rendered with `mirror`. */
  arrow: [
    "............",
    "............",
    "......##....",
    ".......##...",
    "........##..",
    ".##########.",
    ".##########.",
    "........##..",
    ".......##...",
    "......##....",
    "............",
    "............",
  ],
} as const satisfies Record<string, readonly string[]>;

export type PixelIconName = keyof typeof pixelIcons;

export const pixelIconNames = Object.keys(pixelIcons) as PixelIconName[];

/** Grid characters → tones. */
export const ICON_TONES = { "#": "ink", y: "accent" } as const;

/** Directional icons (the only ones that may be mirrored). */
export const DIRECTIONAL_ICONS: readonly PixelIconName[] = ["arrow"];
