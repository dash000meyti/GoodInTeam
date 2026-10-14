import { describe, expect, it } from "vitest";
import { layoutSpans, layoutTimed, visibleSpans, type Span } from "./layout";

const H = 3_600_000;
const D = 24 * H;
// Seven consecutive 24h columns starting at 0.
const week = Array.from({ length: 7 }, (_, i) => ({ start: i * D, end: (i + 1) * D }));
const span = (key: string, start: number, end: number): Span => ({ key, start, end });

describe("layoutSpans", () => {
  it("clips items to the visible columns and flags continuation", () => {
    const { segments } = layoutSpans([span("a", -D, 2 * D), span("b", 5 * D, 9 * D)], week);
    const a = segments.find((s) => s.item.key === "a")!;
    const b = segments.find((s) => s.item.key === "b")!;
    expect(a).toMatchObject({ startCol: 0, endCol: 1, continuesBefore: true, continuesAfter: false });
    expect(b).toMatchObject({ startCol: 5, endCol: 6, continuesBefore: false, continuesAfter: true });
  });

  it("treats point items as occupying their day", () => {
    const { segments } = layoutSpans([span("p", 3 * D + 10 * H, 3 * D + 10 * H)], week);
    expect(segments[0]).toMatchObject({ startCol: 3, endCol: 3, lane: 0 });
  });

  it("packs non-overlapping items into the same lane and longer items first", () => {
    const { segments, laneCount } = layoutSpans(
      [
        span("short", 1 * D + 9 * H, 1 * D + 10 * H),
        span("long", 0, 4 * D),
        span("later", 5 * D, 6 * D),
        span("same-day", 1 * D + 11 * H, 1 * D + 12 * H),
      ],
      week,
    );
    const lane = (k: string) => segments.find((s) => s.item.key === k)!.lane;
    expect(lane("long")).toBe(0);
    expect(lane("later")).toBe(0);
    expect(lane("short")).toBe(1);
    expect(lane("same-day")).toBe(2);
    expect(laneCount).toBe(3);
  });

  it("ignores items outside the range", () => {
    expect(layoutSpans([span("x", 8 * D, 9 * D)], week).segments).toHaveLength(0);
  });
});

describe("visibleSpans", () => {
  it("replaces the last lane with a +N counter on overflowing days", () => {
    const items = [
      span("a", 0, D),
      span("b", 0, D),
      span("c", 0, D),
      span("d", 0, D),
      span("e", D, 2 * D), // day 1 only has one item
    ];
    const { segments } = layoutSpans(items, week);
    const { shown, more } = visibleSpans(segments, 7, 3);
    // Day 0: 4 items → 2 shown + "+2"
    expect(shown.filter((s) => s.startCol === 0)).toHaveLength(2);
    expect(more[0]).toBe(2);
    // Day 1 fits.
    expect(more[1]).toBe(0);
    expect(shown.some((s) => s.item.key === "e")).toBe(true);
  });

  it("hides a multi-day bar in the last lane if any of its days overflows", () => {
    const items = [
      span("a", 0, D),
      span("b", 0, 2 * D),
      span("bar", 0, 3 * D),
      span("x", 2 * D, 3 * D),
      span("y", 2 * D, 3 * D),
      span("z", 2 * D, 3 * D),
    ];
    const { segments } = layoutSpans(items, week);
    const { shown, more } = visibleSpans(segments, 7, 3);
    expect(shown.find((s) => s.item.key === "bar")).toBeDefined(); // lane 0
    const hiddenKeys = segments
      .filter((s) => !shown.includes(s))
      .map((s) => s.item.key)
      .sort();
    expect(hiddenKeys.length).toBeGreaterThan(0);
    expect(more[2]).toBeGreaterThan(0);
  });
});

describe("layoutTimed", () => {
  const day = { start: 0, end: D };

  it("positions a single event as a fraction of the day", () => {
    const [box] = layoutTimed([span("a", 6 * H, 12 * H)], day.start, day.end);
    expect(box).toMatchObject({ top: 0.25, height: 0.25, col: 0, cols: 1, span: 1 });
  });

  it("puts overlapping events side by side", () => {
    const boxes = layoutTimed(
      [span("a", 9 * H, 11 * H), span("b", 10 * H, 12 * H), span("c", 13 * H, 14 * H)],
      day.start,
      day.end,
    );
    const get = (k: string) => boxes.find((b) => b.item.key === k)!;
    expect(get("a")).toMatchObject({ col: 0, cols: 2 });
    expect(get("b")).toMatchObject({ col: 1, cols: 2 });
    // A separate cluster gets the full width.
    expect(get("c")).toMatchObject({ col: 0, cols: 1, span: 1 });
  });

  it("reuses freed columns and expands into free space", () => {
    const boxes = layoutTimed(
      [
        span("a", 9 * H, 12 * H),
        span("b", 9 * H, 10 * H),
        span("c", 9.5 * H, 10.5 * H),
        span("d", 10.5 * H, 11 * H),
      ],
      day.start,
      day.end,
    );
    const get = (k: string) => boxes.find((b) => b.item.key === k)!;
    expect(get("a")).toMatchObject({ col: 0, cols: 3 });
    expect(get("b")).toMatchObject({ col: 1 });
    expect(get("c")).toMatchObject({ col: 2 });
    // d starts after b and c ended → takes column 1 and stretches over column 2.
    expect(get("d")).toMatchObject({ col: 1, span: 2 });
  });

  it("clips events crossing midnight and enforces a minimum height", () => {
    const boxes = layoutTimed(
      [span("late", 22 * H, 26 * H), span("early", -2 * H, 1 * H), span("point", 8 * H, 8 * H)],
      day.start,
      day.end,
      30 * 60_000,
    );
    const get = (k: string) => boxes.find((b) => b.item.key === k)!;
    expect(get("late")).toMatchObject({ endsAfter: true, startsBefore: false });
    expect(get("late").top + get("late").height).toBeCloseTo(1);
    expect(get("early")).toMatchObject({ top: 0, startsBefore: true });
    expect(get("point").height).toBeCloseTo(0.5 / 24);
  });
});
