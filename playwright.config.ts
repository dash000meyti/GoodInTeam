import { defineConfig, devices } from "@playwright/test";

/**
 * Browser end-to-end tests (`e2e/*.spec.ts`). They run against an already
 * running app with the demo data (`pnpm test:e2e`). Not part of `pnpm check`.
 *
 * `chromium` is the only project by default (CI). `BROWSERS=all` adds Firefox,
 * desktop Safari (WebKit) and an iPhone (mobile Safari); install them first
 * with `pnpm exec playwright install webkit firefox`. Specs that are
 * Chromium-only (CDP, layout-shift entries) or desktop-only skip themselves
 * with a reason.
 */
const crossBrowser = process.env.BROWSERS === "all";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } }
          : {}),
      },
    },
    ...(crossBrowser
      ? [
          { name: "firefox", use: { ...devices["Desktop Firefox"] } },
          { name: "webkit", use: { ...devices["Desktop Safari"] } },
          { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
        ]
      : []),
  ],
});
