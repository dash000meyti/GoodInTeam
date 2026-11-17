import { PaletteIcon } from "lucide-react";
import {
  chartTokens,
  greyScale,
  inkTokens,
  PRESET_SCOPE_CLASS,
  presetScales,
  presetStyle,
  statusTokens,
  surfaceTokens,
} from "@/components/shared/design-tokens";
import type { CSSProperties } from "react";
import { colorPresets } from "@/components/shared/theme";
import { cn } from "@/lib/utils";
import type { Messages } from "@/i18n/messages";
import { CodeBlock } from "../example";
import { DsSection, DsSubheading } from "../section";
import { Swatch } from "../swatch";

const steps = ["lighter", "light", "main", "dark", "darker"] as const;

/** Light value on the start half, dark on the end half (over the matching page color). */
const split = (light: string, dark: string) =>
  `linear-gradient(90deg, ${light} 0 50%, ${dark} 50% 100%), linear-gradient(90deg, #f3f3f3 0 50%, #161618 50% 100%)`;

/** "rgb(106 106 108 / 0.08)" → "grey α8%" (the alpha greys are what matters). */
const short = (v: string) => {
  const m = /\/\s*([\d.]+)\)$/.exec(v);
  return m ? `grey α${Math.round(Number(m[1]) * 100)}%` : v;
};

const usage = `// Semantic tokens → Tailwind colors (light/dark + preset aware)
<div className="bg-card text-card-foreground shadow-card rounded-2xl" />
<p className="text-muted-foreground" />
<span className="bg-primary/12 text-primary-dark dark:text-primary-light" /> // soft surface
<div className="border border-dashed" />                                       // --border
<span className="bg-success/16 text-success-ink" />                            // = <Badge variant="success">
<a className="text-primary-ink" />  // text, links, icons use the -ink tokens (ESLint guard)

// Re-skin a subtree with another preset (previews): always both, so the
// var(--primary…)-derived tokens (ink, hover, ring, chart-1) follow it.
import { PRESET_SCOPE_CLASS, presetStyle } from "@/components/shared/design-tokens";
<div className={PRESET_SCOPE_CLASS} style={presetStyle("purple")}>…</div>`;

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
              className="grid grid-cols-5 items-center gap-2 sm:grid-cols-[72px_repeat(5,minmax(0,1fr))]"
            >
              <span
                className="col-span-5 font-mono text-xs font-bold text-muted-foreground sm:col-span-1"
                dir="ltr"
              >
                {p}
              </span>
              {steps.map((st) => (
                <Swatch
                  key={st}
                  color={presetScales[p][st]}
                  label={st === "main" ? "primary" : st}
                  value={presetScales[p][st]}
                  copy={st === "main" ? "var(--primary)" : `var(--primary-${st})`}
                />
              ))}
            </div>
          ))}
        </div>
        {/* Live previews: PRESET_SCOPE_CLASS + presetStyle re-derive ink, hover and ring per preset.
            White on the green, cyan and red fills is 3.1–3.7:1 (AA large text only), so the
            samples are intentional demos (spec §3.4): the "Aa" is aria-hidden, the name says which. */}
        <div data-a11y-demo className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {colorPresets.map((p) => (
            <div
              key={p}
              className={cn(
                PRESET_SCOPE_CLASS,
                "flex items-center gap-2 rounded-xl border bg-card p-2.5",
              )}
              style={presetStyle(p) as CSSProperties}
            >
              <span
                aria-hidden
                className="inline-flex h-7 items-center rounded-md bg-primary px-2.5 font-mono text-xs font-bold text-primary-foreground ring-2 ring-ring ring-offset-2 ring-offset-card"
              >
                Aa
              </span>
              <span className="font-mono text-xs font-bold text-primary-ink" dir="ltr">
                {p}
              </span>
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
            {inkTokens.map((tok) => (
              <Swatch
                key={tok.name}
                color={`var(--${tok.name})`}
                label={tok.name}
                value={tok.light.startsWith("#") ? `${tok.light} · ${tok.dark}` : tok.light}
                copy={`text-${tok.tw}`}
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
