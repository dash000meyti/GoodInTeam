import { afterEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE, sessionCookieOptions, sessionCookieSecure } from "./cookie";

afterEach(() => vi.unstubAllEnvs());

describe("session cookie", () => {
  it("is Secure only in production with an https site URL", () => {
    expect(sessionCookieSecure("production", "https://goodteam.ir")).toBe(true);
    expect(sessionCookieSecure("production", " HTTPS://goodteam.ir ")).toBe(true);
    expect(sessionCookieSecure("production", "http://intranet.local")).toBe(false);
    expect(sessionCookieSecure("production", undefined)).toBe(false);
    expect(sessionCookieSecure("development", "https://goodteam.ir")).toBe(false);
    expect(sessionCookieSecure("test", "https://goodteam.ir")).toBe(false);
  });

  it("reads the environment by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://goodteam.ir");
    expect(sessionCookieOptions()).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    expect(sessionCookieOptions().secure).toBe(false);
  });

  it("keeps the cookie name stable", () => {
    expect(SESSION_COOKIE).toBe("gt_session");
  });
});
