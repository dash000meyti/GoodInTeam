/**
 * Performance budget (spec §12 "Verification"; A10, A16, A18, A28).
 *
 * Blocking (deterministic): layout shift on / and /en under a 4× CPU
 * throttle, the lazy guide engine (after `load`, never when muted), DOM size,
 * pixel-art element count, exactly two blurred surfaces, and no Radix
 * DropdownMenu / Tooltip or sonner code on public routes.
 *
 * Tagged `@perf` and skipped unless `PERF=1` (timing is noisy on shared CI
 * runners): the LCP element is the hero <h1>, painted within 1.8s under a
 * 4× CPU throttle and a 4G-like network. The measured numbers live in
 * docs/os-shell.md.
 *
 * Every test sets `gt-guide-test=1`: under `navigator.webdriver` the loader
 * otherwise never requests the engine, and "no engine before load" would
 * pass vacuously.
 *
 *   BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/perf.spec.ts
 *   PERF=1 BASE_URL=… pnpm exec playwright test e2e/perf.spec.ts --grep @perf
 */
import { expect, test, type Page } from "@playwright/test";

/** The engine chunk's sentinel (`GUIDE_ENGINE_ID`); Turbopack chunk names are hashed. */
const SENTINEL = "gt-guide-engine@1";
/** Radix display names and sonner's attribute survive minification. */
const BANNED = ["DropdownMenuContent", "TooltipContent", "data-sonner-toaster"];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("gt-guide-test", "1"));
});

/** Records a measured number in the report (annotation) and the console. */
function note(type: string, description: string) {
  test.info().annotations.push({ type, description });
  console.log(`[perf] ${type}: ${description}`);
}

/** Bodies of every JavaScript response the page receives (url → text). */
function collectScripts(page: Page) {
  const bodies = new Map<string, Promise<string>>();
  page.on("response", (r) => {
    const type = r.request().resourceType();
    const ct = r.headers()["content-type"] ?? "";
    if (type === "script" || ct.includes("javascript"))
      bodies.set(
        r.url(),
        r.text().catch(() => ""),
      );
  });
  return async () =>
    new Map(await Promise.all([...bodies].map(async ([u, b]) => [u, await b] as const)));
}

async function throttle(page: Page, network = false) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  if (network) {
    await cdp.send("Network.enable");
    // ~Lighthouse's mobile preset: 150ms RTT, 1.6 Mbps down, 750 Kbps up.
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
  }
}

test.describe("layout shift (390×844, 4× CPU)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of ["/", "/en"]) {
    test(`CLS < 0.01 on ${path}`, async ({ page, browserName }) => {
      test.skip(
        browserName !== "chromium",
        "CDP CPU throttle and layout-shift entries: Chromium only",
      );
      await throttle(page);
      await page.addInitScript(() => {
        const w = window as unknown as { __shifts: { value: number; sources: string[] }[] };
        w.__shifts = [];
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as unknown as {
            value: number;
            hadRecentInput: boolean;
            sources?: { node?: Node | null }[];
          }[]) {
            if (e.hadRecentInput) continue;
            w.__shifts.push({
              value: e.value,
              sources: (e.sources ?? []).map((s) => {
                const n = s.node as Element | null;
                return n?.nodeType === 1 ? `${n.tagName}.${n.className}`.slice(0, 80) : "#text";
              }),
            });
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto(path, { waitUntil: "load" });
      // the streamed holes (clock, availability, sections) and the guide's boot
      await expect(page.locator("#gt-guide[data-engine]")).toBeAttached({ timeout: 20_000 });
      await page.waitForTimeout(3000);
      const shifts = await page.evaluate(
        () => (window as unknown as { __shifts: { value: number; sources: string[] }[] }).__shifts,
      );
      const sum = shifts.reduce((a, s) => a + s.value, 0);
      note("cls", `${path}: ${sum.toFixed(4)}`);
      expect(sum, JSON.stringify(shifts)).toBeLessThan(0.01);
    });
  }
});

test.describe("panel layout shift (390×844, 4× CPU)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("CLS < 0.01 on /panel (owner, framed Desktop)", async ({ page, browserName }) => {
    test.skip(
      browserName !== "chromium",
      "CDP CPU throttle and layout-shift entries: Chromium only",
    );
    await page.goto("/en/login");
    await page.fill("#email", "owner@goodteam.local");
    await page.fill("#password", "goodteam-demo-pass");
    await Promise.all([
      page.waitForURL((u) => !u.pathname.endsWith("/login")),
      page.press("#password", "Enter"),
    ]);
    await throttle(page);
    await page.addInitScript(() => {
      const w = window as unknown as { __shifts: number[] };
      w.__shifts = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as {
          value: number;
          hadRecentInput: boolean;
        }[])
          if (!e.hadRecentInput) w.__shifts.push(e.value);
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/panel", { waitUntil: "load" });
    await expect(page.locator("main h1:visible").first()).toBeVisible();
    await page.waitForTimeout(3000);
    const sum = await page.evaluate(() =>
      (window as unknown as { __shifts: number[] }).__shifts.reduce((a, v) => a + v, 0),
    );
    note("cls", `/panel: ${sum.toFixed(4)}`);
    expect(sum).toBeLessThan(0.01);
  });
});

