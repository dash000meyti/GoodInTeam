import { describe, expect, it } from "vitest";
import {
  FILLER_CLASS,
  FRAME_TRACKS,
  fillerPlan,
  packRows,
  type FrameBp,
  type FrameCols,
  type FrameSpan,
} from "./frame-plan";

type Spans = readonly (FrameSpan | undefined)[];
const BPS: FrameBp[] = ["md", "lg"];
const ones = (n: number) => Array.from({ length: n }, () => undefined);

/** Every layout must leave no mid-grid hole; returns the trailing counts. */
function noHoles(spans: Spans, cols: FrameCols) {
  const out = {} as Record<FrameBp, number>;
  for (const bp of BPS) {
    const r = packRows(spans, cols, bp);
    expect(r.holes, `${JSON.stringify(spans)} cols=${cols} @${bp}`).toBe(0);
    out[bp] = r.trailing;
  }
  return out;
}

describe("packRows", () => {
  it("uses the literal track map of FrameGrid", () => {
    expect(FRAME_TRACKS).toEqual({
      1: { md: 1, lg: 1 },
      2: { md: 2, lg: 2 },
      3: { md: 2, lg: 3 },
      4: { md: 2, lg: 4 },
      "2-1": { md: 1, lg: 2 },
      hero: { md: 1, lg: 2 },
    });
  });

  it("counts trailing tracks for plain cells in every cols value", () => {
    for (const cols of Object.keys(FRAME_TRACKS).map((k) =>
      /^\d$/.test(k) ? Number(k) : k,
    ) as FrameCols[])
      for (const bp of BPS) {
        const tracks = FRAME_TRACKS[cols][bp];
        for (let n = 0; n <= 7; n++) {
          const r = packRows(ones(n), cols, bp);
          expect(r.holes).toBe(0);
          expect(r.trailing, `${cols}@${bp} n=${n}`).toBe(
            n === 0 ? 0 : (tracks - (n % tracks)) % tracks,
          );
        }
      }
  });

  it("detects a mid-grid hole when a wide cell wraps", () => {
    // lg 3 tracks: ·, ·, then a span-2 cell cannot fit → a hole at the end of row 0.
    expect(packRows([undefined, undefined, 2], 3, "lg")).toEqual({ holes: 1, trailing: 1 });
    // md 2 tracks: · then md2 wraps.
    expect(packRows([undefined, "md2"], 3, "md")).toEqual({ holes: 1, trailing: 0 });
  });

  it("handles row2 with a 2D occupancy grid", () => {
    // lg: A spans two rows at col 0, four cells fill the rest of rows 0-1.
    expect(packRows(["row2", ...ones(4)], 3, "lg")).toEqual({ holes: 0, trailing: 0 });
    // lg: · then row2 → fillers reach (0,2), (1,0), (1,2).
    expect(packRows([undefined, "row2"], 3, "lg")).toEqual({ holes: 0, trailing: 3 });
    // md: row2 is one row tall.
    expect(packRows(["row2", undefined], 3, "md")).toEqual({ holes: 0, trailing: 0 });
  });

  it("full spans every track; spans wider than the grid are clamped", () => {
    expect(packRows(["full", undefined], 4, "lg")).toEqual({ holes: 0, trailing: 3 });
    expect(packRows([3], "2-1", "md")).toEqual({ holes: 0, trailing: 0 });
  });
});

describe("home layouts (spec §8)", () => {
  it("hero: start cell + decor end cell", () => {
    expect(noHoles(ones(2), "hero")).toEqual({ md: 0, lg: 0 });
  });

  it("brands: header + logo row, then three brand cells", () => {
    expect(noHoles(ones(2), 2)).toEqual({ md: 0, lg: 0 });
    expect(noHoles(ones(3), 3)).toEqual({ md: 1, lg: 0 });
  });

  it("work: 0–3 works (header md2, work 1 or its slot span 2, the rest, view-all)", () => {
    const layouts: Record<number, Spans> = {
      3: ["md2", 2, undefined, undefined, undefined],
      2: ["md2", 2, undefined, undefined],
      1: ["md2", 2, undefined],
      0: ["md2", 2, undefined], // work 1 is a span-2 dots slot
    };
    expect(noHoles(layouts[3]!, 3)).toEqual({ md: 1, lg: 0 });
    expect(noHoles(layouts[2]!, 3)).toEqual({ md: 0, lg: 1 });
    expect(noHoles(layouts[1]!, 3)).toEqual({ md: 1, lg: 2 });
    expect(noHoles(layouts[0]!, 3)).toEqual({ md: 1, lg: 2 });
  });

  it("services: header + 0–5 services, fillers complete to 6", () => {
    for (let n = 0; n <= 5; n++) {
      const plain = noHoles([undefined, ...ones(n)], 3);
      expect(plain.lg, `n=${n}`).toBe((3 - ((1 + n) % 3)) % 3);
      noHoles(["md2", ...ones(n)], 3); // a full-row header at md is fine too
    }
  });

  it("process: a full header row stacked on a 2-1 grid", () => {
    expect(noHoles(["full"], 1)).toEqual({ md: 0, lg: 0 });
    expect(noHoles(ones(2), "2-1")).toEqual({ md: 0, lg: 0 });
  });

  it("stats (StatsCells): four cells in FrameGrid 4", () => {
    expect(noHoles(ones(4), 4)).toEqual({ md: 0, lg: 0 });
  });

  it("latest: with a course and without, 0–3 posts (missing posts are slot cells)", () => {
    const course: Spans = ["md2", undefined, undefined, 3];
    const noCourse: Spans = ["md2", undefined, undefined, undefined, "lg2"];
    for (let posts = 0; posts <= 3; posts++) {
      expect(noHoles(course, 3), `course, ${posts} posts`).toEqual({ md: 0, lg: 0 });
      expect(noHoles(noCourse, 3), `no course, ${posts} posts`).toEqual({ md: 0, lg: 0 });
    }
  });

  it("kind words: full header + 0–6 testimonials", () => {
    for (let n = 0; n <= 6; n++) {
      const r = noHoles(["full", ...ones(n)], 3);
      expect(r.lg).toBe(n === 0 ? 0 : (3 - (n % 3)) % 3);
    }
  });

  it("CtaBand: one full-width cell", () => {
    expect(noHoles(ones(1), 1)).toEqual({ md: 0, lg: 0 });
  });
});

describe("footer (spec §7.5)", () => {
  it("row 1: four cells in FrameGrid 4, then full rows", () => {
    expect(noHoles(ones(4), 4)).toEqual({ md: 0, lg: 0 });
    expect(noHoles(["full"], 1)).toEqual({ md: 0, lg: 0 });
  });
});

describe("fillerPlan", () => {
  it("maps md/lg trailing counts to literal visibility classes", () => {
    expect(fillerPlan(0, 0)).toEqual([]);
    expect(fillerPlan(1, 1)).toEqual([FILLER_CLASS.both]);
    expect(fillerPlan(1, 2)).toEqual([FILLER_CLASS.both, FILLER_CLASS.lg]);
    expect(fillerPlan(1, 0)).toEqual([FILLER_CLASS.md]);
    expect(fillerPlan(0, 2)).toEqual([FILLER_CLASS.lg, FILLER_CLASS.lg]);
    expect(FILLER_CLASS).toEqual({
      both: "hidden md:block",
      md: "hidden md:block lg:hidden",
      lg: "hidden lg:block",
    });
  });
});
