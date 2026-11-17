import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  chartTokens,
  chromeTokens,
  greyScale,
  inkTokens,
  PRESET_SCOPE_CLASS,
  presetScales,
  statusForegroundTokens,
  statusTokens,
  surfaceTokens,
} from "./design-tokens";
import { colorPresets, DEFAULT_PRESET } from "./theme";

/** Docs must never drift from globals.css (the real source of truth). */
const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

function block(selector: string) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`selector not found: ${selector}`);
  const end = css.indexOf("}", start);
  const vars: Record<string, string> = {};
  for (const m of css.slice(start, end).matchAll(/--([\w-]+):\s*([^;]+);/g))
    vars[m[1]!] = m[2]!.trim().toLowerCase().replace(/\s+/g, " ");
  return vars;
}

const rootOwn = block(":root");
const darkOwn = block(".dark");
const root = rootOwn;
const dark = { ...root, ...darkOwn };
const theme = block("@theme inline");

describe("design tokens match globals.css", () => {
  it("surface tokens (light + dark)", () => {
    for (const t of surfaceTokens) {
      expect(root[t.name], `light --${t.name}`).toBe(t.light);
      expect(dark[t.name], `dark --${t.name}`).toBe(t.dark);
    }
  });

  it("status, status foreground, ink + chart tokens", () => {
    for (const t of [...statusTokens, ...statusForegroundTokens, ...inkTokens, ...chartTokens]) {
      expect(root[t.name], `--${t.name}`).toBe(t.light);
      expect(dark[t.name], `dark --${t.name}`).toBe(t.dark);
    }
  });

  it("status inks are text-safe tokens with Tailwind mappings", () => {
    for (const name of ["primary-ink", "primary-hover", "warning-ink", "success-ink", "info-ink"]) {
      expect(
        inkTokens.some((t) => t.name === name),
        name,
      ).toBe(true);
      expect(theme[`color-${name}`], `@theme --color-${name}`).toBe(`var(--${name})`);
    }
    // light-mode text inks are never the bright fills
    expect(root["success-ink"]).not.toBe(root["success"]);
    expect(root["info-ink"]).not.toBe(root["info"]);
    expect(root["warning-ink"]).not.toBe(root["warning"]);
  });

  it("chrome tokens (light + dark) and their Tailwind mappings", () => {
    for (const t of chromeTokens) {
      expect(root[t.name], `light --${t.name}`).toBe(t.light);
      expect(dark[t.name], `dark --${t.name}`).toBe(t.dark);
      if (t.tw) expect(theme[`color-${t.tw}`], `@theme --color-${t.tw}`).toBe(`var(--${t.name})`);
    }
  });

  it("grey scale", () => {
    for (const g of greyScale) expect(theme[`color-grey-${g.step}`]).toBe(g.value);
  });

  it("every preset scale", () => {
    expect(colorPresets[0]).toBe(DEFAULT_PRESET);
    for (const p of colorPresets) {
      const vars = p === DEFAULT_PRESET ? root : { ...root, ...block(`[data-preset="${p}"]`) };
      const s = presetScales[p];
      expect(vars["primary-lighter"], `${p} lighter`).toBe(s.lighter);
      expect(vars["primary-light"], `${p} light`).toBe(s.light);
      expect(vars["primary"], `${p} main`).toBe(s.main);
      expect(vars["primary-dark"], `${p} dark`).toBe(s.dark);
      expect(vars["primary-darker"], `${p} darker`).toBe(s.darker);
      expect(vars["primary-foreground"], `${p} contrast`).toBe(s.contrast);
      expect(vars["primary-rgb"], `${p} rgb`).toBe(s.rgb);
      expect(vars["preset-ink"], `${p} ink`).toBe(s.ink);
    }
  });

  it("white foreground on the five dark-fill presets (yellow and orange keep ink)", () => {
    for (const p of ["green", "cyan", "purple", "blue", "red"] as const)
      expect(block(`[data-preset="${p}"]`)["primary-foreground"], p).toBe("#ffffff");
    expect(rootOwn["primary-foreground"]).toBe("#1c1c1e");
  });

  it(".preset-scope re-derives every var(--primary…)-based token in both modes", () => {
    expect(PRESET_SCOPE_CLASS).toBe("preset-scope");
    // the light block must come first: indexOf(".preset-scope {") would otherwise hit the dark one
    expect(css.indexOf(".preset-scope {")).toBeLessThan(css.indexOf(".dark .preset-scope {"));
    const scope = block(".preset-scope");
    const darkScope = block(".dark .preset-scope");
    const derived = (vars: Record<string, string>) =>
      Object.entries(vars)
        .filter(([, v]) => v.includes("var(--primary") || v.includes("--primary-rgb"))
        .map(([k]) => k);
    const lightDerived = derived(rootOwn);
    const darkDerived = derived(darkOwn);
    expect(lightDerived.length).toBeGreaterThan(5);
    for (const k of lightDerived) expect(scope[k], `.preset-scope --${k}`).toBe(rootOwn[k]);
    for (const k of darkDerived)
      expect(darkScope[k], `.dark .preset-scope --${k}`).toBe(darkOwn[k]);
  });
});
