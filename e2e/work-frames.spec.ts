/**
 * Time, Calendar and Tasks in the frame language (docs/design-system.md
 * "Frame (site and panel)"): the page box with its strip and KPI cells, the
 * modules' framed boxes (square, one hairline, no shadow), the calendar's
 * keyboard shortcuts and the board inside the tasks box, and no horizontal
 * page overflow at 390px (wide grids scroll inside their box).
 *
 * Needs a running app with the demo data (`pnpm db:reset && pnpm db:seed`):
 *   BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/work-frames.spec.ts
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

/** A framed box at panel density: square corners, one 1px hairline, no shadow. */
async function expectFramed(box: Locator) {
  await expect(box).toHaveClass(/\bframe-box\b/);
  await expect(box).toHaveAttribute("data-density", "compact");
  const style = await box.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, border: cs.borderTopWidth };
  });
  expect(style).toEqual({ radius: "0px", shadow: "none", border: "1px" });
}

const pageBox = (page: Page) =>
  page.locator("main header.frame-box[data-density=compact]:visible").first();

test.describe("framed Time, Calendar and Tasks", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("time: page box strip + KPI cells, tracker and timeline boxes", async ({ page }) => {
    await login(page, OWNER);
    await page.goto("/en/panel/time");
    const header = pageBox(page);
    await expectFramed(header);
    await expect(header.locator(".frame-strip")).toBeVisible();
    await expect(header.locator("h1")).toHaveText("Time tracking");
    // header cell + 4 KPI cells share the page box's hairlines (decor and fillers aside)
    await expect(header.locator(".frame-grid > .frame-cell:not([data-decor])")).toHaveCount(5);

    const tracker = page.getByRole("region", { name: "What are you working on?" });
    await expectFramed(tracker);
    await expect(tracker.getByRole("textbox", { name: "What are you working on?" })).toBeVisible();

    const timeline = page.getByRole("region", { name: "Time entries" });
    await expectFramed(timeline);
    // one section per day, each a cell of the same box with edge-to-edge rows
    await expect(timeline.locator(".frame-grid > section.frame-cell").first()).toBeVisible();
    await expect(timeline.locator("li").first()).toBeVisible();
  });

  test("timesheet and reports: KPIs in the page box, content in framed boxes", async ({ page }) => {
    await login(page, MEMBER);
    await page.goto("/en/panel/time/timesheet");
    await expect(pageBox(page).locator("h1")).toHaveText("Timesheet");
    await expect(pageBox(page).locator(".frame-grid > .frame-cell:not([data-decor])")).toHaveCount(
      5,
    );
    const sheet = page.getByRole("region", { name: "Timesheet" });
    await expectFramed(sheet);
    await expect(sheet.locator("table")).toBeVisible();

    await page.goto("/en/panel/time/reports");
    const header = pageBox(page);
    await expect(header.locator("h1")).toHaveText("Reports");
    // the range chips are a row of the page box
    await expect(header.getByRole("radio", { name: "This week" })).toHaveAttribute(
      "data-state",
      "on",
    );
  });

  test("calendar: one box with the view and the side cell; shortcuts still work", async ({
    page,
  }) => {
    await login(page, OWNER);
    await page.goto("/en/panel/calendar");
    const cal = page.getByRole("region", { name: "Calendar" });
    await expectFramed(cal);
    const views = cal.getByRole("navigation", { name: "View" });
    await expect(views.getByRole("link")).toHaveCount(4);
    await expect(views.getByRole("link", { name: "Month" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(cal.getByRole("heading", { name: "Next 7 days" })).toBeVisible();

    // W switches to the week grid (layout-independent key codes), inside the same box.
    await page.locator("body").press("w");
    await expect(page).toHaveURL(/view=week/);
    await expect(
      page.getByRole("region", { name: "Calendar" }).getByRole("navigation", { name: "View" }),
    ).toBeVisible();
    await expect(views.getByRole("link", { name: "Week" })).toHaveAttribute("aria-current", "page");
  });

  test("tasks: quick add, lists and board share one framed box", async ({ page }) => {
    await login(page, OWNER);
    await page.goto("/en/panel/tasks");
    const box = page.getByRole("region", { name: "Tasks & reminders" });
    await expectFramed(box);
    await expect(box.getByRole("textbox", { name: "Quick add task" })).toBeVisible();
    await expect(box.getByRole("button", { name: /^Today\b/ }).last()).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.getByRole("radio", { name: "Board" }).click();
    await expect(page).toHaveURL(/view=board/);
    for (const column of ["To do", "In progress", "Waiting", "Done"])
      await expect(box.getByRole("region", { name: column, exact: true })).toBeVisible();
    const card = box.locator("article[draggable=true]").first();
    await expect(card).toBeVisible();
    const radius = await card.evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
    expect(radius).toBe("0px");
  });

  test("no horizontal overflow at 390px; the timesheet grid scrolls inside its box", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, OWNER);
    for (const path of [
      "/en/panel/time",
      "/en/panel/time/timesheet",
      "/en/panel/time/reports",
      "/en/panel/calendar",
      "/en/panel/calendar?view=week",
      "/en/panel/calendar/commitments",
      "/en/panel/tasks",
      "/en/panel/tasks?view=board",
      "/panel/time",
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1:visible").first()).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }

    await page.goto("/en/panel/time/timesheet");
    const scroller = page.getByRole("region", { name: "Timesheet" }).locator("table").locator("..");
    const widths = await scroller.evaluate((el) => ({
      scroll: el.scrollWidth,
      client: el.clientWidth,
    }));
    expect(widths.scroll).toBeGreaterThan(widths.client);
  });
});
