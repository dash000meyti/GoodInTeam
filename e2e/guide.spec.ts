/**
 * The site guide, "virtual me" (spec §10, §17): lazy engine, placement on
 * box roofs, the first box speaking into its decor cell, the rail perch,
 * mute + explicit mode, reduced motion, keyboard, and compact mode.
 *
 * Every test sets `gt-guide-test=1` (under `navigator.webdriver` the loader
 * otherwise never boots the automatic guide) and runs at 1440×900 (desktop
 * mode) unless noted. It targets only the foundation contract of §15.1
 * (`[data-guide]`, ids, `--chrome-top`/`--dock-space`), so it runs before and
 * after the home rewrite; the greeting and first-box cases need the
 * rewritten hero's reserved roof and skip without it.
 *
 *   BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/guide.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";
import { guide as en } from "../src/i18n/messages/en/guide";
import { guide as fa } from "../src/i18n/messages/fa/guide";

const ROOF = "section#top.frame-box[data-first]";

/** The formatted greeting: the template with any owner name, or the no-name line. */
const greetingRe = (tpl: string, noName: string) => {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const [a, b] = tpl.split("{owner}");
  return new RegExp(`^(?:${esc(a!)}.+${esc(b!)}|${esc(noName)})$`);
};

async function setup(page: Page, { greeted = true } = {}) {
  await page.addInitScript((g) => {
    localStorage.setItem("gt-guide-test", "1");
    if (g) sessionStorage.setItem("gt-guide-greeted", "1");
  }, greeted);
}

const engine = (page: Page) =>
  expect(page.locator('#gt-guide[data-engine="gt-guide-engine@1"]')).toBeAttached({
    timeout: 15_000,
  });

const rect = (page: Page, sel: string) =>
  page
    .locator(sel)
    .first()
    .evaluate((e) => {
      const r = e.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    });

const chromeTop = (page: Page) =>
  page.evaluate(() =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--chrome-top")),
  );

/** Scroll so `[data-guide=key]`'s top sits at `y` px from the viewport top. */
const scrollBoxTo = (page: Page, key: string, y: number | "band") =>
  page.evaluate(
    ([k, at]) => {
      const el = document.querySelector(`[data-guide="${k}"]`)!;
      const top = at === "band" ? innerHeight * 0.4 : Number(at);
      scrollTo({ top: scrollY + el.getBoundingClientRect().top - top, behavior: "instant" });
    },
    [key, y] as const,
  );

const bubble = (page: Page) => page.locator("#gt-guide-bubble");
const sprite = (page: Page) => page.locator("#gt-guide .gt-guide-sprite");

test.use({ viewport: { width: 1440, height: 900 } });

test("chrome variables are finite px and the engine boots after load", async ({ page }) => {
  await setup(page);
  await page.goto("/en");
  const vars = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return [cs.getPropertyValue("--chrome-top"), cs.getPropertyValue("--dock-space")];
  });
  for (const v of vars) {
    expect(v.trim()).toMatch(/^\d+(\.\d+)?px$/);
    expect(Number.isFinite(parseFloat(v))).toBe(true);
  }
  await engine(page);
  await expect(page.locator("#gt-guide")).not.toHaveAttribute("hidden");
  // the engine writes frame state to the sprite's svg only, never to the layer
  await expect(page.locator("#gt-guide")).not.toHaveAttribute("data-state");
  await expect(page.locator("#gt-guide svg.px-sprite")).toHaveAttribute("data-state", /.+/);
});

test("greeting stands on the first box's roof, inside the painted desktop", async ({ page }) => {
  await setup(page, { greeted: false });
  await page.goto("/en");
  test.skip(!(await page.locator(ROOF).count()), "needs the home rewrite's reserved roof");
  await engine(page);
  await expect(bubble(page).locator(".gt-guide-text")).toHaveText(
    greetingRe(en.greeting, en.greetingNoName),
  );
  await expect(bubble(page)).toBeVisible();
  const [box, spr, desk] = await Promise.all([
    rect(page, ROOF),
    rect(page, "#gt-guide .gt-guide-sprite"),
    rect(page, ".os-desktop"),
  ]);
  expect(Math.abs(spr.bottom - box.top)).toBeLessThanOrEqual(2);
  expect(spr.top).toBeGreaterThanOrEqual(desk.top);
  expect(box.top).toBeGreaterThanOrEqual(desk.top + 56 - 0.5);
  expect(await page.evaluate(() => sessionStorage.getItem("gt-guide-greeted"))).toBe("1");
});

