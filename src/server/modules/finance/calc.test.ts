import { describe, expect, it } from "vitest";
import { zonedParts } from "@/lib/tz";
import {
  accountBalance,
  analyze,
  APPROX,
  budgetUsedPercent,
  convertMinor,
  effectiveHourlyRate,
  jalaliToGregorian,
  lastMonths,
  monthIndexOf,
  monthKeyRange,
  normalizeDay,
  parseRateInput,
  pickRate,
  runningLedger,
  subtractByCurrency,
  sumByCurrency,
  sumConverted,
  timeValueMinor,
  type FlowRow,
} from "./calc";

const TZ = "Asia/Tehran";

describe("account balances", () => {
  it("adds incomes and incoming transfers, subtracts expenses and outgoing transfers", () => {
    const b = accountBalance(
      1_000,
      [
        { kind: "income", status: "cleared", total: 500 },
        { kind: "expense", status: "cleared", total: 200 },
        { kind: "expense", status: "pending", total: 50 },
        { kind: "transfer", status: "cleared", total: 100 },
      ],
      [{ status: "cleared", total: 300 }],
    );
    expect(b.balance).toBe(1_000 + 500 - 200 - 50 - 100 + 300);
    expect(b.pending).toBe(-50);
    expect(b.cleared).toBe(b.balance + 50);
    expect(b.income).toBe(500);
    expect(b.expense).toBe(250);
  });

  it("groups by currency without mixing", () => {
    const rows = sumByCurrency([
      { currency: "USD", minor: 100 },
      { currency: "IRT", minor: 5 },
      { currency: "USD", minor: 50 },
    ]);
    expect(rows).toEqual([
      { currency: "IRT", minor: 5 },
      { currency: "USD", minor: 150 },
    ]);
    expect(subtractByCurrency(rows, [{ currency: "EUR", minor: 10 }])).toContainEqual({
      currency: "EUR",
      minor: -10,
    });
  });
});

describe("fx conversion", () => {
  const rates = { USD: 100_000, USDT: 98_000, EUR: 110_000 };
  it("converts to base with decimals", () => {
    // 12.50 USD → 1,250,000 IRT (IRT has 0 decimals)
    expect(convertMinor(1250, "USD", "IRT", rates, "IRT")).toBe(1_250_000);
  });
  it("converts from base and across currencies via base", () => {
    expect(convertMinor(1_000_000, "IRT", "USD", rates, "IRT")).toBe(1000); // 10.00 USD
    expect(convertMinor(11_000, "EUR", "USD", rates, "IRT")).toBe(12_100); // 110 EUR → 121 USD
  });
  it("is identity for same currency and null when a rate is missing", () => {
    expect(convertMinor(42, "AED", "AED", rates, "IRT")).toBe(42);
    expect(convertMinor(100, "AED", "IRT", rates, "IRT")).toBeNull();
  });
  it("sums converted totals and reports missing currencies", () => {
    const r = sumConverted(
      [
        { currency: "IRT", minor: 500 },
        { currency: "USD", minor: 100 },
        { currency: "AED", minor: 999 },
      ],
      "IRT",
      rates,
      "IRT",
    );
    expect(r.minor).toBe(500 + 100_000);
    expect(r.missing).toEqual(["AED"]);
    expect(r.approximate).toBe(true);
  });
  it("picks the latest rate on/before a date, else the earliest after", () => {
    const h = [
      { rate: 1, date: 100 },
      { rate: 2, date: 200 },
      { rate: 3, date: 300 },
    ];
    expect(pickRate(h, 250)?.rate).toBe(2);
    expect(pickRate(h, 50)?.rate).toBe(1);
    expect(pickRate(h, 999)?.rate).toBe(3);
    expect(pickRate([], 1)).toBeNull();
  });
  it("parses rate input with Persian digits and separators", () => {
    expect(parseRateInput("۱۰۵٬۰۰۰")).toBe(105_000);
    expect(parseRateInput("0.92")).toBe(0.92);
    expect(parseRateInput("abc")).toBeNull();
    expect(parseRateInput("-3")).toBeNull();
  });
});

