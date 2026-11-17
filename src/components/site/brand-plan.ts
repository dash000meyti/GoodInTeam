/**
 * Grid plans of the brand boxes (pure, no React; unit-tested in
 * page-frame-plan.test.ts). Shared by the `/services` brand boxes and the
 * brand landing pages (`/studio`, `/code`), so the JSX and the hole-free
 * proof use the same span lists.
 */
import type { FrameSpan } from "./frame-plan";

const ones = (n: number): undefined[] => Array.from({ length: n }, () => undefined);

/**
 * Service cells of one brand in a `FrameGrid 3`: `n` service cells, plus the
 * "ask about this brand" cell when the last lg row has room (it never opens a
 * new row). No services → one `full` ask cell (the empty state).
 */
export function serviceCellsPlan(n: number): { ask: boolean; spans: (FrameSpan | undefined)[] } {
  if (n <= 0) return { ask: true, spans: ["full"] };
  const ask = n % 3 !== 0;
  return { ask, spans: ones(n + (ask ? 1 : 0)) };
}

/**
 * The family box of a brand page in a `FrameGrid 3`: the header cell (`md2`:
 * a full row at md, one track at lg) and one cell per other brand.
 */
export const familySpans = (others: number): (FrameSpan | undefined)[] => ["md2", ...ones(others)];
