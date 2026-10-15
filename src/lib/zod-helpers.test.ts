import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  zCurrency,
  zNullDay,
  zNullNumber,
  zNullNumberOf,
  zOptDay,
  zOptInt,
  zOptNumber,
  zOptNumberOf,
} from "./zod-helpers";

/** Marker for "key not present at all" (vs. present with `undefined`). */
const ABSENT = Symbol("absent");
const parse = <S extends z.ZodType>(schema: S, value: unknown) =>
  z.object({ v: schema }).safeParse(value === ABSENT ? {} : { v: value });

describe("zOptNumber", () => {
  it("accepts JSON numbers and plain decimal strings", () => {
    expect(parse(zOptNumber, 12.5).data?.v).toBe(12.5);
    expect(parse(zOptNumber, "120.5").data?.v).toBe(120.5);
    expect(parse(zOptNumber, "-4").data?.v).toBe(-4);
  });

  it("normalizes Persian digits and thousands separators", () => {
    expect(parse(zOptNumber, "۱۲٬۵۰۰").data?.v).toBe(12500);
    expect(parse(zOptNumber, "12,500").data?.v).toBe(12500);
    expect(parse(zOptNumber, "۱۲٫۵").data?.v).toBe(12.5);
  });

  it("rejects hex, exponents, Infinity and junk", () => {
    for (const v of ["0x10", "1e3", "Infinity", "abc", "1.2.3", "12px", true, {}])
      expect(parse(zOptNumber, v).success).toBe(false);
    expect(parse(zOptNumber, Number.POSITIVE_INFINITY).success).toBe(false);
    expect(parse(zOptNumber, Number.NaN).success).toBe(false);
  });

  it("treats empty input as undefined", () => {
    for (const v of ["", "  ", null, undefined, ABSENT]) {
      const r = parse(zOptNumber, v);
      expect(r.success).toBe(true);
      expect(r.data?.v).toBeUndefined();
    }
  });

  it("zOptInt rejects fractions; bounds come from the base schema", () => {
    expect(parse(zOptInt, "۴۲").data?.v).toBe(42);
    expect(parse(zOptInt, "4.5").success).toBe(false);
    expect(parse(zOptInt, "0x10").success).toBe(false);
    const nonNegative = zOptNumberOf(z.number().min(0));
    expect(parse(nonNegative, "-1").success).toBe(false);
    expect(parse(nonNegative, "0").data?.v).toBe(0);
  });
});

describe("zNullNumber (updates)", () => {
  it("absent → undefined (untouched), empty / null → null (clear)", () => {
    expect(parse(zNullNumber, ABSENT).data).toEqual({});
    expect(parse(zNullNumber, undefined).data?.v).toBeUndefined();
    expect(parse(zNullNumber, "").data?.v).toBeNull();
    expect(parse(zNullNumber, null).data?.v).toBeNull();
    expect(parse(zNullNumber, "۱۲٬۵۰۰").data?.v).toBe(12500);
    expect(parse(zNullNumber, "1e3").success).toBe(false);
    expect(parse(zNullNumberOf(z.number().min(0)), "-1").success).toBe(false);
  });
});

describe("zCurrency", () => {
  it("accepts supported codes (case-insensitive)", () => {
    expect(parse(zCurrency, "USD").data?.v).toBe("USD");
    expect(parse(zCurrency, " eur ").data?.v).toBe("EUR");
  });

  it("rejects unknown codes and prototype keys", () => {
    for (const v of ["XYZ", "toString", "__proto__", "", 1, null])
      expect(parse(zCurrency, v).success).toBe(false);
  });
});

describe("zOptDay / zNullDay", () => {
  it("accept real calendar days and ISO date-times", () => {
    expect(parse(zOptDay, "2026-10-15").data?.v).toBe("2026-10-15");
    expect(parse(zOptDay, "2026-10-15T10:00:00Z").success).toBe(true);
    expect(parse(zOptDay, "2028-02-29").success).toBe(true);
  });

  it("reject impossible days and junk", () => {
    for (const v of ["2026-13-01", "2026-02-30", "tomorrow", "15/10/2026", "2026-1-5"])
      expect(parse(zOptDay, v).success).toBe(false);
  });

  it("create: empty → undefined; update: absent → untouched, empty / null → null", () => {
    expect(parse(zOptDay, "").data?.v).toBeUndefined();
    expect(parse(zOptDay, null).data?.v).toBeUndefined();
    expect(parse(zNullDay, ABSENT).data).toEqual({});
    expect(parse(zNullDay, "").data?.v).toBeNull();
    expect(parse(zNullDay, null).data?.v).toBeNull();
    expect(parse(zNullDay, "2026-10-15").data?.v).toBe("2026-10-15");
  });
});
