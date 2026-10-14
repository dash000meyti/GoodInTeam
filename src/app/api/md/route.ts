import { connection, type NextRequest } from "next/server";
import { defaultLocale, isLocale, stripLocale } from "@/i18n/config";
import { markdownForPath } from "@/server/modules/content/geo";

/**
 * Markdown mirrors for agents / answer engines. src/proxy.ts rewrites
 * `/<path>.md` (and `/en/<path>.md`) to `/api/md?locale=&path=`.
 * Supported: /blog/<slug>, /work/<slug>, /learn/<course>[/<lesson>],
 * /learn/<tutorial>, /services/<slug>, /about.
 */
export async function GET(req: NextRequest) {
  await connection();
  let locale = req.nextUrl.searchParams.get("locale");
  let path = req.nextUrl.searchParams.get("path") ?? "";
  // Behind the proxy rewrite the handler still sees the ORIGINAL url
  // (`/en/blog/x.md`), so derive locale + path from it when needed.
  if (!locale || !path) {
    const stripped = stripLocale(req.nextUrl.pathname);
    if (stripped.path.endsWith(".md")) {
      locale = stripped.locale ?? defaultLocale;
      path = stripped.path.slice(0, -3);
    }
  }
  if (!isLocale(locale) || !path.startsWith("/") || path.length > 300) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const res = await markdownForPath(locale, path);
  if (!res) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(res.md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Language": locale,
      // The HTML page is the canonical document; this is an alternate representation.
      Link: `<${res.canonical}>; rel="canonical"`,
      "Cache-Control": "public, max-age=600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
