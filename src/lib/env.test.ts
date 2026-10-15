import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { assertValidEnv, env, envProblems } = await import("./env");

const SECRET = "x".repeat(44);
const prod = (extra: Record<string, string | undefined> = {}) =>
  ({ NODE_ENV: "production", APP_SECRET: SECRET, ...extra }) as NodeJS.ProcessEnv;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("envProblems / assertValidEnv", () => {
  it("accepts a production config with a long secret", () => {
    expect(envProblems(prod())).toEqual({ errors: [], warnings: [] });
    expect(() => assertValidEnv(prod({ TRUST_PROXY: "xff:1" }))).not.toThrow();
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["blank", "   "],
    ["the .env.example placeholder", "change-me-to-a-long-random-string"],
    ["the dev fallback", "dev-insecure-secret-do-not-use-in-production"],
  ])("fails fast in production when APP_SECRET is %s", (_label, value) => {
    const e = prod({ APP_SECRET: value });
    expect(envProblems(e).errors[0]).toMatch(/APP_SECRET must be set/);
    expect(() => assertValidEnv(e)).toThrow(/APP_SECRET must be set/);
  });

  it("only warns about a short (but set) secret", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => assertValidEnv(prod({ APP_SECRET: "short-but-set" }))).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/shorter than 32/));
  });

  it("does not require APP_SECRET outside production", () => {
    expect(envProblems({ NODE_ENV: "development" } as NodeJS.ProcessEnv).errors).toEqual([]);
  });

  it("rejects an invalid TRUST_PROXY in every environment", () => {
    expect(() =>
      assertValidEnv({ NODE_ENV: "development", TRUST_PROXY: "yes" } as NodeJS.ProcessEnv),
    ).toThrow(/TRUST_PROXY="yes" is invalid/);
    expect(envProblems(prod({ TRUST_PROXY: "cloudflare" })).errors).toEqual([]);
  });
});

describe("env.appSecret", () => {
  it("returns the configured secret unchanged", () => {
    vi.stubEnv("APP_SECRET", SECRET);
    expect(env.appSecret).toBe(SECRET);
  });

  it("uses an insecure fallback only outside production", () => {
    vi.stubEnv("APP_SECRET", "change-me-to-a-long-random-string");
    vi.stubEnv("NODE_ENV", "development");
    expect(env.appSecret).toBe("dev-insecure-secret-do-not-use-in-production");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => env.appSecret).toThrow(/APP_SECRET/);
  });
});
