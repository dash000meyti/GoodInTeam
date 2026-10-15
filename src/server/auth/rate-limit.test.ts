import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  clearRateLimits,
  isRateLimited,
  rateLimit,
  rateLimitBucketCount,
  refundRateLimit,
  resetRateLimit,
} = await import("./rate-limit");

beforeEach(() => {
  clearRateLimits();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("rateLimit", () => {
  it("allows `limit` hits per window, then blocks until the window resets", () => {
    for (let i = 0; i < 3; i++) expect(rateLimit("t:a", 3, 1000).ok).toBe(true);
    expect(rateLimit("t:a", 3, 1000).ok).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(rateLimit("t:a", 3, 1000)).toMatchObject({ ok: true, remaining: 2 });
  });

  it("keeps keys independent", () => {
    rateLimit("t:a", 1, 1000);
    expect(rateLimit("t:a", 1, 1000).ok).toBe(false);
    expect(rateLimit("t:b", 1, 1000).ok).toBe(true);
  });
});

describe("isRateLimited / refund / reset", () => {
  it("checks without counting", () => {
    expect(isRateLimited("t:a", 2)).toBe(false);
    rateLimit("t:a", 2, 1000);
    expect(isRateLimited("t:a", 2)).toBe(false);
    rateLimit("t:a", 2, 1000);
    expect(isRateLimited("t:a", 2)).toBe(true);
    expect(isRateLimited("t:a", 2)).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(isRateLimited("t:a", 2)).toBe(false);
  });

  it("refund gives one hit back; reset forgets the key", () => {
    rateLimit("t:a", 2, 1000);
    rateLimit("t:a", 2, 1000);
    refundRateLimit("t:a");
    expect(isRateLimited("t:a", 2)).toBe(false);
    refundRateLimit("t:a");
    refundRateLimit("t:a"); // never below zero
    expect(rateLimitBucketCount("t")).toBe(0);
    rateLimit("t:a", 2, 1000);
    rateLimit("t:a", 2, 1000);
    resetRateLimit("t:a");
    expect(isRateLimited("t:a", 2)).toBe(false);
  });
});

describe("memory bounds", () => {
  it("caps each namespace and never evicts another namespace's buckets", () => {
    rateLimit("login:victim", 1, 60_000);
    rateLimit("login:victim", 1, 60_000);
    expect(isRateLimited("login:victim", 1)).toBe(true);

    // Flood another namespace with unique keys.
    for (let i = 0; i < 60_000; i++) rateLimit(`flood:${i}`, 1, 60_000);
    expect(rateLimitBucketCount("flood")).toBeLessThanOrEqual(50_000);
    expect(isRateLimited("login:victim", 1)).toBe(true);
  });

  it("prunes expired buckets first", () => {
    for (let i = 0; i < 10_001; i++) rateLimit(`old:${i}`, 1, 1000);
    vi.advanceTimersByTime(1000);
    rateLimit("old:new", 1, 1000);
    expect(rateLimitBucketCount("old")).toBe(1);
  });
});
