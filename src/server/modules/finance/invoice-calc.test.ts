import { describe, expect, it } from "vitest";
import {
  balanceDue,
  deriveInvoiceStatus,
  formatInvoiceNumber,
  groupTimeEntries,
  invoiceTotals,
  lineAmount,
  nextInvoiceSeq,
  percentToBps,
} from "./invoice-calc";

describe("invoice totals", () => {
  it("computes line amounts with fractional quantities", () => {
    expect(lineAmount(2.5, 450_000)).toBe(1_125_000);
    expect(lineAmount(1.333, 100)).toBe(133);
  });

  it("applies discount before tax (basis points)", () => {
    const t = invoiceTotals({
      items: [
        { quantity: 10, unitPriceMinor: 450_000 },
        { quantity: 1, unitPriceMinor: 500_000 },
      ],
      discountMinor: 1_000_000,
      taxBps: 1000,
    });
    expect(t.subtotal).toBe(5_000_000);
    expect(t.taxable).toBe(4_000_000);
    expect(t.tax).toBe(400_000);
    expect(t.total).toBe(4_400_000);
  });

  it("clamps discount to the subtotal and rounds tax", () => {
    const t = invoiceTotals({
      items: [{ quantity: 1, unitPriceMinor: 999 }],
      discountMinor: 5_000,
      taxBps: 900,
    });
    expect(t.discount).toBe(999);
    expect(t.total).toBe(0);
    const r = invoiceTotals({ items: [{ quantity: 1, unitPriceMinor: 1005 }], taxBps: 950 });
    expect(r.tax).toBe(95); // 95.475 → 95
    expect(percentToBps(9.5)).toBe(950);
  });
});

describe("invoice numbering", () => {
  it("formats and finds the next sequence for the year", () => {
    expect(formatInvoiceNumber("GT-", 1405, 7)).toBe("GT-1405-007");
    const existing = ["GT-1405-001", "GT-1405-012", "GT-1404-099", "X-1405-500", "GT-1405-abc"];
    expect(nextInvoiceSeq(existing, "GT-", 1405)).toBe(13);
    expect(nextInvoiceSeq(existing, "GT-", 1406)).toBe(1);
    expect(nextInvoiceSeq(["INV.(1)2026-004"], "INV.(1)", 2026)).toBe(5);
  });
});

describe("invoice status", () => {
  const today = new Date("2026-10-14T00:00:00Z").getTime();
  const base = {
    status: "sent" as const,
    totalMinor: 1000,
    paidMinor: 0,
    dueDate: null,
    viewedAt: null,
  };
  it("keeps draft and void", () => {
    expect(deriveInvoiceStatus({ ...base, status: "draft" }, today)).toBe("draft");
    expect(deriveInvoiceStatus({ ...base, status: "void", paidMinor: 1000 }, today)).toBe("void");
  });
  it("derives paid, overdue, partial, viewed and sent", () => {
    expect(deriveInvoiceStatus({ ...base, paidMinor: 1000 }, today)).toBe("paid");
    expect(deriveInvoiceStatus({ ...base, dueDate: today - 1 }, today)).toBe("overdue");
    expect(deriveInvoiceStatus({ ...base, dueDate: today, paidMinor: 1 }, today)).toBe("partial");
    expect(deriveInvoiceStatus({ ...base, dueDate: today - 1, paidMinor: 1 }, today)).toBe(
      "overdue",
    );
    expect(deriveInvoiceStatus({ ...base, viewedAt: today }, today)).toBe("viewed");
    expect(deriveInvoiceStatus({ ...base, status: "overdue", dueDate: today + 1 }, today)).toBe(
      "sent",
    );
    expect(balanceDue({ totalMinor: 100, paidMinor: 130 })).toBe(0);
  });
});

describe("time entries → lines", () => {
  it("groups by task/description and rate", () => {
    const h = 3_600_000;
    const groups = groupTimeEntries(
      [
        { id: "1", ms: 2 * h, description: "API", taskId: "t1", taskTitle: "Build API", rateMinor: 100, currency: "USD" },
        { id: "2", ms: h / 2, description: "x", taskId: "t1", taskTitle: "Build API", rateMinor: 100, currency: "USD" },
        { id: "3", ms: h, description: "Call", taskId: null, taskTitle: null, rateMinor: null, currency: null },
        { id: "4", ms: h / 3, description: "", taskId: null, taskTitle: null, rateMinor: 100, currency: "USD" },
      ],
      { fallbackRateMinor: 50, fallbackCurrency: "USD", untitled: "Work" },
    );
    expect(groups[0]).toMatchObject({ label: "Build API", entryIds: ["1", "2"], hours: 2.5, amountMinor: 250 });
    expect(groups.find((g) => g.label === "Call")).toMatchObject({ rateMinor: 50, amountMinor: 50 });
    expect(groups.find((g) => g.label === "Work")).toMatchObject({ hours: 0.33, amountMinor: 33 });
  });
});
