import { describe, expect, it } from "vitest";
import {
  bpsToPercent,
  formatBytes,
  isValidTimeZone,
  mergeDeep,
  normalizeUrl,
  percentToBps,
  socialUrl,
  unflatten,
} from "./utils";

describe("socialUrl", () => {
  it.each([
    ["telegram", "@goodteam", "https://t.me/goodteam"],
    ["github", "mahdi", "https://github.com/mahdi"],
    ["youtube", "@studio", "https://www.youtube.com/@studio"],
    ["linkedin", "linkedin.com/in/me", "https://linkedin.com/in/me"],
    ["x", "https://x.com/me", "https://x.com/me"],
    ["instagram", "", ""],
  ] as const)("%s %j → %j", (network, input, out) => expect(socialUrl(network, input)).toBe(out));
});

describe("unflatten", () => {
  it("expands dotted keys", () => {
    expect(
      unflatten({ "brandName.fa": "گود", "brandName.en": "Good", "socials.x": "u", email: "e" }),
    ).toEqual({ brandName: { fa: "گود", en: "Good" }, socials: { x: "u" }, email: "e" });
  });
  it("handles deep paths and overwrites non-objects", () => {
    expect(unflatten({ a: 1, "a.b.c": 2 })).toEqual({ a: { b: { c: 2 } } });
  });
});

describe("mergeDeep", () => {
  const base = { a: { fa: "x", en: "y" }, n: 1, list: [1, 2] };
  it("merges nested objects and skips undefined", () => {
    expect(mergeDeep(base, { a: { en: "z" }, n: undefined })).toEqual({
      a: { fa: "x", en: "z" },
      n: 1,
      list: [1, 2],
    });
  });
  it("replaces arrays and primitives", () => {
    expect(mergeDeep(base, { list: [3], n: 2 })).toEqual({ ...base, list: [3], n: 2 });
  });
  it("does not mutate the base", () => {
    mergeDeep(base, { a: { fa: "changed" } });
    expect(base.a.fa).toBe("x");
  });
});

describe("percent ⇄ basis points", () => {
  it("converts and rounds", () => {
    expect(percentToBps(9)).toBe(900);
    expect(percentToBps(9.5)).toBe(950);
    expect(percentToBps(0.125)).toBe(13);
    expect(bpsToPercent(1000)).toBe(10);
    expect(bpsToPercent(950)).toBe(9.5);
  });
});

describe("normalizeUrl", () => {
  it.each([
    ["", ""],
    ["  ", ""],
    ["t.me/goodteam", "https://t.me/goodteam"],
    ["https://github.com/me", "https://github.com/me"],
    ["//cdn.example.com/a.png", "https://cdn.example.com/a.png"],
    ["/media/me.jpg", "/media/me.jpg"],
    ["mailto:hi@x.ir", "mailto:hi@x.ir"],
  ])("%j → %j", (input, out) => expect(normalizeUrl(input)).toBe(out));
});

describe("isValidTimeZone", () => {
  it("accepts IANA zones and rejects junk", () => {
    expect(isValidTimeZone("Asia/Tehran")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});

describe("formatBytes", () => {
  it("uses binary units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1023)).toBe("1,023 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
  });
  it("localizes digits", () => {
    expect(formatBytes(1536, "fa-IR")).toBe("۱٫۵ KB");
  });
});
