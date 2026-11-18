import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale } from "@/i18n/config";
import { ACTION_BODY_LIMIT_BYTES } from "@/lib/limits";
import { sanitizeForwardingHeaders } from "@/server/auth/client-ip";
import { SESSION_COOKIE, SESSION_DAYS, sessionCookieOptions } from "@/server/auth/cookie";
import { EDGE_HEADER, edgeToken } from "@/server/auth/edge";
import {
  actionHeaderIds,
  formNamesCacheReference,
  isCacheReferenceId,
} from "@/server/auth/server-reference";

/**
 * Edge of the app. It runs before EVERY request except Next's own static
 * files and image optimizer (see `config.matcher`), so nothing below it ever
 * sees a request the proxy did not vet:
 *
 * 1. Client IP hygiene: with `TRUST_PROXY=none` the client's own
 *    `x-forwarded-for`/`x-real-ip`/`cf-connecting-ip` are dropped on every
 *    path, so server code only ever sees the socket address
 *    (server/auth/client-ip.ts).
 * 2. The voucher: any incoming `x-gt-edge` is dropped and the proxy sets its
 *    own (server/auth/edge.ts). Server actions and `requestMeta()` refuse a
 *    request without it. Static prefixes are served, but not vouched for.
 * 3. Secrets never stay in a URL: a GET whose query string carries a password
 *    field is redirected to the same URL without it.
 * 4. Cache references are refused as actions: a `'use cache'` function has a
 *    server reference id like an action, and only our own server code may call
 *    it (server/auth/server-reference.ts).
 * 5. A path that cannot be decoded is answered with 400.
 * 6. Locale routing: `fa` (default) is served without prefix: `/blog` is
 *    rewritten to `/fa/blog`; `/fa/blog` permanently redirects to `/blog`.
 * 7. Markdown mirrors for AI agents: `/blog/my-post.md` → `/api/md?...`.
 * 8. Optimistic auth gate: `/panel/*` without a session cookie goes to /login.
 *    (Real authorization happens in the data layer, see server/auth.)
 * 9. Exposes `x-gt-locale` to server code (used by server actions).
 */

/** Form fields that hold a secret. They must never be part of a URL. */
export const SECRET_QUERY_PARAMS = [
  "password",
  "vault-master",
  "currentPassword",
  "newPassword",
  "confirmPassword",
] as const;

/** `POST /api/media` (src/app/api/media/route.ts) streams uploads with its own limit. */
const UPLOAD_ROUTE = "/api/media";

/** Served from `public/` or by the `/media` route: files only, never a page or an action. */
const STATIC_PREFIXES = ["/media/", "/brand/", "/fonts/"] as const;
/** Metadata files at the app root (they must not get a locale prefix). */
const ROOT_FILES = new Set([
  "/icon.svg",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/llms-full.txt",
  "/manifest.webmanifest",
]);

const isStaticPath = (pathname: string) =>
  ROOT_FILES.has(pathname) || STATIC_PREFIXES.some((p) => pathname.startsWith(p));

/** The answer Next.js itself gives for an action id it does not know. */
const actionUnavailable = () =>
  new NextResponse("Server Action unavailable.", {
    status: 409,
    headers: { "content-type": "text/plain", "x-nextjs-action-not-found": "1" },
  });

/** The request body, or null when it is larger than `limit` bytes. */
async function readBody(req: NextRequest, limit: number) {
  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > limit) return null;
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/**
 * Refuse a POST that names a `'use cache'` function as its action, in either
 * of the two ways Next.js accepts an action id: the `Next-Action` header, or
 * the field names of a form posted without JavaScript.
 */
