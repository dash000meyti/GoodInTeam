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

  it("reads a DATE UNTIL as the end of that day in the app timezone", () => {
    const r = parseRRule("FREQ=DAILY;UNTIL=20261020", TZ)!;
    // 23:59:59 Tehran (UTC+3:30) = 20:29:59Z the same day.
    expect(r.until!.toISOString()).toBe("2026-10-20T20:29:59.000Z");
    const list = expandRRule(
      "FREQ=DAILY;UNTIL=20261020",
      at(2026, 10, 18, 22),
      at(2026, 10, 1),
      at(2026, 11, 1),
      TZ,
    );
    expect(list.map(ymd)).toEqual(["2026-10-18 22:00", "2026-10-19 22:00", "2026-10-20 22:00"]);
    // A UTC instant stays exact; a floating local time is read in tz.
    expect(parseRRule("FREQ=DAILY;UNTIL=20261020T120000Z", TZ)!.until!.toISOString()).toBe(
      "2026-10-20T12:00:00.000Z",
    );
    expect(parseRRule("FREQ=DAILY;UNTIL=20261020T120000", TZ)!.until!.toISOString()).toBe(
      "2026-10-20T08:30:00.000Z",
    );
  });

  it("honours WKST for bi-weekly rules", () => {
    // RFC 5545 example: every other week on TU,SU from Tue 1997-08-05, 4 times.
    const dt = zonedTimeToUtc(1997, 8, 5, 9, 0, "UTC");
    const mo = expandRRule(
      "FREQ=WEEKLY;INTERVAL=2;COUNT=4;BYDAY=TU,SU;WKST=MO",
      dt,
      dt,
      new Date(Date.UTC(1998, 0, 1)),
      "UTC",
    );
    const su = expandRRule(
      "FREQ=WEEKLY;INTERVAL=2;COUNT=4;BYDAY=TU,SU;WKST=SU",
      dt,
      dt,
      new Date(Date.UTC(1998, 0, 1)),
      "UTC",
    );
    const day = (d: Date) => d.toISOString().slice(0, 10);
    expect(mo.map(day)).toEqual(["1997-08-05", "1997-08-10", "1997-08-19", "1997-08-24"]);
    expect(su.map(day)).toEqual(["1997-08-05", "1997-08-17", "1997-08-19", "1997-08-31"]);
    expect(formatRRule(parseRRule("FREQ=WEEKLY;WKST=SU")!)).toBe("FREQ=WEEKLY;WKST=SU");
  });

  it("keeps DTSTART seconds so the first occurrence isn't skipped", () => {
    const dt = new Date(at(2026, 10, 14).getTime() + 30_500);
    const list = expandRRule("FREQ=DAILY;COUNT=2", dt, at(2026, 10, 1), at(2026, 11, 1), TZ);
    expect(list.map((d) => d.getTime() - dt.getTime())).toEqual([0, 86_400_000]);
  });
});
