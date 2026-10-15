/**
 * MCP endpoint (JSON-RPC over HTTP) against a throwaway SQLite database with
 * the real tool registry.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/** Lets a test make authentication blow up with an unexpected (non-auth) error. */
const authFault = vi.hoisted(() => ({ error: null as Error | null }));
vi.mock("@/server/api/auth", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/server/api/auth")>();
  return {
    ...real,
    actorFromRequest: (req: Request) => {
      if (authFault.error) throw authFault.error;
      return real.actorFromRequest(req);
    },
  };
});

const dir = mkdtempSync(path.join(tmpdir(), "gt-mcp-"));
process.env.DATA_DIR = dir;

const { db, getDb } = await import("@/server/db/client");
const s = await import("@/server/db/schema");
const { hmac } = await import("@/server/auth/crypto");
const { clearRateLimits } = await import("@/server/auth/rate-limit");
const { tools } = await import("@/server/api/registry");
const { POST } = await import("./route");

let token: string;

beforeAll(() => {
  const user = db
    .insert(s.users)
    .values({ email: "member@x.test", name: "Member", role: "member" })
    .returning()
    .get();
  token = `gt_${"m".repeat(43)}`;
  db.insert(s.apiTokens)
    .values({
      userId: user.id,
      name: "mcp",
      prefix: token.slice(0, 10),
      tokenHash: hmac(token),
      scopes: ["read"],
    })
    .run();
});

beforeEach(() => {
  clearRateLimits();
  authFault.error = null;
});

afterAll(() => {
  getDb().sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

const call = (body: unknown, auth: string | null = token) =>
  POST(
    new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(auth ? { authorization: `Bearer ${auth}` } : {}),
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

const rpc = (method: string, params?: Record<string, unknown>) =>
  call({ jsonrpc: "2.0", id: 1, method, params });

describe("POST /api/mcp", () => {
  describe("authentication", () => {
    it("answers 401 with WWW-Authenticate for a missing or bad token", async () => {
      for (const auth of [null, `gt_${"x".repeat(43)}`]) {
        const res = await call({ jsonrpc: "2.0", id: 1, method: "ping" }, auth);
        expect(res.status).toBe(401);
        expect(res.headers.get("www-authenticate")).toMatch(/^Bearer/);
        expect((await res.json()).error.code).toBe(-32001);
      }
    });

    it("answers 500 (not 401) when authentication fails for an internal reason", async () => {
      authFault.error = new Error("SQLITE_BUSY: database is locked");
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      const res = await rpc("ping");
      expect(res.status).toBe(500);
      expect(res.headers.get("www-authenticate")).toBeNull();
      const body = await res.json();
      expect(body.error).toEqual({ code: -32603, message: "Internal error" });
      expect(JSON.stringify(body)).not.toContain("SQLITE");
      expect(log).toHaveBeenCalled();
      log.mockRestore();
    });
  });

  describe("protocol", () => {
    it("negotiates only the supported protocol versions", async () => {
      const latest = await (await rpc("initialize", { protocolVersion: "2025-11-25" })).json();
      expect(latest.result.protocolVersion).toBe("2025-11-25");
      const older = await (await rpc("initialize", { protocolVersion: "2025-06-18" })).json();
      expect(older.result.protocolVersion).toBe("2025-06-18");
      // 2025-03-26 needs JSON-RPC batching, which this server doesn't implement.
      const batching = await (await rpc("initialize", { protocolVersion: "2025-03-26" })).json();
      expect(batching.result.protocolVersion).toBe("2025-11-25");
    });

    it("rejects malformed JSON and batches", async () => {
      const parse = await call("{not json");
      expect(parse.status).toBe(400);
      expect((await parse.json()).error.code).toBe(-32700);
      const batch = await call([{ jsonrpc: "2.0", id: 1, method: "ping" }]);
      expect(batch.status).toBe(400);
      expect((await batch.json()).error.code).toBe(-32600);
    });

    it("reports unknown methods as -32601", async () => {
      expect((await (await rpc("resources/list")).json()).error.code).toBe(-32601);
    });
  });

  describe("tools/call", () => {
    it("runs a known tool", async () => {
      const res = await rpc("tools/call", { name: "whoami", arguments: {} });
      const body = await res.json();
      expect(body.result.isError).toBe(false);
      expect(JSON.parse(body.result.content[0].text).user.email).toBe("member@x.test");
    });

    it("returns JSON-RPC -32602 for an unknown tool", async () => {
      const res = await rpc("tools/call", { name: "does_not_exist", arguments: {} });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(1);
      expect(body.result).toBeUndefined();
      expect(body.error).toEqual({ code: -32602, message: "Unknown tool: does_not_exist" });
    });

    it("treats tools hidden from the caller's role as unknown", async () => {
      const adminOnly = tools.find((t) => t.roles && !t.roles.includes("member"));
      expect(adminOnly).toBeDefined();
      const body = await (await rpc("tools/call", { name: adminOnly!.name, arguments: {} })).json();
      expect(body.error.code).toBe(-32602);
    });

    it("returns -32602 when the tool name is missing", async () => {
      const body = await (await rpc("tools/call", { arguments: {} })).json();
      expect(body.error.code).toBe(-32602);
    });

    it("reports tool failures (e.g. validation) as an isError result", async () => {
      const body = await (
        await rpc("tools/call", { name: "projects_get", arguments: { id: 42 } })
      ).json();
      expect(body.error).toBeUndefined();
      expect(body.result.isError).toBe(true);
    });
  });
});