async function refuseCacheReference(req: NextRequest) {
  const named = req.headers.get("next-action");
  if (named !== null) {
    return actionHeaderIds(named).some(isCacheReferenceId) ? actionUnavailable() : null;
  }
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("multipart/form-data")) return null;
  const body = await readBody(req, ACTION_BODY_LIMIT_BYTES);
  if (!body) return new NextResponse("Payload Too Large", { status: 413 });
  let form: FormData;
  try {
    form = await new Response(body, { headers: { "content-type": type } }).formData();
  } catch {
    return null; // Not a readable form: Next.js rejects it as well.
  }
  return formNamesCacheReference(form) ? actionUnavailable() : null;
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // A secret that reached the query string (a form submitted before its
  // script loaded) is dropped before anything can log, cache or forward it.
  if (req.method === "GET" || req.method === "HEAD") {
    const query = req.nextUrl.searchParams;
    if (SECRET_QUERY_PARAMS.some((p) => query.has(p))) {
      const url = req.nextUrl.clone();
      for (const p of SECRET_QUERY_PARAMS) url.searchParams.delete(p);
      const res = NextResponse.redirect(url, 303);
      res.headers.set("Cache-Control", "no-store");
      return res;
    }
  }

  // Malformed percent-encoding (`%ZZ`, a broken UTF-8 sequence) can never name
  // a route; without this the router fails on it later with a 500.
  try {
    decodeURIComponent(pathname);
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // Only the proxy may vouch for a request or name its locale.
  const headers = sanitizeForwardingHeaders(req.headers);
  headers.delete(EDGE_HEADER);
  headers.delete("x-gt-locale");
  headers.delete("x-gt-pathname");

  // Files: same header cleanup as every other request, but read-only and
  // without a voucher.
  if (isStaticPath(pathname)) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return new NextResponse(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    return NextResponse.next({ request: { headers } });
  }

  // Any other path can end at a page (an unknown `/api/…` or `/_next/…` path
  // falls through to `[locale]`), and a page runs the action a POST names.
  // The upload route is the one handler that takes a large multipart body.
  if (req.method === "POST" && pathname !== UPLOAD_ROUTE) {
    const refusal = await refuseCacheReference(req);
    if (refusal) return refusal;
  }

  // Whatever else Next.js keeps under `/_next/` is passed on as it is, not vouched for.
  if (pathname.startsWith("/_next/")) return NextResponse.next({ request: { headers } });

  headers.set(EDGE_HEADER, edgeToken());

  // API routes: no locale handling.
  if (pathname.startsWith("/api/")) return NextResponse.next({ request: { headers } });

  const first = pathname.split("/")[1] ?? "";

  // Generated metadata images (opengraph-image) carry the internal /fa prefix
  // in their URL — serve them directly instead of redirecting.
  if (first === defaultLocale && !/\/(?:opengraph|twitter)-image(?:-[\w]+)?$/.test(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(defaultLocale.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }

  const locale = isLocale(first) ? first : defaultLocale;
  const pathNoLocale = isLocale(first) ? pathname.slice(first.length + 1) || "/" : pathname;

  // Markdown mirror of public content (GEO/AEO): /blog/slug.md, /en/learn/x.md, /work/x.md
  if (pathNoLocale.endsWith(".md") && pathNoLocale !== "/llms.md") {
    const url = req.nextUrl.clone();
    url.pathname = "/api/md";
    url.search = `?locale=${locale}&path=${encodeURIComponent(pathNoLocale.slice(0, -3))}`;
    return NextResponse.rewrite(url, { request: { headers } });
  }

  const isPanel = pathNoLocale === "/panel" || pathNoLocale.startsWith("/panel/");
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (isPanel && !session) {
    const url = req.nextUrl.clone();
    url.pathname = locale === defaultLocale ? "/login" : `/${locale}/login`;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  headers.set("x-gt-locale", locale);
  headers.set("x-gt-pathname", pathname);

  let res: NextResponse;
  if (isLocale(first)) {
    res = NextResponse.next({ request: { headers } });
  } else {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
    res = NextResponse.rewrite(url, { request: { headers } });
  }

  // Sliding session: keep the cookie alive while the panel is in use.
  if (isPanel && session) {
    res.cookies.set(SESSION_COOKIE, session, {
      ...sessionCookieOptions(),
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    });
  }
  return res;
}

export const config = {
  matcher: [
    /*
     * Everything except plain requests for the two things Next.js serves by
     * itself: its build output (`/_next/static/…`) and the image optimizer
     * (`/_next/image`).
     *
     * Nothing else may skip the proxy. A path that skips it reaches the app
     * with whatever headers the client sent, and is routed straight to
     * `[locale]` with its first segment as the "locale". Files under `/media/`,
     * `/brand/`, `/fonts/` and the root metadata files are passed through
     * inside `proxy()` instead (after the header cleanup); unknown prefixes
     * (`/de/…`) are rewritten to `/fa/de/…` and end in the (site) catch-all → 404.
     */
    "/((?!_next/static/|_next/image).*)",
    /*
     * The two prefixes above are files only as long as the request asks for a
     * file. A request that names a server action (the `Next-Action` header, or
     * a posted form) is handled by the app router even there, so it goes
     * through the proxy like any other.
     */
    { source: "/_next/:path*", has: [{ type: "header", key: "next-action" }] },
    {
      source: "/_next/:path*",
      has: [{ type: "header", key: "content-type", value: "multipart/form-data.*" }],
    },
  ],
};
