import { describe, expect, it } from "vitest";
import { zonedTimeToUtc } from "@/lib/tz";
import { resolveRange } from "./ranges";

const TZ = "Asia/Tehran";
// Wednesday 14 Oct 2026 (22 Mehr 1405), 10:00 Tehran.
const now = zonedTimeToUtc(2026, 10, 14, 10, 0, TZ).getTime();
const keys = (r: ReturnType<typeof resolveRange>) => [r.preset, r.fromKey, r.toKey];

describe("resolveRange", () => {
  it("uses Saturday weeks and Jalali months for fa", () => {
    const fa = { now, tz: TZ, locale: "fa" as const };
    expect(keys(resolveRange({}, fa))).toEqual(["this_week", "2026-10-10", "2026-10-16"]);
    expect(keys(resolveRange({ preset: "last_week" }, fa))).toEqual([
      "last_week",
      "2026-10-03",
      "2026-10-09",
    ]);
    // Mehr 1405 = 23 Sep – 22 Oct 2026; Shahrivar 1405 = 23 Aug – 22 Sep.
    expect(keys(resolveRange({ preset: "this_month" }, fa))).toEqual([
      "this_month",
      "2026-09-23",
      "2026-10-22",
    ]);
    expect(keys(resolveRange({ preset: "last_month" }, fa))).toEqual([
      "last_month",
      "2026-08-23",
      "2026-09-22",
    ]);
  });

  it("uses Monday weeks and Gregorian months for en", () => {
    const en = { now, tz: TZ, locale: "en" as const };
    expect(keys(resolveRange({ preset: "this_week" }, en))).toEqual([
      "this_week",
      "2026-10-12",
      "2026-10-18",
    ]);
    expect(keys(resolveRange({ preset: "this_month" }, en))).toEqual([
      "this_month",
      "2026-10-01",
      "2026-10-31",
    ]);
    expect(keys(resolveRange({ preset: "last_30" }, en))).toEqual([
      "last_30",
      "2026-09-15",
      "2026-10-14",
    ]);
  });

  it("handles custom ranges (inclusive, swapped, invalid)", () => {
    const en = { now, tz: TZ, locale: "en" as const };
    expect(
      keys(resolveRange({ preset: "custom", from: "2026-01-01", to: "2026-01-31" }, en)),
    ).toEqual(["custom", "2026-01-01", "2026-01-31"]);
    expect(
      keys(resolveRange({ preset: "custom", from: "2026-01-31", to: "2026-01-01" }, en)),
    ).toEqual(["custom", "2026-01-01", "2026-01-31"]);
    expect(resolveRange({ preset: "custom", from: "nope" }, en).preset).toBe("this_week");
    expect(resolveRange({ preset: "bogus" }, en).preset).toBe("this_week");
  });
});
