/**
 * GoodInBot, the site guide (spec §10, §17; the anchor model of 2026-11-18):
 * the bot emerges from the top or bottom edge of the active box (or from under
 * the menu bar on a tall box, or from the dock in compact mode) and never
 * travels; its bubble sits beside it and types its line while it talks.
 *
 * Every test sets `gt-guide-test=1` (under `navigator.webdriver` the loader
 * otherwise never boots the automatic guide) and runs at 1440×900 (desktop
 * mode) unless noted. It targets the foundation contract of §15.1
 * (`[data-guide]`, ids, `--chrome-top`/`--dock-space`) plus the home hero's
 * reserved roof (`section#top.frame-box[data-first]`, home.spec).
 *
 *   BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/guide.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";
import { guide as en } from "../src/i18n/messages/en/guide";
import { guide as fa } from "../src/i18n/messages/fa/guide";

const ROOF = "section#top.frame-box[data-first]";
const HOME = [
  "home_hero",
  "home_brands",
  "home_trust",
  "home_work",
  "home_services",
  "home_process",
  "home_stats",
  "home_latest",
  "home_testimonials",
  "home_cta",
  "footer",
];

/** The formatted greeting: the template with any owner name, or the no-name line. */
const greetingRe = (tpl: string, noName: string) => {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const [a, b] = tpl.split("{owner}");
  return new RegExp(`^(?:${esc(a!)}.+${esc(b!)}|${esc(noName)})$`);
};

/** `seen`: home keys whose lines count as already spoken (`path#key` in gt-guide-seen). */
async function setup(page: Page, { greeted = true, seen = [] as string[], path = "/en" } = {}) {
  await page.addInitScript(
    ([g, s, p]) => {
      localStorage.setItem("gt-guide-test", "1");
      if (g) sessionStorage.setItem("gt-guide-greeted", "1");
      if ((s as string[]).length)
        sessionStorage.setItem(
          "gt-guide-seen",
          JSON.stringify((s as string[]).map((k) => `${p}#${k}`)),
        );
    },
    [greeted, seen, path] as const,
  );
}

const engine = (page: Page) =>
  expect(page.locator('#gt-guide[data-engine="gt-guide-engine@1"]')).toBeAttached({
    timeout: 15_000,
  });

type Rect = { top: number; bottom: number; left: number; right: number };
const rect = (page: Page, sel: string): Promise<Rect> =>
  page
    .locator(sel)
    .first()
    .evaluate((e) => {
      const r = e.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    });
const overlaps = (a: Rect, b: Rect) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * Scroll so `[data-guide=key]`'s `edge` sits at `y` px from the viewport top.
 * A jump renders the skipped `.frame-cv` boxes on the way at their real size
 * (their intrinsic size is the desktop one), so it settles and scrolls again.
 */
const scrollBoxTo = (page: Page, key: string, y: number | "band", edge: "top" | "bottom" = "top") =>
  page.evaluate(
    async ([k, at, e]) => {
      const el = document.querySelector(`[data-guide="${k}"]`)!;
      const to = at === "band" ? innerHeight * 0.42 : Number(at);
      const go = () =>
        scrollTo({
          top: scrollY + el.getBoundingClientRect()[e as "top" | "bottom"] - to,
          behavior: "instant",
        });
      const frame = () => new Promise((r) => requestAnimationFrame(r));
      go();
      for (let i = 0; i < 3; i++) await frame();
      go();
    },
    [key, y, edge] as const,
  );

const layer = (page: Page) => page.locator("#gt-guide");
const bubble = (page: Page) => page.locator("#gt-guide-bubble");
const sprite = (page: Page) => page.locator("#gt-guide .gt-guide-sprite");
const svgState = (page: Page) => page.locator("#gt-guide svg.px-sprite");
const sayOf = (page: Page, key: string) =>
  page.locator(`[data-guide="${key}"]`).getAttribute("data-guide-say");
/** The bot has emerged at `anchor` and settled (its slot no longer clips): one combined poll. */
const settled = (page: Page, anchor: string) =>
  expect
    .poll(
      () =>
        page.evaluate(() => {
          const g = document.getElementById("gt-guide")!;
          const rest = g.hasAttribute("data-rest") && g.getAttribute("data-bot") === "out";
          return rest ? g.getAttribute("data-anchor") : null;
        }),
      { timeout: 10_000 },
    )
    .toBe(anchor);

