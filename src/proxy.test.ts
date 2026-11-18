import { readdirSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
// Next's own evaluation of `config.matcher` (path patterns and `has` conditions).
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import nextConfig from "../next.config";
import { ACTION_BODY_LIMIT_BYTES } from "@/lib/limits";
import { EDGE_HEADER, edgeToken } from "@/server/auth/edge";
import { SECRET_QUERY_PARAMS, config, proxy } from "./proxy";

const ORIGIN = "http://localhost:3000";
const run = (path: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  proxy(new NextRequest(`${ORIGIN}${path}`, init));
const rewriteOf = (res: Response) => res.headers.get("x-middleware-rewrite")?.replace(ORIGIN, "");
/** Names of the request headers the proxy passes on to the app. */
const forwarded = (res: Response) =>
  (res.headers.get("x-middleware-override-headers") ?? "").split(",").filter(Boolean);
const forwardedValue = (res: Response, name: string) =>
  res.headers.get(`x-middleware-request-${name}`);
/** True when the proxy hands the request on (next or rewrite) instead of answering it. */
const passesOn = (res: Response) =>
  res.headers.get("x-middleware-next") === "1" || res.headers.has("x-middleware-rewrite");

/** True when Next.js runs the proxy for this request. */
const proxied = (path: string, headers?: Record<string, string>) =>
  unstable_doesMiddlewareMatch({ config, nextConfig, url: path, headers });

/** Every page and route handler under `src/app/[locale]`, as a sample URL path without the locale. */
function localeRoutes() {
  const root = path.join(import.meta.dirname, "app", "[locale]");
  const out = new Set<string>();
  const walk = (dir: string, segments: string[]) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const name = entry.name;
        if (name.startsWith("_")) continue; // private folders hold no routes
        const segment = name.startsWith("(")
          ? []
          : name.startsWith("[...")
            ? ["a", "b"]
            : name.startsWith("[")
              ? ["x1"]
              : [name];
        walk(path.join(dir, name), [...segments, ...segment]);
      } else if (/^(page|route)\.tsx?$/.test(entry.name)) {
        out.add(`/${segments.join("/")}`.replace(/\/$/, ""));
      }
    }
  };
  walk(root, []);
  return [...out].filter(Boolean).sort();
}

const forgedAddress = {
  "x-forwarded-for": "6.6.6.6",
  "x-real-ip": "6.6.6.6",
  "cf-connecting-ip": "6.6.6.6",
  "true-client-ip": "6.6.6.6",
  forwarded: "for=6.6.6.6",
};
const ADDRESS_HEADERS = Object.keys(forgedAddress);

/** One path for every branch of the proxy that hands a request on. */
const VOUCHED_PATHS = [
  "/",
  "/blog",
  "/en/blog",
  "/login",
  "/de/x",
  "/feed.xml",
  "/blog/post.md",
  "/api/mcp",
  "/api/v1/tools/whoami",
  "/api/media",
  "/api/login",
];
const STATIC_PATHS = [
  "/media/abc123/photo.png",
  "/brand/work-acme.svg",
  "/fonts/og/vazirmatn-500.ttf",
  "/icon.svg",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/llms-full.txt",
  "/manifest.webmanifest",
];
const NEXT_INTERNAL_PATHS = ["/_next/login", "/_next/webpack-hmr", "/_next/panel/settings"];
/** Prefixes that are not locales but whose first segment Next.js would use as one. */
const NON_LOCALE_PREFIXES = ["/brand", "/fonts", "/media", "/_next", "/api"];

afterEach(() => vi.unstubAllEnvs());

