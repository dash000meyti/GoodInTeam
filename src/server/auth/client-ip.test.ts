import { afterEach, describe, expect, it } from "vitest";
import {
  CLIENT_ADDRESS_HEADERS,
  clientIp,
  normalizeIp,
  parseTrustProxy,
  sanitizeForwardingHeaders,
  trustProxyFromEnv,
  type TrustProxy,
} from "./client-ip";

const NONE: TrustProxy = { mode: "none" };
const CF: TrustProxy = { mode: "cloudflare" };
const xff = (hops: number): TrustProxy => ({ mode: "xff", hops });

describe("parseTrustProxy", () => {
  it("parses the supported modes", () => {
    expect(parseTrustProxy(undefined)).toEqual(NONE);
    expect(parseTrustProxy("")).toEqual(NONE);
    expect(parseTrustProxy("none")).toEqual(NONE);
    expect(parseTrustProxy(" Cloudflare ")).toEqual(CF);
    expect(parseTrustProxy("xff:1")).toEqual(xff(1));
    expect(parseTrustProxy("XFF:2")).toEqual(xff(2));
    expect(parseTrustProxy("xff:99")).toEqual(xff(99));
  });

  it.each(["true", "1", "xff", "xff:0", "xff:-1", "xff:100", "xff:1.5", "x-real-ip", "all"])(
    "rejects %j",
    (value) => {
      expect(parseTrustProxy(value)).toBeNull();
    },
  );

  describe("from env", () => {
    const original = process.env.TRUST_PROXY;
    afterEach(() => {
      if (original === undefined) delete process.env.TRUST_PROXY;
      else process.env.TRUST_PROXY = original;
    });

    it("falls back to none for invalid values", () => {
      process.env.TRUST_PROXY = "everything";
      expect(trustProxyFromEnv()).toEqual(NONE);
      process.env.TRUST_PROXY = "xff:2";
      expect(trustProxyFromEnv()).toEqual(xff(2));
    });
  });
});

describe("normalizeIp", () => {
  it("accepts IPv4 and IPv6", () => {
    expect(normalizeIp("203.0.113.7")).toBe("203.0.113.7");
    expect(normalizeIp(" 2001:DB8::1 ")).toBe("2001:db8::1");
    expect(normalizeIp("::1")).toBe("::1");
  });

  it("strips ports, brackets and the IPv4-mapped prefix", () => {
    expect(normalizeIp("203.0.113.7:51234")).toBe("203.0.113.7");
    expect(normalizeIp("[2001:db8::1]:443")).toBe("2001:db8::1");
    expect(normalizeIp("[2001:db8::1]")).toBe("2001:db8::1");
    expect(normalizeIp("::ffff:198.51.100.4")).toBe("198.51.100.4");
  });

  it.each([null, undefined, "", "unknown", "evil.com", "1.2.3", "999.1.1.1", "a".repeat(100)])(
    "rejects %j",
    (value) => {
      expect(normalizeIp(value)).toBeNull();
    },
  );
});

describe("clientIp", () => {
  const forged = new Headers({
    "x-forwarded-for": "6.6.6.6, 198.51.100.4, 10.0.0.2",
    "x-real-ip": "7.7.7.7",
    "cf-connecting-ip": "203.0.113.9",
  });

  it("none: reads the address Next.js derived from the socket (right-most entry)", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "::1" }), NONE)).toBe("::1");
    // Never the client-controlled left-most entry, x-real-ip or cf-connecting-ip.
    expect(clientIp(forged, NONE)).toBe("10.0.0.2");
    expect(clientIp(new Headers(), NONE)).toBeNull();
  });

  it("cloudflare: trusts cf-connecting-ip only", () => {
    expect(clientIp(forged, CF)).toBe("203.0.113.9");
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6" }), CF)).toBeNull();
    expect(clientIp(new Headers({ "cf-connecting-ip": "not-an-ip" }), CF)).toBeNull();
  });

  it("xff:N: takes the N-th entry from the right", () => {
    expect(clientIp(forged, xff(1))).toBe("10.0.0.2");
    expect(clientIp(forged, xff(2))).toBe("198.51.100.4");
    expect(clientIp(forged, xff(3))).toBe("6.6.6.6");
  });

  it("xff:N: a client-prepended entry can't displace the real one", () => {
    // One trusted proxy appended the real peer (198.51.100.4) to a forged header.
    const h = new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 198.51.100.4" });
    expect(clientIp(h, xff(1))).toBe("198.51.100.4");
  });

  it("xff:N: uses the left-most entry when the chain is shorter than N", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.4" }), xff(2))).toBe(
      "198.51.100.4",
    );
  });

  it("ignores empty entries and junk", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.4, , " }), xff(1))).toBe(
      "198.51.100.4",
    );
    expect(clientIp(new Headers({ "x-forwarded-for": "garbage" }), xff(1))).toBeNull();
  });
});

describe("sanitizeForwardingHeaders", () => {
  const input = () =>
    new Headers({
      "x-forwarded-for": "6.6.6.6",
      "x-real-ip": "6.6.6.6",
      "cf-connecting-ip": "6.6.6.6",
      "true-client-ip": "6.6.6.6",
      forwarded: "for=6.6.6.6",
      "user-agent": "test",
      "x-forwarded-proto": "https",
    });

  it("none: removes every client address header and keeps the rest", () => {
    const out = sanitizeForwardingHeaders(input(), NONE);
    for (const h of CLIENT_ADDRESS_HEADERS) expect(out.get(h)).toBeNull();
    expect(out.get("user-agent")).toBe("test");
    expect(out.get("x-forwarded-proto")).toBe("https");
  });

  it("trusted proxies: leaves headers untouched (and does not mutate the input)", () => {
    const original = input();
    expect(sanitizeForwardingHeaders(original, xff(1)).get("x-forwarded-for")).toBe("6.6.6.6");
    expect(sanitizeForwardingHeaders(original, CF).get("cf-connecting-ip")).toBe("6.6.6.6");
    sanitizeForwardingHeaders(original, NONE);
    expect(original.get("x-forwarded-for")).toBe("6.6.6.6");
  });
});