/** The bubble sits beside the bot (toward inline-start), never over it. */
async function expectBeside(page: Page, rtl = false) {
  const [b, s] = await Promise.all([
    rect(page, "#gt-guide-bubble"),
    rect(page, ".gt-guide-sprite"),
  ]);
  expect(overlaps(b, s)).toBe(false);
  if (rtl) expect(b.left).toBeGreaterThanOrEqual(s.right + 8);
  else expect(b.right).toBeLessThanOrEqual(s.left - 8);
  // beside, not above or below: the two overlap vertically
  expect(b.top).toBeLessThan(s.bottom);
  expect(b.bottom).toBeGreaterThan(s.top);
  await expect(bubble(page)).toHaveAttribute("data-tail", rtl ? "l" : "r");
  return { b, s };
}

test.use({ viewport: { width: 1440, height: 900 } });

/** Desktop placement needs a fine pointer: a touch device is compact at any width (D21). */
const TOUCH = "a touch device always uses compact mode (D21)";

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
  await expect(layer(page)).not.toHaveAttribute("hidden");
  // the engine writes frame state to the sprite's svg only, never to the layer
  await expect(layer(page)).not.toHaveAttribute("data-state");
  await expect(svgState(page)).toHaveAttribute("data-state", /.+/);
  await expect(sprite(page)).toHaveAccessibleName(en.name);
  await expect(sprite(page)).toHaveAttribute("aria-controls", "gt-guide-bubble");
});

test("greeting: the bot stands on the first box's top border, the bubble beside it", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, TOUCH);
  await setup(page, { greeted: false });
  await page.goto("/en");
  await expect(page.locator(ROOF)).toHaveCount(1);
  await engine(page);
  await expect(bubble(page)).toBeVisible();
  // the whole line is in the DOM from the start (typing only reveals it)
  await expect(bubble(page).locator(".gt-guide-text")).toHaveText(
    greetingRe(en.greeting, en.greetingNoName),
  );
  await expect(bubble(page)).toHaveAttribute("role", "group");
  await expect(bubble(page)).toHaveAccessibleName(en.name);
  await settled(page, "top");
  const [box, spr, desk] = await Promise.all([
    rect(page, ROOF),
    rect(page, ".gt-guide-sprite"),
    rect(page, ".os-desktop"),
  ]);
  expect(Math.abs(spr.bottom - box.top)).toBeLessThanOrEqual(1); // feet on the border
  expect(Math.abs(box.right - 24 - spr.right)).toBeLessThanOrEqual(1); // 24px inside inline-end
  expect(spr.top).toBeGreaterThanOrEqual(desk.top);
  await expectBeside(page);
  // it waves while it thinks, then talks while it types
  await expect(svgState(page)).toHaveAttribute("data-state", "talk", { timeout: 5000 });
  expect(await page.evaluate(() => sessionStorage.getItem("gt-guide-greeted"))).toBe("1");
});

test("a section's line: typed beside the bot, full text laid out from the start, talk then idle", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, TOUCH);
  await setup(page);
  await page.goto("/en");
  await engine(page);
  const say = (await sayOf(page, "home_work"))!;
  await scrollBoxTo(page, "home_work", "band");
  await expect(bubble(page)).toHaveAttribute("data-open", "", { timeout: 10_000 });
  await expect(layer(page)).toHaveAttribute("data-anchor", "top");
  // the full line is present before (and while) it is typed
  await expect(bubble(page).locator(".gt-guide-text")).toHaveText(say);
  await expect(bubble(page)).toHaveAttribute("data-phase", "type", { timeout: 5000 });
  const sizes = new Set<string>();
  const typed: number[] = [];
  for (let i = 0; i < 8; i++) {
    const r = await page.evaluate(() => {
      const b = document.getElementById("gt-guide-bubble")!;
      return {
        size: `${b.offsetWidth}×${b.offsetHeight}`,
        typed: document.querySelector(".gt-guide-typed")!.textContent!.length,
        full: document.querySelector(".gt-guide-text")!.textContent,
        phase: b.getAttribute("data-phase"),
        state: document.querySelector("#gt-guide svg.px-sprite")!.getAttribute("data-state"),
      };
    });
    if (r.phase !== "type") break;
    sizes.add(r.size);
    typed.push(r.typed);
    expect(r.full).toBe(say);
    expect(r.state).toBe("talk");
    await page.waitForTimeout(150);
  }
  expect(typed.length).toBeGreaterThan(3);
  expect(typed[typed.length - 1]!).toBeGreaterThan(typed[0]!); // it types…
  expect(typed[typed.length - 1]!).toBeLessThan(say.length); // …slowly
  expect(sizes.size).toBe(1); // without resizing the bubble
  const box = await rect(page, '[data-guide="home_work"]');
  const { b } = await expectBeside(page);
  expect(Math.abs(b.bottom - (box.top - 4))).toBeLessThanOrEqual(1); // grows up from 4px above the line
  // done: idle again, every grapheme shown
  await expect(bubble(page)).not.toHaveAttribute("data-phase", { timeout: 10_000 });
  await expect(svgState(page)).toHaveAttribute("data-state", "idle");
  await expect(bubble(page).locator(".gt-guide-typed")).toHaveText(say);
  await expect(bubble(page).locator(".gt-guide-rest")).toHaveText("");
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("gt-guide-seen")))
    .toContain("/en#home_work");
});

