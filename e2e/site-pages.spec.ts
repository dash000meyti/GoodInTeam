/**
 * Public site pages on the frame system (spec §9, §17, site-pages track).
 *
 * Needs a running app with the demo data (`pnpm db:reset && pnpm db:seed`):
 *   BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/site-pages.spec.ts
 *
 * Chrome geometry comes ONLY from the registered `--chrome-top` variable
 * (spec §16 rule 3), never from `.os-menubar`, which another track builds.
 */
import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

const chromeTop = (page: Page) =>
  page.evaluate(() =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--chrome-top")),
  );

/** Seed routes: fa has every kind; en lacks the course (fa-only series). */
const FIRST_BOX_PAGES = [
  "/work",
  "/services",
  "/blog",
  "/learn",
  "/learn/nextjs-zero-to-deploy",
  "/about",
  "/contact",
  "/work/acme-learning-platform",
  "/services/product-design",
  "/studio",
  "/code",
  "/blog/sqlite-is-enough",
  "/learn/nextjs-zero-to-deploy/nextjs-01-setup",
  "/does-not-exist",
  "/en/work",
  "/en/services",
  "/en/blog",
  "/en/about",
  "/en/contact",
  "/en/work/acme-learning-platform",
  "/en/services/web-development",
  "/en/studio",
  "/en/code",
  "/en/blog/sqlite-is-enough",
  "/en/does-not-exist",
];

test.describe("first-box rule (§9)", () => {
  for (const path of FIRST_BOX_PAGES) {
    test(`${path}: the first box ends its first row in a clear decor cell`, async ({ page }) => {
      await page.goto(path);
      const box = page.locator("main section.frame-box").first();
      await expect(box).toHaveAttribute("data-first", "");
      // detail pages stream their header (the skeleton has no h1)
      await expect(box.locator("h1")).toBeVisible();
      const r = await box.evaluate((el) => {
        const rtl = getComputedStyle(el).direction === "rtl";
        const rect = (e: Element) => e.getBoundingClientRect().toJSON() as DOMRect;
        const b = rect(el);
        const firstGrid = el.querySelector(
          ":scope > .frame-grid, :scope > .frame-cv > .frame-grid",
        );
        const rowTop = firstGrid ? rect(firstGrid).top : NaN;
        const headers = [...el.querySelectorAll("[data-frame-header]")].map(rect);
        const decor = [...el.querySelectorAll("[data-decor]")]
          .map(rect)
          .filter((c) => c.width > 0 && c.height > 0)
          .find(
            (c) =>
              Math.abs(rtl ? c.left - b.left : b.right - c.right) <= 1 &&
              Math.abs(c.top - rowTop) <= 1,
          );
        const overlaps = (a: DOMRect, h: DOMRect) =>
          Math.min(a.right, h.right) - Math.max(a.left, h.left) > 1 &&
          Math.min(a.bottom, h.bottom) - Math.max(a.top, h.top) > 1;
        return {
          found: !!decor,
          width: decor?.width ?? 0,
          height: decor?.height ?? 0,
          hitsHeader: decor ? headers.some((h) => overlaps(decor, h)) : true,
        };
      });
      expect(r.found, "a [data-decor] cell flush with the inline-end border at the first row").toBe(
        true,
      );
      expect(r.width).toBeGreaterThanOrEqual(312);
      expect(r.height).toBeGreaterThanOrEqual(200);
      expect(r.hitsHeader).toBe(false);
      // glow layers are gone (§12 "Glow removal")
      await expect(page.locator(".gt-glow")).toHaveCount(0);
    });
  }
});