describe("proxy matcher", () => {
  it.each([
    "/",
    "/blog",
    "/en/blog",
    "/de",
    "/de/panel",
    "/de/blog/x",
    "/api",
    "/apical",
    "/media",
    "/mediakit",
    "/brand",
    "/brandx",
    "/icon",
    "/iconography",
    "/fonts",
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
    // Files and uploads are served through the proxy too.
    ...STATIC_PATHS,
    // Only two prefixes under /_next belong to Next.js alone.
    "/_next",
    "/_next/login",
    "/_next/staticx/login",
    "/_next/data/build/en/blog.json",
  ])("runs on %s", (path) => {
    expect(proxied(path)).toBe(true);
  });

  const NEXT_FILES = [
    "/_next/static/chunks/app.js",
    "/_next/static/media/font.woff2",
    "/_next/static/login",
    "/_next/image",
  ];

  it.each(NEXT_FILES)("skips a plain request for %s (served by Next.js itself)", (path) => {
    expect(proxied(path)).toBe(false);
    expect(proxied(path, { accept: "*/*", range: "bytes=0-9" })).toBe(false);
  });

  it.each(NEXT_FILES)("runs on %s as soon as the request names an action", (path) => {
    // The app router handles such a request even under Next's own prefixes.
    expect(proxied(path, { "next-action": `40${"ab".repeat(20)}` }), "header").toBe(true);
    expect(proxied(path, { "next-action": "x" }), "any header value").toBe(true);
    expect(proxied(path, { "content-type": "multipart/form-data; boundary=x" }), "form").toBe(true);
    expect(proxied(path, { "content-type": "multipart/form-data" }), "bare form").toBe(true);
  });

  it("never lets a [locale] route be reached around the proxy", async () => {
    const routes = localeRoutes();
    // The scan found the real app (sign-in, panel, public signing page…).
    expect(routes).toEqual(expect.arrayContaining(["/login", "/panel", "/sign/x1", "/contact"]));
    for (const prefix of NON_LOCALE_PREFIXES) {
      for (const route of routes) {
        const target = `${prefix}${route}`;
        expect(proxied(target), target).toBe(true);
        const res = await run(target, { headers: forgedAddress });
        for (const h of ADDRESS_HEADERS) expect(forwarded(res), target).not.toContain(h);
      }
    }
  });
});

describe("proxy locale routing", () => {
  it("serves the default locale without a prefix", async () => {
    expect(rewriteOf(await run("/"))).toBe("/fa");
    expect(rewriteOf(await run("/blog"))).toBe("/fa/blog");
    expect((await run("/en/blog")).headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects an explicit /fa prefix", async () => {
    const res = await run("/fa/blog");
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/blog`);
  });

  it.each(["/de", "/de/panel", "/de/blog/x", "/EN/blog", "/apical", "/x.png"])(
    "routes the unknown prefix %s under /fa (→ the catch-all 404), never as a locale",
    async (path) => {
      expect(rewriteOf(await run(path))).toBe(`/fa${path}`);
    },
  );

  it("does not apply the panel auth gate to an unknown prefix", async () => {
    expect((await run("/de/panel")).status).not.toBe(307);
  });

  it("sends signed-out panel visits to the login page", async () => {
    const res = await run("/en/panel/time?x=1");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/en/login?next=${encodeURIComponent("/en/panel/time?x=1")}`,
    );
  });

  it("rewrites markdown mirrors to /api/md", async () => {
    expect(rewriteOf(await run("/en/blog/post.md"))).toBe("/api/md?locale=en&path=%2Fblog%2Fpost");
  });

  it("passes files and root metadata through without a locale rewrite", async () => {
    for (const path of STATIC_PATHS) {
      const res = await run(path);
      expect(res.headers.get("x-middleware-next"), path).toBe("1");
      expect(rewriteOf(res), path).toBeUndefined();
    }
  });

  it("keeps the request headers of a file request (range, conditional)", async () => {
    const res = await run("/media/abc123/clip.mp4", {
      headers: { range: "bytes=0-99", "if-none-match": '"abc"' },
    });
    expect(forwardedValue(res, "range")).toBe("bytes=0-99");
    expect(forwardedValue(res, "if-none-match")).toBe('"abc"');
  });

  it("serves files read-only", async () => {
    for (const path of STATIC_PATHS) {
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        const res = await run(path, { method });
        expect(res.status, `${method} ${path}`).toBe(405);
        expect(passesOn(res), `${method} ${path}`).toBe(false);
      }
      expect((await run(path, { method: "HEAD" })).headers.get("x-middleware-next")).toBe("1");
    }
  });
});

describe("proxy forwarding headers", () => {
  const ALL = [...VOUCHED_PATHS, ...STATIC_PATHS, ...NEXT_INTERNAL_PATHS];

  it("strips client-supplied address headers on every path (TRUST_PROXY=none)", async () => {
    for (const path of ALL) {
      const res = await run(path, { headers: forgedAddress });
      expect(passesOn(res), path).toBe(true);
      for (const h of ADDRESS_HEADERS) expect(forwarded(res), `${h} on ${path}`).not.toContain(h);
    }
  });

  it("strips them on a signed-in panel request too", async () => {
    const res = await run("/panel", { headers: { ...forgedAddress, cookie: "gt_session=abc" } });
    for (const h of ADDRESS_HEADERS) expect(forwarded(res)).not.toContain(h);
  });

  it("keeps them when a trusted proxy is configured", async () => {
    vi.stubEnv("TRUST_PROXY", "xff:1");
    const res = await run("/api/mcp", { headers: forgedAddress });
    expect(forwarded(res)).toContain("x-forwarded-for");
    expect(forwardedValue(res, "x-forwarded-for")).toBe("6.6.6.6");
  });
});

