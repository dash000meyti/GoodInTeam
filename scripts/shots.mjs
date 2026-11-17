// Visual QA helper: logs in (optional) and screenshots pages in fa/en, light/dark, desktop/mobile.
//
//   node scripts/shots.mjs --base http://localhost:3000 --out ./shots \
//     --login owner@goodteam.local:goodteam-demo-pass /panel/time /panel/time/reports /blog
//
// Flags: --base URL, --out DIR, --login email:password, --only fa|en, --dark, --mobile, --full
// (--dark --mobile also adds dark mobile shots). Uses Playwright's own Chromium unless
// CHROMIUM_PATH is set. --full captures the whole page with reduced motion after a scroll
// pass (scroll-driven reveals and content-visibility boxes paint), mobile at 1×.
// Prints console errors / page errors / non-2xx responses for each page (exit code 1 if any).
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const base = opt("base", "http://localhost:3000");
const out = opt("out", "./shots");
const login = opt("login");
const only = opt("only");
const paths = args.filter(
  (a, i) => !a.startsWith("--") && !["--base", "--out", "--login", "--only"].includes(args[i - 1]),
);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const full = flag("full");
let problems = 0;
const variants = [];
for (const locale of ["fa", "en"]) {
  if (only && only !== locale) continue;
  variants.push({ locale, dark: false, mobile: false });
  if (flag("dark")) variants.push({ locale, dark: true, mobile: false });
  if (flag("mobile")) variants.push({ locale, dark: false, mobile: true });
  if (flag("dark") && flag("mobile")) variants.push({ locale, dark: true, mobile: true });
}
for (const v of variants) {
  const ctx = await browser.newContext({
    viewport: v.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    colorScheme: v.dark ? "dark" : "light",
    // very tall 2× full-page captures repeat tiles; 1× is plenty for QA
    deviceScaleFactor: v.mobile && !full ? 2 : 1,
    // scroll-driven reveals keep unscrolled rows at opacity 0 in a full-page capture
    reducedMotion: full ? "reduce" : "no-preference",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on(
    "response",
    (r) =>
      r.status() >= 400 && !r.url().includes("favicon") && errors.push(`${r.status()} ${r.url()}`),
  );
  if (login) {
    const [email, password] = login.split(":");
    await page.goto(`${base}/login`);
    await page.fill("#email", email);
    await page.fill("#password", password);
    await Promise.all([
      page.waitForURL(/\/panel/, { timeout: 20000 }),
      page.click("button[type=submit]"),
    ]);
  }
  for (const p of paths) {
    errors.length = 0;
    const url = `${base}${v.locale === "fa" ? "" : "/en"}${p}`;
    await page.goto(url, { waitUntil: "networkidle" }).catch((e) => errors.push(String(e)));
    if (full) {
      // paint every content-visibility box and lazy image once, then come back up
      await page.evaluate(async () => {
        const frame = () => new Promise((r) => requestAnimationFrame(r));
        for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) {
          scrollTo({ top: y, behavior: "instant" });
          await frame();
        }
        scrollTo({ top: 0, behavior: "instant" });
      });
    }
    await page.waitForTimeout(400);
    const name = `${v.locale}${v.dark ? "-dark" : ""}${v.mobile ? "-mobile" : ""}${p.replace(/[/?&=]+/g, "_") || "_home"}.png`;
    await page.screenshot({ path: `${out}/${name}`, fullPage: full });
    console.log(`${errors.length ? "✗" : "✓"} ${url} → ${name}`);
    for (const e of errors) console.log(`    ${e}`);
    problems += errors.length;
  }
  await ctx.close();
}
await browser.close();
process.exit(problems ? 1 : 0);
