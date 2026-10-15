import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale } from "@/i18n/config";
import { sanitizeForwardingHeaders } from "@/server/auth/client-ip";
import { SESSION_COOKIE, SESSION_DAYS, sessionCookieOptions } from "@/server/auth/cookie";

/**
 * Edge of the app (runs before every matched request):
 * 1. Locale routing — `fa` (default) is served without prefix: `/blog` is
 *    rewritten to `/fa/blog`; `/fa/blog` permanently redirects to `/blog`.
 * 2. Markdown mirrors for AI agents — `/blog/my-post.md` → `/api/md?...`.
 * 3. Optimistic auth gate — `/panel/*` without a session cookie goes to /login.
 *    (Real authorization happens in the data layer, see server/auth.)
 * 4. Exposes `x-gt-locale` to server code (used by server actions).
 * 5. Client IP hygiene — with `TRUST_PROXY=none` the client's own
 *    `x-forwarded-for`/`x-real-ip`/`cf-connecting-ip` are dropped so server
 *    code only ever sees the socket address (see server/auth/client-ip.ts).
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const headers = sanitizeForwardingHeaders(req.headers);

  // API routes: no locale handling, only the forwarding-header cleanup.
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
     * Everything except: Next internals, uploaded media, metadata files served
     * from the app root, and static assets. API routes are included so the
     * forwarding-header cleanup above applies to them as well.
     */
    "/((?!_next/static|_next/image|media|brand|icon|apple-icon|robots\\.txt|sitemap\\.xml|llms\\.txt|llms-full\\.txt|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|css|js|map)$).*)",
  ],
};
