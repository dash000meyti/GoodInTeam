import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => {} }));

const getDb = vi.fn();
vi.mock("@/server/db/client", () => ({ getDb: () => getDb() }));

const { GET } = await import("./route");

afterEach(() => vi.restoreAllMocks());

describe("GET /api/health", () => {
  it("reports up when the database answers", async () => {
    getDb.mockReturnValue({ sqlite: { prepare: () => ({ get: () => ({ 1: 1 }) }) } });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, db: "up" });
  });

  it("returns a generic 503 and logs the details server-side", async () => {
    const secretDetail = "SQLITE_CANTOPEN: unable to open /data/app.db";
    getDb.mockImplementation(() => {
      throw new Error(secretDetail);
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET();
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ ok: false, db: "down" });
    expect(text).not.toContain("SQLITE");
    expect(log).toHaveBeenCalledWith(expect.any(String), expect.any(Error));
  });
});