test("first box speaks into its decor cell (candidate B)", async ({ page }) => {
  await setup(page);
  await page.goto("/");
  test.skip(!(await page.locator(ROOF).count()), "needs the home rewrite's reserved roof");
  await engine(page);
  const say = await page.locator('[data-guide="home_hero"]').getAttribute("data-guide-say");
  await expect(bubble(page).locator(".gt-guide-text")).toHaveText(say!);
  await expect(bubble(page)).toBeVisible();
  const b = await rect(page, "#gt-guide-bubble");
  const decor = await page.evaluate(
    ({ x, y }) => {
      const cell = document
        .elementsFromPoint(x, y)
        .find((e) => !e.closest("#gt-guide"))
        ?.closest(".frame-cell[data-decor]");
      const r = cell?.getBoundingClientRect();
      return r && { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    },
    { x: b.left + 4, y: b.top + 4 },
  );
  expect(decor).toBeTruthy();
  expect(b.top).toBeGreaterThanOrEqual(decor!.top - 0.5);
  expect(b.bottom).toBeLessThanOrEqual(decor!.bottom + 0.5);
  expect(b.left).toBeGreaterThanOrEqual(decor!.left - 0.5);
  expect(b.right).toBeLessThanOrEqual(decor!.right + 0.5);
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("gt-guide-seen")))
    .toContain("/#home_hero");
});

test("a section in the activation band speaks above its roof (candidate A)", async ({ page }) => {
  await setup(page);
  await page.goto("/en");
  await engine(page);
  await scrollBoxTo(page, "home_work", "band");
  const say = await page.locator('[data-guide="home_work"]').getAttribute("data-guide-say");
  await expect(bubble(page).locator(".gt-guide-text")).toHaveText(say!, { timeout: 10_000 });
  await expect(bubble(page)).toBeVisible();
  await expect(page.locator("#gt-guide")).toHaveAttribute("data-perch", "roof");
  const [b, box, spr] = await Promise.all([
    rect(page, "#gt-guide-bubble"),
    rect(page, '[data-guide="home_work"]'),
    rect(page, "#gt-guide .gt-guide-sprite"),
  ]);
  expect(b.bottom).toBeLessThan(box.top);
  expect(b.bottom).toBeLessThanOrEqual(spr.top); // above the sprite's head, never over it
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("gt-guide-seen")))
    .toContain("/en#home_work");
});

test("a roof hidden under the menu bar moves the sprite to the rail, with a badge and no bubble", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/en");
  await engine(page);
  // First let the next box speak from its roof (clears the badge), then come back up.
  await scrollBoxTo(page, "home_services", "band");
  await expect(page.locator("#gt-guide")).toHaveAttribute("data-perch", "roof", {
    timeout: 10_000,
  });
  await expect(bubble(page)).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("#gt-guide")).not.toHaveAttribute("data-badge");
  await scrollBoxTo(page, "home_work", 40);
  await expect(page.locator("#gt-guide")).toHaveAttribute("data-badge", "", { timeout: 10_000 });
  await expect(page.locator("#gt-guide")).toHaveAttribute("data-perch", /^(rail|out)$/);
  await expect(bubble(page)).toBeHidden();
  const top = await chromeTop(page);
  await expect
    .poll(async () => Math.round((await rect(page, "#gt-guide .gt-guide-sprite")).top))
    .toBe(Math.round(top + 24));
  expect(await page.evaluate(() => sessionStorage.getItem("gt-guide-seen") ?? "")).not.toContain(
    "home_work",
  );
});

