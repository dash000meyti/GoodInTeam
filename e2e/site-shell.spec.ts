/**
 * The public OS shell (spec §7, §17 "site-shell.spec.ts"): menu bar, its two
 * streamed holes, the native popovers (brand menu, guide extra, language,
 * Spotlight, Control Center, Launchpad), the dock / tab bar, the boot moment
 * and the login screen's menu bar.
 *
 * Runs against `pnpm start` (CI) or `pnpm dev` with the demo data:
 *   BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/site-shell.spec.ts
 * Chrome geometry other specs measure against (`--chrome-top`) is tied to the
 * real bar here.
 */
import { expect, test, type Page } from "@playwright/test";
import { CLOCK_LONGEST } from "../src/components/shell/clock-format";
import { common as enCommon } from "../src/i18n/messages/en/common";
import { guide as enGuide } from "../src/i18n/messages/en/guide";
import { nav as enNav } from "../src/i18n/messages/en/nav";
import { common as faCommon } from "../src/i18n/messages/fa/common";
import { guide as faGuide } from "../src/i18n/messages/fa/guide";
import { nav as faNav } from "../src/i18n/messages/fa/nav";

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

/**
 * The visible menu bar. Cache Components keeps the previous route's layout
 * mounted but hidden (React Activity) after a soft navigation, so a second,
 * hidden `header.os-menubar` can exist.
 */
const menuBar = (page: Page) => page.locator("header.os-menubar:visible");
const isOpen = (page: Page, id: string) =>
  page.locator(`#${id}`).evaluate((el) => el.matches(":popover-open"));

/** Wait until the boot slide-in (transform only) has finished. */
async function settleBar(page: Page) {
  await menuBar(page).evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
}

/**
 * The page has hydrated: the client clock (inside its own Suspense boundary,
 * hydrated after the layout around it) shows text. Needed before clicking
 * controls whose behaviour is JS (guide rows, switches).
 */
async function hydrated(page: Page) {
  await expect(page.locator("header.os-menubar time.os-clock").first()).not.toHaveText("");
}

/** Records every `gt:guide` event on window.__guide. */
async function recordGuide(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __guide: unknown[] };
    w.__guide = [];
    addEventListener("gt:guide", (e) => w.__guide.push((e as CustomEvent).detail));
  });
}
const guideEvents = (page: Page) =>
  page.evaluate(() => (window as unknown as { __guide: unknown[] }).__guide);

test.describe("landmarks and names", () => {
  for (const vp of [PHONE, DESKTOP]) {
    test(`fa at ${vp.width}px: landmarks, brand trigger named appName`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto("/");
      const nav = page.getByRole("banner").getByRole("navigation", { name: faCommon.menuBar });
      await expect(nav).toBeVisible();
      await expect(nav.getByRole("button", { name: faCommon.appName, exact: true })).toBeVisible();
      await expect(page.locator("main#main")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toHaveAttribute("data-guide", "footer");
      await expect(page.locator("footer#site-footer.frame-box")).toHaveCount(1);
      await expect(page.getByRole("navigation", { name: faCommon.dock })).toBeVisible();
      // The icon-only Control Center trigger is named by i18n.
      await expect(
        menuBar(page).getByRole("button", { name: faCommon.controlCenter, exact: true }),
      ).toBeVisible();
    });
  }

  test("/en mirrors to LTR (brand at the start, clock at the end)", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await settleBar(page);
    const brand = await menuBar(page).locator('[popovertarget="mb-brand"]').boundingBox();
    const clock = await menuBar(page).locator(".os-clock").boundingBox();
    expect(brand!.x).toBeLessThan(clock!.x);

    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await settleBar(page);
    const faBrand = await menuBar(page).locator('[popovertarget="mb-brand"]').boundingBox();
    const faClock = await menuBar(page).locator(".os-clock").boundingBox();
    expect(faBrand!.x).toBeGreaterThan(faClock!.x);
  });
});

