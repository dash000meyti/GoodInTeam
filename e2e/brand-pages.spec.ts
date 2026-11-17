/**
 * The Good In brand landing pages (`/studio`, `/code`; spec §18, phase 2):
 * one shared BrandPage per sub-brand, framed boxes, the brand's services,
 * the family cross-links, and every Studio/Code entry point pointing here.
 *
 * Needs a running app with the demo data (`pnpm db:reset && pnpm db:seed`):
 *   BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/brand-pages.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";
import { common as enCommon } from "../src/i18n/messages/en/common";
import { nav as enNav } from "../src/i18n/messages/en/nav";
import { common as faCommon } from "../src/i18n/messages/fa/common";
import { nav as faNav } from "../src/i18n/messages/fa/nav";

const DESKTOP = { width: 1280, height: 900 };
const PHONE = { width: 390, height: 844 };

/** Seed services per brand (`meta.brand`): web, mobile, AI → code; design → studio; consulting → team. */
const SERVICES = {
  studio: ["product-design"],
  code: ["web-development", "mobile-apps", "ai-agents-automation"],
} as const;

const PAGES = [
  { path: "/studio", id: "studio", locale: "fa", name: faNav.brandStudio },
  { path: "/code", id: "code", locale: "fa", name: faNav.brandCode },
  { path: "/en/studio", id: "studio", locale: "en", name: enNav.brandStudio },
  { path: "/en/code", id: "code", locale: "en", name: enNav.brandCode },
] as const;

const prefix = (locale: "fa" | "en") => (locale === "fa" ? "" : "/en");

/** The visible menu bar (a hidden one can stay mounted after a soft navigation). */
const menuBar = (page: Page) => page.locator("header.os-menubar:visible");

/** The page has hydrated (the client clock shows text). */
async function hydrated(page: Page) {
  await expect(page.locator("header.os-menubar time.os-clock").first()).not.toHaveText("");
}

