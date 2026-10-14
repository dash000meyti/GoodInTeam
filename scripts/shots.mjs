// Visual QA helper: logs in (optional) and screenshots pages in fa/en, light/dark, desktop/mobile.
//
//   node scripts/shots.mjs --base http://localhost:3000 --out ./shots \
//     --login owner@goodteam.local:goodteam-demo-pass /panel/time /panel/time/reports /blog
//
// Flags: --base URL, --out DIR, --login email:password, --only fa|en, --dark, --mobile, --full
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

const browser = await chromium
  .launch({
    executablePath:
      process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  })
  .catch(() => chromium.launch());
let problems = 0;
const variants = [];
for (const locale of ["fa", "en"]) {
  if (only && only !== locale) continue;
  variants.push({ locale, dark: false, mobile: false });
  if (flag("dark")) variants.push({ locale, dark: true, mobile: false });
  if (flag("mobile")) variants.push({ locale, dark: false, mobile: true });
}
for (const v of variants) {
  const ctx = await browser.newContext({
    viewport: v.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    colorScheme: v.dark ? "dark" : "light",
    deviceScaleFactor: v.mobile ? 2 : 1,
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
    await page.waitForTimeout(400);
    const name = `${v.locale}${v.dark ? "-dark" : ""}${v.mobile ? "-mobile" : ""}${p.replace(/[/?&=]+/g, "_") || "_home"}.png`;
    await page.screenshot({ path: `${out}/${name}`, fullPage: flag("full") });
    console.log(`${errors.length ? "✗" : "✓"} ${url} → ${name}`);
    for (const e of errors) console.log(`    ${e}`);
    problems += errors.length;
  }
  await ctx.close();
}
await browser.close();
process.exit(problems ? 1 : 0);