test.describe("menu bar geometry", () => {
  for (const vp of [DESKTOP, PHONE]) {
    test(`header bottom equals --chrome-top at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto("/en");
      await settleBar(page);
      const { bottom, chromeTop } = await page.evaluate(() => ({
        bottom: document.querySelector("header.os-menubar")!.getBoundingClientRect().bottom,
        chromeTop: parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--chrome-top"),
        ),
      }));
      expect(Number.isFinite(chromeTop)).toBe(true);
      expect(Math.abs(bottom - chromeTop)).toBeLessThanOrEqual(1);
      expect(bottom).toBe(vp.width >= 768 ? 32 : 44);
    });
  }

  for (const [locale, path] of [
    ["fa", "/"],
    ["en", "/en"],
  ] as const) {
    test(`holes stream with zero layout shift, longest clock fits (${locale})`, async ({
      page,
    }) => {
      await page.clock.setFixedTime(CLOCK_LONGEST[locale]);
      await page.setViewportSize(DESKTOP);
      await page.addInitScript(() => {
        const w = window as unknown as { __mbShift: number };
        w.__mbShift = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as unknown as {
            value: number;
            sources?: { node?: Node | null }[];
          }[]) {
            const inBar = e.sources?.some(
              (s) => s.node instanceof Element && s.node.closest("header.os-menubar"),
            );
            if (inBar) w.__mbShift += e.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto(path);
      const clock = menuBar(page).locator("time.os-clock");
      await expect(clock).not.toHaveText("");
      await expect(menuBar(page).locator("a.os-mb-avail")).toHaveCount(1);
      await page.waitForLoadState("load");
      await page.waitForTimeout(300);
      expect(
        await page.evaluate(() => (window as unknown as { __mbShift: number }).__mbShift),
      ).toBe(0);
      const m = await clock.evaluate((el) => {
        // A ClockSkeleton-equivalent box in the same place (same font size).
        const skeleton = document.createElement("span");
        skeleton.className = "os-clock";
        el.after(skeleton);
        const r = {
          clock: el.getBoundingClientRect().width,
          skeleton: skeleton.getBoundingClientRect().width,
          scroll: el.scrollWidth,
          client: el.clientWidth,
        };
        skeleton.remove();
        return r;
      });
      expect(Math.abs(m.clock - m.skeleton)).toBeLessThan(0.5);
      expect(m.scroll).toBeLessThanOrEqual(m.client);
    });
  }
});

test.describe("menus", () => {
  test("brand menu opens on click, shows the open background, closes on Esc", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/en");
    const trigger = menuBar(page).locator('[popovertarget="mb-brand"]');
    const bg = () => trigger.evaluate((el) => getComputedStyle(el).backgroundColor);
    await page.mouse.move(700, 500);
    const idle = await bg();
    await trigger.click();
    await expect(page.locator("#mb-brand")).toBeVisible();
    expect(await isOpen(page, "mb-brand")).toBe(true);
    await page.mouse.move(700, 600); // not hovering: the background comes from the open state
    expect(await bg()).not.toBe(idle);
    await expect(
      page.locator("#mb-brand").getByRole("link", { name: enNav.brandStudio }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#mb-brand")).toBeHidden();
    expect(await bg()).toBe(idle);
  });

  test("#mb-guide 'What's this part?' closes its menu, then dispatches gt:guide", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/en");
    await hydrated(page);
    await recordGuide(page);
    await menuBar(page).getByRole("button", { name: enGuide.toggle }).click();
    await expect(page.locator("#mb-guide")).toBeVisible();
    await page.locator("#mb-guide").getByRole("button", { name: enGuide.explain }).click();
    await expect(page.locator("#mb-guide")).toBeHidden();
    expect(await guideEvents(page)).toContainEqual({ type: "explain" });
  });

  test("Control Center explain row (phone) closes Control Center, then dispatches", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/");
    await hydrated(page);
    await recordGuide(page);
    await menuBar(page).getByRole("button", { name: faCommon.controlCenter, exact: true }).click();
    await expect(page.locator("#os-cc")).toBeVisible();
    await page.locator("#os-cc").getByRole("button", { name: faGuide.tour }).click();
    await expect(page.locator("#os-cc")).toBeHidden();
    await menuBar(page).getByRole("button", { name: faCommon.controlCenter, exact: true }).click();
    await page.locator("#os-cc").getByRole("button", { name: faGuide.explain }).click();
    await expect(page.locator("#os-cc")).toBeHidden();
    expect(await guideEvents(page)).toEqual([{ type: "tour" }, { type: "explain" }]);
  });

  test("Control Center Reduce motion persists across a reload", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/en");
    await hydrated(page);
    await menuBar(page).getByRole("button", { name: enCommon.controlCenter, exact: true }).click();
    const sw = page.locator("#os-cc").getByRole("switch", { name: enCommon.reduceMotion });
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await sw.click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    await hydrated(page);
    await menuBar(page).getByRole("button", { name: enCommon.controlCenter, exact: true }).click();
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await sw.click();
    await expect(page.locator("html")).not.toHaveAttribute("data-motion", "reduce");
  });
});

test.describe("language", () => {
  test("menu-bar language links use hreflang and a full page load", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");
    await page.evaluate(() => ((window as unknown as { __same: number }).__same = 1));
    const trigger = menuBar(page).getByRole("button", {
      name: `${faCommon.language} (فا)`,
      exact: true,
    });
    await trigger.click();
    const en = page.locator('#mb-lang a[hreflang="en"]');
    await expect(en).toHaveAttribute("lang", "en");
    await expect(page.locator('#mb-lang a[hreflang="fa"]')).toHaveAttribute("aria-current", "true");
    await Promise.all([page.waitForURL(/\/en\/?$/), en.click()]);
    await page.waitForLoadState("load");
    expect(await page.evaluate(() => (window as unknown as { __same?: number }).__same)).toBe(
      undefined,
    );
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("/login: same plain language links, no Radix menu, full page load", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible();
    // Light DOM only (the dev-tools indicator lives in a shadow root under `next dev`).
    const radixMenus = await page.evaluate(
      () =>
        document.querySelectorAll("[data-slot^='dropdown-menu'], [aria-haspopup='menu']").length,
    );
    expect(radixMenus).toBe(0);
    await page.evaluate(() => ((window as unknown as { __same: number }).__same = 1));
    const en = menuBar(page).locator('a[hreflang="en"]');
    await expect(en).toHaveAttribute("lang", "en");
    await expect(en).toHaveAccessibleName(`${faCommon.language} (EN)`);
    await Promise.all([page.waitForURL(/\/en\/login$/), en.click()]);
    await page.waitForLoadState("load");
    expect(await page.evaluate(() => (window as unknown as { __same?: number }).__same)).toBe(
      undefined,
    );
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator(".os-win")).toBeVisible();
  });
});

test.describe("Spotlight", () => {
  test("Ctrl+K focuses the field; Persian normalisation filters the quick links", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");
    // Retry until the chrome island has hydrated (a key press before that does nothing).
    await expect(async () => {
      if (!(await isOpen(page, "os-spotlight"))) await page.keyboard.press("Control+k");
      expect(await isOpen(page, "os-spotlight")).toBe(true);
    }).toPass();
    const input = page.locator('#os-spotlight input[name="q"]');
    await expect(input).toBeFocused();
    const links = page.locator("#os-spotlight").getByRole("navigation", {
      name: faCommon.quickLinks,
    });
    // Arabic yeh (ي) typed for the Persian ی of «گودین».
    await input.fill("گودين");
    await expect(links.getByRole("link", { name: faNav.brandStudio })).toBeVisible();
    await expect(links.getByRole("link", { name: faNav.brandCode })).toBeVisible();
    await expect(links.getByRole("link", { name: faNav.about })).toBeHidden();
    await input.fill("zzzz");
    await expect(page.locator("#os-spotlight").getByText(faCommon.noMatches)).toBeVisible();
    await input.fill("next");
    await Promise.all([page.waitForURL(/\/blog\?q=next$/), input.press("Enter")]);
  });
});

test.describe("dock", () => {
  test("Home has aria-current on /", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/en");
    const dock = page.getByRole("navigation", { name: enCommon.dock });
    await expect(dock.getByRole("link", { name: enNav.home })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(dock.getByRole("link", { name: enNav.work })).not.toHaveAttribute("aria-current");
  });

  test("phone tab bar: five items in 28px tiles; More opens the Launchpad", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/en");
    await hydrated(page);
    const items = page.locator(".os-dock li[data-app]:visible");
    await expect(items).toHaveCount(5);
    const tiles = await page.locator(".os-dock li[data-app]:visible .os-tile").evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        const art = el.querySelector("svg")!.getBoundingClientRect();
        return { w: r.width, h: r.height, aw: art.width, ah: art.height };
      }),
    );
    for (const t of tiles) {
      expect(t.w).toBe(28);
      expect(t.h).toBe(28);
      expect(t.aw).toBeLessThanOrEqual(28);
      expect(t.ah).toBeLessThanOrEqual(28);
    }
    await page.getByRole("button", { name: enCommon.more }).click();
    const lp = page.locator("#os-launchpad");
    await expect(lp).toBeVisible();
    await expect(lp.getByRole("button", { name: enGuide.explain })).toBeVisible();
    // Popovers close on navigation.
    await lp.getByRole("link", { name: enNav.blog }).click();
    await page.waitForURL(/\/en\/blog$/);
    await expect(lp).toBeHidden();
  });
});

test.describe("boot", () => {
  test("data-booted after load; no replay after a soft navigation to /login", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/en");
    await page.waitForLoadState("load");
    await page.waitForTimeout(1200);
    await expect(page.locator("html")).toHaveAttribute("data-booted", "");
    await page.evaluate(() => ((window as unknown as { __same: number }).__same = 1));
    const dock = page.getByRole("navigation", { name: enCommon.dock });
    await Promise.all([
      page.waitForURL(/\/en\/login$/),
      dock.getByRole("link", { name: enCommon.signIn }).click(),
    ]);
    await expect(page.locator("#email")).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __same?: number }).__same)).toBe(1);
    expect(await menuBar(page).evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  });
});

test.describe("layout", () => {
  for (const path of ["/", "/en", "/en/work", "/login"]) {
    test(`no horizontal overflow at 375px on ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(path);
      await page.waitForLoadState("load");
      const { sw, cw } = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      expect(sw).toBeLessThanOrEqual(cw);
    });
  }
});
