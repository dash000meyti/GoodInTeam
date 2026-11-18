import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EDGE_HEADER, edgeToken, isVouched, vouchedClientIp } from "./edge";
import { vouchedHeaders } from "./edge-testing";

afterEach(() => vi.unstubAllEnvs());

describe("the proxy's voucher", () => {
  it("is an HMAC of the app secret", () => {
    vi.stubEnv("APP_SECRET", "a-long-random-secret-for-this-test-0123456789");
    expect(edgeToken()).toBe(
      createHmac("sha256", "a-long-random-secret-for-this-test-0123456789")
        .update("edge")
        .digest("hex"),
    );
  });

  it("changes with the secret", () => {
    vi.stubEnv("APP_SECRET", "secret-one-secret-one-secret-one-1");
    const one = edgeToken();
    vi.stubEnv("APP_SECRET", "secret-two-secret-two-secret-two-2");
    expect(edgeToken()).not.toBe(one);
    // A voucher signed with the old secret no longer counts.
    expect(isVouched(new Headers({ [EDGE_HEADER]: one }))).toBe(false);
  });

  it("is never derived from a fallback key in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_SECRET", "");
    expect(() => edgeToken()).toThrow(/APP_SECRET/);
  });

  it("accepts only the exact value", () => {
    const token = edgeToken();
    expect(isVouched(new Headers({ [EDGE_HEADER]: token }))).toBe(true);
    expect(isVouched(vouchedHeaders())).toBe(true);
    for (const forged of ["", "1", "true", token.slice(0, -1), `${token}0`, token.toUpperCase()]) {
      expect(isVouched(new Headers(forged ? { [EDGE_HEADER]: forged } : {})), forged).toBe(false);
    }
  });
});

describe("vouchedClientIp", () => {
  it("reads the address only from a vouched request", () => {
    vi.stubEnv("TRUST_PROXY", "xff:1");
    const claimed = { "x-forwarded-for": "198.51.100.7" };
    expect(vouchedClientIp(vouchedHeaders(claimed))).toBe("198.51.100.7");
    expect(vouchedClientIp(new Headers(claimed))).toBeNull();
    expect(vouchedClientIp(new Headers({ ...claimed, [EDGE_HEADER]: "forged" }))).toBeNull();
  });
});
