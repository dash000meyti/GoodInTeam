/**
 * Framed pages of the projects track (projects, clients, inbox, contracts and
 * the public status page): the page box with its strip, cells sharing one
 * grid instead of floating cards, the project tab strip inside the page box,
 * role-specific tabs, and no horizontal page overflow at 390px.
 *
 * Needs a running app with the demo data (`pnpm db:reset && pnpm db:seed`):
 *   BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/panel-frames-projects.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "goodteam-demo-pass";
const OWNER = "owner@goodteam.local";
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

const pageBox = (page: Page) =>
  page.locator("main header.frame-box[data-density=compact]:visible").first();

/** The first project's detail URL, from the framed list (ids differ per seed). */
async function firstProjectUrl(page: Page) {
  await page.goto("/en/panel/projects");
  const link = page.locator("main section.frame-box .frame-cell h2 a").first();
  await expect(link).toBeVisible();
  return (await link.getAttribute("href"))!;
}

test.describe("projects track: framed pages", () => {
  test("projects list: the page box, then project cells sharing one framed grid", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, OWNER);
    await page.goto("/en/panel/projects");
    const header = pageBox(page);
    await expect(header.locator(".frame-strip")).toBeVisible();
    await expect(header.locator("h1")).toHaveText("Projects");

    const list = page.locator("main section.frame-box[aria-label=Projects]");
    await expect(list).toBeVisible();
    const cells = list.locator(".frame-grid > article.frame-cell");
    expect(await cells.count()).toBeGreaterThanOrEqual(3);
    // Cells are square and flat: no radius, no shadow (not floating cards).
    const style = await cells.first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return { radius: cs.borderTopLeftRadius, shadow: cs.boxShadow };
    });
    expect(style).toEqual({ radius: "0px", shadow: "none" });
    // No card component left inside the list box.
    await expect(list.locator("[data-slot=card]")).toHaveCount(0);
  });

  test("project detail: stats and the tab strip are rows of the page box", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, OWNER);
    await page.goto(await firstProjectUrl(page));
    const header = pageBox(page);
    await expect(header.getByRole("tablist")).toBeVisible();
    await expect(header.getByRole("tab", { name: "Client portal" })).toBeVisible();
    // Overview content is its own framed box after the page box.
    await expect(page.locator("main h2#pj-description")).toBeVisible();
    await header.getByRole("tab", { name: "Updates" }).click();
    await expect(page.locator("main section.frame-box[aria-label=Updates]")).toBeVisible();
  });

  test("client view: the same framed detail without admin-only tabs", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, CLIENT);
    await page.goto(await firstProjectUrl(page));
    const header = pageBox(page);
    await expect(header.getByRole("tablist")).toBeVisible();
    await expect(header.getByRole("tab", { name: "Overview" })).toBeVisible();
    await expect(header.getByRole("tab", { name: "Client portal" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
  });

  test("contracts: KPIs are cells of the page box, the list is one box", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, OWNER);
    await page.goto("/en/panel/contracts");
    const header = pageBox(page);
    // header cell + 3 KPI cells (the decor and filler cells aside)
    await expect(header.locator(".frame-grid > .frame-cell:not([data-decor])")).toHaveCount(4);
    const list = page.locator("main section.frame-box[aria-label='Contracts & approvals']");
    await expect(list.getByRole("navigation")).toBeVisible();
    await expect(list.locator("table")).toBeVisible();
  });

  test("no horizontal overflow at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, OWNER);
    const project = await firstProjectUrl(page);
    await page.goto(`${project}?tab=portal`);
    const shareInput = page.locator("main input[readonly]").first();
    const statusUrl = (await shareInput.count()) ? await shareInput.inputValue() : null;
    const paths = [
      "/en/panel/projects",
      project,
      `${project}?tab=updates`,
      "/en/panel/clients",
      "/en/panel/inbox",
      "/en/panel/contracts",
      "/en/panel/contracts?tab=templates",
      "/panel/contracts",
      ...(statusUrl ? [new URL(statusUrl).pathname] : []),
    ];
    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator("main h1:visible").first()).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