describe("proxy voucher", () => {
  const forged = { [EDGE_HEADER]: "forged-by-the-client", "x-gt-locale": "en" };

  it("vouches for pages, API routes and markdown mirrors with its own value", async () => {
    for (const path of VOUCHED_PATHS) {
      const res = await run(path, { headers: forged });
      expect(forwardedValue(res, EDGE_HEADER), path).toBe(edgeToken());
    }
  });

  it("does not vouch for files or for /_next paths, and drops a client-supplied voucher", async () => {
    for (const path of [...STATIC_PATHS, ...NEXT_INTERNAL_PATHS]) {
      const res = await run(path, { headers: forged });
      expect(passesOn(res), path).toBe(true);
      expect(forwarded(res), path).not.toContain(EDGE_HEADER);
      expect(forwarded(res), path).not.toContain("x-gt-locale");
    }
  });

  it("does not vouch for a route reached under a non-locale file prefix", async () => {
    for (const prefix of ["/brand", "/fonts", "/media", "/_next"]) {
      for (const route of ["/login", "/sign/x1", "/contact", "/panel/settings"]) {
        const target = `${prefix}${route}`;
        const get = await run(target, { headers: forged });
        expect(forwarded(get), target).not.toContain(EDGE_HEADER);
        const post = await run(target, { method: "POST", headers: forged, body: "[]" });
        // A file prefix answers 405; /_next passes on without a voucher.
        if (passesOn(post)) expect(forwarded(post), target).not.toContain(EDGE_HEADER);
        else expect(post.status, target).toBe(405);
      }
    }
  });

  it("names the locale itself", async () => {
    const res = await run("/blog", { headers: forged });
    expect(forwardedValue(res, "x-gt-locale")).toBe("fa");
    // API routes have no locale: the client's value is dropped, not passed on.
    expect(forwarded(await run("/api/mcp", { headers: forged }))).not.toContain("x-gt-locale");
  });
});

describe("proxy secrets in the URL", () => {
  it.each(SECRET_QUERY_PARAMS)("redirects a GET that carries %s to the clean URL", async (p) => {
    const res = await run(`/login?email=a%40b.co&${p}=NOT-A-REAL-SECRET&next=%2Fpanel%2Ftime`);
    expect(res.status).toBe(303);
    const location = res.headers.get("location")!;
    expect(location).toBe(`${ORIGIN}/login?email=a%40b.co&next=%2Fpanel%2Ftime`);
    expect(location).not.toContain("NOT-A-REAL-SECRET");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(passesOn(res)).toBe(false);
  });

  it("removes every secret field at once and keeps the rest of the query", async () => {
    const res = await run(
      "/en/panel/settings?currentPassword=a&newPassword=b&confirmPassword=c&tab=account&password=d&vault-master=e",
      { headers: { cookie: "gt_session=abc" } },
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/en/panel/settings?tab=account`);
  });

  it("drops the secret before the sign-in gate can copy it into ?next=", async () => {
    const res = await run("/en/panel/vault?vault-master=NOT-A-REAL-SECRET");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/en/panel/vault`);
    // The follow-up request is the ordinary signed-out redirect, without the value.
    const next = await run("/en/panel/vault");
    expect(next.status).toBe(307);
    expect(next.headers.get("location")).not.toContain("vault-master");
  });

  it("applies to every path and to HEAD", async () => {
    for (const path of ["/api/md", "/media/abc123/a.png", "/_next/login", "/", "/fa/login"]) {
      const res = await run(`${path}?password=NOT-A-REAL-SECRET`, { method: "HEAD" });
      expect(res.status, path).toBe(303);
      expect(res.headers.get("location"), path).toBe(`${ORIGIN}${path}`);
    }
  });

  it("leaves other requests alone", async () => {
    // The word as a value, or as part of another field name, is not a secret field.
    expect((await run("/en/blog?q=password")).status).toBe(200);
    expect((await run("/en/blog?password_hint=x")).status).toBe(200);
    // A POST body is where a secret belongs; its URL is not rewritten.
    const post = await run("/login?password=x", { method: "POST", body: "[]" });
    expect(post.status).not.toBe(303);
  });
});

