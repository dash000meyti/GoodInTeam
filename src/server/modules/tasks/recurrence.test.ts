import { describe, expect, it } from "vitest";
import { zonedParts, zonedTimeToUtc } from "@/lib/tz";
import { nextTaskOccurrence } from "./recurrence";

const TZ = "Asia/Tehran";
const at = (m: number, d: number, h = 0, min = 0) => zonedTimeToUtc(2026, m, d, h, min, TZ);
const ymdh = (d: Date | null) => {
  if (!d) return null;
  const p = zonedParts(d, TZ);
  return `${p.month}-${p.day} ${p.hour}:${String(p.minute).padStart(2, "0")}`;
};

describe("nextTaskOccurrence", () => {
  // Wed 14 Oct 2026 is "today".
  const now = at(10, 14, 11).getTime();

  it("returns null for non-recurring or finished series", () => {
    expect(
      nextTaskOccurrence({ dueAt: at(10, 14), remindAt: null, recurrence: null }, { now, tz: TZ }),
    ).toBeNull();
    expect(
      nextTaskOccurrence(
        { dueAt: at(10, 14), remindAt: null, recurrence: "FREQ=DAILY;UNTIL=20261014T120000Z" },
        { now, tz: TZ },
      ),
    ).toBeNull();
  });

  it("moves an on-time weekly task to next week", () => {
    const r = nextTaskOccurrence(
      { dueAt: at(10, 14), remindAt: at(10, 14, 9), recurrence: "FREQ=WEEKLY;BYDAY=WE" },
      { now, tz: TZ },
    );
    expect(ymdh(r!.dueAt)).toBe("10-21 0:00");
    expect(ymdh(r!.remindAt)).toBe("10-21 9:00");
  });

  it("skips past occurrences of an overdue task", () => {
    const r = nextTaskOccurrence(
      { dueAt: at(9, 30), remindAt: null, recurrence: "FREQ=WEEKLY;BYDAY=WE" },
      { now, tz: TZ },
    );
    expect(ymdh(r!.dueAt)).toBe("10-21 0:00");
  });

  it("completing early skips the current occurrence", () => {
    const r = nextTaskOccurrence(
      { dueAt: at(10, 16, 14, 30), remindAt: null, recurrence: "FREQ=DAILY" },
      { now, tz: TZ },
    );
    expect(ymdh(r!.dueAt)).toBe("10-17 14:30");
  });

  it("handles monthly rules and undated tasks", () => {
    const r = nextTaskOccurrence(
      { dueAt: at(10, 1), remindAt: null, recurrence: "FREQ=MONTHLY" },
      { now, tz: TZ },
    );
    expect(ymdh(r!.dueAt)).toBe("11-1 0:00");
    const undated = nextTaskOccurrence(
      { dueAt: null, remindAt: null, recurrence: "FREQ=DAILY" },
      { now, tz: TZ },
    );
    expect(ymdh(undated!.dueAt)).toBe("10-15 0:00");
  });
});