test.describe("brand pages", () => {
  test.use({ viewport: DESKTOP });

  for (const p of PAGES) {
    test(`${p.path}: 200, the brand h1, the hero logo, its own services only`, async ({ page }) => {
      const res = await page.goto(p.path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", p.locale);
      const top = page.locator("main section#top");
      await expect(top).toHaveAttribute("data-first", "");
      await expect(top.locator("h1")).toHaveText(p.name);
      // the brand's pixel logo (34×18 cells) in the decor end cell
      const logo = top.locator("[data-decor] svg.px-art");
      await expect(logo).toBeVisible();
      await expect(logo).toHaveAttribute("viewBox", "0 0 34 18");
      // hero CTAs: start a project → contact, see services → the services box
      await expect(top.locator(`a[href="${prefix(p.locale)}/contact"]`)).toBeVisible();
      await expect(top.locator('a[href="#services"]')).toBeVisible();

      // the services stream into their Suspense hole: wait for them before reading
      const cards = page.locator("main section#services article h3 a");
      await expect(cards).toHaveCount(SERVICES[p.id].length);
      const links = await cards.evaluateAll((els) =>
        els.map((a) => (a as HTMLAnchorElement).pathname),
      );
      expect(links.map((h) => h.split("/").pop()).sort()).toEqual([...SERVICES[p.id]].sort());
      for (const h of links) expect(h).toMatch(new RegExp(`^${prefix(p.locale)}/services/`));
    });

    test(`${p.path}: every box carries a guide key and line`, async ({ page }) => {
      await page.goto(p.path);
      await page.waitForLoadState("networkidle");
      const boxes = await page.locator("main section.frame-box").evaluateAll((els) =>
        els.map((e) => ({
          id: e.id,
          key: e.getAttribute("data-guide") ?? "",
          say: (e.getAttribute("data-guide-say") ?? "").trim(),
        })),
      );
      expect(boxes.map((b) => b.key)).toEqual([
        `brand_${p.id}`,
        `brand_services_${p.id}`,
        "brand_family",
        "cta",
      ]);
      for (const b of boxes) expect(b.say, `box #${b.id} (${b.key})`).not.toBe("");
      // no dots cell holds text (decoration only)
      const dotsText = await page
        .locator("main .frame-cell[data-tone=dots]")
        .evaluateAll((els) => els.map((e) => e.textContent?.trim() ?? "").filter(Boolean));
      expect(dotsText).toEqual([]);
    });
  }

  test("/studio at 1280px: the first box ends its first row in a clear decor cell", async ({
    page,
  }) => {
    await page.goto("/studio");
    const box = page.locator("main section.frame-box").first();
    await expect(box.locator("h1")).toBeVisible();
    const r = await box.evaluate((el) => {
      const rtl = getComputedStyle(el).direction === "rtl";
      const rect = (e: Element) => e.getBoundingClientRect().toJSON() as DOMRect;
      const b = rect(el);
      const rowTop = rect(el.querySelector(":scope > .frame-grid")!).top;
      const headers = [...el.querySelectorAll("[data-frame-header]")].map(rect);
      const decor = [...el.querySelectorAll("[data-decor]")]
        .map(rect)
        .find(
          (c) =>
            c.width > 0 &&
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
    expect(r.found).toBe(true);
    expect(r.width).toBeGreaterThanOrEqual(312);
    expect(r.height).toBeGreaterThanOrEqual(200);
    expect(r.hitsHeader).toBe(false);
  });

  test("the family box links the other two brands (team → home)", async ({ page }) => {
    await page.goto("/en/studio");
    const family = page.locator("main section#family");
    await expect(family.locator("[data-brand]")).toHaveCount(2);
    await expect(family.locator('[data-brand="team"] a')).toHaveAttribute("href", "/en");
    await expect(family.locator('[data-brand="code"] a')).toHaveAttribute("href", "/en/code");
    await expect(family.locator('[data-brand="studio"]')).toHaveCount(0);
  });

  test("the dock marks Studio as the current app, the Services link is not current", async ({
    page,
  }) => {
    await page.goto("/en/studio");
    const dock = page.getByRole("navigation", { name: enCommon.dock });
    await expect(dock.getByRole("link", { name: enNav.brandStudio })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(dock.getByRole("link", { name: enNav.brandCode })).not.toHaveAttribute(
      "aria-current",
    );
    await expect(menuBar(page).getByRole("link", { name: enNav.services })).not.toHaveAttribute(
      "aria-current",
    );
  });

  test("the Markdown mirror renders the brand page", async ({ request }) => {
    const res = await request.get("/en/code.md");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/markdown");
    const md = await res.text();
    expect(md).toContain(`# ${enNav.brandCode}`);
    expect(md).toContain("/en/services/web-development.md");
    expect(md).not.toContain("/en/services/product-design.md");
  });
});

test.describe("entry points", () => {
  for (const locale of ["fa", "en"] as const) {
    test(`${locale}: brand menu, Spotlight, Launchpad, dock and footer link to the brand pages`, async ({
      page,
    }) => {
      await page.setViewportSize(DESKTOP);
      await page.goto(prefix(locale) || "/");
      for (const id of ["studio", "code"]) {
        const href = `${prefix(locale)}/${id}`;
        for (const sel of ["#mb-brand", "#os-spotlight", "#os-launchpad", "footer"])
          await expect(page.locator(`${sel} a[href="${href}"]`), `${sel} → ${href}`).toHaveCount(1);
        await expect(page.locator(`.os-dock a[href="${href}"]`)).toHaveCount(1);
        // the home brand family cell
        await expect(page.locator(`#brands [data-brand="${id}"] a`)).toHaveAttribute("href", href);
      }
      // nothing points at the old anchors any more
      await expect(
        page.locator('a[href*="/services#studio"], a[href*="/services#code"]'),
      ).toHaveCount(0);
    });
  }

  test("the brand menu opens /studio", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/en");
    await hydrated(page);
    await menuBar(page).locator('[popovertarget="mb-brand"]').click();
    await Promise.all([
      page.waitForURL(/\/en\/studio$/),
      page.locator("#mb-brand").getByRole("link", { name: enNav.brandStudio }).click(),
    ]);
    await expect(page.locator("main h1:visible")).toHaveText(enNav.brandStudio);
  });

  test("Spotlight finds Good In Code", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");
    await expect(async () => {
      const open = await page
        .locator("#os-spotlight")
        .evaluate((el) => el.matches(":popover-open"));
      if (!open) await page.keyboard.press("Control+k");
      expect(
        await page.locator("#os-spotlight").evaluate((el) => el.matches(":popover-open")),
      ).toBe(true);
    }).toPass();
    await page.locator('#os-spotlight input[name="q"]').fill("کد");
    const link = page
      .locator("#os-spotlight")
      .getByRole("navigation", { name: faCommon.quickLinks })
      .getByRole("link", { name: faNav.brandCode });
    await expect(link).toHaveAttribute("href", "/code");
    await Promise.all([page.waitForURL(/\/code$/), link.click()]);
    await expect(page.locator("main h1:visible")).toHaveText(faNav.brandCode);
  });

  test("the phone Launchpad opens /studio", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/en");
    await hydrated(page);
    await page.getByRole("button", { name: enCommon.more }).click();
    const lp = page.locator("#os-launchpad");
    await expect(lp).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/en\/studio$/),
      lp.getByRole("link", { name: enNav.brandStudio }).click(),
    ]);
    await expect(lp).toBeHidden();
    await expect(page.locator("main h1:visible")).toHaveText(enNav.brandStudio);
  });

  test("the service detail brand chip and the /services brand box open the brand page", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/en/services/product-design");
    await expect(page.locator('section#top a[href="/en/studio"]').first()).toBeVisible();
    await page.goto("/en/services");
    await expect(page.locator('section#code [data-frame-header] a[href="/en/code"]')).toBeVisible();
    // team services keep the /services anchor
    await page.goto("/en/services/technical-consulting");
    await expect(page.locator('section#top a[href="/en/services#team"]')).toBeVisible();
  });
});

test("the locale switch keeps the brand page", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto("/studio");
  await menuBar(page).locator('[popovertarget="mb-lang"]').click();
  const en = page.locator('#mb-lang a[hreflang="en"]');
  await expect(en).toHaveAttribute("href", "/en/studio");
  await Promise.all([page.waitForURL(/\/en\/studio$/), en.click()]);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("main h1")).toHaveText(enNav.brandStudio);
  await menuBar(page).locator('[popovertarget="mb-lang"]').click();
  await expect(page.locator('#mb-lang a[hreflang="fa"]')).toHaveAttribute("href", "/studio");
});

test.describe("layout at 390px", () => {
  for (const path of ["/studio", "/en/code"]) {
    test(`no horizontal overflow on ${path}; the logo shows below the h1 cell`, async ({
      page,
    }) => {
      await page.setViewportSize(PHONE);
      await page.goto(path);
      await page.waitForLoadState("load");
      const { sw, cw } = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      expect(sw).toBeLessThanOrEqual(cw);
      await expect(page.locator("main section#top [data-decor] svg.px-art")).toBeVisible();
    });
  }
});
