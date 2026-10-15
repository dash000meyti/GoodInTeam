import { describe, expect, it } from "vitest";
import { daysUntil, isDueToday, isOverdue } from "./due";
import { fromDateInput } from "./tz";

const TZ = "Asia/Tehran";
const day = (d: string) => fromDateInput(d, undefined, TZ);
const at = (d: string, t: string) => fromDateInput(d, t, TZ).getTime();

describe("isOverdue", () => {
  it("an all-day due date is not overdue during its own day", () => {
    const due = day("2026-10-15");
    expect(isOverdue(due, { allDay: true, now: at("2026-10-15", "00:01"), tz: TZ })).toBe(false);
    expect(isOverdue(due, { allDay: true, now: at("2026-10-15", "23:59"), tz: TZ })).toBe(false);
  });

  it("an all-day due date is overdue once the day has ended (app timezone)", () => {
    const due = day("2026-10-15");
    expect(isOverdue(due, { allDay: true, now: at("2026-10-16", "00:00"), tz: TZ })).toBe(true);
    // 2026-10-15 22:00 UTC is already the 16th in Tehran (+03:30).
    expect(isOverdue(due, { allDay: true, now: Date.parse("2026-10-15T22:00:00Z"), tz: TZ })).toBe(
      true,
    );
    // …but still the 15th in UTC.
    expect(
      isOverdue(new Date("2026-10-15T00:00:00Z"), {
        allDay: true,
        now: Date.parse("2026-10-15T22:00:00Z"),
        tz: "UTC",
      }),
    ).toBe(false);
  });

  it("a timed due date is overdue right after the instant", () => {
    const due = at("2026-10-15", "14:00");
    expect(isOverdue(due, { allDay: false, now: at("2026-10-15", "13:59"), tz: TZ })).toBe(false);
    expect(isOverdue(due, { allDay: false, now: due, tz: TZ })).toBe(false);
    expect(isOverdue(due, { allDay: false, now: due + 1, tz: TZ })).toBe(true);
  });

  it("no due date is never overdue", () => {
    expect(isOverdue(null, { allDay: true, now: Date.now(), tz: TZ })).toBe(false);
    expect(isOverdue(undefined, { allDay: false, now: Date.now(), tz: TZ })).toBe(false);
  });
});

describe("isDueToday / daysUntil", () => {
  it("counts calendar days in the timezone", () => {
    const now = at("2026-10-15", "23:30");
    expect(isDueToday(day("2026-10-15"), now, TZ)).toBe(true);
    expect(isDueToday(day("2026-10-16"), now, TZ)).toBe(false);
    expect(daysUntil(day("2026-10-15"), now, TZ)).toBe(0);
    expect(daysUntil(day("2026-10-16"), now, TZ)).toBe(1);
    expect(daysUntil(day("2026-10-13"), now, TZ)).toBe(-2);
  });

  it("is DST-safe", () => {
    // Europe/Berlin leaves DST on 2026-10-25.
    const tz = "Europe/Berlin";
    const now = fromDateInput("2026-10-24", "12:00", tz).getTime();
    expect(daysUntil(fromDateInput("2026-10-26", undefined, tz), now, tz)).toBe(2);
  });
});
