import { describe, expect, it } from "vitest";
import { addDays, startOfDay, startOfMonth, startOfWeek, zonedParts, zonedTimeToUtc } from "./tz";

const TZ = "Asia/Tehran"; // UTC+03:30, no DST since 2022

describe("tz helpers", () => {
  it("computes start of day in Tehran", () => {
    const at = new Date("2026-10-14T01:00:00Z"); // 04:30 Tehran
    expect(startOfDay(at, TZ).toISOString()).toBe("2026-10-13T20:30:00.000Z");
  });

  it("round-trips wall clock time", () => {
    const d = zonedTimeToUtc(2026, 3, 21, 9, 15, TZ);
    const p = zonedParts(d, TZ);
    expect([p.year, p.month, p.day, p.hour, p.minute]).toEqual([2026, 3, 21, 9, 15]);
  });

  it("starts weeks on Saturday for fa", () => {
    const wed = new Date("2026-10-14T08:00:00Z"); // Wednesday
    const start = startOfWeek(wed, TZ, 6);
    expect(zonedParts(start, TZ).weekday).toBe(6);
    expect(zonedParts(start, TZ).day).toBe(10);
  });

  it("starts Jalali months on day 1 (persian calendar)", () => {
    const d = new Date("2026-10-14T08:00:00Z"); // 22 Mehr 1405
    const start = startOfMonth(d, TZ, "persian");
    expect(zonedParts(start, TZ, "persian").day).toBe(1);
    expect(zonedParts(start, TZ, "persian").month).toBe(7);
  });

  it("adds days across month boundaries", () => {
    const d = zonedTimeToUtc(2026, 1, 31, 10, 0, TZ);
    const p = zonedParts(addDays(d, 1, TZ), TZ);
    expect([p.month, p.day, p.hour]).toEqual([2, 1, 10]);
  });
});
