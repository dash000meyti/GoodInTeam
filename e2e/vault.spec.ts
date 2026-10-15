/**
 * Zero-knowledge vault, end to end: set up a vault, store a secret, lock and
 * unlock — and prove that no plaintext (master password, recovery key, item
 * title or secret) is ever sent to the server.
 *
 * Needs a running app with the demo data (`pnpm db:reset && pnpm db:seed && pnpm dev`):
 *   pnpm test:e2e            # BASE_URL defaults to http://localhost:3000
 * Uses the demo member account and erases its vault before and after the run.
 */
import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "sara@goodteam.local";
const PASSWORD = process.env.E2E_PASSWORD ?? "goodteam-demo-pass";

const rand = Math.random().toString(36).slice(2, 10);
const MASTER = `Correct-Horse-Battery-${rand}-Staple!`;
const TITLE = `E2E secret ${rand}`;
const SECRET = `s3cret-${rand}-Xq9!`;

async function login(page: Page) {
  await page.goto("/en/login");
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.endsWith("/login")),
    page.press("#password", "Enter"),
  ]);
}

/** Erase the vault from whichever screen is showing (unlock screen or settings tab). */
async function eraseVault(page: Page) {
  await page.getByRole("button", { name: "Erase vault completely" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#vault-reset").fill("erase");
  await dialog.getByRole("button", { name: "Erase vault completely" }).click();
  await expect(page.getByRole("button", { name: "Let's start" })).toBeVisible();
}

test("vault keeps every secret in the browser", async ({ page }) => {
  const sent: string[] = [];
  page.on("request", (r) => {
    const body = r.postData();
    sent.push(`${r.url()}\n${body ?? ""}`);
  });

  await login(page);
  await page.goto("/en/panel/vault");

  const start = page.getByRole("button", { name: "Let's start" });
  const unlock = page.getByRole("button", { name: "Unlock", exact: true });
  await expect(start.or(unlock)).toBeVisible();
  if (await unlock.isVisible()) await eraseVault(page);

  // ── Setup: master password → recovery key → create ────────────────────────
  await start.click();
  await page.getByLabel("Master password", { exact: true }).fill(MASTER);
  await page.getByLabel("Repeat master password").fill(MASTER);
  await page.getByRole("button", { name: "Continue" }).click();
  const codes = page.getByTestId("recovery-key").locator("code");
  await expect(codes).toHaveCount(13); // PBKDF2 key generation takes a moment
  const groups = await codes.allInnerTexts();
  const recoveryKey = groups.map((g) => g.trim()).join("-");
  expect(recoveryKey).toMatch(/^[A-Z2-7]{4}(-[A-Z2-7]{4}){12}$/);
  await page.getByLabel("I have saved my recovery key somewhere safe.").check();
  await page.getByRole("button", { name: "Create vault" }).click();

  // ── Store a login item ────────────────────────────────────────────────────
  await page.getByRole("button", { name: "New item" }).first().click();
  await page.getByRole("menuitem", { name: "Login" }).click();
  const form = page.getByRole("dialog");
  await form.getByRole("textbox", { name: /^Title/ }).fill(TITLE);
  await form.getByRole("textbox", { name: "Password", exact: true }).fill(SECRET);
  await form.getByRole("button", { name: "Save" }).click();
  // Saving opens the (decrypted) item drawer.
  await expect(page.getByRole("dialog", { name: TITLE })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText(TITLE)).toBeVisible();

  // ── Lock, then unlock with the master password ────────────────────────────
  await page.getByRole("button", { name: "Lock", exact: true }).click();
  await expect(unlock).toBeVisible();
  await expect(page.getByText(TITLE)).toBeHidden();
  await page.locator("#vault-master").fill(MASTER);
  await unlock.click();
  await expect(page.getByText(TITLE)).toBeVisible();

  // ── Nothing readable ever left the browser ────────────────────────────────
  const traffic = sent.join("\n");
  for (const plain of [MASTER, recoveryKey, recoveryKey.replaceAll("-", ""), TITLE, SECRET]) {
    expect(traffic, `"${plain}" must never be sent to the server`).not.toContain(plain);
    expect(traffic).not.toContain(encodeURIComponent(plain));
  }

  // ── Clean up ──────────────────────────────────────────────────────────────
  await page.getByRole("tab", { name: "Security & backup" }).click();
  await eraseVault(page);
});
