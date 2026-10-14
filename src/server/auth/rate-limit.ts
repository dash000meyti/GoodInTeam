import "server-only";

/**
 * Tiny in-memory fixed-window rate limiter. Good enough for a single-node
 * deployment (one Docker container). Replace with Redis if you scale out.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  b.count++;
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count), resetAt: b.resetAt };
}
