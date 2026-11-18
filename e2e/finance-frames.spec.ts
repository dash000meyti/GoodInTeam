/**
 * Finance & invoices in the frame language (docs/design-system.md "Panel
 * density"): the page box carries the strip, the finance nav and the KPI row;
 * content sits in square hairline boxes whose parts are cells sharing
 * hairlines; nothing overflows a 390px phone; the public invoice is a site box
 * on the desktop wallpaper.
 *
 * Needs a running app with the demo data (`pnpm db:reset && pnpm db:seed`):
 *   BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/finance-frames.spec.ts
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

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

/** Square, one even hairline, no shadow: a frame box (never a floating card). */
async function expectFramed(box: Locator) {
  const style = await box.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, border: cs.borderTopWidth };
  });
  expect(style).toEqual({ radius: "0px", shadow: "none", border: "1px" });
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test.describe("finance pages (framed)", () => {
  test("overview: strip, finance nav and KPIs share the page box; the analytics are one box", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, OWNER);
    await page.goto("/en/panel/finance");

    const header = page.locator("main header.frame-box[data-density=compact]:visible").first();
    await expect(header.locator(".frame-strip")).toBeVisible();
    await expect(header.locator("h1")).toHaveText("Finance");
    const nav = header.getByRole("navigation", { name: "Finance" });
    await expect(nav.getByRole("link")).toHaveCount(6);
    await expect(nav.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // header cell + nav row + 4 KPI cells (the decor cell aside): one grid family, no cards
    await expect(header.locator(".frame-grid > .frame-cell:not([data-decor])")).toHaveCount(6);

    const boxes = page.locator("main .frame-box[data-density=compact]:visible");
    expect(await boxes.count()).toBeGreaterThanOrEqual(3);
    for (const box of await boxes.all()) await expectFramed(box);

    // cash flow, account balances, by category, top clients, unpaid invoices: cells of one box
    const analytics = page.locator("main .frame-box", { has: page.locator("#fin-cashflow") });
    await expect(analytics).toHaveCount(1);
    await expect(analytics.locator("section.frame-cell[aria-labelledby]")).toHaveCount(5);
    // the chart's grid lines are the frame hairline
    await expect(analytics.locator(".recharts-cartesian-grid line").first()).toHaveAttribute(
      "stroke",
      "var(--frame-line)",
    );
  });

  test("transactions: one list box — filter toolbar, totals row, edge-to-edge table, pager", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, OWNER);
    await page.goto("/en/panel/finance/transactions");

    const list = page.locator("main section.frame-box[aria-label=Transactions]");
    await expectFramed(list);
    await expect(list.getByRole("textbox", { name: "Search" })).toBeVisible();
    await expect(list.locator("dl.frame-grid > .frame-cell")).toHaveCount(3);
    await expect(list.locator("table tbody tr").first()).toBeVisible();
    // the table runs edge to edge: its cell has no padding
    await expect(list.locator(".frame-cell[data-pad=none]:has(table)")).toHaveCount(1);
  });

  test("no horizontal overflow at 390px (wide tables scroll inside their box)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, OWNER);
    for (const path of [
      "/en/panel/finance",
      "/panel/finance",
      "/en/panel/finance/transactions",
      "/en/panel/finance/accounts",
      "/en/panel/finance/categories",
      "/en/panel/finance/ledgers",
      "/en/panel/finance/ledgers?tab=projects",
      "/en/panel/finance/rates",
      "/en/panel/invoices/new",
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1:visible").first()).toBeVisible();
      expect(await horizontalOverflow(page), path).toBeLessThanOrEqual(0);
    }
    // an account statement (exact amounts in the KPI row)
    await page.goto("/en/panel/finance/accounts");
    await page.locator("main article a").first().click();
    await page.waitForURL(/\/panel\/finance\/accounts\/[^/]+$/);
    await expect(page.locator("main h1:visible").first()).toBeVisible();
    expect(await horizontalOverflow(page), "account statement").toBeLessThanOrEqual(0);
  });

  test("client: the project's invoices and payments are one framed box", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, CLIENT);
    await page.goto("/en/panel");
    await page.locator("main .frame-cell h2 a").first().click();
    await page.waitForURL(/\/panel\/projects\/[^/?]+/);
    await page.goto(`${new URL(page.url()).pathname}?tab=finance`);
    const box = page.locator("main section.frame-box[aria-label='Invoices & payments']");
    await expect(box).toBeVisible();
    await expectFramed(box);
    // totals row (3 cells) + invoices | payments
    await expect(box.locator("dl.frame-grid > .frame-cell")).toHaveCount(3);
    await expect(box.locator("section.frame-cell[aria-labelledby]")).toHaveCount(3);
  });
});

test.describe("public invoice (site frame)", () => {
  test("a site box on the wallpaper: strip, title, the paper; no overflow at 390px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Staff views never count as the client's view, so the demo data stays as seeded.
    await login(page, OWNER);
    await page.goto("/en/panel/invoices");
    await page.getByRole("link", { name: "GT-1405-002" }).click();
    await page.waitForURL(/\/panel\/invoices\/[^/]+$/);
    const link = await page.getByRole("textbox", { name: "Invoice link" }).inputValue();
    const path = new URL(link).pathname;

    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const box = page.locator(".os-desktop main section.frame-box[data-first]");
      await expect(box).toBeVisible();
      await expect(box.locator(".frame-strip")).toBeVisible();
      await expect(box.locator("h1")).toContainText("GT-1405-002");
      await expect(box.locator("#invoice-doc")).toBeVisible();
      expect(await horizontalOverflow(page), `${path} @${width}`).toBeLessThanOrEqual(0);
    }
  });
});
