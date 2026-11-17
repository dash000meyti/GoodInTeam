// Visual QA helper: logs in (optional) and screenshots pages in fa/en, light/dark, desktop/mobile.
//
//   node scripts/shots.mjs --base http://localhost:3000 --out ./shots \
//     --login owner@goodteam.local:goodteam-demo-pass /panel/time /panel/time/reports /blog
//
// Flags: --base URL, --out DIR, --login email:password, --only fa|en, --dark, --mobile, --full
// (--dark --mobile also adds dark mobile shots). Uses Playwright's own Chromium unless
// CHROMIUM_PATH is set. --full captures the whole page with reduced motion after a scroll
// pass (scroll-driven reveals and content-visibility boxes paint), mobile at 1×.
// --engine firefox|webkit uses that engine instead (webkit --mobile emulates an iPhone 14:
// touch, coarse pointer, 3×; install with `pnpm exec playwright install webkit firefox`).
// --forced-colors and --reduced-transparency (Chromium only) emulate those modes.
// File names get an `<engine>-` prefix for firefox/webkit.
// Prints console errors / page errors / non-2xx responses for each page (exit code 1 if any).
import { mkdirSync } from "node:fs";
import { chromium, devices, firefox, webkit } from "@playwright/test";

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
const engine = opt("engine", "chromium");
const paths = args.filter(
  (a, i) =>
    !a.startsWith("--") &&
    !["--base", "--out", "--login", "--only", "--engine"].includes(args[i - 1]),
);
mkdirSync(out, { recursive: true });

const browserType = { chromium, firefox, webkit }[engine];
if (!browserType) throw new Error(`--engine must be chromium, firefox or webkit (got ${engine})`);
const browser = await browserType.launch(
  engine === "chromium" && process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {},
);
const prefix = engine === "chromium" ? "" : `${engine}-`;
const forced = flag("forced-colors");
const transparency = flag("reduced-transparency");
if ((forced || transparency) && engine !== "chromium")
  throw new Error("--forced-colors and --reduced-transparency need --engine chromium");
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
  const iphone = engine === "webkit" && v.mobile;
  const ctx = await browser.newContext({
    ...(iphone ? devices["iPhone 14"] : {}),
    viewport: v.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    colorScheme: v.dark ? "dark" : "light",
    // very tall 2× full-page captures repeat tiles; 1× is plenty for QA
    deviceScaleFactor: v.mobile && !full ? (iphone ? 3 : 2) : 1,
    // scroll-driven reveals keep unscrolled rows at opacity 0 in a full-page capture
    reducedMotion: full ? "reduce" : "no-preference",
    ...(forced ? { forcedColors: "active" } : {}),
  });
  const page = await ctx.newPage();
  if (transparency) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
    });
  }
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
    const mode = `${forced ? "-forced" : ""}${transparency ? "-opaque" : ""}`;
    const name = `${prefix}${v.locale}${v.dark ? "-dark" : ""}${v.mobile ? "-mobile" : ""}${mode}${p.replace(/[/?&=]+/g, "_") || "_home"}.png`;
    await page.screenshot({ path: `${out}/${name}`, fullPage: full });
    console.log(`${errors.length ? "✗" : "✓"} ${url} → ${name}`);
    for (const e of errors) console.log(`    ${e}`);
    problems += errors.length;
  }
  await ctx.close();
}
await browser.close();
process.exit(problems ? 1 : 0);
