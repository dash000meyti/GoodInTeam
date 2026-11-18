/**
 * The edge rules of docs/security.md, checked against a running server:
 *
 * - the proxy vets forwarding headers on every path, and server actions refuse
 *   a request it did not vouch for;
 * - a cached function is never callable as an action;
 * - ordinary saves fit the server-action body limit, uploads have their own route;
 * - published HTML is sanitised on the page, in the feed and in the mirrors;
 * - a secret never stays in a URL; a malformed path is a 400.
 *
 * Needs the production build this checkout was built into and the demo data:
 *   pnpm build && pnpm db:reset && pnpm db:seed && pnpm start
 *   BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/security.spec.ts
 * Everything it creates (a post, a page, media, a vault) is removed again.
 */
import { deflateSync } from "node:zlib";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { ACTION_BODY_LIMIT_BYTES } from "../src/lib/limits";
import { isCacheReferenceId } from "../src/server/auth/server-reference";
import {
  DEMO_PASSWORD,
  MEMBER,
  OWNER,
  actionId,
  builtReferences,
  callAction,
  hasSession,
  signIn,
} from "./server-actions";

const references = builtReferences();
test.skip(!references, "needs the production build of this checkout (.next) behind BASE_URL");

const rand = Math.random().toString(36).slice(2, 10);
/** Address headers a client can send. None of them may ever be believed. */
const forged = (ip: string) => ({
  "X-Forwarded-For": ip,
  "X-Real-IP": ip,
  "CF-Connecting-IP": ip,
  "True-Client-IP": ip,
  Forwarded: `for=${ip}`,
});
/** Prefixes that are not locales but whose first segment Next.js would route as one. */
const NON_LOCALE_PREFIXES = ["/brand", "/fonts", "/media", "/_next", "/_next/static", "/api"];

const origin = (baseURL: string | undefined) => new URL(baseURL ?? "http://localhost:3000").origin;

/**
 * A server action answers only on a page that uses it (anywhere else Next.js
 * says "unavailable"). These are the pages of the actions called below.
 */
const PAGE = {
  login: "/en/login",
  blogPost: "/en/blog/sqlite-is-enough",
  docEditor: "/en/panel/docs/new",
  docArchive: "/en/panel/docs/archive",
  postEditor: "/en/panel/content/new",
  vault: "/en/panel/vault",
  media: "/en/panel/media",
};

