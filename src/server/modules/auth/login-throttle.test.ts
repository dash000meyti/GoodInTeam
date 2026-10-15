import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { clearRateLimits } = await import("@/server/auth/rate-limit");
const {
  LOGIN_MAX_FAILURES_PER_ACCOUNT,
  LOGIN_MAX_FAILURES_PER_IP,
  LOGIN_WINDOW_MS,
  beginLoginAttempt,
} = await import("./login-throttle");

const OWNER = "owner@example.com";
const ATTACKER_IP = "203.0.113.66";
const OWNER_IP = "198.51.100.7";

/** Simulate a sign-in attempt; returns false when it was throttled. */
function attempt(email: string, ip: string | null, passwordOk: boolean) {
  const a = beginLoginAttempt(email, ip);
  if (!a.allowed) return false;
  if (passwordOk) a.succeeded();
  return true;
}

beforeEach(() => {
  clearRateLimits();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("login throttle", () => {
  it("blocks an (email, IP) pair after too many failures", () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES_PER_ACCOUNT; i++) {
      expect(attempt(OWNER, ATTACKER_IP, false)).toBe(true);
    }
    expect(attempt(OWNER, ATTACKER_IP, false)).toBe(false);
    // Even the right password is refused from that IP until the window ends…
    expect(attempt(OWNER, ATTACKER_IP, true)).toBe(false);
    // …which then resets.
    vi.advanceTimersByTime(LOGIN_WINDOW_MS);
    expect(attempt(OWNER, ATTACKER_IP, false)).toBe(true);
  });

  it("cannot be used to lock the owner out from another IP", () => {
    for (let i = 0; i < 50; i++) attempt(OWNER, ATTACKER_IP, false);
    expect(attempt(OWNER, OWNER_IP, true)).toBe(true);
  });

  it("does not count successful sign-ins", () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES_PER_IP * 2; i++) {
      expect(attempt(OWNER, OWNER_IP, true)).toBe(true);
    }
  });

  it("clears the pair's failures after a successful sign-in", () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES_PER_ACCOUNT - 1; i++) attempt(OWNER, OWNER_IP, false);
    expect(attempt(OWNER, OWNER_IP, true)).toBe(true);
    for (let i = 0; i < LOGIN_MAX_FAILURES_PER_ACCOUNT; i++) {
      expect(attempt(OWNER, OWNER_IP, false)).toBe(true);
    }
    expect(attempt(OWNER, OWNER_IP, false)).toBe(false);
  });

  it("treats the email case-insensitively", () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES_PER_ACCOUNT; i++) attempt(OWNER, ATTACKER_IP, false);
    expect(attempt(" Owner@Example.COM ", ATTACKER_IP, false)).toBe(false);
  });

  it("caps failures per IP across many emails (password spraying)", () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES_PER_IP; i++) {
      expect(attempt(`user${i}@example.com`, ATTACKER_IP, false)).toBe(true);
    }
    expect(attempt("someone-else@example.com", ATTACKER_IP, false)).toBe(false);
    expect(attempt("someone-else@example.com", OWNER_IP, false)).toBe(true);
  });

  it("a success does not reset the per-IP failure count (no spray reset)", () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES_PER_IP - 1; i++) {
      attempt(`user${i}@example.com`, ATTACKER_IP, false);
    }
    expect(attempt("attacker@example.com", ATTACKER_IP, true)).toBe(true);
    expect(attempt("victim@example.com", ATTACKER_IP, false)).toBe(true);
    expect(attempt("victim2@example.com", ATTACKER_IP, false)).toBe(false);
  });

  it("reserves the slot before the password check (parallel bursts)", () => {
    const pending = Array.from({ length: 30 }, () => beginLoginAttempt(OWNER, ATTACKER_IP));
    expect(pending.filter((a) => a.allowed)).toHaveLength(LOGIN_MAX_FAILURES_PER_ACCOUNT);
  });
});
