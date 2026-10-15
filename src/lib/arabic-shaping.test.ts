import { describe, expect, it } from "vitest";
import { bidiRuns, hasRtl, shapeArabic, visualRtl } from "./arabic-shaping";

const cps = (s: string) => Array.from(s, (c) => c.codePointAt(0)!.toString(16));

describe("shapeArabic", () => {
  it("picks initial / medial / final forms", () => {
    // ب ب ب → init, medi, fina
    expect(cps(shapeArabic("ببب"))).toEqual(["fe91", "fe92", "fe90"]);
  });

  it("handles right-joining letters (no join after alef)", () => {
    // سلام: س init, ل medi, ا fina? (lam+alef → ligature), م isolated
    expect(cps(shapeArabic("سلام"))).toEqual(["feb3", "fefc", "fee1"]);
  });

  it("supports Persian letters and ZWNJ", () => {
    // گل‌ها: گ init, ل fina, ZWNJ, ه init, ا fina
    expect(cps(shapeArabic("گل‌ها"))).toEqual(["fb94", "fede", "200c", "feeb", "fe8e"]);
    // پی → پ init, ی fina
    expect(cps(shapeArabic("پی"))).toEqual(["fb58", "fbfd"]);
  });

  it("keeps non-Arabic characters untouched", () => {
    expect(shapeArabic("Next.js 16")).toBe("Next.js 16");
  });
});

describe("visualRtl", () => {
  it("reverses letters but keeps numbers in reading order", () => {
    const v = visualRtl("سال۲۰۲۶");
    expect(v.endsWith("ﺱ") || v.includes("۲۰۲۶")).toBe(true);
    expect(v.startsWith("۲۰۲۶")).toBe(true);
  });

  it("mirrors brackets", () => {
    expect(visualRtl("(ب)")).toBe(`(${String.fromCodePoint(0xfe8f)})`);
  });
});

describe("bidiRuns", () => {
  it("groups consecutive LTR words", () => {
    expect(bidiRuns("با React Native و Expo")).toEqual([
      { text: "با", rtl: true },
      { text: "React Native", rtl: false },
      { text: "و", rtl: true },
      { text: "Expo", rtl: false },
    ]);
    expect(hasRtl("hello")).toBe(false);
    expect(hasRtl("سلام")).toBe(true);
  });
});