test.describe("the proxy vets every path", () => {
  test("the sign-in action is refused under every non-locale prefix", async ({ request }) => {
    const login = actionId("login", "auth/actions");
    for (const [i, prefix] of NON_LOCALE_PREFIXES.entries()) {
      // Valid credentials and a forged address: nothing may come of it.
      const reply = await callAction(
        request,
        `${prefix}/login`,
        login,
        [{ email: MEMBER, password: DEMO_PASSWORD }],
        forged(`203.0.113.${20 + i}`),
      );
      expect(reply.redirect, prefix).toBeNull();
      expect(await hasSession(request), prefix).toBe(false);
      // Refused by the proxy (405), by Next.js (no such action there) or by the action itself.
      if (reply.result)
        expect(reply.result, prefix).toMatchObject({ ok: false, error: { code: "forbidden" } });
      else expect([400, 404, 405, 409], `${prefix} → ${reply.status}`).toContain(reply.status);
    }
  });

  test("a forged address never reaches the session record", async ({ request }) => {
    const reply = await callAction(
      request,
      "/en/login",
      actionId("login", "auth/actions"),
      [{ email: MEMBER, password: DEMO_PASSWORD }],
      forged("203.0.113.77"),
    );
    expect(reply.redirect).toContain("/panel");
    const page = await request.get("/en/panel/settings/security");
    expect(page.status()).toBe(200);
    const html = await page.text();
    expect(html).not.toContain("203.0.113.77");
  });

  test("no page exists under a non-locale prefix", async ({ request }) => {
    for (const path of [
      "/brand/login",
      "/fonts/setup",
      "/media/login",
      "/brand/blog",
      "/brand/panel",
      "/api/login",
      "/_next/login",
      "/brand",
      "/media",
    ]) {
      const res = await request.get(path, { maxRedirects: 0, failOnStatusCode: false });
      expect(res.status(), path).toBe(404);
    }
  });

  test("files are still served, read-only", async ({ request }) => {
    for (const [path, type] of [
      ["/brand/work-acme.svg", "image/svg+xml"],
      ["/fonts/og/vazirmatn-500.ttf", "font/ttf"],
      ["/icon.svg", "image/svg+xml"],
      ["/robots.txt", "text/plain"],
      ["/sitemap.xml", "application/xml"],
      ["/llms.txt", "text/markdown"],
      ["/manifest.webmanifest", "application/manifest+json"],
    ] as const) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(res.headers()["content-type"], path).toContain(type);
      // The proxy's own request headers never show up in a response.
      expect(Object.keys(res.headers()).filter((h) => /^x-(gt|middleware)-/.test(h))).toEqual([]);
    }
    const range = await request.get("/fonts/og/vazirmatn-500.ttf", {
      headers: { Range: "bytes=0-9" },
    });
    expect(range.status()).toBe(206);
    expect((await range.body()).byteLength).toBe(10);
    for (const path of ["/brand/work-acme.svg", "/icon.svg", "/robots.txt"]) {
      const res = await request.post(path, { data: "x", failOnStatusCode: false });
      expect(res.status(), path).toBe(405);
    }
  });

  test("a path that cannot be decoded is a bad request", async ({ request }) => {
    for (const path of ["/media/x/%E0%A4%A", "/blog/%ZZ", "/%ZZ", "/en/%C0%AF"]) {
      const res = await request.get(path, { failOnStatusCode: false });
      expect(res.status(), path).toBe(400);
    }
    // Well-formed encoding is an ordinary (here: unknown) address.
    const persian = await request.get("/en/blog/%D8%B3%D9%84%D8%A7%D9%85", {
      failOnStatusCode: false,
    });
    expect([200, 404]).toContain(persian.status());
  });
});

