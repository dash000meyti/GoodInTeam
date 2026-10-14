import { describe, expect, it } from "vitest";
import { buildDocTree, escapeLike, flattenDocTree, makeSnippet, normalizeSearch } from "./tree";

const rows = [
  { id: "a", parentId: null, title: "Guide" },
  { id: "b", parentId: "a", title: "Checklist" },
  { id: "c", parentId: "b", title: "Deep" },
  { id: "d", parentId: null, title: "Other" },
  { id: "e", parentId: "hidden", title: "Orphan" },
  { id: "f", parentId: "f", title: "Self loop" },
];

describe("buildDocTree", () => {
  it("nests children and promotes orphans / self-loops to roots", () => {
    const tree = buildDocTree(rows);
    expect(tree.map((n) => n.id)).toEqual(["a", "d", "e", "f"]);
    expect(tree[0]!.children.map((n) => n.id)).toEqual(["b"]);
    expect(tree[0]!.children[0]!.children.map((n) => n.id)).toEqual(["c"]);
  });
});

describe("flattenDocTree", () => {
  it("returns depth-first rows with depth and can exclude a subtree", () => {
    const tree = buildDocTree(rows);
    expect(flattenDocTree(tree).map((r) => `${r.id}:${r.depth}`)).toEqual([
      "a:0",
      "b:1",
      "c:2",
      "d:0",
      "e:0",
      "f:0",
    ]);
    // Excluding "b" removes it and its descendant "c" (can't become their own parent).
    expect(flattenDocTree(tree, { exclude: "b" }).map((r) => r.id)).toEqual(["a", "d", "e", "f"]);
  });
});

describe("search helpers", () => {
  it("normalizes Arabic letters and case", () => {
    expect(normalizeSearch("كتاب علي API")).toBe("کتاب علی api");
  });

  it("escapes LIKE wildcards", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
  });

  it("builds a snippet around the first match with highlight ranges", () => {
    const text = `${"lorem ipsum ".repeat(20)}deploy with Docker then deploy again ${"dolor ".repeat(30)}`;
    const { snippet, ranges } = makeSnippet(text, "DEPLOY", 30);
    expect(snippet.startsWith("…")).toBe(true);
    expect(snippet.endsWith("…")).toBe(true);
    expect(ranges.length).toBe(2);
    for (const [s, e] of ranges) expect(snippet.slice(s, e).toLowerCase()).toBe("deploy");
  });

  it("matches Persian text typed with Arabic letters", () => {
    const { snippet, ranges } = makeSnippet("راهنمای کار با کلید API در تیم", "كليد");
    expect(ranges).toHaveLength(1);
    const [s, e] = ranges[0]!;
    expect(snippet.slice(s, e)).toBe("کلید");
  });

  it("falls back to the beginning of the text when there is no match", () => {
    const { snippet, ranges } = makeSnippet("short text", "zzz");
    expect(snippet).toBe("short text");
    expect(ranges).toEqual([]);
  });
});