test("scrolling back up into a box: the bot hangs under its bottom border", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, TOUCH);
  await setup(page, { seen: HOME.filter((k) => k !== "home_work") });
  await page.goto("/en");
  await engine(page);
  // home_work leaves the activation band first…
  await scrollBoxTo(page, "home_services", 150);
  await settled(page, "top");
  // …then comes back from above: its bottom border is in view, its top is not
  await scrollBoxTo(page, "home_work", 330, "bottom");
  await settled(page, "bottom");
  const [box, spr] = await Promise.all([
    rect(page, '[data-guide="home_work"]'),
    rect(page, ".gt-guide-sprite"),
  ]);
  // the head (row 4 of 16) sits 2px under the line; the empty rows above it are clipped
  expect(Math.abs(spr.top + 12 - (box.bottom + 2))).toBeLessThanOrEqual(1);
  await expect(bubble(page).locator(".gt-guide-text")).toHaveText(
    (await sayOf(page, "home_work"))!,
    {
      timeout: 10_000,
    },
  );
  await expect(bubble(page)).toHaveAttribute("data-open", "");
  const { b } = await expectBeside(page);
  expect(Math.abs(b.top - box.bottom)).toBeLessThanOrEqual(1); // its top sits on the line
});

test.describe("a tall box (1440×700)", () => {
  test.use({ viewport: { width: 1440, height: 700 } });

  test("covering the viewport: the bot hangs under the menu bar", async ({ page, isMobile }) => {
    test.skip(isMobile, TOUCH);
    await setup(page, { seen: HOME });
    await page.goto("/en");
    await engine(page);
    const zone = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const top = parseFloat(cs.getPropertyValue("--chrome-top"));
      const dock = parseFloat(cs.getPropertyValue("--dock-space"));
      return { top, bottom: innerHeight - dock - 64 };
    });
    const box = await rect(page, '[data-guide="home_work"]');
    // its top above the comfortable zone (under chromeTop + 56), its bottom below it
    const y = zone.top + 20;
    expect(y + box.bottom - box.top).toBeGreaterThan(zone.bottom + 20); // precondition: tall enough
    await scrollBoxTo(page, "home_work", y);
    await settled(page, "chrome");
    await expect(layer(page)).toHaveAttribute("data-fixed", "");
    const spr = await rect(page, ".gt-guide-sprite");
    expect(Math.abs(spr.top + 12 - (zone.top + 2))).toBeLessThanOrEqual(1);
    // it stays under the menu bar while the box scrolls
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(300);
    expect((await rect(page, ".gt-guide-sprite")).top).toBeCloseTo(spr.top, 0);
  });
});

test("its top border scrolling under the menu bar: the bot drops down from under it", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, TOUCH);
  await setup(page, { seen: HOME });
  await page.goto("/en");
  await engine(page);
  await scrollBoxTo(page, "home_work", 430);
  await settled(page, "top");
  // still the active box (it spans the activation band), but its top border is gone
  await scrollBoxTo(page, "home_work", 20);
  const box = await rect(page, '[data-guide="home_work"]');
  expect(box.bottom).toBeGreaterThan(900 * 0.5);
  await settled(page, "chrome");
  const top = parseFloat(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--chrome-top"),
    ),
  );
  expect(Math.abs((await rect(page, ".gt-guide-sprite")).top + 12 - (top + 2))).toBeLessThanOrEqual(
    1,
  );
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the full line at once: no thinking dots, no typing, no talking", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, TOUCH);
    await setup(page);
    await page.goto("/en");
    await engine(page);
    await page.evaluate(() => {
      const w = window as unknown as { states: string[]; phases: string[] };
      w.states = [];
      w.phases = [];
      const svg = document.querySelector("#gt-guide svg.px-sprite")!;
      const bub = document.getElementById("gt-guide-bubble")!;
      new MutationObserver(() => w.states.push(svg.getAttribute("data-state") ?? "")).observe(svg, {
        attributeFilter: ["data-state"],
      });
      new MutationObserver(() => w.phases.push(bub.getAttribute("data-phase") ?? "")).observe(bub, {
        attributeFilter: ["data-phase"],
      });
    });
    const say = (await sayOf(page, "home_work"))!;
    await scrollBoxTo(page, "home_work", "band");
    await expect(bubble(page)).toHaveAttribute("data-open", "", { timeout: 10_000 });
    // the moment it opens, every grapheme is shown
    await expect(bubble(page).locator(".gt-guide-typed")).toHaveText(say, { timeout: 500 });
    await expect(layer(page)).toHaveAttribute("data-rm", "");
    const seen = await page.evaluate(() => {
      const w = window as unknown as { states: string[]; phases: string[] };
      return { states: w.states, phases: w.phases };
    });
    expect(seen.states).not.toContain("talk");
    expect(seen.phases.filter(Boolean)).toEqual([]);
    // the bot fades instead of sliding
    expect(await sprite(page).evaluate((e) => getComputedStyle(e).translate)).toMatch(
      /^(none|0px)$/,
    );
  });
});

