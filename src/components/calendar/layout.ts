/**
 * Event layout algorithms (pure, server + client):
 *
 * - `layoutSpans` — horizontal bars across day columns (month rows and the
 *   all-day row of the week view), packed into lanes.
 * - `visibleSpans` — which bars fit in a cell with N lanes and the "+N more" counts.
 * - `layoutTimed` — side-by-side columns for overlapping timed events in a day.
 */

export interface Span {
  key: string;
  start: number;
  /** Exclusive end; may equal `start` for point-in-time items. */
  end: number;
}

export interface DayBound {
  start: number;
  end: number;
}

export interface SpanSegment<T extends Span> {
  item: T;
  /** First column (inclusive) the item touches. */
  startCol: number;
  /** Last column (inclusive) the item touches. */
  endCol: number;
  lane: number;
  /** The item started before the first visible column. */
  continuesBefore: boolean;
  /** The item ends after the last visible column. */
  continuesAfter: boolean;
}

const effectiveEnd = (s: Span) => Math.max(s.end, s.start + 1);

/**
 * Pack items into lanes over `bounds` (one entry per day column). Longer
 * items and earlier items get the top lanes so multi-day bars stay aligned.
 */
export function layoutSpans<T extends Span>(items: T[], bounds: DayBound[]) {
  const segments: SpanSegment<T>[] = [];
  for (const item of items) {
    const end = effectiveEnd(item);
    let first = -1;
    let last = -1;
    for (let i = 0; i < bounds.length; i++) {
      if (item.start < bounds[i]!.end && end > bounds[i]!.start) {
        if (first < 0) first = i;
        last = i;
      }
    }
    if (first < 0) continue;
    segments.push({
      item,
      startCol: first,
      endCol: last,
      lane: 0,
      continuesBefore: item.start < bounds[first]!.start,
      continuesAfter: end > bounds[last]!.end,
    });
  }
  segments.sort(
    (a, b) =>
      a.startCol - b.startCol ||
      b.endCol - b.startCol - (a.endCol - a.startCol) ||
      a.item.start - b.item.start ||
      effectiveEnd(b.item) - effectiveEnd(a.item) ||
      (a.item.key < b.item.key ? -1 : a.item.key > b.item.key ? 1 : 0),
  );
  const lanes: boolean[][] = [];
  for (const seg of segments) {
    for (let lane = 0; ; lane++) {
      const row = (lanes[lane] ??= Array.from({ length: bounds.length }, () => false));
      let free = true;
      for (let c = seg.startCol; c <= seg.endCol; c++) {
        if (row[c]) {
          free = false;
          break;
        }
      }
      if (free) {
        for (let c = seg.startCol; c <= seg.endCol; c++) row[c] = true;
        seg.lane = lane;
        break;
      }
    }
  }
  return { segments, laneCount: lanes.length };
}

/**
 * Decide which segments fit when a cell shows at most `maxLanes` lanes.
 * When a day overflows, its last lane is replaced by a "+N more" link, so
 * segments in that lane are hidden on every day they cover.
 * Returns the drawable segments and, per column, how many items are hidden.
 */
export function visibleSpans<T extends Span>(
  segments: SpanSegment<T>[],
  columns: number,
  maxLanes: number,
) {
  const overflow = Array.from({ length: columns }, () => false);
  for (const s of segments) {
    if (s.lane >= maxLanes) for (let c = s.startCol; c <= s.endCol; c++) overflow[c] = true;
  }
  const shown: SpanSegment<T>[] = [];
  const more = Array.from({ length: columns }, () => 0);
  for (const s of segments) {
    let visible = s.lane < maxLanes - 1;
    if (s.lane === maxLanes - 1) {
      visible = true;
      for (let c = s.startCol; c <= s.endCol; c++) if (overflow[c]) visible = false;
    }
    if (visible) shown.push(s);
    else for (let c = s.startCol; c <= s.endCol; c++) more[c]!++;
  }
  return { shown, more };
}

export interface TimedBox<T extends Span> {
  item: T;
  /** Offset from the top of the day, 0–1. */
  top: number;
  /** Height as a fraction of the day, 0–1. */
  height: number;
  /** Column inside the overlap cluster. */
  col: number;
  /** Number of columns in the overlap cluster. */
  cols: number;
  /** How many columns the box may stretch over (free space to its end side). */
  span: number;
  startsBefore: boolean;
  endsAfter: boolean;
}

/**
 * Lay out timed items of one day: overlapping items sit side by side
 * (Google-Calendar style). Items shorter than `minDurationMs` are drawn as if
 * they lasted that long, so they stay readable and don't visually collide.
 */
export function layoutTimed<T extends Span>(
  items: T[],
  dayStart: number,
  dayEnd: number,
  minDurationMs = 20 * 60_000,
): TimedBox<T>[] {
  const len = dayEnd - dayStart;
  type Box = { item: T; s: number; e: number; col: number; before: boolean; after: boolean };
  const boxes: Box[] = [];
  for (const item of items) {
    const end = effectiveEnd(item);
    if (!(item.start < dayEnd && end > dayStart)) continue;
    let s = Math.max(item.start, dayStart);
    const e = Math.min(Math.max(end, s + minDurationMs), dayEnd);
    if (e - s < minDurationMs) s = Math.max(dayStart, e - minDurationMs);
    boxes.push({ item, s, e, col: 0, before: item.start < dayStart, after: end > dayEnd });
  }
  boxes.sort(
    (a, b) =>
      a.s - b.s ||
      b.e - b.s - (a.e - a.s) ||
      (a.item.key < b.item.key ? -1 : a.item.key > b.item.key ? 1 : 0),
  );

  const out: TimedBox<T>[] = [];
  let cluster: Box[] = [];
  let colEnds: number[] = [];
  let clusterEnd = Number.NEGATIVE_INFINITY;

  const flush = () => {
    const cols = colEnds.length;
    for (const b of cluster) {
      let span = 1;
      for (let c = b.col + 1; c < cols; c++) {
        const blocked = cluster.some((o) => o.col === c && o.s < b.e && o.e > b.s);
        if (blocked) break;
        span++;
      }
      out.push({
        item: b.item,
        top: (b.s - dayStart) / len,
        height: (b.e - b.s) / len,
        col: b.col,
        cols,
        span,
        startsBefore: b.before,
        endsAfter: b.after,
      });
    }
    cluster = [];
    colEnds = [];
  };

  for (const b of boxes) {
    if (cluster.length && b.s >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= b.s);
    if (col < 0) {
      col = colEnds.length;
      colEnds.push(b.e);
    } else colEnds[col] = b.e;
    b.col = col;
    cluster.push(b);
    clusterEnd = cluster.length === 1 ? b.e : Math.max(clusterEnd, b.e);
  }
  if (cluster.length) flush();
  return out;
}
