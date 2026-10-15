import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
// Next.js compiles `config.matcher` with path-to-regexp through this helper.
import { tryToParsePath } from "next/dist/lib/try-to-parse-path";
import { config, proxy } from "./proxy";

const ORIGIN = "http://localhost:3000";
const run = (path: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  proxy(new NextRequest(`${ORIGIN}${path}`, init));
const rewriteOf = (res: Response) => res.headers.get("x-middleware-rewrite")?.replace(ORIGIN, "");

const matcher = new RegExp(tryToParsePath(config.matcher[0]!).regexStr!);
const proxied = (path: string) => matcher.test(path);

afterEach(() => vi.unstubAllEnvs());

describe("proxy matcher", () => {
  it.each([
    "/",
    "/blog",
    "/en/blog",
    "/de",
    "/de/panel",
    "/de/blog/x",
    // Bare words that only *start* like an excluded path must not skip the proxy.
    "/api",
    "/apical",
    "/media",
    "/mediakit",
    "/brand",
    "/brandx",
    "/icon",
    "/iconography",
    "/fonts",
    // Unknown files must not reach `[locale]` directly either.
    "/x.png",
    "/de.png",
    "/favicon.ico",
    "/robots.txt.bak",
    "/blog/post.md",
    "/feed.xml",
    "/en/feed.xml",
    "/fa/opengraph-image-1t30ir",
    "/api/mcp",
    "/api/v1/tools/whoami",
  ])("runs on %s", (path) => {
    expect(proxied(path)).toBe(true);
  });

  it.each([
    "/_next/static/chunks/app.js",
    "/_next/image",
    "/media/abc123/photo.png",
    "/brand/work-acme.svg",
    "/fonts/og/vazirmatn.ttf",
    "/icon.svg",
    "/robots.txt",
    "/sitemap.xml",
    "/llms.txt",
    "/llms-full.txt",
    "/manifest.webmanifest",
  ])("skips %s", (path) => {
    expect(proxied(path)).toBe(false);
  });
});

describe("proxy locale routing", () => {
  it("serves the default locale without a prefix", () => {
    expect(rewriteOf(run("/"))).toBe("/fa");
    expect(rewriteOf(run("/blog"))).toBe("/fa/blog");
    expect(run("/en/blog").headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects an explicit /fa prefix", () => {
    const res = run("/fa/blog");
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/blog`);
  });

  it.each(["/de", "/de/panel", "/de/blog/x", "/EN/blog", "/apical", "/x.png"])(
    "routes the unknown prefix %s under /fa (→ the catch-all 404), never as a locale",
    (path) => {
      expect(rewriteOf(run(path))).toBe(`/fa${path}`);
    },
  );

  it("does not apply the panel auth gate to an unknown prefix", () => {
    expect(run("/de/panel").status).not.toBe(307);
  });

  it("sends signed-out panel visits to the login page", () => {
    const res = run("/en/panel/time?x=1");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/en/login?next=${encodeURIComponent("/en/panel/time?x=1")}`,
    );
  });

  it("rewrites markdown mirrors to /api/md", () => {
    expect(rewriteOf(run("/en/blog/post.md"))).toBe("/api/md?locale=en&path=%2Fblog%2Fpost");
  });
});

describe("proxy forwarding headers", () => {
  const forged = {
    "x-forwarded-for": "6.6.6.6",
    "x-real-ip": "6.6.6.6",
    "cf-connecting-ip": "6.6.6.6",
  };
  const forwarded = (res: Response) =>
    (res.headers.get("x-middleware-override-headers") ?? "").split(",");

  it("strips client-supplied address headers by default (TRUST_PROXY=none)", () => {
    for (const path of ["/blog", "/api/mcp", "/blog/post.md"]) {
      const sent = forwarded(run(path, { headers: forged }));
      expect(sent).not.toContain("x-forwarded-for");
      expect(sent).not.toContain("x-real-ip");
      expect(sent).not.toContain("cf-connecting-ip");
    }
  });

  it("keeps them when a trusted proxy is configured", () => {
    vi.stubEnv("TRUST_PROXY", "xff:1");
    const res = run("/api/mcp", { headers: forged });
    expect(forwarded(res)).toContain("x-forwarded-for");
    expect(res.headers.get("x-middleware-request-x-forwarded-for")).toBe("6.6.6.6");
  });
});

describe("proxy session refresh", () => {
  const withSession = { headers: { cookie: "gt_session=abc" } };

  it("refreshes the session cookie on panel requests", () => {
    const cookie = run("/panel", withSession).headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^gt_session=abc;/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).not.toMatch(/Secure/i);
  });

  it("uses the configured Secure flag, not the request protocol", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://goodteam.ir");
    // Plain-http request (TLS terminated by a proxy) still gets a Secure cookie.
    expect(run("/panel", withSession).headers.get("set-cookie")).toMatch(/Secure/i);
  });
});