test("bot click and the brand menu's Explain open an explicit bubble; Esc returns focus", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, TOUCH);
  await setup(page, { seen: HOME });
  await page.goto("/en");
  await engine(page);
  await scrollBoxTo(page, "home_work", "band");
  await settled(page, "top");
  await expect(sprite(page)).toHaveAttribute("aria-expanded", "false");
  // Safari never focuses a button on click (macOS rule), so focus can only return there from the keyboard.
  if (browserName === "webkit") await sprite(page).press("Enter");
  else await sprite(page).click();
  await expect(sprite(page)).toHaveAttribute("aria-expanded", "true");
  await expect(bubble(page)).toBeVisible();
  await expect(bubble(page).locator(".gt-guide-text")).toHaveText(
    (await sayOf(page, "home_work"))!,
  );
  await expect(bubble(page).getByRole("button", { name: en.hide })).toBeVisible();
  await expect(page.locator("#gt-guide-live")).toHaveText((await sayOf(page, "home_work"))!);
  await expectBeside(page);
  // a resize re-measures the same anchor: both move in place, the bubble stays shown
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect
    .poll(async () => (await rect(page, ".gt-guide-sprite")).right)
    .toBeCloseTo((await rect(page, '[data-guide="home_work"]')).right - 24, 0);
  await expect(bubble(page)).toBeVisible();
  await expect(bubble(page)).toHaveCSS("visibility", "visible");
  await expectBeside(page);
  await page.keyboard.press("Escape");
  await expect(bubble(page)).toBeHidden();
  await expect(sprite(page)).toHaveAttribute("aria-expanded", "false");
  await expect(sprite(page)).toBeFocused();
  // the bot stays at its box
  await expect(layer(page)).toHaveAttribute("data-bot", "out");

  // the brand menu's Explain closes the menu, then explains the active part
  await page.locator('[popovertarget="mb-brand"]').click();
  await page.locator("#mb-brand").getByRole("button", { name: en.explain }).click();
  await expect(page.locator("#mb-brand")).toBeHidden();
  await expect(bubble(page)).toBeVisible();
  await expect(bubble(page)).toHaveAttribute("data-kind", "explicit");
  await expect(bubble(page).locator(".gt-guide-text")).toHaveText(
    (await sayOf(page, "home_work"))!,
  );
  // a second click on the bot closes it (toggle)
  await sprite(page).click();
  await expect(bubble(page)).toBeHidden();
});

test("tour: Next moves focus step by step, End closes and returns focus", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, TOUCH);
  await setup(page, { seen: HOME });
  await page.goto("/en");
  await engine(page);
  const trigger = page.locator('[popovertarget="mb-brand"]');
  await trigger.click();
  await page.locator("#mb-brand").getByRole("button", { name: en.tour }).click();
  const n = HOME.length;
  const next = bubble(page).getByRole("button", {
    name: en.next.replace("{i}", "1").replace("{n}", String(n)),
  });
  await expect(next).toBeFocused({ timeout: 10_000 });
  await expect(bubble(page).locator(".gt-guide-text")).toHaveText(
    (await sayOf(page, "home_hero"))!,
  );
  await expect(layer(page)).toHaveAttribute("data-anchor", "top");
  await page.keyboard.press("Enter");
  const next2 = bubble(page).getByRole("button", {
    name: en.next.replace("{i}", "2").replace("{n}", String(n)),
  });
  await expect(next2).toBeFocused({ timeout: 10_000 });
  await expect(bubble(page).locator(".gt-guide-text")).toHaveText(
    (await sayOf(page, "home_brands"))!,
  );
  await settled(page, "top");
  // the step's box top landed low enough for the bubble above it, beside the bot
  await expectBeside(page);
  await bubble(page).getByRole("button", { name: en.endTour }).click();
  await expect(bubble(page)).toBeHidden();
  await expect(trigger).toBeFocused();
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
  await expect(layer(page)).toHaveAttribute("hidden", "");
  expect(await page.evaluate(() => localStorage.getItem("gt-guide"))).toBe("off");

  await page.reload();
  await page.waitForLoadState("load");
  await page.waitForTimeout(2000);
  // muted: the automatic engine never loaded
  await expect(layer(page)).toHaveAttribute("hidden", "");
  await expect(layer(page)).not.toHaveAttribute("data-engine");

  await page.evaluate(() =>
    dispatchEvent(new CustomEvent("gt:guide", { detail: { type: "explain" } })),
  );
  await expect(bubble(page)).toBeVisible();
  await expect(layer(page)).not.toHaveAttribute("hidden");
  await expect(layer(page)).toHaveAttribute("data-bot", "out");
  await expect(page.locator("#gt-guide-live")).not.toBeEmpty();
  await page.keyboard.press("Escape");
  await expect(layer(page)).toHaveAttribute("hidden", "");
  expect(await page.evaluate(() => localStorage.getItem("gt-guide"))).toBe("off");
});

