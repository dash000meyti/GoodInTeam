import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale } from "@/i18n/config";

/**
 * Edge of the app (runs before every matched request):
 * 1. Locale routing — `fa` (default) is served without prefix: `/blog` is
 *    rewritten to `/fa/blog`; `/fa/blog` permanently redirects to `/blog`.
 * 2. Markdown mirrors for AI agents — `/blog/my-post.md` → `/api/md?...`.
 * 3. Optimistic auth gate — `/panel/*` without a session cookie goes to /login.
 *    (Real authorization happens in the data layer, see server/auth.)
 * 4. Exposes `x-gt-locale` to server code (used by server actions).
 */
const SESSION_COOKIE = "gt_session";

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const first = pathname.split("/")[1] ?? "";

  if (first === defaultLocale) {
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
    return NextResponse.rewrite(url);
  }

  const isPanel = pathNoLocale === "/panel" || pathNoLocale.startsWith("/panel/");
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (isPanel && !session) {
    const url = req.nextUrl.clone();
    url.pathname = locale === defaultLocale ? "/login" : `/${locale}/login`;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const headers = new Headers(req.headers);
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
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}

export const config = {
  matcher: [
    /*
     * Everything except: API routes, Next internals, uploaded media, metadata
     * files served from the app root, and static assets.
     */
    "/((?!api|_next/static|_next/image|media|brand|icon|apple-icon|robots\\.txt|sitemap\\.xml|llms\\.txt|llms-full\\.txt|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|css|js|map)$).*)",
  ],
};
