/**
 * Pure planning for framed grids (spec §6.1; unit-tested in frame-plan.test.ts
 * and site-pages' page-frame-plan.test.ts). No React.
 *
 * - `packRows` simulates CSS Grid sparse auto-placement on a 2D occupancy grid
 *   and reports mid-grid `holes` (design errors: must be 0) and the `trailing`
 *   empty tracks a FrameFiller completes.
 * - `fillerPlan` turns the trailing counts at md and lg into the literal
 *   visibility class of each filler cell.
 */

export type FrameCols = 1 | 2 | 3 | 4 | "2-1" | "hero";
export type FrameSpan = 2 | 3 | "md2" | "lg2" | "full" | "row2";
export type FrameBp = "md" | "lg";

/** Track counts per breakpoint; mirrors FrameGrid's literal class map. */
export const FRAME_TRACKS: Record<FrameCols, Record<FrameBp, number>> = {
  1: { md: 1, lg: 1 },
  2: { md: 2, lg: 2 },
  3: { md: 2, lg: 3 },
  4: { md: 2, lg: 4 },
  "2-1": { md: 1, lg: 2 },
  hero: { md: 1, lg: 2 },
};

/** Column span of a FrameSpan per breakpoint; mirrors FrameCell's literal class map. */
const COL_SPAN: Record<FrameSpan, Record<FrameBp, number | "full">> = {
  2: { md: 2, lg: 2 },
  3: { md: 2, lg: 3 },
  md2: { md: 2, lg: 1 },
  lg2: { md: 1, lg: 2 },
  full: { md: "full", lg: "full" },
  row2: { md: 1, lg: 1 },
};
const ROW_SPAN: Record<FrameSpan, Record<FrameBp, number>> = {
  2: { md: 1, lg: 1 },
  3: { md: 1, lg: 1 },
  md2: { md: 1, lg: 1 },
  lg2: { md: 1, lg: 1 },
  full: { md: 1, lg: 1 },
  row2: { md: 1, lg: 2 },
};

/** Resolved size of a cell in tracks at a breakpoint (spans wider than the grid are clamped). */
export function cellSize(span: FrameSpan | undefined, tracks: number, bp: FrameBp) {
  if (!span) return { cols: 1, rows: 1 };
  const c = COL_SPAN[span][bp];
  return { cols: c === "full" ? tracks : Math.min(c, tracks), rows: ROW_SPAN[span][bp] };
}

export function packRows(
  spans: readonly (FrameSpan | undefined)[],
  cols: FrameCols,
  bp: FrameBp,
): { holes: number; trailing: number } {
  const tracks = FRAME_TRACKS[cols][bp];
  const occupied: boolean[][] = [];
  const isFree = (r: number, c: number) => !occupied[r]?.[c];
  const occupy = (r: number, c: number) => ((occupied[r] ??= [])[c] = true);
  let cursor = { row: 0, col: 0 };
  let lastRow = -1;

  /** Sparse auto-placement (grid-auto-flow: row): never moves the cursor back. */
  const place = (w: number, h: number) => {
    let { row, col } = cursor;
    for (;;) {
      if (col + w > tracks) {
        row += 1;
        col = 0;
        continue;
      }
      let fits = true;
      for (let r = row; r < row + h && fits; r++)
        for (let c = col; c < col + w; c++) if (!isFree(r, c)) fits = false;
      if (fits) break;
      col += 1;
    }
    for (let r = row; r < row + h; r++) for (let c = col; c < col + w; c++) occupy(r, c);
    cursor = { row, col: col + w };
    return { row, bottom: row + h - 1 };
  };

  for (const span of spans) {
    const { cols: w, rows: h } = cellSize(span, tracks, bp);
    lastRow = Math.max(lastRow, place(w, h).bottom);
  }
  if (lastRow < 0) return { holes: 0, trailing: 0 };

  // Trailing fillers: 1×1 cells auto-placed after the last item, inside the used rows.
  let trailing = 0;
  for (;;) {
    const saved = cursor;
    let { row, col } = cursor;
    while (row <= lastRow && (col >= tracks || !isFree(row, col))) {
      col += 1;
      if (col >= tracks) {
        row += 1;
        col = 0;
      }
    }
    if (row > lastRow) {
      cursor = saved;
      break;
    }
    occupy(row, col);
    cursor = { row, col: col + 1 };
    trailing += 1;
  }

  let holes = 0;
  for (let r = 0; r <= lastRow; r++) for (let c = 0; c < tracks; c++) if (isFree(r, c)) holes += 1;
  return { holes, trailing };
}

/** Literal visibility classes of filler cells (Tailwind needs whole strings). */
export const FILLER_CLASS = {
  both: "hidden md:block",
  md: "hidden md:block lg:hidden",
  lg: "hidden lg:block",
} as const;

/**
 * One class per filler cell: shown at md, at lg, or both. Fillers are never
 * shown below md (the grid is one column there).
 */
export function fillerPlan(unitsMd: number, unitsLg: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < Math.max(unitsMd, unitsLg, 0); i++) {
    const md = i < unitsMd;
    const lg = i < unitsLg;
    out.push(md && lg ? FILLER_CLASS.both : md ? FILLER_CLASS.md : FILLER_CLASS.lg);
  }
  return out;
}
