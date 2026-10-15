import "server-only";

/**
 * Tiny in-memory fixed-window rate limiter. Good enough for a single-node
 * deployment (one Docker container). Replace with Redis if you scale out.
 *
 * Keys are namespaced by their first segment (`login:…`, `api:…`, `view:…`).
 * Each namespace has its own bounded map, so flooding one kind of key can
 * neither exhaust memory nor evict the buckets of another (e.g. login).
 */
type Bucket = { count: number; resetAt: number };
type Space = { buckets: Map<string, Bucket>; nextSweep: number };
const spaces = new Map<string, Space>();

/** Sweep expired buckets (at most once a second) once a namespace grows past this. */
const SWEEP_AT = 10_000;
/** Hard cap per namespace: the oldest buckets are evicted beyond this. */
const MAX_BUCKETS = 50_000;

function spaceOf(key: string) {
  const name = key.slice(0, Math.max(0, key.indexOf(":")));
  let s = spaces.get(name);
  if (!s) spaces.set(name, (s = { buckets: new Map(), nextSweep: 0 }));
  return s;
}

function live({ buckets }: Space, key: string, now: number) {
  const b = buckets.get(key);
  if (b && b.resetAt <= now) {
    buckets.delete(key);
    return undefined;
  }
  return b;
}

function prune(s: Space, now: number) {
  if (s.buckets.size > SWEEP_AT && now >= s.nextSweep) {
    s.nextSweep = now + 1000;
    for (const [k, v] of s.buckets) if (v.resetAt <= now) s.buckets.delete(k);
  }
  // Maps iterate in insertion order → the first key is the oldest window.
  while (s.buckets.size > MAX_BUCKETS) {
    const oldest = s.buckets.keys().next().value;
    if (oldest === undefined) break;
    s.buckets.delete(oldest);
  }
}

/** Count one hit for `key`; `ok` is false once more than `limit` hits fall in the window. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const s = spaceOf(key);
  const b = live(s, key, now);
  if (!b) {
    s.buckets.set(key, { count: 1, resetAt: now + windowMs });
    prune(s, now);
    return { ok: limit >= 1, remaining: Math.max(0, limit - 1), resetAt: now + windowMs };
  }
  b.count++;
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count), resetAt: b.resetAt };
}

/** True when `key` already used up `limit` hits in its window (does not count a hit). */
export function isRateLimited(key: string, limit: number) {
  const b = live(spaceOf(key), key, Date.now());
  return !!b && b.count >= limit;
}

/** Give back one hit (e.g. an attempt reserved up-front turned out fine). */
export function refundRateLimit(key: string) {
  const s = spaceOf(key);
  const b = live(s, key, Date.now());
  if (!b) return;
  if (b.count <= 1) s.buckets.delete(key);
  else b.count--;
}

/** Forget `key` entirely (e.g. after a successful login). */
export function resetRateLimit(key: string) {
  spaceOf(key).buckets.delete(key);
}

/** Number of live buckets in a namespace (tests / diagnostics). */
export function rateLimitBucketCount(namespace: string) {
  return spaces.get(namespace)?.buckets.size ?? 0;
}

/** Test helper: drop every bucket. */
export function clearRateLimits() {
  spaces.clear();
}
