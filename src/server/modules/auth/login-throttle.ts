import "server-only";
import {
  isRateLimited,
  rateLimit,
  refundRateLimit,
  resetRateLimit,
} from "@/server/auth/rate-limit";

export const LOGIN_WINDOW_MS = 15 * 60_000;
/** Failed sign-ins allowed per (email, IP) pair per window. */
export const LOGIN_MAX_FAILURES_PER_ACCOUNT = 8;
/** Coarse cap on failed sign-ins from one IP across all emails (password spraying). */
export const LOGIN_MAX_FAILURES_PER_IP = 20;

/**
 * Brute-force protection for the login form that cannot be used to lock
 * someone else out:
 *
 * - only *failed* attempts count, and the per-account bucket is keyed by
 *   (email, IP) — failures from an attacker's IP never block the owner
 *   signing in from theirs;
 * - a successful sign-in clears its (email, IP) bucket;
 * - a coarse per-IP bucket caps failures across all emails.
 *
 * An attempt reserves a slot in both buckets *before* the (slow, async)
 * password check, so a burst of parallel requests can't all slip past the
 * limit; `succeeded()` gives the slots back.
 */
export function beginLoginAttempt(email: string, ip: string | null) {
  const who = ip ?? "unknown";
  const ipKey = `login:ip:${who}`;
  const accountKey = `login:account:${who}:${email.trim().toLowerCase()}`;

  if (
    isRateLimited(ipKey, LOGIN_MAX_FAILURES_PER_IP) ||
    isRateLimited(accountKey, LOGIN_MAX_FAILURES_PER_ACCOUNT)
  ) {
    return { allowed: false as const };
  }
  rateLimit(ipKey, LOGIN_MAX_FAILURES_PER_IP, LOGIN_WINDOW_MS);
  rateLimit(accountKey, LOGIN_MAX_FAILURES_PER_ACCOUNT, LOGIN_WINDOW_MS);

  return {
    allowed: true as const,
    /** Call after a successful sign-in: the attempt no longer counts as a failure. */
    succeeded() {
      resetRateLimit(accountKey);
      refundRateLimit(ipKey);
    },
  };
}
