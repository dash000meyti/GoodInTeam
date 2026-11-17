import { describe, expect, it } from "vitest";
import {
  brandById,
  brandIds,
  brandIntro,
  brandOf,
  brands,
  isSubBrand,
  isValidSuffix,
  subBrandIds,
} from "./brands";
import { brandLogoLayout } from "./pixel-font";
import { pixelIconNames } from "./pixel-icons";

describe("brand registry", () => {
  it("lists team, studio, code in registry order", () => {
    expect(brandIds).toEqual(["team", "studio", "code"]);
    expect(brands.filter((b) => "master" in b && b.master).map((b) => b.id)).toEqual(["team"]);
  });

  it("every brand has a valid suffix, a 34×18 logo and a real icon", () => {
    for (const b of brands) {
      expect(isValidSuffix(b.suffix), b.id).toBe(true);
      const l = brandLogoLayout(b.suffix);
      expect([l.width, l.height], b.id).toEqual([34, 18]);
      expect(pixelIconNames).toContain(b.icon);
    }
  });

  it("isValidSuffix rejects lower case, unknown glyphs, empty and too-wide words", () => {
    expect(isValidSuffix("code")).toBe(false);
    expect(isValidSuffix("CODE!")).toBe(false);
    expect(isValidSuffix("")).toBe(false);
    expect(isValidSuffix("ACADEMYX")).toBe(false); // 39 cells
    expect(isValidSuffix("LABS")).toBe(true);
  });

  it("every sub-brand has its own landing page; the master brand lives on /about", () => {
    expect(subBrandIds).toEqual(["studio", "code"]);
    expect(subBrandIds.map((id) => brandById(id).href)).toEqual(["/studio", "/code"]);
    expect(brandById("team").href).toBe("/about");
    for (const id of subBrandIds) expect(brandIntro[id]).toMatch(/^brand\w+Intro$/);
    expect(isSubBrand("studio")).toBe(true);
    expect(isSubBrand("team")).toBe(false);
    expect(isSubBrand("services")).toBe(false);
  });

  it("brandOf falls back to team", () => {
    expect(brandOf({ brand: "studio" })).toBe("studio");
    expect(brandOf({ brand: "nope" })).toBe("team");
    expect(brandOf({})).toBe("team");
    expect(brandOf(null)).toBe("team");
    expect(brandOf(undefined)).toBe("team");
  });
});
