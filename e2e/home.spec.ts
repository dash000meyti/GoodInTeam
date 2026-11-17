/**
 * Home page (spec §8, §15.1, §17): ten framed boxes in a fixed order with the
 * guide contract, the brand-family logo swap, the first-box decor cell, the
 * zero-JS process tabs and reduced motion.
 *
 * Needs a running app with the demo data (`pnpm db:reset && pnpm db:seed`):
 *   BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/home.spec.ts
 * Targets only home's own markup and foundation contracts (§16 rule 3): never
 * the site header, footer or dock, which site-shell builds in parallel.
 */
import { expect, test, type Page } from "@playwright/test";

const BOXES = [
  ["top", "home_hero"],
  ["brands", "home_brands"],
  ["trust", "home_trust"],
  ["work", "home_work"],
  ["services", "home_services"],
  ["process", "home_process"],
  ["stats", "home_stats"],
  ["latest", "home_latest"],
  ["kind-words", "home_testimonials"],
  ["contact-cta", "home_cta"],
] as const;

/** Wait until every streamed hole has resolved (the trust box streams as a whole). */
async function openHome(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("main section.frame-box")).toHaveCount(BOXES.length);
  await expect(page.locator("main [data-slot=skeleton]")).toHaveCount(0);
}

for (const path of ["/", "/en"]) {
  test.describe(`home ${path}`, () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("ten framed boxes in order, each with a guide key and line", async ({ page }) => {
      await openHome(page, path);
      const boxes = await page.$$eval("main section.frame-box", (els) =>
        els.map((e) => ({
          id: e.id,
          key: e.getAttribute("data-guide"),
          say: e.getAttribute("data-guide-say") ?? "",
        })),
      );
      expect(boxes.map((b) => [b.id, b.key])).toEqual(BOXES.map(([id, key]) => [id, key]));
      for (const b of boxes) expect(b.say.trim(), b.id).not.toBe("");
      // the footer box is a <footer> outside main and never counted
      await expect(page.locator("main footer")).toHaveCount(0);
    });

    test("one h1, every box named, #top reserves the guide roof", async ({ page }) => {
      await openHome(page, path);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("section#top.frame-box[data-first]")).toHaveCount(1);
      for (const [id] of BOXES)
        await expect(page.locator(`main section#${id}`), id).toHaveAccessibleName(/\S/);
    });

    test("the hero h1 and its ancestors are never animated", async ({ page }) => {
      await openHome(page, path);
      const animated = await page.$eval("#top h1", (h1) => {
        const out: string[] = [];
        for (let el: Element | null = h1; el && el !== document.body; el = el.parentElement) {
          const cs = getComputedStyle(el);
          if (cs.animationName !== "none" || cs.opacity !== "1" || cs.transform !== "none")
            out.push(`${el.tagName}.${el.className}`);
        }
        return out;
      });
      expect(animated).toEqual([]);
    });

    test("brand cells follow the registry; hovering Studio swaps the big logo", async ({
      page,
    }) => {
      await openHome(page, path);
      const order = await page.$$eval("#brands [data-brand]", (els) =>
        els.map((e) => e.getAttribute("data-brand")),
      );
      expect(order).toEqual(["team", "studio", "code"]);
      const sfx = (s: string) => page.locator(`#brands .gi-swap .gi-sfx[data-sfx=${s}]`);
      await expect(sfx("TEAM")).toHaveCSS("opacity", "1");
      await expect(sfx("STUDIO")).toHaveCSS("opacity", "0");
      await page.locator("#brands [data-brand=studio]").hover();
      await expect(sfx("STUDIO")).toHaveCSS("opacity", "1");
      await expect(sfx("TEAM")).toHaveCSS("opacity", "0");
      // keyboard focus inside a brand cell swaps too
      await page.locator("#brands [data-brand=code] a").focus();
      await expect(sfx("CODE")).toHaveCSS("opacity", "1");
    });

    test("the hero's first row ends at inline-end in a decor cell", async ({ page }) => {
      await openHome(page, path);
      const r = await page.evaluate(() => {
        const box = document.querySelector("#top")!;
        const rtl = getComputedStyle(box).direction === "rtl";
        const b = box.getBoundingClientRect();
        const cells = [...box.querySelectorAll(":scope > .frame-grid > .frame-cell")];
        const top = cells[0]!.getBoundingClientRect().top;
        const row = cells.filter((c) => Math.abs(c.getBoundingClientRect().top - top) < 1);
        const end = row.reduce((a, c) => {
          const ra = a.getBoundingClientRect();
          const rc = c.getBoundingClientRect();
          return (rtl ? rc.left < ra.left : rc.right > ra.right) ? c : a;
        });
        const e = end.getBoundingClientRect();
        return {
          cells: row.length,
          decor: end.hasAttribute("data-decor"),
          edge: Math.abs(rtl ? e.left - b.left : b.right - e.right),
          w: e.width,
          h: e.height,
          header: !!end.querySelector("h1, h2"),
        };
      });
      expect(r.cells).toBe(2);
      expect(r.decor).toBe(true);
      expect(r.header).toBe(false);
      expect(r.edge).toBeLessThanOrEqual(2);
      expect(r.w).toBeGreaterThanOrEqual(312);
      expect(r.h).toBeGreaterThanOrEqual(200);
    });

    test("checking the PROGRESS tab shows only the PROGRESS window path", async ({ page }) => {
      await openHome(page, path);
      const shown = () =>
        page.$$eval("#process .px-set > [data-path-id]", (els) =>
          els
            .filter((e) => getComputedStyle(e).display !== "none")
            .map((e) => e.getAttribute("data-path-id")),
        );
      expect(await shown()).toEqual(["PORTAL"]);
      await page.locator("label[for=how-progress]").click();
      await expect(page.locator("#how-progress")).toBeChecked();
      expect(await shown()).toEqual(["PROGRESS"]);
      await page.locator("label[for=how-invoices]").click();
      expect(await shown()).toEqual(["INVOICES"]);
    });

    test("no glow, no blur and no text on dots inside main", async ({ page }) => {
      await openHome(page, path);
      await expect(page.locator("main .gt-glow")).toHaveCount(0);
      const issues = await page.evaluate(() => {
        const out: string[] = [];
        for (const el of document.querySelectorAll("main *")) {
          const cs = getComputedStyle(el);
          if (cs.backdropFilter !== "none" || cs.filter.includes("blur"))
            out.push(`blur: ${el.tagName}.${el.className}`);
        }
        for (const cell of document.querySelectorAll("main .frame-cell[data-tone=dots]")) {
          const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode())
            if (n.textContent!.trim() && !n.parentElement!.closest(".os-win"))
              out.push(`text on dots: ${n.textContent!.trim().slice(0, 40)}`);
        }
        return out;
      });
      expect(issues).toEqual([]);
    });

    test("home pixel art stays within its allocation (≤115 elements)", async ({ page }) => {
      await openHome(page, path);
      const n = await page.evaluate(
        () => document.querySelectorAll("main svg.px-art, main svg.px-art *").length,
      );
      expect(n).toBeLessThanOrEqual(115);
    });
  });
}

test.describe("home with reduced motion", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });

  for (const path of ["/", "/en"]) {
    test(`${path}: the hero cycle shows TEAM only and the marquee is static`, async ({ page }) => {
      await openHome(page, path);
      const cycle = (s: string) => page.locator(`#top .gi-cycle .gi-sfx[data-sfx=${s}]`);
      await expect(cycle("TEAM")).toHaveCSS("opacity", "1");
      await expect(cycle("STUDIO")).toHaveCSS("opacity", "0");
      await expect(cycle("CODE")).toHaveCSS("opacity", "0");
      await expect(cycle("TEAM")).toHaveCSS("animation-name", "none");
      await expect(page.locator("#trust .gt-marquee")).toHaveCSS("animation-name", "none");
      // the repeated names are hidden; every visible name appears once
      const names = await page.$$eval("#trust .gt-marquee > li", (els) =>
        els.filter((e) => getComputedStyle(e).display !== "none").map((e) => e.textContent),
      );
      expect(names.length).toBeGreaterThanOrEqual(2);
      expect(new Set(names).size).toBe(names.length);
    });
  }
});
