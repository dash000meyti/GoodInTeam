import { describe, expect, it } from "vitest";
import { zonedParts } from "@/lib/tz";
import { BOM, mapImportRows, parseCsv, parseImportDate, toCsv } from "./csv";

const TZ = "Asia/Tehran";

describe("csv parse/serialize", () => {
  it("handles quotes, escaped quotes, CRLF and BOM", () => {
    const rows = parseCsv(BOM + 'a,b,c\r\n1,"hello, ""world""",3\r\n\r\n"multi\nline",x,\n');
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", 'hello, "world"', "3"],
      ["multi\nline", "x", ""],
    ]);
  });

  it("auto-detects semicolon and tab delimiters", () => {
    expect(parseCsv("a;b\n1;2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv("a\tb\n1\t2")[1]).toEqual(["1", "2"]);
  });

  it("round-trips through toCsv", () => {
    const data = [
      ["date", "description"],
      ["2026-10-14", 'Say "hi", ok'],
      ["2026-10-15", null],
    ];
    const text = toCsv(data, false);
    expect(parseCsv(text)).toEqual([
      ["date", "description"],
      ["2026-10-14", 'Say "hi", ok'],
      ["2026-10-15", ""],
    ]);
    expect(toCsv([["x"]]).startsWith(BOM)).toBe(true);
    expect(BOM.charCodeAt(0)).toBe(0xfeff);
  });
});

describe("import mapping", () => {
  const ctx = {
    tz: TZ,
    accounts: [
      { id: "acc1", name: "بانک ملت", currency: "IRT" },
      { id: "acc2", name: "Wise", currency: "USD" },
    ],
    categories: [
      { id: "c1", name: "Hosting", kind: "expense" as const },
      { id: "c2", name: "درآمد پروژه", kind: "income" as const },
    ],
  };

  it("parses Gregorian and Jalali dates with optional time", () => {
    const d = parseImportDate("۱۴۰۵/۰۷/۲۲ 14:30", undefined, TZ)!;
    expect(zonedParts(d, TZ)).toMatchObject({
      year: 2026,
      month: 10,
      day: 14,
      hour: 14,
      minute: 30,
    });
    expect(parseImportDate("2026-10-14", "09:05", TZ)!.toISOString()).toBe(
      "2026-10-14T05:35:00.000Z",
    );
    expect(parseImportDate("14/10/2026", undefined, TZ)).toBeNull();
    expect(parseImportDate("2026-10-14 25:00", undefined, TZ)).toBeNull();
  });

  it("maps valid rows and reports errors/warnings per line", () => {
    const table = parseCsv(
      [
        "تاریخ,مبلغ,نوع,حساب,دسته,توضیحات",
        "1405/07/20,۱۲٬۰۰۰٬۰۰۰,درآمد,بانک ملت,درآمد پروژه,پرداخت آکمه",
        "2026-10-01,-12.50,,Wise,Hosting,VPS",
        "2026-10-02,abc,expense,Wise,,bad amount",
        "2026-10-03,10,expense,Unknown,,bad account",
        "2026-10-04,10,expense,wise,Nope,unknown category",
        "2026-10-05,10,transfer,wise,,skip",
        "bad,10,income,wise,,bad date",
      ].join("\n"),
    );
    const { rows, missingColumns } = mapImportRows(table, ctx);
    expect(missingColumns).toEqual([]);
    expect(rows[0]!.data).toMatchObject({
      kind: "income",
      amountMinor: 12_000_000,
      currency: "IRT",
      accountId: "acc1",
      categoryId: "c2",
    });
    expect(rows[1]!.data).toMatchObject({ kind: "expense", amountMinor: 1250, categoryId: "c1" });
    expect(rows[2]!.errors).toContain("badAmount");
    expect(rows[3]!.errors).toContain("unknownAccount");
    expect(rows[4]!.data?.categoryId).toBeNull();
    expect(rows[4]!.warnings).toContain("unknownCategory");
    expect(rows[5]!.data).toBeNull();
    expect(rows[5]!.warnings).toContain("transferSkipped");
    expect(rows[6]!.errors).toContain("badDate");
    expect(rows[6]!.line).toBe(8);
  });

  it("reports missing required columns", () => {
    const { missingColumns } = mapImportRows(parseCsv("date,description\n2026-01-01,x"), ctx);
    expect(missingColumns).toEqual(["amount", "account"]);
  });
});