describe("calendar helpers", () => {
  it("converts Jalali dates to Gregorian", () => {
    expect(jalaliToGregorian(1405, 7, 1)).toEqual({ y: 2026, m: 9, d: 23 });
    expect(jalaliToGregorian(1405, 1, 1)).toEqual({ y: 2026, m: 3, d: 21 });
  });
  it("normalizes typed days", () => {
    expect(normalizeDay("2026-10-14")).toBe("2026-10-14");
    expect(normalizeDay("۱۴۰۵/۰۷/۲۲")).toBe("2026-10-14");
    expect(normalizeDay("2026-02-30")).toBeNull();
    expect(normalizeDay("hello")).toBeNull();
  });
  it("builds the last N Jalali months ending with the current one", () => {
    const now = new Date("2026-10-14T08:00:00Z").getTime(); // 22 Mehr 1405
    const months = lastMonths(now, TZ, "persian", 6);
    expect(months).toHaveLength(6);
    expect(zonedParts(months[5]!.start, TZ, "persian")).toMatchObject({ month: 7, day: 1 });
    expect(zonedParts(months[0]!.start, TZ, "persian")).toMatchObject({ month: 2, day: 1 });
    for (let i = 1; i < months.length; i++) expect(months[i]!.start).toBe(months[i - 1]!.end);
    expect(monthIndexOf(months, now)).toBe(5);
    expect(monthIndexOf(months, months[2]!.start)).toBe(2);
    expect(monthIndexOf(months, months[0]!.start - 1)).toBe(-1);
  });
  it("parses Gregorian and Jalali month keys", () => {
    const g = monthKeyRange("2026-10", TZ)!;
    expect(zonedParts(g.start, TZ)).toMatchObject({ year: 2026, month: 10, day: 1, hour: 0 });
    const j = monthKeyRange("1405-07", TZ)!;
    expect(zonedParts(j.start, TZ, "persian")).toMatchObject({ year: 1405, month: 7, day: 1 });
    expect(zonedParts(j.end, TZ, "persian")).toMatchObject({ month: 8, day: 1 });
    expect(monthKeyRange("2026-13", TZ)).toBeNull();
  });
});

describe("analytics", () => {
  const rows: FlowRow[] = [
    { m: 0, k: "income", c: "IRT", cat: "a", cl: "x", a: 1000 },
    { m: 1, k: "income", c: "USD", cat: null, cl: "y", a: 100 },
    { m: 1, k: "expense", c: "IRT", cat: "b", cl: null, a: 300 },
    { m: 2, k: "expense", c: "AED", cat: "b", cl: null, a: 5 },
  ];
  it("filters by currency and range", () => {
    const r = analyze(rows, { totalMonths: 3, months: 2, currency: "IRT", base: "IRT", rates: {} });
    expect(r.series).toEqual([
      { m: 1, income: 0, expense: 300 },
      { m: 2, income: 0, expense: 0 },
    ]);
    expect(r.byCategory).toEqual([{ id: "b", value: 300 }]);
  });
  it("converts everything to base in ≈ mode and reports missing rates", () => {
    const r = analyze(rows, {
      totalMonths: 3,
      months: 3,
      currency: APPROX,
      base: "IRT",
      rates: { USD: 10 },
    });
    expect(r.income).toBe(1000 + 10); // 1.00 USD × 10
    expect(r.byClient).toEqual([
      { id: "x", value: 1000 },
      { id: "y", value: 10 },
    ]);
    expect(r.missing).toEqual(["AED"]);
  });
});

describe("project metrics", () => {
  it("computes effective rate, time value and budget usage", () => {
    expect(effectiveHourlyRate(9_000_000, 20 * 3_600_000)).toBe(450_000);
    expect(effectiveHourlyRate(100, 0)).toBeNull();
    expect(
      timeValueMinor([
        { ms: 3_600_000 * 1.5, rateMinor: 400 },
        { ms: 3_600_000, rateMinor: null },
      ]),
    ).toBe(600);
    expect(budgetUsedPercent(250, 1000)).toBe(25);
    expect(budgetUsedPercent(250, null)).toBeNull();
  });
});

describe("ledger", () => {
  it("keeps a running balance per currency (positive = they owe us)", () => {
    const groups = runningLedger([
      { id: "p1", at: 20, currency: "IRT", type: "received", debit: 0, credit: 400 },
      { id: "i1", at: 10, currency: "IRT", type: "invoice", debit: 1000, credit: 0 },
      { id: "u1", at: 5, currency: "USD", type: "received", debit: 0, credit: 50 },
      { id: "i2", at: 20, currency: "IRT", type: "invoice", debit: 200, credit: 0 },
    ]);
    const irt = groups.find((g) => g.currency === "IRT")!;
    expect(irt.lines.map((l) => [l.id, l.balance])).toEqual([
      ["i1", 1000],
      ["i2", 1200],
      ["p1", 800],
    ]);
    expect(irt.balance).toBe(800);
    expect(groups.find((g) => g.currency === "USD")!.balance).toBe(-50);
  });
});
