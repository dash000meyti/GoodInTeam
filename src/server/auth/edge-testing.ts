import { EDGE_HEADER, edgeToken } from "./edge";

/**
 * TEST HELPER: request headers as they look after src/proxy.ts handled the
 * request. Import it from `*.test.ts` files only.
 *
 * Unit tests call route handlers and services directly, without the proxy.
 * Code that needs the proxy's voucher (`requestMeta()`, `defineAction()`,
 * the API's per-IP failure limit; see ./edge.ts) refuses such a request, and
 * that check is never switched off for tests. A test that needs a vouched
 * request builds its headers with this function instead:
 *
 * ```ts
 * new Request(url, { headers: vouchedHeaders({ "x-forwarded-for": "198.51.100.1" }) })
 * ```
 *
 * It signs with the same key as the code under test (`APP_SECRET`, or the
 * development key when the variable is unset), so nothing is weakened.
 */
export function vouchedHeaders(init?: HeadersInit) {
  const headers = new Headers(init);
  headers.set(EDGE_HEADER, edgeToken());
  return headers;
}
