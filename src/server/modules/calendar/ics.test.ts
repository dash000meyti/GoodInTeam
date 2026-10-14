import { describe, expect, it } from "vitest";
import { parseRRule } from "@/lib/rrule";
import {
  buildCalendar,
  escapeText,
  foldLine,
  formatDateValue,
  formatUtc,
  rruleForIcs,
  shiftRRuleDays,
} from "./ics";

const bytes = (s: string) => new TextEncoder().encode(s).length;

describe("escapeText", () => {
  it("escapes backslash, separators and newlines", () => {
    expect(escapeText("a\\b; c, d\ne\r\nf")).toBe("a\\\\b\\; c\\, d\\ne\\nf");
  });
});

describe("foldLine", () => {
  it("keeps short lines intact", () => {
    expect(foldLine("SUMMARY:Hello")).toBe("SUMMARY:Hello");
  });

  it("folds ASCII lines at 75 octets with a leading space", () => {
    const line = `DESCRIPTION:${"x".repeat(200)}`;
    const parts = foldLine(line).split("\r\n");
    expect(parts.length).toBeGreaterThan(2);
    for (const p of parts) expect(bytes(p)).toBeLessThanOrEqual(75);
    expect(parts.slice(1).every((p) => p.startsWith(" "))).toBe(true);
    // Unfolding restores the original.
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join("")).toBe(line);
  });

  it("never splits multi-byte characters (Persian + emoji)", () => {
    const line = `SUMMARY:🤝 ${"تحویل نسخه آزمایشی پنل مدرس ".repeat(6)}`;
    const parts = foldLine(line).split("\r\n");
    for (const p of parts) {
      expect(bytes(p)).toBeLessThanOrEqual(75);
      expect(p).not.toContain("�");
    }
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join("")).toBe(line);
  });
});

describe("value formats", () => {
  it("formats UTC date-times and dates", () => {
    expect(formatUtc(new Date("2026-10-14T06:30:05.123Z"))).toBe("20261014T063005Z");
    expect(formatDateValue("2026-10-14")).toBe("20261014");
  });
});

describe("rrule for ics", () => {
  it("shifts BYDAY back a day for UTC starts on the previous date", () => {
    const r = shiftRRuleDays(parseRRule("FREQ=WEEKLY;BYDAY=SA,MO")!, -1);
    expect(r.byDay!.map((d) => d.day)).toEqual([5, 0]); // FR, SU
  });

  it("shifts BYMONTHDAY across month edges", () => {
    expect(shiftRRuleDays(parseRRule("FREQ=MONTHLY;BYMONTHDAY=1,15,-1")!, -1).byMonthDay).toEqual(
      [-1, 14, -2],
    );
    expect(shiftRRuleDays(parseRRule("FREQ=MONTHLY;BYMONTHDAY=-1,10")!, 1).byMonthDay).toEqual([
      1, 11,
    ]);
  });

  it("normalizes rules and renders UNTIL as DATE for all-day events", () => {
    expect(rruleForIcs("RRULE:FREQ=WEEKLY;BYDAY=SA", { allDay: false, dayShift: -1 })).toBe(
      "FREQ=WEEKLY;BYDAY=FR",
    );
    expect(rruleForIcs("FREQ=DAILY;UNTIL=20261020", { allDay: true })).toBe(
      "FREQ=DAILY;UNTIL=20261020",
    );
    expect(rruleForIcs("FREQ=DAILY;UNTIL=20261020", { allDay: false })).toBe(
      "FREQ=DAILY;UNTIL=20261020T235959Z",
    );
    expect(rruleForIcs("garbage", { allDay: false })).toBeNull();
    expect(rruleForIcs(null, { allDay: false })).toBeNull();
  });
});

describe("buildCalendar", () => {
  const stamp = new Date("2026-10-01T00:00:00Z");
  const ics = buildCalendar(
    [
      {
        uid: "e1@goodteam",
        title: "🤝 Demo, for Acme; v2",
        description: "Line 1\nLine 2",
        location: "Tehran",
        url: "https://meet.example.com/x",
        allDay: false,
        start: new Date("2026-10-14T06:30:00Z"),
        end: new Date("2026-10-14T07:30:00Z"),
        status: "CONFIRMED",
        rrule: "FREQ=WEEKLY;BYDAY=WE",
        categories: ["COMMITMENT"],
        alarmMinutesBefore: 15,
        stamp,
      },
      {
        uid: "e2@goodteam",
        title: "Release",
        allDay: true,
        startDate: "2026-10-20",
        endDateExclusive: "2026-10-21",
        stamp,
      },
    ],
    { name: "Good Team", timezone: "Asia/Tehran", refreshMinutes: 60 },
  );

  it("wraps events in a VCALENDAR with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });

  it("writes timed events in UTC and all-day events as DATE values", () => {
    expect(ics).toContain("DTSTART:20261014T063000Z\r\n");
    expect(ics).toContain("DTEND:20261014T073000Z\r\n");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261020\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20261021\r\n");
  });

  it("escapes text, passes RRULE through and adds an alarm", () => {
    expect(ics).toContain("SUMMARY:🤝 Demo\\, for Acme\\; v2\r\n");
    expect(ics).toContain("DESCRIPTION:Line 1\\nLine 2\r\n");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=WE\r\n");
    expect(ics).toContain("TRIGGER:-PT15M\r\n");
    expect(ics).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT60M\r\n");
  });

  it("keeps every physical line within 75 octets", () => {
    for (const line of ics.split("\r\n")) expect(bytes(line)).toBeLessThanOrEqual(75);
  });
});
