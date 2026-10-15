/**
 * REST tool endpoint against a throwaway SQLite database with the real registry.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const dir = mkdtempSync(path.join(tmpdir(), "gt-rest-"));
process.env.DATA_DIR = dir;

const { db, getDb } = await import("@/server/db/client");
const s = await import("@/server/db/schema");
const { hmac } = await import("@/server/auth/crypto");
const { clearRateLimits } = await import("@/server/auth/rate-limit");
const { POST } = await import("./route");

const token = `gt_${"r".repeat(43)}`;

beforeAll(() => {
  const user = db
    .insert(s.users)
    .values({ email: "member@x.test", name: "Member", role: "member" })
    .returning()
    .get();
  db.insert(s.apiTokens)
    .values({
      userId: user.id,
      name: "rest",
      prefix: token.slice(0, 10),
      tokenHash: hmac(token),
      scopes: ["read"],
    })
    .run();
});

beforeEach(() => clearRateLimits());

afterAll(() => {
  getDb().sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

const post = (name: string, body?: string, auth: string | null = token) =>
  POST(
    new Request(`http://localhost/api/v1/tools/${name}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(auth ? { authorization: `Bearer ${auth}` } : {}),
      },
      body,
    }),
    { params: Promise.resolve({ name }) },
  );

describe("POST /api/v1/tools/{name}", () => {
  it("runs a tool with a JSON body", async () => {
    const res = await post("whoami", "{}");
    expect(res.status).toBe(200);
    expect((await res.json()).data.user.email).toBe("member@x.test");
  });

  it("treats an empty body as {}", async () => {
    for (const body of [undefined, "", "  \n"]) {
      expect((await post("whoami", body)).status).toBe(200);
    }
  });

  it.each(["{not json", "{", "undefined", '{"a":1,}'])(
    "answers 400 for a malformed JSON body (%j)",
    async (body) => {
      const res = await post("whoami", body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: { code: "bad_request", message: "Malformed JSON body" },
      });
    },
  );

  it("authenticates before reading the body", async () => {
    const res = await post("whoami", "{not json", null);
    expect(res.status).toBe(401);
  });

  it("keeps 404 for unknown tools and 422 for invalid input", async () => {
    expect((await post("does_not_exist", "{}")).status).toBe(404);
    expect((await post("projects_get", '{"id":42}')).status).toBe(422);
  });
});
