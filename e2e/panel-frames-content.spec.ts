/**
 * Framed docs, content and media pages (the site's frame language at panel
 * density): the page box with its strip, square hairline boxes, the docs
 * tree as a framed box, editors as ONE box whose columns share a hairline,
 * the editors' keyboard behaviour, no horizontal overflow at 390px.
 *
 * Needs a running app with the demo data (`pnpm db:reset && pnpm db:seed`):
 *   BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/panel-frames-content.spec.ts
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

const PASSWORD = "goodteam-demo-pass";
const OWNER = "owner@goodteam.local";
const MEMBER = "sara@goodteam.local";

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

/** A framed box: square, one even 1px hairline, no shadow. */
async function expectFramed(box: Locator) {
  const style = await box.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, border: cs.borderTopWidth };
  });
  expect(style).toEqual({ radius: "0px", shadow: "none", border: "1px" });
}

/** The two top-level cells of an editor box sit side by side and share one hairline. */
async function expectSharedColumns(editor: Locator) {
  const cols = editor.locator(":scope > .frame-grid > .frame-cell");
  await expect(cols).toHaveCount(2);
  const [a, b] = [await cols.nth(0).boundingBox(), await cols.nth(1).boundingBox()];
  expect(a && b).toBeTruthy();
  expect(Math.abs(a!.y - b!.y)).toBeLessThan(1);
  // LTR: the writing cell ends where the side cell starts (its end border is the shared line)
  expect(Math.abs(a!.x + a!.width - b!.x)).toBeLessThan(1);
}

test.describe("framed docs, content and media pages", () => {
  test("docs: the page box carries the counters; the tree is a framed box beside it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, OWNER);
    await page.goto("/en/panel/docs");
    const box = pageBox(page);
    await expect(box.locator(".frame-strip")).toBeVisible();
    await expect(box.locator("h1")).toHaveText("Docs");
    await expectFramed(box);
    // header cell + 4 counters share the box's hairlines (the decor cell aside)
    await expect(box.locator(".frame-grid > .frame-cell:not([data-decor])")).toHaveCount(5);
    const tree = page.locator("main aside .frame-box");
    await expect(tree.getByRole("tree", { name: "Pages" })).toBeVisible();
    await expectFramed(tree);
    // the toolbar box is for narrower screens only
    await expect(page.getByRole("button", { name: "Pages" })).toBeHidden();

    // a doc page: the article box keeps a readable .prose-gt column
    const recent = page.locator("main section[aria-labelledby=docs-recent] li a").first();
    await recent.click();
    await page.waitForURL(/\/panel\/docs\/[0-9a-z]{16}$/);
    const article = page.locator("main article.frame-box#doc-print");
    await expectFramed(article);
    const prose = article.locator(".prose-gt");
    await expect(prose).toBeVisible();
    const width = await prose.evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBeLessThanOrEqual(768);
  });

  test("editors are one framed box whose columns share a hairline; Ctrl+S still validates", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, OWNER);

    await page.goto("/en/panel/content/new?type=article");
    await expect(pageBox(page).locator("h1")).toHaveText("New Article");
    const postEditor = page.locator("main form > .frame-box");
    await expectFramed(postEditor);
    await expectSharedColumns(postEditor);
    // sections of a column share hairlines: one nested grid per section
    await expect(
      postEditor.locator(":scope > .frame-grid > .frame-cell").nth(1).locator("h2"),
    ).toContainText(["Publishing", "Details", "Cover image"]);

    await page.goto("/en/panel/docs/new");
    const docEditor = page.locator("main .frame-box", { has: page.locator("#doc-title") });
    await expectFramed(docEditor);
    await expectSharedColumns(docEditor);
    await page.keyboard.press("Control+s");
    await expect(docEditor.getByRole("alert")).toHaveText("Give the page a title.");
  });

  test("content and media lists are framed boxes with chip rows", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, OWNER);

    await page.goto("/en/panel/content");
    const box = pageBox(page);
    // the CMS sub-navigation is a chip row of the page box; the KPIs follow
    await expect(box.getByRole("navigation", { name: "Content" })).toBeVisible();
    await expect(box.getByRole("link", { name: "Posts" })).toHaveAttribute("aria-current", "page");
    const list = page.locator("main section.frame-box[aria-label=Posts]");
    await expectFramed(list);
    await expect(list.getByRole("textbox", { name: "Search" })).toBeVisible();
    await expect(list.locator("table")).toBeVisible();

    await page.goto("/en/panel/content/testimonials");
    const quotes = page.locator("main section.frame-box[aria-label=Testimonials] .frame-grid");
    // quotes are cells of ONE grid (dots fillers complete the last row)
    await expect(quotes.locator(":scope > article.frame-cell")).not.toHaveCount(0);

    await page.goto("/en/panel/media");
    const library = page.locator("main section.frame-box[aria-label='Media library']");
    await expectFramed(library);
    await expect(library.getByText("Drop files here or click to browse")).toBeVisible();
    await expect(library.getByRole("link", { name: "Images" })).toBeVisible();
  });

  test("no horizontal overflow at 390px; the docs toolbar box sits under the page box", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, OWNER);
    for (const path of [
      "/en/panel/docs",
      "/en/panel/docs/new",
      "/en/panel/docs/archive",
      "/en/panel/content",
      "/en/panel/content/new?type=work",
      "/en/panel/content/series",
      "/en/panel/content/testimonials",
      "/en/panel/media",
      "/panel/docs",
      "/panel/content",
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1:visible").first()).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }

    await page.goto("/en/panel/docs");
    const header = await pageBox(page).boundingBox();
    const pagesButton = page.getByRole("button", { name: "Pages" });
    await expect(pagesButton).toBeVisible();
    const bar = await pagesButton.boundingBox();
    expect(bar!.y).toBeGreaterThan(header!.y + header!.height);
    await pagesButton.click();
    await expect(page.getByRole("dialog").getByRole("tree", { name: "Pages" })).toBeVisible();
  });

  test("member: framed docs pages", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(page, MEMBER);
    await page.goto("/en/panel/docs");
    await expectFramed(pageBox(page));
    await expect(page.locator("main aside .frame-box").getByRole("tree")).toBeVisible();
    await page.goto("/en/panel/docs/archive");
    await expect(pageBox(page).locator("h1")).toHaveText("Archived pages");
  });
});