test.describe("cached functions are not actions", () => {
  const cached = (references ?? []).filter((r) => r.cached);
  const actions = (references ?? []).filter((r) => !r.cached);

  test("the proxy's rule matches the build: every cached function, no real action", () => {
    expect(cached.length).toBeGreaterThan(0);
    expect(actions.length).toBeGreaterThan(50);
    for (const r of cached) expect(isCacheReferenceId(r.id), `${r.name} in ${r.file}`).toBe(true);
    for (const r of actions) expect(isCacheReferenceId(r.id), `${r.name} in ${r.file}`).toBe(false);
  });

  test("every cache reference is refused, however it is named", async ({ request }) => {
    for (const r of cached) {
      const label = `${r.name} in ${r.file}`;
      // As the action of a fetch call, on a page, on an unknown API path and under Next's own prefix.
      for (const path of ["/en/blog", "/", "/api/nope", "/_next/static/x"]) {
        const reply = await callAction(request, path, r.id, ["en"]);
        expect(reply.status, `${label} on ${path}`).toBe(409);
        expect(reply.response.headers()["x-nextjs-action-not-found"], label).toBe("1");
        expect(reply.body, label).toBe("Server Action unavailable.");
      }
      // As the action of a form posted without JavaScript.
      const form = await request.post("/en/blog", {
        multipart: { [`$ACTION_ID_${r.id}`]: "", locale: "en" },
        maxRedirects: 0,
        failOnStatusCode: false,
      });
      expect(form.status(), `${label} as a form`).toBe(409);
    }
  });

  test("real actions still work", async ({ request }) => {
    // A public action called the way the client runtime calls it…
    const view = await callAction(
      request,
      PAGE.blogPost,
      actionId("recordViewAction", "content/actions"),
      [{ id: "nosuchpost000000" }],
    );
    expect(view.status).toBe(200);
    expect(view.result).toEqual({ ok: true, data: null });
    // …a private one without a valid session…
    const denied = await callAction(
      request,
      PAGE.docEditor,
      actionId("createDocAction", "docs/actions"),
      [{ title: "x" }],
      { Cookie: "gt_session=not-a-session" },
    );
    expect(denied.result).toMatchObject({ ok: false, error: { code: "unauthorized" } });
    // …and a form posted without JavaScript.
    const form = await request.post(PAGE.login, {
      multipart: {
        [`$ACTION_ID_${actionId("login", "auth/actions")}`]: "",
        email: MEMBER,
        password: DEMO_PASSWORD,
      },
      headers: { Origin: origin(test.info().project.use.baseURL) },
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect(form.status()).toBe(303);
    expect(await hasSession(request)).toBe(true);
  });
});

test.describe("request bodies", () => {
  /** Persian text with line breaks: two bytes per letter, and JSON spells a line break as two. */
  const LINE = "سلام دنیا، این یک متن است\n";
  const persian = (chars: number) => {
    const text = LINE.repeat(Math.ceil(chars / LINE.length)).slice(0, chars);
    expect(text).toHaveLength(chars);
    return text;
  };

  test("a page, a post and a vault item save at their maximum size", async ({ request }) => {
    await signIn(request, OWNER);

    // Docs: 500,000 characters.
    const body = persian(500_000);
    const doc = await callAction(
      request,
      PAGE.docEditor,
      actionId("createDocAction", "docs/actions"),
      [{ title: `Limit ${rand}`, contentMd: body, visibility: "private" }],
    );
    expect(doc.result, doc.body.slice(0, 200)).toMatchObject({ ok: true });
    const docId = (doc.result!.data as { id: string }).id;
    try {
      const update = await callAction(
        request,
        PAGE.docEditor,
        actionId("updateDocAction", "docs/actions"),
        [{ id: docId, contentMd: `${body.slice(0, -1)}!` }],
      );
      expect(update.result).toMatchObject({ ok: true });
      const tooLong = await callAction(
        request,
        PAGE.docEditor,
        actionId("updateDocAction", "docs/actions"),
        [{ id: docId, contentMd: `${body}!` }],
      );
      expect(tooLong.result).toMatchObject({ ok: false, error: { code: "validation" } });
    } finally {
      const removed = await callAction(
        request,
        PAGE.docArchive,
        actionId("deleteDocAction", "docs/actions"),
        [{ id: docId }],
      );
      expect(removed.result).toMatchObject({ ok: true });
    }

    // Posts: 400,000 characters.
    const post = await callAction(
      request,
      PAGE.postEditor,
      actionId("savePostAction", "content/actions"),
      [
        {
          type: "article",
          locale: "en",
          title: `Limit ${rand}`,
          slug: `limit-${rand}`,
          status: "draft",
          contentMd: persian(400_000),
        },
      ],
    );
    expect(post.result, post.body.slice(0, 200)).toMatchObject({ ok: true });
    const removed = await callAction(
      request,
      PAGE.postEditor,
      actionId("deletePostAction", "content/actions"),
      [{ id: (post.result!.data as { id: string }).id }],
    );
    expect(removed.result).toMatchObject({ ok: true });
  });

  test("a vault item saves at its maximum size", async ({ playwright, baseURL }) => {
    // Its own context: the member's vault is created for this test and erased after it.
    const request = await playwright.request.newContext({ baseURL });
    await signIn(request, MEMBER);
    const b64 = (bytes: number) => Buffer.alloc(bytes, 7).toString("base64");
    const vault = PAGE.vault;
    const reset = () =>
      callAction(request, vault, actionId("resetVaultAction", "vault/actions"), [
        { confirm: true },
      ]);
    await reset();
    try {
      const setup = await callAction(
        request,
        vault,
        actionId("setupVaultAction", "vault/actions"),
        [
          {
            kdf: "PBKDF2-SHA256",
            iterations: 600_000,
            salt: b64(16),
            wrappedKey: b64(48),
            wrapIv: b64(12),
            recoverySalt: b64(16),
            recoveryWrappedKey: b64(48),
            recoveryIv: b64(12),
          },
        ],
      );
      expect(setup.result, setup.body.slice(0, 200)).toMatchObject({ ok: true });
      // 700,000 characters of base64: the largest ciphertext the vault accepts.
      const ciphertext = Buffer.alloc(525_000, 9).toString("base64");
      expect(ciphertext).toHaveLength(700_000);
      const item = await callAction(
        request,
        vault,
        actionId("createVaultItemAction", "vault/actions"),
        [{ type: "note", ciphertext, iv: b64(12) }],
      );
      expect(item.result, item.body.slice(0, 200)).toMatchObject({ ok: true });
    } finally {
      await reset();
      await request.dispose();
    }
  });

  test("a body over the limit is refused, signed in or not", async ({ request }) => {
    const big = "x".repeat(ACTION_BODY_LIMIT_BYTES + 1024);
    const preview = actionId("renderMarkdownAction", "markdown/actions");
    const anonymous = await callAction(request, PAGE.postEditor, preview, [{ md: big }], {
      Cookie: "gt_session=not-a-session",
    });
    expect(anonymous.result?.ok ?? false).toBe(false);
    expect(anonymous.status).toBeGreaterThanOrEqual(400);
    await signIn(request, OWNER);
    const signedIn = await callAction(request, PAGE.postEditor, preview, [{ md: big }]);
    expect(signedIn.result?.ok ?? false).toBe(false);
    expect(signedIn.status).toBeGreaterThanOrEqual(400);
    // The same action with an ordinary body works.
    const small = await callAction(request, PAGE.postEditor, preview, [{ md: "# ok" }]);
    expect(small.result).toMatchObject({ ok: true });
  });

  test("files are uploaded through their own route", async ({ request, baseURL }) => {
    const Origin = origin(baseURL);
    const upload = (
      ctx: APIRequestContext,
      buffer: Buffer,
      name: string,
      headers: Record<string, string>,
    ) =>
      ctx.post("/api/media?locale=en", {
        multipart: { file: { name, mimeType: "image/png", buffer } },
        headers,
        failOnStatusCode: false,
      });
    const small = png(32, 32);
    // Larger than any server action may be: the route has its own limit.
    const large = png(1100, 1100);
    expect(large.byteLength).toBeGreaterThan(ACTION_BODY_LIMIT_BYTES);

    expect((await upload(request, small, "a.png", { Origin })).status()).toBe(401);
    await signIn(request, OWNER);
    expect(
      (await upload(request, small, "a.png", { Origin: "https://evil.example" })).status(),
    ).toBe(403);
    expect((await upload(request, small, "a.png", {})).status()).toBe(403);
    const notAnImage = await upload(request, Buffer.from("<script>alert(1)</script>"), "x.png", {
      Origin,
    });
    expect(notAnImage.status()).toBe(422);
    const tooLarge = await upload(request, Buffer.alloc(21 * 1024 * 1024, 1), "huge.png", {
      Origin,
    });
    expect(tooLarge.status()).toBe(422);
    expect(await tooLarge.json()).toMatchObject({
      ok: false,
      error: { fieldErrors: { file: ["too_large"] } },
    });

    const ids: string[] = [];
    try {
      for (const [buffer, name] of [
        [small, `small-${rand}.png`],
        [large, `large-${rand}.png`],
      ] as const) {
        const res = await upload(request, buffer, name, { Origin });
        expect(res.status(), name).toBe(200);
        const json = (await res.json()) as {
          ok: true;
          data: { id: string; url: string; duplicate: boolean }[];
        };
        expect(json.ok).toBe(true);
        ids.push(json.data[0]!.id);
        // The stored file is served back, whole and by range.
        const file = await request.get(json.data[0]!.url);
        expect(file.status()).toBe(200);
        expect(file.headers()["content-type"]).toBe("image/png");
        expect((await file.body()).equals(buffer)).toBe(true);
        const part = await request.get(json.data[0]!.url, { headers: { Range: "bytes=1-3" } });
        expect(part.status()).toBe(206);
        expect((await part.body()).toString("latin1")).toBe("PNG");
      }
    } finally {
      for (const id of ids) {
        await callAction(request, PAGE.media, actionId("deleteMediaAction", "media/actions"), [
          { id },
        ]);
      }
    }
  });
});

test.describe("published HTML is sanitised", () => {
  test("on the page, in the feed and in the Markdown mirrors", async ({ request, page }) => {
    await signIn(request, OWNER);
    const slug = `sanitised-${rand}`;
    const contentMd = [
      "Opening paragraph.",
      `<script id="probe-${rand}">window.__gtProbe = "${rand}"</script>`,
      `<img src="/nope-${rand}.png" onerror="window.__gtProbe = 'onerror'" alt="probe image">`,
      `<a href="javascript:window.__gtProbe='link'" id="link-${rand}">a link</a>`,
      `<iframe src="https://example.com/embed-${rand}"></iframe>`,
      `<div style="position:fixed;inset:0" class="fixed inset-0">overlay text</div>`,
      "<details><summary>More</summary>\n\nHidden **text**.\n\n</details>",
      "Press <kbd>K</kbd>.",
      "```html\n<script>shown as code</script>\n```",
    ].join("\n\n");
    const created = await callAction(
      request,
      PAGE.postEditor,
      actionId("savePostAction", "content/actions"),
      [
        {
          type: "article",
          locale: "en",
          title: `Sanitised ${rand}`,
          slug,
          excerpt: "A post for the sanitiser check.",
          status: "published",
          contentMd,
        },
      ],
    );
    expect(created.result, created.body.slice(0, 200)).toMatchObject({ ok: true });
    const id = (created.result!.data as { id: string }).id;
    try {
      const html = await (await request.get(`/en/blog/${slug}`)).text();
      expect(html).toContain("Opening paragraph.");
      // None of it is markup: not in the document, not in the data the page ships.
      expect(html).not.toContain(`probe-${rand}`);
      expect(html).not.toContain("__gtProbe");
      expect(html).not.toContain(`embed-${rand}`);
      expect(html).not.toContain("position:fixed");
      expect(html).not.toMatch(/<img[^>]*\sonerror/i);
      // Markup of the safe subset is kept.
      expect(html).toContain("<details><summary>More</summary>");
      expect(html).toContain("<kbd>K</kbd>");
      expect(html).toContain("overlay text");
      expect(html).toContain(`<img src="/nope-${rand}.png" alt="probe image" />`);

      // In a browser nothing of it runs.
      await page.goto(`/en/blog/${slug}`);
      await expect(page.getByText("Opening paragraph.")).toBeVisible();
      await page.locator(".prose-gt details summary").click();
      await expect(page.getByText("Hidden text.")).toBeVisible();
      await page.waitForTimeout(300);
      expect(
        await page.evaluate(() => (window as unknown as { __gtProbe?: string }).__gtProbe),
      ).toBeUndefined();
      const prose = page.locator(".prose-gt");
      expect(
        await prose.locator("script, iframe, [onerror], [style*='fixed'], .fixed").count(),
      ).toBe(0);
      expect(await prose.getByText("a link").getAttribute("href")).toBeNull();
      // The code sample is text.
      await expect(prose.locator("pre").getByText("shown as code").first()).toBeVisible();

      const feed = await (await request.get("/en/feed.xml")).text();
      expect(feed).toContain(`Sanitised ${rand}`);
      expect(feed).not.toContain("__gtProbe");
      expect(feed).not.toContain(`probe-${rand}`);
      expect(feed).not.toContain(`embed-${rand}`);
      expect(feed).toContain("<details><summary>More</summary>");

      // The mirrors publish the Markdown source: the same subset, the rest as inert text.
      const mirror = await (await request.get(`/en/blog/${slug}.md`)).text();
      const outsideCode = mirror.replace(/```[\s\S]*?```/g, "");
      expect(outsideCode).toContain("Opening paragraph.");
      expect(outsideCode).not.toMatch(/<script|<iframe|onerror\s*=|javascript:|style=|class=/i);
      expect(outsideCode).toContain(`&lt;script id="probe-${rand}">`);
      expect(outsideCode).toContain("<details><summary>More</summary>");
      expect(outsideCode).toContain("Press <kbd>K</kbd>.");
      expect(mirror).toContain("```html\n<script>shown as code</script>\n```");
      const full = await (await request.get("/llms-full.txt")).text();
      expect(full).toContain(`&lt;script id="probe-${rand}">`);
      expect(full).not.toContain(`<script id="probe-${rand}">`);
    } finally {
      await callAction(request, PAGE.postEditor, actionId("deletePostAction", "content/actions"), [
        { id },
      ]);
    }
    // The post is gone again (a streamed page answers a missing post with its not-found view).
    const after = await request.get(`/en/blog/${slug}`, { failOnStatusCode: false });
    expect(await after.text()).not.toContain("Opening paragraph.");
  });
});

test.describe("secrets never stay in a URL", () => {
  test("a GET that carries a password field is redirected to the clean URL", async ({
    request,
    page,
  }) => {
    for (const [path, clean] of [
      [
        "/login?email=a%40b.co&password=NOT-A-REAL-SECRET&next=%2Fpanel%2Ftime",
        "/login?email=a%40b.co&next=%2Fpanel%2Ftime",
      ],
      ["/en/panel/vault?vault-master=NOT-A-REAL-SECRET", "/en/panel/vault"],
      [
        "/en/panel/settings?currentPassword=a&newPassword=b&confirmPassword=c&tab=account",
        "/en/panel/settings?tab=account",
      ],
    ] as const) {
      const res = await request.get(path, { maxRedirects: 0, failOnStatusCode: false });
      expect(res.status(), path).toBe(303);
      expect(
        new URL(res.headers().location!, "http://x").pathname +
          new URL(res.headers().location!, "http://x").search,
        path,
      ).toBe(clean);
      expect(res.headers().location, path).not.toContain("NOT-A-REAL-SECRET");
    }
    // What a form submitted before its script loaded would do, in a real browser.
    const seen: string[] = [];
    page.on("request", (r) => seen.push(r.url()));
    await page.goto("/en/login?email=probe%40example.com&password=NOT-A-REAL-SECRET");
    await expect(page.locator("#email")).toBeVisible();
    expect(page.url()).not.toContain("password");
    expect(page.url()).toContain("email=probe%40example.com");
    // Only the first request carried it; nothing after the redirect did.
    expect(seen.filter((u) => u.includes("NOT-A-REAL-SECRET"))).toHaveLength(1);
  });
});

// ─── helpers ────────────────────────────────────────────────────────────────

/** A valid, incompressible-enough PNG of the given size (colour type 2, no compression). */
function png(width: number, height: number) {
  const row = Buffer.alloc(1 + width * 3);
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width * 3; x++)
      row[1 + x] = (x * 7 + y * 13 + rand.charCodeAt(x % rand.length)) & 0xff;
    rows.push(Buffer.from(row));
  }
  const chunk = (type: string, data: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, "latin1");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "latin1"), data])), 0);
    return Buffer.concat([head, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows), { level: 0 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function crc32(data: Buffer) {
  let crc = ~0;
  for (const byte of data) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}
