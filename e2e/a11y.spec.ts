/**
 * Colour contrast with axe (spec §3.4, §13; A6): the `color-contrast` rule on
 * the public routes and the main panel pages, light mode (the spec's gate)
 * and dark mode. The catalog's intentional "Never" samples live inside
 * `[data-a11y-demo]` and are excluded; `incomplete` results (e.g. text over
 * an image or a gradient) are logged, not failed.
 *
 * Needs a running app with the demo data:
 *   BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/a11y.spec.ts
 */
import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PUBLIC = ["/", "/en", "/services", "/login"];
const PANEL = ["/panel", "/panel/design-system", "/panel/settings/appearance"];

async function login(page: Page) {
  await page.goto("/en/login");
  await page.fill("#email", "owner@goodteam.local");
  await page.fill("#password", "goodteam-demo-pass");
  await Promise.all([
    page.waitForURL((u) => !u.pathname.endsWith("/login")),
    page.press("#password", "Enter"),
  ]);
}

async function contrast(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
  // streamed holes and skeletons settle; entrance animations are off (reduced motion)
  await page.waitForTimeout(500);
  const { violations, incomplete } = await new AxeBuilder({ page })
    .withRules(["color-contrast"])
    .exclude("[data-a11y-demo]")
    .analyze();
  const nodes = (rs: typeof violations) =>
    rs.flatMap((r) =>
      r.nodes.map((n) => `${n.target.join(" ")} — ${n.any[0]?.message ?? n.failureSummary}`),
    );
  if (incomplete.length)
    console.log(`[a11y] ${path}: ${nodes(incomplete).length} incomplete (needs review)`);
  expect(nodes(violations), `color-contrast violations on ${path}`).toEqual([]);
}

test("only the catalog's Brand and Colors sections carry data-a11y-demo", () => {
  const files = execFileSync("git", ["grep", "-l", "data-a11y-demo", "--", "src"], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .map((f) => f.split("/").pop());
  for (const f of files) expect(["brand.tsx", "colors.tsx"]).toContain(f);
});

for (const scheme of ["light", "dark"] as const) {
  test.describe(`color-contrast, ${scheme} mode`, () => {
    test.use({ colorScheme: scheme, reducedMotion: "reduce" });

    for (const path of PUBLIC)
      test(`${path} (${scheme})`, async ({ page }) => {
        await contrast(page, path);
      });

    for (const path of PANEL)
      test(`${path} (${scheme}, owner)`, async ({ page }) => {
        await login(page);
        await contrast(page, path);
      });
  });
}
