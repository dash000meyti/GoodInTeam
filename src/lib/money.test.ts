import { describe, expect, it } from "vitest";
import {
  currencyCodes,
  isCurrency,
  normalizeNumberInput,
  parseDecimalInput,
  parseMoneyInput,
  toMinor,
} from "./money";

describe("isCurrency", () => {
  it("accepts every supported code", () => {
    for (const c of currencyCodes) expect(isCurrency(c)).toBe(true);
  });

  it("rejects prototype keys, unknown codes and non-strings", () => {
    for (const v of ["toString", "__proto__", "constructor", "hasOwnProperty", "usd", "XYZ", ""])
      expect(isCurrency(v)).toBe(false);
    expect(isCurrency(1)).toBe(false);
    expect(isCurrency(null)).toBe(false);
    expect(isCurrency(undefined)).toBe(false);
  });
});

describe("parseDecimalInput", () => {
  it("parses plain decimals", () => {
    expect(parseDecimalInput("12500")).toBe(12500);
    expect(parseDecimalInput("120.5")).toBe(120.5);
    expect(parseDecimalInput(".5")).toBe(0.5);
    expect(parseDecimalInput("-3.25")).toBe(-3.25);
    expect(parseDecimalInput("  42 ")).toBe(42);
  });

  it("normalizes Persian/Arabic digits and thousands separators", () => {
    expect(parseDecimalInput("۱۲٬۵۰۰")).toBe(12500);
    expect(parseDecimalInput("12,500")).toBe(12500);
    expect(parseDecimalInput("1 250 000")).toBe(1250000);
    expect(parseDecimalInput("١٢٣")).toBe(123);
    expect(parseDecimalInput("۱۲٫۵")).toBe(12.5);
    expect(parseDecimalInput("−۵")).toBe(-5);
  });

  it("rejects hex, exponents, Infinity and junk", () => {
    for (const v of [
      "0x10",
      "1e3",
      "Infinity",
      "-Infinity",
      "NaN",
      "abc",
      "12abc",
      "1.2.3",
      "",
      "-",
      ".",
    ])
      expect(parseDecimalInput(v)).toBeNull();
  });

  it("normalizeNumberInput keeps the sign and decimal point", () => {
    expect(normalizeNumberInput("۱٬۲۵۰٫۵۰")).toBe("1250.50");
  });
});

describe("parseMoneyInput", () => {
  it("returns minor units in the currency's precision", () => {
    expect(parseMoneyInput("1,250.50", "USD")).toBe(125050);
    expect(parseMoneyInput("۱٬۲۵۰", "IRT")).toBe(1250);
    expect(parseMoneyInput("0x10", "USD")).toBeNull();
    expect(parseMoneyInput("", "USD")).toBeNull();
  });

  it("toMinor rounds to integer minor units", () => {
    expect(toMinor(19.99, "USD")).toBe(1999);
    expect(toMinor(1500000, "IRT")).toBe(1500000);
  });
});
