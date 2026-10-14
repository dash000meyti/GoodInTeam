import { describe, expect, it } from "vitest";
import { zonedTimeToUtc } from "@/lib/tz";
import {
  earnedMinor,
  NO_PROJECT,
  overlapMs,
  resolveEntryTimes,
  splitByDay,
  summarize,
  type EntryLike,
} from "./calc";

const TZ = "Asia/Tehran";
const H = 3_600_000;
const at = (d: number, h: number, m = 0) => zonedTimeToUtc(2026, 10, d, h, m, TZ);

const entry = (over: Partial<EntryLike>): EntryLike => ({
  startedAt: at(14, 9),
  endedAt: at(14, 10),
  billable: true,
  hourlyRateMinor: 450_000,
  currency: "IRT",
  projectId: "p1",
  taskId: null,
  ...over,
});

describe("time math", () => {
  it("computes overlaps and earnings", () => {
    expect(overlapMs(0, 10, 5, 20)).toBe(5);
    expect(overlapMs(0, 10, 10, 20)).toBe(0);
    expect(earnedMinor(1.5 * H, 450_000)).toBe(675_000);
    expect(earnedMinor(H, null)).toBe(0);
  });

  it("splits entries across midnight", () => {
    const parts = splitByDay(at(14, 22).getTime(), at(15, 1, 30).getTime(), TZ);
    expect(parts).toEqual([
      ["2026-10-14", 2 * H],
      ["2026-10-15", 1.5 * H],
    ]);
  });

  it("summarizes by project, task, day and currency", () => {
    const now = at(15, 12).getTime();
    const r = summarize(
      [
        entry({}),
        entry({ startedAt: at(14, 11), endedAt: at(14, 13), taskId: "t1" }),
        entry({ projectId: null, billable: false, hourlyRateMinor: null, currency: null }),
        entry({
          projectId: "p2",
          currency: "USD",
          hourlyRateMinor: 4_500,
          startedAt: at(15, 10),
          endedAt: null,
        }),
        // Outside the range — ignored.
        entry({ startedAt: at(1, 9), endedAt: at(1, 10) }),
      ],
      { from: at(14, 0), to: at(16, 0), tz: TZ, now },
    );
    expect(r.totalMs).toBe(6 * H);
    expect(r.billableMs).toBe(5 * H);
    expect(r.earned).toEqual({ IRT: 1_350_000, USD: 9_000 });
    expect(r.activeDays).toBe(2);
    expect(r.byDay.get("2026-10-14")?.get("p1")).toBe(3 * H);
    expect(r.byDay.get("2026-10-14")?.get(NO_PROJECT)).toBe(H);
    expect(r.byDay.get("2026-10-15")?.get("p2")).toBe(2 * H);
    expect(r.byProject.get("p1")?.tasks.get("t1")?.ms).toBe(2 * H);
  });

  it("clips entries to the range", () => {
    const r = summarize([entry({ startedAt: at(13, 23), endedAt: at(14, 2) })], {
      from: at(14, 0),
      to: at(15, 0),
      tz: TZ,
      now: Date.now(),
    });
    expect(r.totalMs).toBe(2 * H);
  });
});

describe("resolveEntryTimes", () => {
  const opts = { tz: TZ };

  it("accepts date + start + end", () => {
    const r = resolveEntryTimes({ date: "2026-10-14", startTime: "09:00", endTime: "10:30" }, opts);
    expect(r).toEqual({ ok: true, startedAt: at(14, 9), endedAt: at(14, 10, 30) });
  });

  it("wraps past midnight", () => {
    const r = resolveEntryTimes({ date: "2026-10-14", startTime: "23:00", endTime: "01:00" }, opts);
    expect(r).toEqual({ ok: true, startedAt: at(14, 23), endedAt: at(15, 1) });
  });

  it("accepts date + start + duration and Persian digits", () => {
    const r = resolveEntryTimes({ date: "2026-10-14", startTime: "۰۹:۰۰", duration: "۱:۳۰" }, opts);
    expect(r).toEqual({ ok: true, startedAt: at(14, 9), endedAt: at(14, 10, 30) });
  });

  it("places duration-only entries at the anchor", () => {
    const r = resolveEntryTimes(
      { date: "2026-10-14", duration: "2h" },
      { tz: TZ, anchor: () => at(14, 13) },
    );
    expect(r).toEqual({ ok: true, startedAt: at(14, 13), endedAt: at(14, 15) });
  });

  it("accepts ISO instants", () => {
    const r = resolveEntryTimes(
      { startedAt: at(14, 9).toISOString(), endedAt: at(14, 11).toISOString() },
      opts,
    );
    expect(r).toEqual({ ok: true, startedAt: at(14, 9), endedAt: at(14, 11) });
  });

  it("validates", () => {
    expect(resolveEntryTimes({ date: "2026-10-14", startTime: "9:00" }, opts)).toMatchObject({
      ok: false,
      key: "missingTimes",
    });
    expect(
      resolveEntryTimes({ date: "2026-10-14", startTime: "9:00", duration: "soon" }, opts),
    ).toMatchObject({ ok: false, field: "duration", key: "invalidDuration" });
    expect(
      resolveEntryTimes(
        { startedAt: at(14, 9).toISOString(), endedAt: at(14, 8).toISOString() },
        opts,
      ),
    ).toMatchObject({ ok: false, key: "endBeforeStart" });
    expect(
      resolveEntryTimes({ date: "2026-10-14", startTime: "9:00", duration: "30h" }, opts),
    ).toMatchObject({ ok: false, key: "tooLong" });
    expect(
      resolveEntryTimes({ date: "2026-10-14", startTime: "10:00", endTime: "10:00" }, opts),
    ).toMatchObject({ ok: false, key: "endBeforeStart" });
    expect(resolveEntryTimes({ date: "2026-10-14", startTime: "29:00" }, opts)).toMatchObject({
      ok: false,
      field: "startTime",
    });
  });

  it("patches an existing entry", () => {
    const existing = { startedAt: at(14, 9), endedAt: at(14, 10) };
    // Only the end time.
    expect(resolveEntryTimes({ endTime: "12:00" }, { tz: TZ, existing })).toEqual({
      ok: true,
      startedAt: at(14, 9),
      endedAt: at(14, 12),
    });
    // Move to another day, keeping clock time and length.
    expect(resolveEntryTimes({ date: "2026-10-12" }, { tz: TZ, existing })).toEqual({
      ok: true,
      startedAt: at(12, 9),
      endedAt: at(12, 10),
    });
    // A running timer stays running when only its start changes.
    expect(
      resolveEntryTimes(
        { date: "2026-10-14", startTime: "08:00" },
        { tz: TZ, existing: { startedAt: at(14, 9), endedAt: null } },
      ),
    ).toEqual({ ok: true, startedAt: at(14, 8), endedAt: null });
  });
});
