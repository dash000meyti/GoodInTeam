/**
 * First-run owner setup against a throwaway SQLite database (real migrations).
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const dir = mkdtempSync(path.join(tmpdir(), "gt-setup-"));
process.env.DATA_DIR = dir;

const { db, getDb } = await import("@/server/db/client");
const s = await import("@/server/db/schema");
const { eq } = await import("drizzle-orm");
const { AppError } = await import("@/server/errors");
const { createFirstOwner } = await import("./setup");

const owners = () => db.select().from(s.users).where(eq(s.users.role, "owner")).all();

beforeEach(() => {
  db.delete(s.users).run();
});

afterAll(() => {
  getDb().sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("createFirstOwner", () => {
  it("creates the owner with a hashed password", async () => {
    const u = await createFirstOwner({
      name: " Owner ",
      email: " Owner@Example.com ",
      password: "a-long-passphrase",
      locale: "en",
    });
    expect(u).toMatchObject({ role: "owner", email: "owner@example.com", name: "Owner" });
    expect(u.locale).toBe("en");
    expect(u.passwordHash).toMatch(/^scrypt\$/);
    expect(owners()).toHaveLength(1);
  });

  it("creates exactly one owner when two submissions race", async () => {
    const results = await Promise.allSettled([
      createFirstOwner({ name: "First", email: "a@example.com", password: "a-long-passphrase" }),
      createFirstOwner({ name: "Second", email: "b@example.com", password: "a-long-passphrase" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.filter((r) => r.status === "rejected");
    expect(rejected).toHaveLength(1);
    const reason = (rejected[0] as PromiseRejectedResult).reason;
    expect(reason).toBeInstanceOf(AppError);
    expect(reason.code).toBe("forbidden");
    expect(owners()).toHaveLength(1);
  });

  it("refuses once an owner exists", async () => {
    await createFirstOwner({
      name: "First",
      email: "a@example.com",
      password: "a-long-passphrase",
    });
    await expect(
      createFirstOwner({ name: "Late", email: "late@example.com", password: "a-long-passphrase" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(owners()).toHaveLength(1);
  });

  it("rejects an email that already belongs to another user", async () => {
    db.insert(s.users).values({ email: "taken@example.com", name: "Member", role: "member" }).run();
    await expect(
      createFirstOwner({
        name: "Owner",
        email: "Taken@example.com",
        password: "a-long-passphrase",
      }),
    ).rejects.toMatchObject({ code: "conflict" });
    expect(owners()).toHaveLength(0);
  });
});
