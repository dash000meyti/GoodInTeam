import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "./quick-add";
import { zonedTimeToUtc } from "./tz";

const TZ = "Asia/Tehran";
// Wednesday 14 Oct 2026, 10:00 Tehran.
const now = zonedTimeToUtc(2026, 10, 14, 10, 0, TZ).getTime();
const parse = (s: string) => parseQuickAdd(s, { now, tz: TZ });

describe("parseQuickAdd", () => {
  it("returns plain titles untouched", () => {
    expect(parse("  Write the weekly report  ")).toMatchObject({
      title: "Write the weekly report",
      tags: [],
      tokens: [],
    });
  });

  it("extracts priority, tags and project", () => {
    const r = parse("Fix iOS price bug !4 #bug #mobile +narenj-app");
    expect(r.title).toBe("Fix iOS price bug");
    expect(r.priority).toBe(4);
    expect(r.tags).toEqual(["bug", "mobile"]);
    expect(r.project).toBe("narenj-app");
    expect(r.tokens.map((t) => t.kind)).toEqual(["priority", "tag", "tag", "project"]);
  });

  it("understands English date words and weekdays", () => {
    expect(parse("call Sam today").dueDate).toBe("2026-10-14");
    expect(parse("call Sam tomorrow").dueDate).toBe("2026-10-15");
    expect(parse("call Sam day after tomorrow")).toMatchObject({
      title: "call Sam",
      dueDate: "2026-10-16",
    });
    // Saturday after Wednesday 14th → 17th; "wed" on a Wednesday → next week.
    expect(parse("review sat").dueDate).toBe("2026-10-17");
    expect(parse("standup wed").dueDate).toBe("2026-10-21");
  });

  it("understands Persian date words, weekdays and digits", () => {
    const r = parse("تمدید دامنه فردا ساعت ۱۰:۳۰ #شخصی !۳");
    expect(r).toMatchObject({
      title: "تمدید دامنه",
      dueDate: "2026-10-15",
      dueTime: "10:30",
      tags: ["شخصی"],
      priority: 3,
    });
    expect(parse("خرید هارد پس‌فردا").dueDate).toBe("2026-10-16");
    expect(parse("خرید هارد پس فردا")).toMatchObject({ title: "خرید هارد", dueDate: "2026-10-16" });
    expect(parse("جلسه شنبه").dueDate).toBe("2026-10-17");
    expect(parse("جلسه سه‌شنبه").dueDate).toBe("2026-10-20");
    expect(parse("جلسه سه شنبه")).toMatchObject({ title: "جلسه", dueDate: "2026-10-20" });
    expect(parse("گزارش پنج شنبه").dueDate).toBe("2026-10-15");
    expect(parse("گزارش امروز").dueDate).toBe("2026-10-14");
  });

  it("parses bare times and ignores invalid ones", () => {
    expect(parse("deploy 18:00").dueTime).toBe("18:00");
    expect(parse("deploy at 9:15")).toMatchObject({ title: "deploy", dueTime: "09:15" });
    expect(parse("deploy 25:00")).toMatchObject({ title: "deploy 25:00" });
  });

  it("does not treat numbers or mid-word symbols as tokens", () => {
    const r = parse("Learn C# and add +1 to counter !5");
    expect(r.title).toBe("Learn C# and add +1 to counter !5");
    expect(r.tags).toEqual([]);
    expect(r.project).toBeUndefined();
    expect(r.priority).toBeUndefined();
  });

  it("keeps the last date/priority when repeated", () => {
    const r = parse("x today !1 tomorrow !2");
    expect(r.dueDate).toBe("2026-10-15");
    expect(r.priority).toBe(2);
    expect(r.title).toBe("x");
  });
});
