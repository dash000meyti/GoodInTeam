/**
 * Persian-aware server search against a throwaway SQLite database: the
 * `fa_norm` SQL function and `textMatch()` (Arabic/Persian letter forms, ZWNJ,
 * digits, case, literal `%` and `_`).
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const dir = mkdtempSync(path.join(tmpdir(), "gt-search-"));
process.env.DATA_DIR = dir;

const { db, getDb } = await import("./client");
const { clients } = await import("./schema");
const { textMatch } = await import("./search");
const { asc } = await import("drizzle-orm");

const names = [
  "شرکت علی", // Persian yeh
  "كد آكادمي", // Arabic kaf and yeh, as typed on an Arabic layout
  "می‌خواهم سایت", // with ZWNJ
  "Project ۱۴۰۵",
  "50% off",
  "a_b studio",
  "axb studio",
  "GOOD IN TEAM",
];
db.insert(clients)
  .values(names.map((name) => ({ name })))
  .run();

function find(q: string) {
  return db
    .select({ name: clients.name })
    .from(clients)
    .where(textMatch(q, clients.name))
    .orderBy(asc(clients.name))
    .all()
    .map((r) => r.name);
}

afterAll(() => {
  getDb().sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("fa_norm", () => {
  it("normalises stored text like the client filters do", () => {
    const row = getDb()
      .sqlite.prepare("select fa_norm(?) as v, fa_norm(null) as n")
      .get("علي ۱۴۰۵") as {
      v: string;
      n: null;
    };
    expect(row).toEqual({ v: "علی 1405", n: null });
  });
});

describe("textMatch", () => {
  it("matches Arabic and Persian letter forms both ways", () => {
    expect(find("علي")).toEqual(["شرکت علی"]);
    expect(find("کد آکادمی")).toEqual(["كد آكادمي"]);
  });

  it("ignores ZWNJ and maps Persian digits", () => {
    expect(find("میخواهم")).toEqual(["می‌خواهم سایت"]);
    expect(find("1405")).toEqual(["Project ۱۴۰۵"]);
  });

  it("is case-insensitive", () => {
    expect(find("good in")).toEqual(["GOOD IN TEAM"]);
  });

  it("treats % and _ in the query literally", () => {
    expect(find("50%")).toEqual(["50% off"]);
    expect(find("a_b")).toEqual(["a_b studio"]);
  });

  it("is undefined for an empty query, so the filter drops out of and()", () => {
    expect(textMatch("", clients.name)).toBeUndefined();
    expect(textMatch("  ‌ ", clients.name)).toBeUndefined();
    expect(textMatch(undefined, clients.name)).toBeUndefined();
  });
});