describe("proxy malformed paths", () => {
  it.each(["/media/x/%E0%A4%A", "/blog/%ZZ", "/%ZZ", "/en/%C0%AF", "/api/v1/tools/%E0%A4%A"])(
    "answers %s with 400",
    async (path) => {
      const res = await run(path);
      expect(res.status).toBe(400);
      expect(passesOn(res)).toBe(false);
    },
  );

  it("accepts well-formed percent-encoding", async () => {
    expect(passesOn(await run("/blog/%D8%B3%D9%84%D8%A7%D9%85"))).toBe(true);
    expect(passesOn(await run("/en/blog/a%20b"))).toBe(true);
  });
});

describe("proxy cache references", () => {
  const ACTION = `40${"ab".repeat(20)}`;
  const CACHED = `c0${"ab".repeat(20)}`;
  const PAGES = [
    ...["/", "/en/blog", "/login", "/de/x", "/api/nope", "/api/login", "/_next/login"],
    ...["/_next/static/x", "/_next/static/chunks/app.js", "/_next/image"],
  ];
  const call = (path: string, id: string) =>
    run(path, { method: "POST", headers: { "next-action": id }, body: "[]" });
  const form = (fields: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    return fd;
  };

  it("refuses a cache reference named as the action, on every path that can reach a page", async () => {
    for (const path of PAGES) {
      const res = await call(path, CACHED);
      expect(res.status, path).toBe(409);
      expect(res.headers.get("x-nextjs-action-not-found"), path).toBe("1");
      expect(passesOn(res), path).toBe(false);
    }
  });

  it("refuses it in a repeated header as well", async () => {
    expect((await call("/en/blog", `${ACTION}, ${CACHED}`)).status).toBe(409);
  });

  it("lets a real action through", async () => {
    for (const path of PAGES) expect(passesOn(await call(path, ACTION)), path).toBe(true);
  });

  it("refuses a cache reference named by a form posted without JavaScript", async () => {
    for (const path of PAGES) {
      const byName = await run(path, {
        method: "POST",
        body: form({ [`$ACTION_ID_${CACHED}`]: "", x: "1" }),
      });
      expect(byName.status, path).toBe(409);
      const byDescriptor = await run(path, {
        method: "POST",
        body: form({ $ACTION_REF_1: "", "$ACTION_1:0": `{"id":"${CACHED}","bound":null}` }),
      });
      expect(byDescriptor.status, path).toBe(409);
    }
  });

  it("lets a form that names a real action through", async () => {
    const res = await run("/login", {
      method: "POST",
      body: form({ [`$ACTION_ID_${ACTION}`]: "", email: "a@b.co", password: "x" }),
    });
    expect(passesOn(res)).toBe(true);
  });

  it("answers a form larger than the action body limit with 413", async () => {
    const res = await run("/login", {
      method: "POST",
      body: form({ [`$ACTION_ID_${ACTION}`]: "", note: "x".repeat(ACTION_BODY_LIMIT_BYTES + 1) }),
    });
    expect(res.status).toBe(413);
  });

  it("leaves the upload route's body alone", async () => {
    const res = await run("/api/media", {
      method: "POST",
      body: form({ file: "x".repeat(ACTION_BODY_LIMIT_BYTES + 1) }),
    });
    expect(passesOn(res)).toBe(true);
  });

  it("uses the same body limit as the server-action config", () => {
    const configured = String(nextConfig.experimental?.serverActions?.bodySizeLimit);
    const mb = /^(\d+)mb$/.exec(configured);
    expect(mb, configured).not.toBeNull();
    expect(ACTION_BODY_LIMIT_BYTES).toBe(Number(mb![1]) * 1024 * 1024);
  });
});

describe("proxy session refresh", () => {
  const withSession = { headers: { cookie: "gt_session=abc" } };

  it("refreshes the session cookie on panel requests", async () => {
    const cookie = (await run("/panel", withSession)).headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^gt_session=abc;/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).not.toMatch(/Secure/i);
  });

  it("uses the configured Secure flag, not the request protocol", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://goodteam.ir");
    vi.stubEnv("APP_SECRET", "a-long-random-secret-for-this-test-0123456789");
    // Plain-http request (TLS terminated by a proxy) still gets a Secure cookie.
    expect((await run("/panel", withSession)).headers.get("set-cookie")).toMatch(/Secure/i);
  });
});
