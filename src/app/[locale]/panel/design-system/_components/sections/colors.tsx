import { PaletteIcon } from "lucide-react";
import {
  chartTokens,
  greyScale,
  presetScales,
  statusTokens,
  surfaceTokens,
} from "@/components/shared/design-tokens";
import { colorPresets } from "@/components/shared/theme";
import type { Messages } from "@/i18n/messages";
import { CodeBlock } from "../example";
import { DsSection, DsSubheading } from "../section";
import { Swatch } from "../swatch";

const steps = ["lighter", "light", "main", "dark", "darker"] as const;

/** Light value on the start half, dark on the end half (over the matching page color). */
const split = (light: string, dark: string) =>
  `linear-gradient(90deg, ${light} 0 50%, ${dark} 50% 100%), linear-gradient(90deg, #ffffff 0 50%, #141a21 50% 100%)`;

/** "rgb(145 158 171 / 0.08)" → "grey α8%" (the alpha greys are what matters). */
const short = (v: string) => {
  const m = /\/\s*([\d.]+)\)$/.exec(v);
  return m ? `grey α${Math.round(Number(m[1]) * 100)}%` : v;
};

const usage = `// Semantic tokens → Tailwind colors (light/dark + preset aware)
<div className="bg-card text-card-foreground shadow-card rounded-2xl" />
<p className="text-muted-foreground" />
<span className="bg-primary/12 text-primary-dark dark:text-primary-light" /> // soft surface
<div className="border border-dashed" />                                       // --border
<span className="bg-success/16 text-[#118d57] dark:text-[#77ed8b]" />          // = <Badge variant="success">

// Re-skin a subtree with another preset (previews):
import { presetStyle } from "@/components/shared/design-tokens";
<div style={presetStyle("purple")}>…</div>`;

export function ColorsSection({ t }: { t: Messages }) {
  const d = t.designSystem;
  return (
    <DsSection id="colors" title={d.sec_colors} description={d.sec_colorsDesc} icon={PaletteIcon}>
      <div className="space-y-3">
        <DsSubheading hint={d.colorsPresetsHint}>{d.colorsPresets}</DsSubheading>
        <div className="space-y-3">
          {colorPresets.map((p) => (
            <div
              key={p}
              className="grid grid-cols-[72px_repeat(5,minmax(0,1fr))] items-center gap-2"
            >
              <span className="font-mono text-xs font-bold text-muted-foreground" dir="ltr">
                {p}
              </span>
              {steps.map((st) => (
                <Swatch
                  key={st}
                  color={presetScales[p][st]}
                  label={st === "main" ? "primary" : `primary-${st}`}
                  value={presetScales[p][st]}
                  copy={st === "main" ? "var(--primary)" : `var(--primary-${st})`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <DsSubheading hint={`${d.light} | ${d.dark}`}>{d.colorsSurface}</DsSubheading>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {surfaceTokens.map((tok) => (
            <Swatch
              key={tok.name}
              color={split(tok.light, tok.dark)}
              label={`--${tok.name}`}
              value={`${short(tok.light)} · ${short(tok.dark)}`}
              copy={`var(--${tok.name})`}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <DsSubheading>{d.colorsStatus}</DsSubheading>
          <div className="grid grid-cols-5 gap-2">
            {statusTokens.map((tok) => (
              <Swatch
                key={tok.name}
                color={tok.light}
                label={tok.name}
                value={tok.light}
                copy={`bg-${tok.tw}`}
                tall
              />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <DsSubheading>{d.colorsCharts}</DsSubheading>
          <div className="grid grid-cols-5 gap-2">
            {chartTokens.map((tok) => (
              <Swatch
                key={tok.name}
                color={`var(--${tok.name})`}
                label={tok.name}
                value={tok.light.startsWith("var") ? "= primary" : tok.light}
                copy={`var(--${tok.name})`}
                tall
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <DsSubheading>{d.colorsGreys}</DsSubheading>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {greyScale.map((g) => (
            <Swatch
              key={g.step}
              color={g.value}
              label={`grey-${g.step}`}
              value={g.value}
              copy={`grey-${g.step}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <DsSubheading>{d.colorsElevation}</DsSubheading>
        <div className="grid grid-cols-2 gap-4 rounded-2xl bg-muted/40 p-5 sm:grid-cols-4">
          {["shadow-card", "shadow-dropdown", "shadow-dialog", "shadow-primary"].map((sh) => (
            <div
              key={sh}
              className={`flex h-20 items-end rounded-2xl bg-card p-3 font-mono text-[11px] font-bold ${sh}`}
              dir="ltr"
            >
              {sh}
            </div>
          ))}
          {["rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl"].map((r) => (
            <div
              key={r}
              className={`flex h-16 items-end border-2 border-dashed border-primary/40 bg-primary/6 p-3 font-mono text-[11px] font-bold ${r}`}
              dir="ltr"
            >
              {r}
            </div>
          ))}
        </div>
      </div>

      <CodeBlock code={usage} className="overflow-hidden rounded-2xl border bg-muted/30" />
    </DsSection>
  );
}
