/**
 * Auth forms: the shared password field (`components/shared/password-input.tsx`)
 * on the login screen and in account settings. Runs against a server with the
 * demo data (`pnpm db:seed`).
 *
 * The field is an LTR island: on a Persian (RTL) page its show/hide toggle
 * used to sit at the page's inline end (left) while the input reserved its
 * padding on the right, so the typed text ran under the eye icon.
 */
import { expect, test, type Page } from "@playwright/test";
import { common as enCommon } from "../src/i18n/messages/en/common";
import { common as faCommon } from "../src/i18n/messages/fa/common";

const PASSWORD = "goodteam-demo-pass";
const OWNER = "owner@goodteam.local";
const LONG = "a-long-demo-passphrase-1234567890-abcdefgh";

/** The toggle sits inside the input's reserved padding, never over its text. */
async function expectToggleClearOfText(page: Page, input: string) {
  const m = await page.locator(input).evaluate((el) => {
    const i = el as HTMLInputElement;
    const toggle = i.parentElement!.querySelector("button")!;
    const r = i.getBoundingClientRect();
    const q = toggle.getBoundingClientRect();
    const cs = getComputedStyle(i);
    return {
      direction: cs.direction,
      textEnd: r.right - parseFloat(cs.paddingRight),
      inputEnd: r.right,
      toggleStart: q.left,
      toggleEnd: q.right,
    };
  });
  expect(m.direction, input).toBe("ltr");
  expect(m.toggleStart, input).toBeGreaterThanOrEqual(m.textEnd);
  expect(m.toggleEnd, input).toBeLessThanOrEqual(m.inputEnd);
}

for (const [locale, path, label] of [
  ["fa", "/login", faCommon.showPassword],
  ["en", "/en/login", enCommon.showPassword],
] as const) {
  test(`${locale} login: the show-password toggle never covers the typed text`, async ({
    page,
  }) => {
    await page.goto(path);
    const field = page.locator("#password");
    await field.fill(LONG);
    await expectToggleClearOfText(page, "#password");

    const toggle = page.getByRole("button", { name: label, exact: true });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(field).toHaveAttribute("type", "password");
    // The click only counts once the form has hydrated: retry until it takes.
    await expect(async () => {
      if ((await toggle.getAttribute("aria-pressed")) !== "true") await toggle.click();
      await expect(toggle).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
    }).toPass();
    await expect(field).toHaveAttribute("type", "text");
    await expect(field).toHaveValue(LONG);
    await expectToggleClearOfText(page, "#password");
  });
}

test("fa account settings: the three password fields keep their toggles clear of the text", async ({
  page,
}) => {
  await page.goto("/login");
  await page.fill("#email", OWNER);
  await page.fill("#password", PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.endsWith("/login")),
    page.press("#password", "Enter"),
  ]);
  await page.goto("/panel/settings");
  for (const id of ["#pw-current", "#pw-new", "#pw-confirm"]) {
    await page.locator(id).fill(LONG);
    await expectToggleClearOfText(page, id);
  }
});
