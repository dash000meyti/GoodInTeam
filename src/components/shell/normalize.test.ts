import { describe, expect, it } from "vitest";
import { matchesQuery, normalizeQuery } from "./normalize";

describe("normalizeQuery", () => {
  it("maps Arabic letters to their Persian forms", () => {
    expect(normalizeQuery("علي")).toBe("علی");
    expect(normalizeQuery("موسى")).toBe("موسی");
    expect(normalizeQuery("كد")).toBe("کد");
    expect(normalizeQuery("مدرسة")).toBe("مدرسه");
  });

  it("removes ZWNJ, tatweel and diacritics", () => {
    expect(normalizeQuery("می‌خواهم")).toBe("میخواهم");
    expect(normalizeQuery("کـــد")).toBe("کد");
    expect(normalizeQuery("کِتاب")).toBe("کتاب");
  });

  it("maps Persian and Arabic-Indic digits to ASCII", () => {
    expect(normalizeQuery("۱۲۳۴۵۶۷۸۹۰")).toBe("1234567890");
    expect(normalizeQuery("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
  });

  it("lower-cases and collapses whitespace", () => {
    expect(normalizeQuery("  Good   In\tTEAM ")).toBe("good in team");
  });
});

describe("matchesQuery", () => {
  it("finds «علی» when «علي» is typed", () => {
    expect(matchesQuery("درباره علی", "علي")).toBe(true);
  });
  it("finds «میخواهم» for «مي‌خواهم»", () => {
    expect(matchesQuery("میخواهم", "مي‌خواهم")).toBe(true);
  });
  it("finds «۱۲» for 12 and the reverse", () => {
    expect(matchesQuery("فصل ۱۲", "12")).toBe(true);
    expect(matchesQuery("Chapter 12", "۱۲")).toBe(true);
  });
  it("is case-insensitive and rejects non-matches", () => {
    expect(matchesQuery("Good In Studio", "studio")).toBe(true);
    expect(matchesQuery("Good In Studio", "code")).toBe(false);
  });
});
