/**
 * Bearer-token authentication + API rate limiting against a throwaway SQLite
 * database (real migrations).
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const dir = mkdtempSync(path.join(tmpdir(), "gt-api-auth-"));
process.env.DATA_DIR = dir;
process.env.TRUST_PROXY = "xff:1";

const { db, getDb } = await import("@/server/db/client");
const s = await import("@/server/db/schema");
const { hmac } = await import("@/server/auth/crypto");
const { clearRateLimits, rateLimitBucketCount } = await import("@/server/auth/rate-limit");
const { API_AUTH_FAILURES_PER_IP, API_RATE_LIMIT, actorFromRequest } = await import("./auth");

const randomToken = () =>
  `gt_${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url")}`;

function makeToken(userId: string, extra: Partial<typeof s.apiTokens.$inferInsert> = {}) {
  const raw = randomToken();
  db.insert(s.apiTokens)
    .values({
      userId,
      name: "test",
      prefix: raw.slice(0, 10),
      tokenHash: hmac(raw),
      scopes: ["read", "write"],
      ...extra,
    })
    .run();
  return raw;
}

const req = (token: string | null, ip = "198.51.100.1") =>
  new Request("http://localhost/api/v1/tools", {
    headers: {
      ...(token === null ? {} : { authorization: `Bearer ${token}` }),
      "x-forwarded-for": ip,
    },
  });

function errorOf(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    return e as { code?: string; message?: string };
  }
  throw new Error("expected an error");
}

let userId: string;
let disabledId: string;

beforeAll(() => {
  const [u, d] = db
    .insert(s.users)
    .values([
      { email: "member@x.test", name: "Member", role: "member" },
      { email: "gone@x.test", name: "Gone", role: "member", disabled: true },
    ])
    .returning()
    .all();
  userId = u!.id;
  disabledId = d!.id;
});

beforeEach(() => clearRateLimits());

afterAll(() => {
  getDb().sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("actorFromRequest", () => {
  it("authenticates a valid token as its user", () => {
    const actor = actorFromRequest(req(makeToken(userId)));
    expect(actor).toMatchObject({ via: "api", user: { id: userId, role: "member" } });
    expect(actor.scopes).toEqual(["read", "write"]);
  });

  it.each([
    ["no header", null, "Missing or invalid bearer token"],
    ["not a gt_ token", "abc", "Missing or invalid bearer token"],
    ["malformed gt_ token", "gt_!!", "Invalid or revoked token"],
    ["unknown token", "gt_" + "a".repeat(43), "Invalid or revoked token"],
  ])("rejects %s with 401", (_label, token, message) => {
    expect(errorOf(() => actorFromRequest(req(token)))).toMatchObject({
      code: "unauthorized",
      message,
    });
  });

  it("rejects revoked, expired and disabled-user tokens", () => {
    const revoked = makeToken(userId, { revokedAt: new Date() });
    const expired = makeToken(userId, { expiresAt: new Date(Date.now() - 1000) });
    const disabled = makeToken(disabledId);
    expect(errorOf(() => actorFromRequest(req(revoked))).code).toBe("unauthorized");
    expect(errorOf(() => actorFromRequest(req(expired)))).toMatchObject({
      code: "unauthorized",
      message: "Token expired",
    });
    expect(errorOf(() => actorFromRequest(req(disabled))).code).toBe("unauthorized");
  });

  it("does not create a bucket per random token", () => {
    for (let i = 0; i < API_AUTH_FAILURES_PER_IP; i++) {
      expect(errorOf(() => actorFromRequest(req(randomToken()))).code).toBe("unauthorized");
    }
    // One failure bucket for the IP; none per (unverified) token text.
    expect(rateLimitBucketCount("api")).toBe(1);
  });

  it("answers 429 after too many failures from one IP, without blocking valid tokens", () => {
    const good = makeToken(userId);
    for (let i = 0; i < API_AUTH_FAILURES_PER_IP; i++) {
      expect(errorOf(() => actorFromRequest(req(randomToken()))).code).toBe("unauthorized");
    }
    expect(errorOf(() => actorFromRequest(req(randomToken()))).code).toBe("rate_limited");
    expect(errorOf(() => actorFromRequest(req(randomToken(), "203.0.113.5"))).code).toBe(
      "unauthorized",
    );
    expect(actorFromRequest(req(good)).user.id).toBe(userId);
  });

  it("keys the request budget by token id, so look-alike tokens can't exhaust it", () => {
    const good = makeToken(userId);
    // Forged tokens sharing the real token's visible prefix, from many IPs.
    for (let i = 0; i < API_RATE_LIMIT + 50; i++) {
      const forged = good.slice(0, 12) + "x".repeat(good.length - 12);
      errorOf(() => actorFromRequest(req(forged, `10.0.${i >> 8}.${i & 255}`)));
    }
    expect(actorFromRequest(req(good)).user.id).toBe(userId);
  });

  it("limits each verified token to API_RATE_LIMIT requests per minute", () => {
    const good = makeToken(userId);
    const other = makeToken(userId);
    for (let i = 0; i < API_RATE_LIMIT; i++) actorFromRequest(req(good));
    expect(errorOf(() => actorFromRequest(req(good))).code).toBe("rate_limited");
    expect(actorFromRequest(req(other)).user.id).toBe(userId);
  });
});
