import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { chartTokens, greyScale, presetScales, statusTokens, surfaceTokens } from "./design-tokens";
import { colorPresets } from "./theme";

/** Docs must never drift from globals.css (the real source of truth). */
const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

function block(selector: string) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`selector not found: ${selector}`);
  const end = css.indexOf("}", start);
  const vars: Record<string, string> = {};
  for (const m of css.slice(start, end).matchAll(/--([\w-]+):\s*([^;]+);/g))
    vars[m[1]!] = m[2]!.trim().toLowerCase();
  return vars;
}

const root = block(":root");
const dark = { ...root, ...block(".dark") };
const theme = block("@theme inline");

describe("design tokens match globals.css", () => {
  it("surface tokens (light + dark)", () => {
    for (const t of surfaceTokens) {
      expect(root[t.name], `light --${t.name}`).toBe(t.light);
      expect(dark[t.name], `dark --${t.name}`).toBe(t.dark);
    }
  });

  it("status + chart tokens", () => {
    for (const t of [...statusTokens, ...chartTokens]) {
      expect(root[t.name], `--${t.name}`).toBe(t.light);
      expect(dark[t.name], `dark --${t.name}`).toBe(t.dark);
    }
  });

  it("grey scale", () => {
    for (const g of greyScale) expect(theme[`color-grey-${g.step}`]).toBe(g.value);
  });

  it("every preset scale", () => {
    for (const p of colorPresets) {
      const vars = p === "green" ? root : { ...root, ...block(`[data-preset="${p}"]`) };
      const s = presetScales[p];
      expect(vars["primary-lighter"], `${p} lighter`).toBe(s.lighter);
      expect(vars["primary-light"], `${p} light`).toBe(s.light);
      expect(vars["primary"], `${p} main`).toBe(s.main);
      expect(vars["primary-dark"], `${p} dark`).toBe(s.dark);
      expect(vars["primary-darker"], `${p} darker`).toBe(s.darker);
      expect(vars["primary-foreground"], `${p} contrast`).toBe(s.contrast);
      expect(vars["primary-rgb"], `${p} rgb`).toBe(s.rgb);
    }
  });
});
