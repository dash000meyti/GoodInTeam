import { describe, expect, it } from "vitest";
import { ICON_TONES, pixelIconNames, pixelIcons } from "./pixel-icons";

const NAMES = [
  "work",
  "services",
  "blog",
  "learn",
  "about",
  "studio",
  "code",
  "contact",
  "sign-in",
  "more",
  "search",
  "globe",
  "arrow",
];

describe("pixel icons", () => {
  it("is exactly the 13 icons of spec §4.3", () => {
    expect([...pixelIconNames].sort()).toEqual([...NAMES].sort());
  });

  it("every icon is 12×12 with allowed characters only", () => {
    for (const [name, rows] of Object.entries(pixelIcons)) {
      expect(rows, name).toHaveLength(12);
      for (const r of rows) {
        expect(r, name).toHaveLength(12);
        expect(r, name).toMatch(/^[.#y]+$/);
      }
    }
  });

  it("the outer ring of cells is empty", () => {
    for (const [name, rows] of Object.entries(pixelIcons)) {
      expect(rows[0], name).toBe(".".repeat(12));
      expect(rows[11], name).toBe(".".repeat(12));
      for (const r of rows) {
        expect(r[0], name).toBe(".");
        expect(r[11], name).toBe(".");
      }
    }
  });

  it("each icon has at most two tones and draws something", () => {
    for (const [name, rows] of Object.entries(pixelIcons)) {
      const used = new Set(rows.join("").replaceAll(".", ""));
      expect(used.size, name).toBeGreaterThan(0);
      expect(used.size, name).toBeLessThanOrEqual(2);
      for (const ch of used) expect(ch in ICON_TONES, name).toBe(true);
    }
  });

  it("the arrow is the given grid and vertically symmetric", () => {
    const a = pixelIcons.arrow;
    expect(a[5]).toBe(".##########.");
    for (let y = 0; y < 12; y++) expect(a[y]).toBe(a[11 - y]);
  });
});
