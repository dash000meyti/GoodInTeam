import { describe, expect, it } from "vitest";
import { packRows, type FrameBp, type FrameCols, type FrameSpan } from "./frame-plan";

/**
 * Every grid the site pages render (spec §6.1, §9), with each possible
 * streamed count: no mid-grid hole at md or lg, and the trailing tracks the
 * pages feed to FrameFiller. The span lists mirror the JSX of each page
 * (cells actually rendered at that breakpoint, fillers excluded).
 */

type Spans = readonly (FrameSpan | undefined)[];
const BPS: FrameBp[] = ["md", "lg"];
const ones = (n: number): Spans => Array.from({ length: n }, () => undefined);

function noHoles(spans: Spans, cols: FrameCols) {
  const out = {} as Record<FrameBp, number>;
  for (const bp of BPS) {
    const r = packRows(spans, cols, bp);
    expect(r.holes, `${JSON.stringify(spans)} cols=${cols} @${bp}`).toBe(0);
    out[bp] = r.trailing;
  }
  return out;
}

/** After the trailing fillers the grid is complete: a second pass leaves nothing. */
function filled(spans: Spans, cols: FrameCols) {
  const t = noHoles(spans, cols);
  for (const bp of BPS) {
    const r = packRows([...spans, ...ones(t[bp])], cols, bp);
    expect(r, `${cols}@${bp} after fillers`).toEqual({ holes: 0, trailing: 0 });
  }
  return t;
}

describe("PageHero and first boxes (2-1 header row)", () => {
  it("header cell + decor end cell fills the row at lg and stacks at md", () => {
    // PageHero (/work, /services, /blog, /learn, /learn/[series]), /contact row 1,
    // detail headers (post, lesson, case study, service) and the 404 alert box.
    expect(filled([undefined, undefined], "2-1")).toEqual({ md: 0, lg: 0 });
  });

  it("the decor cell hidden below lg leaves a single full row at md", () => {
    // `hidden lg:flex` decor: only the header cell exists at md.
    expect(packRows([undefined], "2-1", "md")).toEqual({ holes: 0, trailing: 0 });
  });

  it("/about intro: text cell row2 + portrait window + profile card", () => {
    expect(filled(["row2", undefined, undefined], "2-1")).toEqual({ md: 0, lg: 0 });
  });

  it("detail first-box TL;DR row is a full FrameGrid 1", () => {
    expect(filled([undefined], 1)).toEqual({ md: 0, lg: 0 });
  });
});

describe("/work grid box", () => {
  it("chip row and pagination row are single FrameGrid 1 rows", () => {
    filled([undefined], 1);
  });

  it("0–12 case studies per page in a FrameGrid 3", () => {
    for (let n = 1; n <= 12; n++) {
      const t = filled(ones(n), 3);
      expect(t.lg).toBe((3 - (n % 3)) % 3);
      expect(t.md).toBe(n % 2);
    }
  });

  it("no works: one full-row empty cell", () => {
    expect(filled(["full"], 3)).toEqual({ md: 0, lg: 0 });
  });
});

describe("/blog grid box", () => {
  it("featured span=2 plus 0–12 posts", () => {
    for (let n = 0; n <= 12; n++) filled([2, ...ones(n)], 3);
  });

  it("filtered pages (no featured) with 1–12 posts", () => {
    for (let n = 1; n <= 12; n++) filled(ones(n), 3);
  });

  it("nothing found: one full-row empty cell", () => {
    expect(filled(["full"], 3)).toEqual({ md: 0, lg: 0 });
  });
});

describe("/learn", () => {
  it("course and tutorial grids (title rows stacked on FrameGrid 3) at 1–12 items", () => {
    filled([undefined], 1);
    for (let n = 1; n <= 12; n++) filled(ones(n), 3);
  });

  it("course lessons: one dots cell holding the LESSONS window", () => {
    filled([undefined], 1);
  });
});

describe("/services", () => {
  it("each brand box: full header row plus 0–6 service cells", () => {
    for (let n = 1; n <= 6; n++) filled(["full", ...ones(n)], 3);
  });

  it("an empty brand: header row plus the full-row ask cell", () => {
    expect(filled(["full", "full"], 3)).toEqual({ md: 0, lg: 0 });
  });

  it("process box: header row stacked on 4 step cells (cols 4)", () => {
    filled([undefined], 1);
    expect(filled(ones(4), 4)).toEqual({ md: 0, lg: 0 });
  });

  it("FAQ box: header cell + questions cell (2-1)", () => {
    expect(filled([undefined, undefined], "2-1")).toEqual({ md: 0, lg: 0 });
  });
});

describe("/about", () => {
  it("values box: header row stacked on 4 value cells (cols 4)", () => {
    expect(filled(ones(4), 4)).toEqual({ md: 0, lg: 0 });
  });
});

describe("detail bodies and end boxes", () => {
  it("article + sticky aside (2-1), or the article alone", () => {
    filled([undefined, undefined], "2-1");
    filled([undefined], 1);
    // aside hidden below lg (TOC): one cell at md
    expect(packRows([undefined], "2-1", "md")).toEqual({ holes: 0, trailing: 0 });
  });

  it("author + share row (2-1), or the share cell alone", () => {
    filled([undefined, undefined], "2-1");
    filled([undefined], 1);
  });

  it("previous/next row: two cells (a missing side is a dots slot)", () => {
    expect(filled([undefined, undefined], 2)).toEqual({ md: 0, lg: 0 });
  });

  it("case-study gallery (cols 2) at 1–6 images and related posts (cols 3) at 1–3", () => {
    for (let n = 1; n <= 6; n++) filled(ones(n), 2);
    for (let n = 1; n <= 3; n++) filled(ones(n), 3);
  });

  it("other services on a service page (cols 3) at 1–6", () => {
    for (let n = 1; n <= 6; n++) filled(ones(n), 3);
  });
});

describe("/contact", () => {
  it("header row and form row are both 2-1 rows of two cells", () => {
    expect(filled([undefined, undefined], "2-1")).toEqual({ md: 0, lg: 0 });
    // below lg the decor window is hidden: header alone, then form + direct contact stacked
    expect(packRows([undefined], "2-1", "md")).toEqual({ holes: 0, trailing: 0 });
  });
});

describe("404 alert box", () => {
  it("text cell + art cell (2-1); below lg they stack", () => {
    expect(filled([undefined, undefined], "2-1")).toEqual({ md: 0, lg: 0 });
  });
});