test("fa (RTL): the bot sits at the box's left corner and the bubble to its right", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, TOUCH);
  await setup(page, { path: "/" });
  await page.goto("/");
  await engine(page);
  const say = (await sayOf(page, "home_work"))!;
  await scrollBoxTo(page, "home_work", "band");
  await expect(bubble(page)).toHaveAttribute("data-open", "", { timeout: 10_000 });
  await expect(bubble(page).locator(".gt-guide-text")).toHaveText(say);
  await settled(page, "top");
  const [box, spr] = await Promise.all([
    rect(page, '[data-guide="home_work"]'),
    rect(page, ".gt-guide-sprite"),
  ]);
  expect(Math.abs(spr.left - (box.left + 24))).toBeLessThanOrEqual(1);
  await expectBeside(page, true);
  expect(await bubble(page).locator("#gt-guide-name").innerText()).toBe(fa.name);
});

test.describe("compact mode (390×844)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  const tabTop = (page: Page) => rect(page, ".os-dock-list").then((r) => r.top);

  test("the one-time greeting comes from the bot on the tab bar", async ({ page }) => {
    await setup(page, { greeted: false, path: "/" });
    await page.goto("/");
    await engine(page);
    await expect(layer(page)).toHaveAttribute("data-compact", "");
    await expect(bubble(page)).toBeVisible();
    await expect(bubble(page).locator(".gt-guide-text")).toHaveText(
      greetingRe(fa.greetingCompact, fa.greetingCompactNoName),
    );
    await settled(page, "dock");
    const [spr, top] = await Promise.all([rect(page, ".gt-guide-sprite"), tabTop(page)]);
    expect(spr.right - spr.left).toBe(32); // 16 cells × 2px
    expect(Math.abs(spr.bottom - top)).toBeLessThanOrEqual(1); // standing on the tab bar
    const { b } = await expectBeside(page, true);
    expect(b.bottom).toBeLessThanOrEqual(top);
  });

  test("a new section: the bot peeks with its badge, a tap opens the bubble beside it", async ({
    page,
  }) => {
    await setup(page, { path: "/" });
    await page.goto("/");
    await engine(page);
    await expect(layer(page)).toHaveAttribute("data-compact", "");
    await scrollBoxTo(page, "home_work", "band");
    await expect(layer(page)).toHaveAttribute("data-badge", "", { timeout: 10_000 });
    await settled(page, "dock");
    // no automatic bubble in compact mode (D21)
    await page.waitForTimeout(1500);
    await expect(bubble(page)).toBeHidden();
    const active = await page.evaluate(() => {
      // the active section is the last one in the activation band
      const band = [...document.querySelectorAll("main [data-guide]")].filter((e) => {
        const r = e.getBoundingClientRect();
        return r.top <= innerHeight * 0.5 && r.bottom >= innerHeight * 0.35;
      });
      return band.at(-1)!.getAttribute("data-guide-say");
    });
    await sprite(page).click();
    await expect(bubble(page)).toBeVisible();
    await expect(bubble(page).locator(".gt-guide-text")).toHaveText(active!);
    await expect(layer(page)).not.toHaveAttribute("data-badge");
    const { b } = await expectBeside(page, true);
    expect(b.bottom).toBeLessThanOrEqual(await tabTop(page));
    // tapping outside closes it
    await page.evaluate(() =>
      document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })),
    );
    await expect(bubble(page)).toBeHidden();
  });
});
