import { isIP } from "node:net";

/**
 * Which request headers may be trusted for the client IP depends on how the
 * app is deployed, so it is configured with the `TRUST_PROXY` env variable:
 *
 * - `none` (default) — clients connect to Next.js directly. Every forwarding
 *   header the client sends is untrusted: src/proxy.ts strips them, so Next.js
 *   fills `x-forwarded-for` with the TCP peer address, which we read.
 * - `cloudflare` — trust `cf-connecting-ip`. Only safe when the origin is
 *   reachable exclusively through Cloudflare (firewall / Cloudflare Tunnel).
 * - `xff:N` — N trusted reverse proxies each append the address they saw to
 *   `x-forwarded-for`; the client is the N-th entry from the right (entries
 *   further left were supplied by the client and are ignored).
 *
 * Pure module (no `server-only`) because src/proxy.ts imports it too.
 */
export type TrustProxy = { mode: "none" } | { mode: "cloudflare" } | { mode: "xff"; hops: number };

/** Headers that carry a client address and can be forged by the client. */
export const CLIENT_ADDRESS_HEADERS = [
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  "true-client-ip",
  "forwarded",
] as const;

/** Parse a `TRUST_PROXY` value. Returns null when it is invalid. */
export function parseTrustProxy(raw: string | null | undefined): TrustProxy | null {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "" || value === "none") return { mode: "none" };
  if (value === "cloudflare") return { mode: "cloudflare" };
  const m = /^xff:([1-9]\d?)$/.exec(value);
  if (m) return { mode: "xff", hops: Number(m[1]) };
  return null;
}

/** `TRUST_PROXY` from the environment; an invalid value falls back to the safe `none`. */
export function trustProxyFromEnv(): TrustProxy {
  return parseTrustProxy(process.env.TRUST_PROXY) ?? { mode: "none" };
}

/**
 * Normalise an address taken from a header: strips `[]`/ports and the
 * IPv4-mapped IPv6 prefix, and returns null unless it is a valid IP (so header
 * junk never ends up in rate-limit keys, sessions or audit logs).
 */
export function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let v = raw.trim();
  if (!v || v.length > 64) return null;
  const bracketed = /^\[([^\]]+)\](?::\d{1,5})?$/.exec(v);
  if (bracketed) v = bracketed[1]!;
  else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d{1,5}$/.test(v)) v = v.slice(0, v.lastIndexOf(":"));
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(v);
  if (mapped) v = mapped[1]!;
  return isIP(v) ? v.toLowerCase() : null;
}

/** The N-th entry from the right of an `x-forwarded-for` chain (left-most if shorter). */
function fromForwardedFor(value: string | null, hops: number) {
  if (!value) return null;
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  return normalizeIp(parts[Math.max(0, parts.length - hops)]);
}

interface HeaderSource {
  get(name: string): string | null;
}

/** Client IP for rate limits and audit logs, honouring `TRUST_PROXY`. */
export function clientIp(headers: HeaderSource, trust: TrustProxy = trustProxyFromEnv()) {
  switch (trust.mode) {
    case "cloudflare":
      return normalizeIp(headers.get("cf-connecting-ip"));
    case "xff":
      return fromForwardedFor(headers.get("x-forwarded-for"), trust.hops);
    case "none":
      // Set by Next.js from the socket (src/proxy.ts removed the client's copy).
      return fromForwardedFor(headers.get("x-forwarded-for"), 1);
  }
}

/**
 * Request headers to forward from src/proxy.ts. With `none`, client-supplied
 * address headers are removed so Next.js fills `x-forwarded-for` from the
 * socket and nothing downstream can read a forged value.
 */
export function sanitizeForwardingHeaders(input: Headers, trust: TrustProxy = trustProxyFromEnv()) {
  const headers = new Headers(input);
  if (trust.mode === "none") for (const h of CLIENT_ADDRESS_HEADERS) headers.delete(h);
  return headers;
}
