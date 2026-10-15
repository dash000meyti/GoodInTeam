import { describe, expect, it } from "vitest";
import {
  addDaysKey,
  calendarParts,
  dayBounds,
  dayKeyOf,
  dayStartMs,
  diffDaysKey,
  isDayKey,
  monthStartKey,
  monthWeeks,
  nextMonthStartKey,
  parseView,
  prevMonthStartKey,
  shiftAnchor,
  startOfWeekKey,
  viewRange,
  wallTimeMs,
  weekdayOfKey,
  type CalendarConfig,
} from "./grid";

const FA: CalendarConfig = { tz: "Asia/Tehran", calendar: "persian", weekStartsOn: 6 };
const EN: CalendarConfig = { tz: "Asia/Tehran", calendar: "gregory", weekStartsOn: 1 };

describe("day keys", () => {
  it("validates keys", () => {
    expect(isDayKey("2026-10-14")).toBe(true);
    expect(isDayKey("2026-02-30")).toBe(false);
    expect(isDayKey("2026-1-4")).toBe(false);
    expect(isDayKey(undefined)).toBe(false);
  });

  it("does civil-date arithmetic across months and years", () => {
    expect(addDaysKey("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(diffDaysKey("2026-10-14", "2026-10-21")).toBe(7);
    expect(weekdayOfKey("2026-10-14")).toBe(3); // Wednesday
  });

  it("converts between keys and instants in the app timezone", () => {
    // Tehran is UTC+3:30 → local midnight is 20:30 UTC the day before.
    expect(new Date(dayStartMs("2026-10-14", "Asia/Tehran")).toISOString()).toBe(
      "2026-10-13T20:30:00.000Z",
    );
    expect(dayKeyOf(Date.parse("2026-10-13T21:00:00Z"), "Asia/Tehran")).toBe("2026-10-14");
    expect(new Date(wallTimeMs("2026-10-14", "10:15", "Asia/Tehran")).toISOString()).toBe(
      "2026-10-14T06:45:00.000Z",
    );
  });

  it("handles DST days (23h / 25h) in other timezones", () => {
    const [d] = dayBounds(["2026-03-29"], "Europe/Berlin");
    expect((d!.end - d!.start) / 3_600_000).toBe(23);
  });
});

describe("calendar systems", () => {
  it("reads Jalali parts of a civil date", () => {
    expect(calendarParts("2026-10-14", "persian")).toEqual({ year: 1405, month: 7, day: 22 });
    expect(calendarParts("2026-10-14", "gregory")).toEqual({ year: 2026, month: 10, day: 14 });
  });

  it("finds Jalali month boundaries (Mehr 1405, Nowruz)", () => {
    expect(monthStartKey("2026-10-14", "persian")).toBe("2026-09-23");
    expect(nextMonthStartKey("2026-10-14", "persian")).toBe("2026-10-23");
    expect(prevMonthStartKey("2026-10-14", "persian")).toBe("2026-08-23");
    // Esfand 1404 (29 days) → Farvardin 1405
    expect(nextMonthStartKey("2026-03-01", "persian")).toBe("2026-03-21");
    expect(prevMonthStartKey("2026-03-21", "persian")).toBe("2026-02-20");
  });

  it("finds Gregorian month boundaries", () => {
    expect(monthStartKey("2026-10-14", "gregory")).toBe("2026-10-01");
    expect(nextMonthStartKey("2026-12-31", "gregory")).toBe("2027-01-01");
    expect(prevMonthStartKey("2026-03-01", "gregory")).toBe("2026-02-01");
  });

  it("starts weeks on Saturday (fa) / Monday (en)", () => {
    expect(startOfWeekKey("2026-10-14", 6)).toBe("2026-10-10");
    expect(startOfWeekKey("2026-10-10", 6)).toBe("2026-10-10");
    expect(startOfWeekKey("2026-10-14", 1)).toBe("2026-10-12");
    expect(startOfWeekKey("2026-10-18", 1)).toBe("2026-10-12"); // Sunday
  });
});

describe("views", () => {
  it("parses the view param", () => {
    expect(parseView("week")).toBe("week");
    expect(parseView("nope")).toBe("month");
    expect(parseView(undefined)).toBe("month");
  });

  it("builds a Jalali month grid starting on Saturday", () => {
    const weeks = monthWeeks("2026-10-14", FA);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]![0]).toMatchObject({ key: "2026-09-19", weekday: 6, inMonth: false });
    const first = weeks.flat().find((c) => c.inMonth)!;
    expect(first).toMatchObject({ key: "2026-09-23", day: 1, gregorianDay: 23 });
    const inMonth = weeks.flat().filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(30); // Mehr has 30 days
    expect(weeks.at(-1)!.at(-1)!.key).toBe("2026-10-23");
  });

  it("builds a Gregorian month grid starting on Monday", () => {
    const weeks = monthWeeks("2026-10-14", EN);
    expect(weeks[0]![0]!.key).toBe("2026-09-28");
    expect(weeks.flat().filter((c) => c.inMonth)).toHaveLength(31);
    expect(weeks.at(-1)!.at(-1)!.key).toBe("2026-11-01");
    for (const w of weeks) expect(w[0]!.weekday).toBe(1);
  });

  it("computes ranges for week, day and agenda", () => {
    expect(viewRange("week", "2026-10-14", FA)).toMatchObject({
      startKey: "2026-10-10",
      endKey: "2026-10-17",
    });
    expect(viewRange("week", "2026-10-14", FA).days).toHaveLength(7);
    expect(viewRange("day", "2026-10-14", FA).days).toEqual(["2026-10-14"]);
    expect(viewRange("agenda", "2026-10-14", FA).days).toHaveLength(30);
  });

  it("navigates by view", () => {
    expect(shiftAnchor("month", "2026-10-14", 1, FA)).toBe("2026-10-23");
    expect(shiftAnchor("month", "2026-10-14", -1, FA)).toBe("2026-08-23");
    expect(shiftAnchor("month", "2026-10-14", 1, EN)).toBe("2026-11-01");
    expect(shiftAnchor("week", "2026-10-14", -1, EN)).toBe("2026-10-07");
    expect(shiftAnchor("day", "2026-10-14", 1, EN)).toBe("2026-10-15");
    expect(shiftAnchor("agenda", "2026-10-14", 1, EN)).toBe("2026-11-13");
  });
});
