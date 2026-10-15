/** Longest `next` value we follow; anything longer falls back (prevents abuse/DoS). */
export const MAX_NEXT_LENGTH = 2000;

const BASE = "http://next.invalid";

/**
 * Only allow same-origin, path-absolute redirects (prevents open redirects).
 *
 * Browsers and the WHATWG URL parser silently drop tab/newline characters and
 * treat `\` like `/`, so `/\t/evil.com` or `/\evil.com` become `//evil.com`
 * (a protocol-relative URL to another host). We therefore reject any control
 * character or backslash outright, then resolve the value against a dummy
 * origin and require that it stays on that origin with a single leading `/`.
 * Returns the normalised path (`pathname + search + hash`) or `fallback`.
 */
export function safeNext(next: unknown, fallback: string): string {
  if (typeof next !== "string" || next.length === 0 || next.length > MAX_NEXT_LENGTH) {
    return fallback;
  }
  // C0 controls, DEL, C1 controls and backslashes are never legitimate here.
  if (/[\u0000-\u001f\u007f-\u009f\\]/.test(next)) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;

  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  if (!url.pathname.startsWith("/") || url.pathname.startsWith("//")) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
