/**
 * Panel OS shell (spec §11, §17): role dock, ⌘K, keyboard menu bar, the
 * role-neutral Brand menu, gt-shell prefs before hydration, the Time tile's
 * running count, auto-hide (desktop only) and the dock never covering content.
 *
 * Needs a running app with the demo data (`pnpm db:reset && pnpm db:seed`):
 *   BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/panel-shell.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "goodteam-demo-pass";
const OWNER = "owner@goodteam.local";
const MEMBER = "sara@goodteam.local";
const CLIENT = "client@acme-academy.ir";

async function login(page: Page, email: string) {
  await page.goto("/en/login");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.endsWith("/login")),
    page.press("#password", "Enter"),
  ]);
}

const dock = (page: Page) => page.getByRole("navigation", { name: "Main menu" });

test.describe("role dock", () => {
  for (const [email, apps] of [
    [OWNER, 16],
    [MEMBER, 9],
    [CLIENT, 5],
  ] as const) {
    test(`${email}: ${apps} dock apps, dashboard once, Brand menu starts with Desktop`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await login(page, email);
      await page.goto("/en/panel");
      const nav = dock(page);
      await expect(nav.locator("[data-dock-app]")).toHaveCount(apps);
      // The overview item (dashboard / portal) is the mark tile only — never a group too.
      await expect(nav.locator('[data-dock-app][href="/en/panel"]')).toHaveCount(1);
      // Plus the Me tile (named by its visible label) and View site, which are not apps.
      await expect(nav.getByRole("button", { name: "Virtual me" })).toBeVisible();
      await expect(nav.getByRole("link", { name: /^View site/ })).toBeVisible();
      if (email === CLIENT) {
        for (const staff of ["time", "calendar", "tasks", "clients", "finance", "docs", "vault"])
          await expect(nav.locator(`a[href="/en/panel/${staff}"]`)).toHaveCount(0);
      }
      // No always-mounted dialog in the chrome.
      await expect(page.getByRole("dialog")).toHaveCount(0);

      // Brand menu: role-neutral, "Desktop" first.
      await page.getByRole("menuitem", { name: "Good In menu" }).click();
      await expect(page.getByRole("menu").getByRole("menuitem").first()).toHaveText("Desktop");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("menu")).toHaveCount(0);
    });
  }
});

test("⌘K / Ctrl+K opens the command palette", async ({ page }) => {
  await login(page, MEMBER);
  await page.goto("/en/panel");
  await expect(dock(page)).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog", { name: "Commands" });
  await expect(palette).toBeVisible();
  await expect(palette.getByRole("option", { name: /Time tracking/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("the menu bar is keyboard-operable (Radix menubar)", async ({ page, browserName }) => {
  // Safari moves to links and buttons with Option+Tab only (Tab reaches text fields alone).
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, OWNER);
  await page.goto("/en/panel");
  // The navigation menus stream into the menu bar's session hole.
  await expect(page.getByRole("menuitem", { name: "Work", exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
  // Tab order: skip link → the menu bar (one roving tab stop).
  await page.keyboard.press(tab);
  await expect(page.locator(":focus")).toHaveAttribute("href", "#main");
  await page.keyboard.press(tab);
  await expect(page.locator(":focus")).toHaveAccessibleName("Good In menu");
  // Radix moves roving focus on the next tick: wait for each move before the next key.
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(":focus")).toHaveText("Desktop"); // App menu (current app, /panel = Desktop)
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(":focus")).toHaveText("Work"); // first navigation menu
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  await expect(menu.getByRole("menuitem").first()).toHaveText("Time tracking");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/panel\/time$/);
  await expect(dock(page).locator('[data-dock-app][href="/en/panel/time"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("gt-shell prefs are applied before hydration", async ({ page, context }) => {
  await login(page, MEMBER);
  await context.addCookies([{ name: "gt-shell", value: "56.1.1.1", url: page.url() }]);
  // No JavaScript bundle runs: only the inline pre-paint script can set the attributes.
  await page.route(/\/_next\/static\/.*\.js(\?.*)?$/, (route) => route.abort());
  await page.goto("/en/panel");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-dock-size", "56");
  await expect(html).toHaveAttribute("data-dock-autohide", "");
  await expect(html).toHaveAttribute("data-window-wide", "");
  const pref = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--dock-pref").trim(),
  );
  expect(pref).toBe("56px");
});

/** Stops every running timer of the signed-in user from the menu-bar pill. */
async function stopAllTimers(page: Page) {
  const pill = page.getByRole("button", { name: /^\d+ running$/ });
  if (!(await pill.count())) return;
  await pill.click();
  const pop = page.getByRole("dialog");
  const all = pop.getByRole("button", { name: "Stop all", exact: true });
  if (await all.count()) await all.click();
  else await pop.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(pill).toHaveCount(0);
  await page.keyboard.press("Escape");
}

test("the Time tile's accessible name includes the running count", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, MEMBER);
  await page.goto("/en/panel");
  // The desktop tile (the 390px tab bar has a short-label twin without data-dock-app).
  const time = dock(page).locator('[data-dock-app][href="/en/panel/time"]');
  await expect(time).toBeVisible();
  await page.waitForLoadState("networkidle");
  await stopAllTimers(page);
  await expect(time).toHaveAccessibleName("Time tracking");

  try {
    await page.getByRole("button", { name: "Quick start", exact: true }).click();
    const pop = page.getByRole("dialog");
    await pop.getByRole("textbox", { name: "What are you working on?" }).fill("e2e dock timer");
    await pop.getByRole("button", { name: "Start", exact: true }).click();
    // The label bubble is its own box on desktop, so the name may read "Time tracking , 1 running".
    await expect(time).toHaveAccessibleName(/^Time tracking ?, 1 running$/);
    await expect(time).toHaveAttribute("data-running", "");
    await page.keyboard.press("Escape");
  } finally {
    await stopAllTimers(page);
  }
  await expect(time).toHaveAccessibleName("Time tracking");
  await expect(time).not.toHaveAttribute("data-running", "");
});

test("auto-hide hides the desktop dock but never the mobile tab bar", async ({ page, context }) => {
  await login(page, MEMBER);
  await context.addCookies([{ name: "gt-shell", value: "48.1.1.0", url: page.url() }]);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en/panel");
  const list = dock(page).locator(".os-dock-list");
  await expect(list).toBeAttached();
  await expect
    .poll(async () => (await list.boundingBox())?.y ?? 0, { message: "dock off-screen" })
    .toBeGreaterThanOrEqual(900);
  // The 8px hot strip at the bottom edge reveals it.
  await page.mouse.move(720, 897);
  await expect
    .poll(async () => {
      const b = await list.boundingBox();
      return b ? b.y + b.height : 9999;
    })
    .toBeLessThanOrEqual(900);

  await page.mouse.move(720, 300);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/panel");
  const bar = dock(page).locator(".os-dock-list");
  await expect(bar).toBeVisible();
  const box = (await bar.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  expect(box.y + box.height).toBeGreaterThan(844 - 24);
  await expect(dock(page).getByRole("link", { name: /^Time\b/ })).toBeInViewport();
});

test("at 1280×720 the dock never covers the last vault button", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await login(page, MEMBER);
  await page.goto("/en/panel/vault");
  const last = page.locator("main button:visible").last();
  await expect(last).toBeVisible();
  await last.scrollIntoViewIfNeeded();
  // A trial click fails when another element (the dock) intercepts pointer events.
  await last.click({ trial: true });
});