test.describe("/services brand boxes", () => {
  for (const prefix of ["", "/en"]) {
    test(`${prefix || "/fa"}: boxes team, studio, code in registry order`, async ({ page }) => {
      await page.goto(`${prefix}/services`);
      const ids = await page
        .locator("main section.frame-box")
        .evaluateAll((els) =>
          els.map((e) => e.id).filter((id) => ["team", "studio", "code"].includes(id)),
        );
      expect(ids).toEqual(["team", "studio", "code"]);
      for (const id of ids) {
        const header = page.locator(`section#${id} [data-frame-header]`).first();
        await expect(header).toHaveAttribute("data-guide-spot", `brand-${id}`);
        expect((await header.getAttribute("data-guide-say"))?.trim()).toBeTruthy();
      }
    });

    for (const id of ["studio", "code"]) {
      test(`${prefix}/services#${id} lands just under the menu bar`, async ({ page }) => {
        await page.goto(`${prefix}/services#${id}`, { waitUntil: "load" });
        const top = await chromeTop(page);
        expect(Number.isFinite(top)).toBe(true);
        // the fragment scroll may be smooth (html scroll-behavior): wait until it settles
        const boxTop = async () => (await page.locator(`section#${id}`).boundingBox())?.y ?? -1;
        await expect.poll(boxTop, { timeout: 5_000 }).toBeLessThanOrEqual(top + 24);
        await page.waitForTimeout(300);
        const y = await boxTop();
        expect(y).toBeGreaterThanOrEqual(top);
        expect(y).toBeLessThanOrEqual(top + 24);
        // one mechanism only (D18): no scroll-margin on the anchor target
        const margin = await page
          .locator(`section#${id}`)
          .evaluate((el) => getComputedStyle(el).scrollMarginTop);
        expect(margin).toBe("0px");
      });
    }
  }
});

test.describe("guide coverage (§9)", () => {
  for (const path of [
    "/services",
    "/about",
    "/studio",
    "/blog/sqlite-is-enough",
    "/en/services",
    "/en/about",
    "/en/code",
  ]) {
    test(`${path}: every box carries a guide key and line`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const boxes = await page.locator("main section.frame-box").evaluateAll((els) =>
        els.map((e) => ({
          id: e.id,
          key: e.getAttribute("data-guide") ?? "",
          say: (e.getAttribute("data-guide-say") ?? "").trim(),
        })),
      );
      expect(boxes.length).toBeGreaterThan(1);
      for (const b of boxes) {
        expect(b.key, `box #${b.id}`).not.toBe("");
        expect(b.say, `box #${b.id} (${b.key})`).not.toBe("");
      }
    });
  }
});

test("a blog post reads with a sticky TOC below the chrome", async ({ page }) => {
  await page.goto("/en/blog/sqlite-is-enough");
  await expect(page.locator("[data-reading]")).toHaveCount(1);
  await expect(page.locator("article.h-entry h1.p-name")).toBeVisible();
  await expect(page.locator("article.h-entry .e-content")).toBeVisible();
  const toc = page.locator("[data-sticky-aside] nav").first();
  await expect(toc).toBeVisible();
  const top = await chromeTop(page);
  // scroll the body cell's top 120px above the chrome: the TOC must stay pinned below it
  await page.locator("#post-body .e-content").evaluate((el, chrome) => {
    const cell = el.closest(".frame-cell")!;
    const top = cell.getBoundingClientRect().top + window.scrollY - chrome + 120;
    window.scrollTo({ top, behavior: "instant" });
  }, top);
  await expect.poll(async () => (await toc.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(top);
  const cellTop = await page
    .locator("#post-body .e-content")
    .evaluate((el) => el.closest(".frame-cell")!.getBoundingClientRect().top);
  expect(cellTop).toBeLessThan(top);
});

for (const [path, home] of [
  ["/does-not-exist", "/"],
  ["/en/does-not-exist", "/en"],
] as const) {
  test(`${path} is a 404 with the alert box`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
    const box = page.locator('main section.frame-box[data-guide="not_found"]');
    await expect(box).toHaveAttribute("data-first", "");
    await expect(box.locator("h1")).toBeVisible();
    await expect(box.locator(`a[href="${home}"]`).first()).toBeVisible();
  });
}
