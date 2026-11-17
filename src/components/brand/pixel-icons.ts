/**
 * 12×12 pixel icons (spec §4.3). `#` = ink, `y` = accent, `.` = empty.
 * Drawing rules: art inside the inner 10×10 (empty outer ring), 1-cell
 * strokes where the motif allows, at most two tones with the accent on ≤20%
 * of the filled cells (`accentShare`; the site's `more` is the one
 * owner-approved exception), legible at cell 2 (24px) and cell 1 (12px).
 * Only `arrow` is directional: render it with
 * `<PixelIcon name="arrow" mirror />` so it points to inline-end in RTL too.
 * The owner reviews both sets in Panel → Design system → Brand.
 */

/** The public site's 13 icons (dock, Spotlight, Launchpad, brand chips). */
export const siteIcons = {
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

/**
 * The panel's module icons: one per app of the panel dock for every role
 * (`panelNav` items carry `pixel`), drawn to the motif of the module's lucide
 * icon so the dock matches the menus and ⌘K. The dock's Desktop/Portal tile
 * keeps the `PixelMark` (`dashboard` and `portal` serve lists and the catalog);
 * View site reuses `globe` and the tab bar's More reuses `more`.
 */
export const panelIcons = {
  /** Four panes of different heights, one accent (Desktop). */
  dashboard: [
    "............",
    ".####..####.",
    ".#..#..#yy#.",
    ".#..#..####.",
    ".#..#.......",
    ".#..#..####.",
    ".####..#..#.",
    ".......#..#.",
    ".####..#..#.",
    ".#..#..#..#.",
    ".####..####.",
    "............",
  ],
  /** House with an accent door (the client portal's home). */
  portal: [
    "............",
    ".....##.....",
    "....####....",
    "...##..##...",
    "..##....##..",
    ".##......##.",
    "..#......#..",
    "..#..yy..#..",
    "..#..yy..#..",
    "..#..yy..#..",
    "..########..",
    "............",
  ],
  /** Stopwatch: ring, hands, accent crown button. */
  time: [
    "............",
    ".....yy.....",
    "....####....",
    "..##....##..",
    ".#........#.",
    ".#...#....#.",
    ".#...#....#.",
    ".#...###..#.",
    ".#........#.",
    "..##....##..",
    "....####....",
    "............",
  ],
  /** Page with rings, a header band and day dots, today in accent. */
  calendar: [
    "............",
    "...#....#...",
    ".##########.",
    ".##########.",
    ".#........#.",
    ".#.#.#.#..#.",
    ".#........#.",
    ".#.#.#.yy.#.",
    ".#.....yy.#.",
    ".#........#.",
    ".##########.",
    "............",
  ],
  /** Checked box (ink only: the check is the motif). */
  tasks: [
    "............",
    ".##########.",
    ".#........#.",
    ".#........#.",
    ".#......#.#.",
    ".#.....##.#.",
    ".#.#..##..#.",
    ".#.####...#.",
    ".#..##....#.",
    ".#........#.",
    ".##########.",
    "............",
  ],
  /** Folder with kanban columns, one accent card. */
  projects: [
    "............",
    "............",
    ".####.......",
    ".#..#######.",
    ".#........#.",
    ".#.#.yy.#.#.",
    ".#.#.yy.#.#.",
    ".#.#....#.#.",
    ".#......#.#.",
    ".#........#.",
    ".##########.",
    "............",
  ],
  /** Two people, the front one in an accent shirt (echoes `about`). */
  clients: [
    "............",
    "........##..",
    "...##..#..#.",
    "..#..#.#..#.",
    "..#..#..##..",
    "...##.......",
    ".......####.",
    "..####....#.",
    ".#.yy.#...#.",
    ".#.yy.#...#.",
    ".##########.",
    "............",
  ],
  /** Wallet with a tab and an accent coin. */
  finance: [
    "............",
    "............",
    "..#######...",
    ".##########.",
    ".#........#.",
    ".#.....####.",
    ".#.....#yy#.",
    ".#.....####.",
    ".#........#.",
    ".##########.",
    "............",
    "............",
  ],
  /** Receipt with a torn bottom edge, the total in accent. */
  invoices: [
    "............",
    "..########..",
    "..#......#..",
    "..#.####.#..",
    "..#......#..",
    "..#.####.#..",
    "..#......#..",
    "..#..yyy.#..",
    "..#......#..",
    "..#......#..",
    "..##.##.##..",
    "............",
  ],
  /** Page with an accent pen signing it. */
  contracts: [
    "............",
    "..######....",
    "..#....#....",
    "..#.##.#....",
    "..#....#.##.",
    "..#.##.##y#.",
    "..#....#yy#.",
    "..#...#yy#..",
    "..#..#yy#...",
    "..#..###....",
    "..######....",
    "............",
  ],
  /** Open book: two pages on a spine, accent lines on one page. */
  docs: [
    "............",
    "............",
    ".###....###.",
    ".#..#..#..#.",
    ".#...##...#.",
    ".#yy.##.###.",
    ".#...##...#.",
    ".#yy.##.###.",
    ".#...##...#.",
    ".###.##.###.",
    "....####....",
    "............",
  ],
  /** Padlock with an accent keyhole (the password vault). */
  vault: [
    "............",
    "....####....",
    "...#....#...",
    "...#....#...",
    "...#....#...",
    "..########..",
    "..#......#..",
    "..#..yy..#..",
    "..#..yy..#..",
    "..#......#..",
    "..########..",
    "............",
  ],
  /** Newspaper: an accent picture, headlines and a text line (site content). */
  content: [
    "............",
    "............",
    ".##########.",
    ".#........#.",
    ".#.yyy.##.#.",
    ".#.yyy....#.",
    ".#.yyy.##.#.",
    ".#........#.",
    ".#.######.#.",
    ".#........#.",
    ".##########.",
    "............",
  ],
  /** Tray with an accent slot (site messages). */
  inbox: [
    "............",
    "............",
    "...######...",
    "..#......#..",
    "..#......#..",
    ".#........#.",
    ".###....###.",
    ".#..yyyy..#.",
    ".#........#.",
    ".#........#.",
    ".##########.",
    "............",
  ],
  /** Picture: mountains and an accent sun. */
  media: [
    "............",
    "............",
    ".##########.",
    ".#........#.",
    ".#.....yy.#.",
    ".#.....yy.#.",
    ".#...#....#.",
    ".#..###...#.",
    ".#.#####.##.",
    ".##########.",
    "............",
    "............",
  ],
  /** Three sliders, the middle knob in accent. */
  settings: [
    "............",
    "...##.......",
    ".##########.",
    "...##.......",
    ".......yy...",
    ".######yy##.",
    ".......yy...",
    ".....##.....",
    ".##########.",
    ".....##.....",
    "............",
    "............",
  ],
  /** Painter's palette: paint dots (one accent) and a thumb hole. */
  "design-system": [
    "............",
    "...######...",
    "..#......#..",
    ".#.yy.##..#.",
    ".#.yy.##..#.",
    ".#........#.",
    ".#.##..##.#.",
    ".#.##.#..#..",
    ".#....#..#..",
    "..#....##.#.",
    "...#######..",
    "............",
  ],
} as const satisfies Record<string, readonly string[]>;

/** Every icon; names are unique across the two sets (pixel-icons.test.ts). */
export const pixelIcons = { ...siteIcons, ...panelIcons };

export type SiteIconName = keyof typeof siteIcons;
export type PanelIconName = keyof typeof panelIcons;
export type PixelIconName = SiteIconName | PanelIconName;

export const siteIconNames = Object.keys(siteIcons) as SiteIconName[];
export const panelIconNames = Object.keys(panelIcons) as PanelIconName[];
export const pixelIconNames = Object.keys(pixelIcons) as PixelIconName[];

/** Share of the filled cells drawn in the accent (`y`), 0–1. Must stay ≤0.2. */
export function accentShare(rows: readonly string[]) {
  const cells = rows.join("");
  const accent = cells.split("y").length - 1;
  const filled = accent + cells.split("#").length - 1;
  return filled ? accent / filled : 0;
}

/** Grid characters → tones. */
export const ICON_TONES = { "#": "ink", y: "accent" } as const;

/** Directional icons (the only ones that may be mirrored). */
export const DIRECTIONAL_ICONS: readonly PixelIconName[] = ["arrow"];
