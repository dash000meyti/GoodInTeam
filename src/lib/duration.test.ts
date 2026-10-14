import { describe, expect, it } from "vitest";
import { formatDurationInput, normalizeClock, parseDuration } from "./duration";

const H = 3_600_000;
const M = 60_000;

describe("parseDuration", () => {
  it("parses h:mm and h:mm:ss", () => {
    expect(parseDuration("1:30")).toBe(1.5 * H);
    expect(parseDuration("0:45")).toBe(45 * M);
    expect(parseDuration("2:00:30")).toBe(2 * H + 30_000);
    expect(parseDuration("1:75")).toBeNull();
  });

  it("treats bare numbers as hours", () => {
    expect(parseDuration("2")).toBe(2 * H);
    expect(parseDuration("1.25")).toBe(1.25 * H);
    expect(parseDuration("1,5")).toBe(1.5 * H);
  });

  it("parses unit expressions", () => {
    expect(parseDuration("90m")).toBe(90 * M);
    expect(parseDuration("1h 30m")).toBe(90 * M);
    expect(parseDuration("1h30m")).toBe(90 * M);
    expect(parseDuration("2 hours and 15 minutes")).toBe(2 * H + 15 * M);
    expect(parseDuration("1.5h")).toBe(1.5 * H);
  });

  it("understands Persian digits and units", () => {
    expect(parseDuration("۱:۳۰")).toBe(90 * M);
    expect(parseDuration("۲ ساعت")).toBe(2 * H);
    expect(parseDuration("۱ ساعت و ۲۰ دقیقه")).toBe(80 * M);
    expect(parseDuration("۴۵ دقیقه")).toBe(45 * M);
    expect(parseDuration("۱٫۵")).toBe(1.5 * H);
  });

  it("rejects garbage and zero", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
    expect(parseDuration("0")).toBeNull();
    expect(parseDuration("0:00")).toBeNull();
    expect(parseDuration("5 bananas")).toBeNull();
    expect(parseDuration("1h banana")).toBeNull();
  });
});

describe("formatDurationInput / normalizeClock", () => {
  it("formats ms as h:mm", () => {
    expect(formatDurationInput(90 * M)).toBe("1:30");
    expect(formatDurationInput(5 * M)).toBe("0:05");
    expect(formatDurationInput(10 * H + 59.6 * M)).toBe("11:00");
  });

  it("normalizes clock input", () => {
    expect(normalizeClock("9:05")).toBe("09:05");
    expect(normalizeClock("۱۴:۳۰")).toBe("14:30");
    expect(normalizeClock("24:00")).toBeNull();
    expect(normalizeClock("12:60")).toBeNull();
    expect(normalizeClock("noon")).toBeNull();
  });
});