test("Hide persists; explain still works while muted and hides the layer again", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/en");
  await engine(page);
  await page.evaluate(() =>
    dispatchEvent(new CustomEvent("gt:guide", { detail: { type: "explain" } })),
  );
  await expect(bubble(page)).toBeVisible();
  await bubble(page).getByRole("button", { name: en.hide }).click();
  await expect(page.locator("#gt-guide")).toHaveAttribute("hidden", "");
  expect(await page.evaluate(() => localStorage.getItem("gt-guide"))).toBe("off");

  await page.reload();
  await page.waitForLoadState("load");
  await page.waitForTimeout(2000);
  // muted: the automatic engine never loaded
  await expect(page.locator("#gt-guide")).toHaveAttribute("hidden", "");
  await expect(page.locator("#gt-guide")).not.toHaveAttribute("data-engine");

  await page.evaluate(() =>
    dispatchEvent(new CustomEvent("gt:guide", { detail: { type: "explain" } })),
  );
  await expect(bubble(page)).toBeVisible();
  await expect(page.locator("#gt-guide")).not.toHaveAttribute("hidden");
  await expect(page.locator("#gt-guide-live")).not.toBeEmpty();
  await page.keyboard.press("Escape");
  await expect(page.locator("#gt-guide")).toHaveAttribute("hidden", "");
  expect(await page.evaluate(() => localStorage.getItem("gt-guide"))).toBe("off");
});

test("the sprite button toggles aria-expanded; Esc closes and returns focus", async ({ page }) => {
  await setup(page);
  await page.goto("/en");
  await engine(page);
  await scrollBoxTo(page, "home_work", "band");
  await expect(page.locator("#gt-guide")).toHaveAttribute("data-perch", "roof", {
    timeout: 10_000,
  });
  await expect(sprite(page)).toBeVisible();
  await expect(sprite(page)).toHaveAttribute("aria-expanded", "false");
  await sprite(page).click();
  await expect(sprite(page)).toHaveAttribute("aria-expanded", "true");
  await expect(bubble(page)).toBeVisible();
  await expect(bubble(page)).toHaveAttribute("role", "group");
  await expect(bubble(page).getByRole("button", { name: en.hide })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(bubble(page)).toBeHidden();
  await expect(sprite(page)).toHaveAttribute("aria-expanded", "false");
  await expect(sprite(page)).toBeFocused();
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the sprite never walks; frames stay static", async ({ page }) => {
    await setup(page);
    await page.goto("/en");
    await engine(page);
    await page.evaluate(() => {
      const w = window as unknown as { states: string[] };
      w.states = [];
      const svg = document.querySelector("#gt-guide svg.px-sprite")!;
      new MutationObserver(() => w.states.push(svg.getAttribute("data-state") ?? "")).observe(svg, {
        attributeFilter: ["data-state"],
      });
    });
    for (const key of ["home_work", "home_services", "home_process"]) {
      await scrollBoxTo(page, key, "band");
      await page.waitForTimeout(1500);
    }
    const states = await page.evaluate(() => (window as unknown as { states: string[] }).states);
    expect(states.length).toBeGreaterThan(0);
    expect(states).not.toContain("walk");
    await expect(page.locator("#gt-guide")).not.toHaveAttribute("data-state");
  });
});

test.describe("compact mode (390×844)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("one-time compact greeting, pinned sprite, no automatic bubble", async ({ page }) => {
    await setup(page, { greeted: false });
    await page.goto("/");
    await engine(page);
    await expect(page.locator("#gt-guide")).toHaveAttribute("data-compact", "");
    await expect(bubble(page).locator(".gt-guide-text")).toHaveText(
      greetingRe(fa.greetingCompact, fa.greetingCompactNoName),
    );
    await expect(bubble(page)).toBeVisible();
    // it closes by itself after 4s of text
    await expect(bubble(page)).toBeHidden({ timeout: 10_000 });

    const width = await sprite(page).evaluate((e) => e.getBoundingClientRect().width);
    expect(width).toBe(32); // 16 cells × 2px
    const before = await rect(page, "#gt-guide .gt-guide-sprite");
    await scrollBoxTo(page, "home_work", "band");
    await page.waitForTimeout(1600);
    const after = await rect(page, "#gt-guide .gt-guide-sprite");
    expect(after).toEqual(before);
    await expect(bubble(page)).toBeHidden();
    await expect(page.locator("#gt-guide")).toHaveAttribute("data-badge", "");

    // a tap explains the active part in a fixed bubble above the sprite
    await sprite(page).click();
    await expect(bubble(page)).toBeVisible();
    const say = await page.locator('[data-guide="home_work"]').getAttribute("data-guide-say");
    await expect(bubble(page).locator(".gt-guide-text")).toHaveText(say!);
    const b = await rect(page, "#gt-guide-bubble");
    expect(b.bottom).toBeLessThanOrEqual(after.top);
  });
});
