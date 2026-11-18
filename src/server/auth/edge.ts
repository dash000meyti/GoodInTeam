import { createHmac, timingSafeEqual } from "node:crypto";
import { clientIp, trustProxyFromEnv } from "./client-ip";

/**
 * The proxy's voucher.
 *
 * `src/proxy.ts` is the only place that decides which forwarding headers a
 * request may carry (see ./client-ip.ts). Server code that reads the client
 * address, and every server action, must therefore know that the proxy really
 * handled the request. The proxy says so with a request header that only the
 * server can produce: `x-gt-edge = HMAC-SHA256(APP_SECRET, "edge")`. It drops
 * any value the client sent first, and it does not vouch for the static
 * prefixes (`/media/…`, `/brand/…`, `/fonts/…`, `/_next/…`, the root metadata
 * files), where no action and no address-based limit belongs.
 *
 * Readers call `isVouched(headers)`; `requestMeta()`, `defineAction()` and
 * `definePublicAction()` refuse a request without it.
 *
 * Pure module (no `server-only`, no `@/lib/env`) because the proxy imports it.
 */
export const EDGE_HEADER = "x-gt-edge";

/** Development and unit tests only; production never boots without APP_SECRET. */
const DEV_EDGE_KEY = "dev-edge-key-not-for-production";

let memo: { secret: string; token: string } | null = null;

function edgeSecret() {
  const secret = process.env.APP_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    // assertValidEnv() stops a production server without a secret at boot;
    // this keeps the voucher unforgeable even if that check is ever bypassed.
    throw new Error("APP_SECRET must be set to a long random string in production.");
  }
  return DEV_EDGE_KEY;
}

/** The value the proxy puts in `x-gt-edge`. Never sent to the browser. */
export function edgeToken() {
  const secret = edgeSecret();
  if (memo?.secret !== secret) {
    memo = { secret, token: createHmac("sha256", secret).update("edge").digest("hex") };
  }
  return memo.token;
}

interface HeaderSource {
  get(name: string): string | null;
}

/** True when the request passed through src/proxy.ts on a path it vouches for. */
export function isVouched(headers: HeaderSource) {
  const got = headers.get(EDGE_HEADER);
  if (!got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(edgeToken());
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The client IP of a request the proxy vouched for, else null. Forwarding
 * headers mean something only after the proxy vetted them, so a request
 * without the voucher has no trusted address (callers fall back to a shared
 * "unknown" bucket or refuse).
 */
export function vouchedClientIp(headers: HeaderSource) {
  return isVouched(headers) ? clientIp(headers, trustProxyFromEnv()) : null;
}