test.describe("guide engine (lazy)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("is requested after load, within 5s of it, and starts", async ({ page }) => {
    const scripts = collectScripts(page);
    await page.goto("/", { waitUntil: "load" });
    await expect(page.locator(`#gt-guide[data-engine="${SENTINEL}"]`)).toBeAttached({
      timeout: 15_000,
    });
    const engine = [...(await scripts())].filter(([, body]) => body.includes(SENTINEL));
    expect(engine.length, "one JS response carries the sentinel").toBe(1);
    const [url] = engine[0]!;
    const t = await page.evaluate((u) => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      const res = performance.getEntriesByName(u)[0] as PerformanceResourceTiming | undefined;
      return { load: nav.loadEventStart, start: res?.startTime ?? -1 };
    }, url);
    expect(t.start, "engine resource timing").toBeGreaterThan(0);
    expect(t.start).toBeGreaterThanOrEqual(t.load);
    expect(t.start - t.load).toBeLessThanOrEqual(5000);
    note("engine", `requested ${Math.round(t.start - t.load)}ms after load`);
  });

  test("is never requested when muted (gt-guide=off)", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("gt-guide", "off"));
    const scripts = collectScripts(page);
    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(8000);
    const engine = [...(await scripts())].filter(([, body]) => body.includes(SENTINEL));
    expect(engine.map(([u]) => u)).toEqual([]);
    await expect(page.locator("#gt-guide")).not.toHaveAttribute("data-engine");
  });
});

test.describe("home weight (1440×900)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("DOM ≤ 1800 nodes and ≤ 260 pixel-art elements on /", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("#gt-guide[data-engine]")).toBeAttached({ timeout: 15_000 });
    const { dom, px } = await page.evaluate(() => ({
      dom: document.querySelectorAll("*").length,
      px: document.querySelectorAll("svg.px-art, svg.px-art *").length,
    }));
    note("weight", `DOM ${dom}, pixel art ${px}`);
    expect(dom).toBeLessThanOrEqual(1800);
    expect(px).toBeLessThanOrEqual(260);
  });

  test("exactly two blurred surfaces: the menu bar and the dock", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const blurred = await page.evaluate(() => {
      const out: string[] = [];
      const on = (cs: CSSStyleDeclaration) =>
        [cs.backdropFilter, cs.getPropertyValue("-webkit-backdrop-filter")].some(
          (v) => v && v !== "none",
        );
      for (const el of document.querySelectorAll("*")) {
        if (on(getComputedStyle(el))) out.push(`${el.className}`);
        if (on(getComputedStyle(el, "::before"))) out.push(`${el.className}::before`);
      }
      return out;
    });
    expect(blurred).toHaveLength(2);
    expect(blurred.some((c) => /\bos-menubar\b/.test(c) && !c.endsWith("::before"))).toBe(true);
    expect(blurred.some((c) => /\bos-dock-list\b/.test(c))).toBe(true);
  });
});

test.describe("public routes ship no Radix menus, tooltips or toasts", () => {
  for (const path of ["/", "/studio", "/login"]) {
    test(`no DropdownMenu, Tooltip or sonner code on ${path}`, async ({ page }) => {
      const scripts = collectScripts(page);
      await page.goto(path, { waitUntil: "networkidle" });
      await page.waitForTimeout(2000); // lazy chunks (guide engine) included
      const hits = [...(await scripts())].flatMap(([u, body]) =>
        BANNED.filter((s) => body.includes(s)).map((s) => `${s} in ${u}`),
      );
      expect(hits).toEqual([]);
    });
  }
});

test.describe("@perf LCP (390×844, 4× CPU, 4G)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of ["/", "/en"]) {
    test(`LCP is the hero h1 within 1.8s on ${path} @perf`, async ({ page, browserName }) => {
      test.skip(!process.env.PERF, "timing check: run with PERF=1");
      test.skip(browserName !== "chromium", "CDP throttling: Chromium only");
      await throttle(page, true);
      await page.addInitScript(() => {
        const w = window as unknown as { __lcp: { t: number; h1: boolean; tag: string } };
        new PerformanceObserver((list) => {
          const e = list.getEntries().at(-1) as unknown as { startTime: number; element?: Element };
          w.__lcp = {
            t: e.startTime,
            h1: !!e.element?.closest("#top h1"),
            tag: e.element ? `${e.element.tagName}.${e.element.className}`.slice(0, 80) : "?",
          };
        }).observe({ type: "largest-contentful-paint", buffered: true });
      });
      await page.goto(path, { waitUntil: "load" });
      await page.waitForTimeout(1500);
      // LCP entries stop at the first input; read the final candidate.
      const lcp = await page.evaluate(
        () => (window as unknown as { __lcp: { t: number; h1: boolean; tag: string } }).__lcp,
      );
      note("lcp", `${path}: ${Math.round(lcp.t)}ms (${lcp.tag})`);
      expect(lcp.h1, lcp.tag).toBe(true);
      expect(lcp.t).toBeLessThanOrEqual(1800);
    });
  }
});
