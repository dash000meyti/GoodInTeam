import { describe, expect, it } from "vitest";
import { expandRRule, formatRRule, nextOccurrence, parseRRule } from "./rrule";
import { zonedParts, zonedTimeToUtc } from "./tz";

const TZ = "Asia/Tehran";
const at = (y: number, m: number, d: number, h = 10, min = 0) =>
  zonedTimeToUtc(y, m, d, h, min, TZ);
const ymd = (d: Date) => {
  const p = zonedParts(d, TZ);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")} ${p.hour}:${String(p.minute).padStart(2, "0")}`;
};

describe("rrule", () => {
  it("parses and formats", () => {
    const r = parseRRule("RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=SA,MO;COUNT=5")!;
    expect(r).toMatchObject({ freq: "WEEKLY", interval: 2, count: 5 });
    expect(formatRRule(r)).toBe("FREQ=WEEKLY;INTERVAL=2;BYDAY=SA,MO;COUNT=5");
    expect(parseRRule("nope")).toBeNull();
  });

  it("expands daily with count", () => {
    const list = expandRRule(
      "FREQ=DAILY;COUNT=3",
      at(2026, 10, 14),
      at(2026, 1, 1),
      at(2027, 1, 1),
      TZ,
    );
    expect(list.map(ymd)).toEqual(["2026-10-14 10:00", "2026-10-15 10:00", "2026-10-16 10:00"]);
  });

  it("expands weekly BYDAY within a window, keeping wall-clock time", () => {
    // 2026-10-14 is a Wednesday
    const list = expandRRule(
      "FREQ=WEEKLY;BYDAY=SA,WE",
      at(2026, 10, 14, 9, 30),
      at(2026, 10, 14, 0, 0),
      at(2026, 10, 28, 23),
      TZ,
    );
    expect(list.map(ymd)).toEqual([
      "2026-10-14 9:30",
      "2026-10-17 9:30",
      "2026-10-21 9:30",
      "2026-10-24 9:30",
      "2026-10-28 9:30",
    ]);
  });

  it("supports monthly ordinal BYDAY (last Friday)", () => {
    const list = expandRRule(
      "FREQ=MONTHLY;BYDAY=-1FR;COUNT=3",
      at(2026, 1, 1),
      at(2026, 1, 1),
      at(2027, 1, 1),
      TZ,
    );
    expect(list.map(ymd)).toEqual(["2026-01-30 10:00", "2026-02-27 10:00", "2026-03-27 10:00"]);
  });

  it("skips months without the day (31st)", () => {
    const list = expandRRule(
      "FREQ=MONTHLY;COUNT=3",
      at(2026, 1, 31),
      at(2026, 1, 1),
      at(2027, 1, 1),
      TZ,
    );
    expect(list.map(ymd)).toEqual(["2026-01-31 10:00", "2026-03-31 10:00", "2026-05-31 10:00"]);
  });

  it("respects UNTIL", () => {
    const list = expandRRule(
      "FREQ=DAILY;UNTIL=20261016",
      at(2026, 10, 14),
      at(2026, 1, 1),
      at(2027, 1, 1),
      TZ,
    );
    expect(list).toHaveLength(3);
  });

  it("finds the next occurrence", () => {
    const n = nextOccurrence("FREQ=WEEKLY;BYDAY=WE", at(2026, 10, 14), at(2026, 10, 14, 12), TZ);
    expect(ymd(n!)).toBe("2026-10-21 10:00");
    expect(
      nextOccurrence("FREQ=DAILY;COUNT=1", at(2026, 10, 14), at(2026, 10, 14, 12), TZ),
    ).toBeNull();
  });
});
