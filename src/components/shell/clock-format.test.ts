import { describe, expect, it } from "vitest";
import { CLOCK_LONGEST, formatClock, msToNextMinute } from "./clock-format";

const TZ = "Asia/Tehran";
const instant = new Date("2026-05-20T08:00:00Z"); // 11:30 in Tehran

describe("formatClock", () => {
  it("formats fa with Persian digits and the Jalali month, no comma or «ساعت»", () => {
    const { text, iso } = formatClock(instant, "fa", TZ);
    expect(text).toBe("چهارشنبه ۳۰ اردیبهشت ۱۱:۳۰");
    expect(text).not.toContain("ساعت");
    expect(text).not.toContain("،");
    expect(iso).toBe("2026-05-20T08:00:00.000Z");
  });

  it("formats en from the typed parts only", () => {
    expect(formatClock(instant, "en", TZ).text).toBe("Wed 20 May 11:30");
    expect(formatClock(instant, "en", TZ).text).not.toContain(",");
  });

  it("truncates the ISO instant to the minute", () => {
    expect(formatClock(new Date("2026-05-20T08:00:42.500Z"), "en", TZ).iso).toBe(
      "2026-05-20T08:00:00.000Z",
    );
  });

  it("CLOCK_LONGEST is at least as long as every day of 2026 at 23:59 Tehran", () => {
    for (const locale of ["fa", "en"] as const) {
      const longest = formatClock(CLOCK_LONGEST[locale], locale, TZ).text;
      expect(longest.endsWith(locale === "fa" ? "۲۳:۵۹" : "23:59")).toBe(true);
      for (let d = 0; d < 365; d++) {
        const day = new Date(Date.UTC(2026, 0, 1, 20, 29) + d * 86_400_000);
        expect(formatClock(day, locale, TZ).text.length, day.toISOString()).toBeLessThanOrEqual(
          longest.length,
        );
      }
    }
    expect(formatClock(CLOCK_LONGEST.en, "en", TZ).text).toBe("Wed 30 Sept 23:59");
  });
});

describe("msToNextMinute", () => {
  it("counts to the next boundary", () => {
    expect(msToNextMinute(59_500)).toBe(500);
    expect(msToNextMinute(120_000)).toBe(60_000);
    expect(msToNextMinute(Date.UTC(2026, 0, 1, 0, 0, 30))).toBe(30_000);
  });
});
