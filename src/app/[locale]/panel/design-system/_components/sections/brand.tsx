import { SparklesIcon } from "lucide-react";
import { brands } from "@/components/brand/brands";
import { LogoMark } from "@/components/brand/logo";
import {
  PixelAvatar,
  PixelAvatarSprite,
  PixelIcon,
  PixelText,
  type SpriteState,
} from "@/components/brand/pixel-art";
import type { PixelPose } from "@/components/brand/pixel-avatar";
import { PERSIAN_DIGITS } from "@/components/brand/pixel-font";
import {
  accentShare,
  panelIconNames,
  pixelIcons,
  siteIconNames,
  type PixelIconName,
} from "@/components/brand/pixel-icons";
import { PixelLogo, PixelLogoCycle, PixelMark } from "@/components/brand/pixel-logo";
import { DockTile, type DockVariant } from "@/components/shell/dock";
import { OsLights } from "@/components/shell/os-lights";
import { chromeTokens, inkTokens } from "@/components/shared/design-tokens";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { Messages } from "@/i18n/messages";
import { CodeBlock, Example } from "../example";
import { DsSection, DsSubheading } from "../section";
import { Swatch } from "../swatch";

const POSES: PixelPose[] = ["idle", "blink", "talk", "walkA", "walkB", "wave", "sit"];
const STATES: SpriteState[] = ["idle", "walk", "talk", "wave", "sit"];

/** A colour pair: sample "Aa" in `fg` on `bg`, with its measured ratio. */
interface Pair {
  fg: string;
  bg: string;
  ratio: string;
  /** What the sample shows when the pair is a fill or a line, not text. */
  note?: string;
}

/** Spec §3.4: allowed and never pairs (light mode unless the background is dark). */
const CONTRAST: { colour: string; allowed: Pair[]; never: Pair[] }[] = [
  {
    colour: "#FFC50D",
    allowed: [{ fg: "#1C1C1E", bg: "#FFC50D", ratio: "10.73" }],
    never: [
      { fg: "#FFC50D", bg: "#F3F3F3", ratio: "1.43" },
      { fg: "#FFFFFF", bg: "#FFC50D", ratio: "1.59" },
    ],
  },
  {
    colour: "#7A5A00 (--primary-ink)",
    allowed: [
      { fg: "#7A5A00", bg: "#F3F3F3", ratio: "5.75" },
      { fg: "#7A5A00", bg: "#FFFFFF", ratio: "6.38" },
    ],
    never: [],
  },
  {
    colour: "#9A7200 (--guide-line)",
    allowed: [],
    never: [{ fg: "#9A7200", bg: "#F3F3F3", ratio: "3.96" }],
  },
  {
    colour: "#FFDB66 (dark --primary-ink)",
    allowed: [{ fg: "#FFDB66", bg: "#161618", ratio: "13.4" }],
    never: [{ fg: "#FFDB66", bg: "#F3F3F3", ratio: "1.2" }],
  },
  {
    colour: "--success-ink / --info-ink",
    allowed: [
      { fg: "#0B6B42", bg: "#F3F3F3", ratio: "5.92" },
      { fg: "#00618C", bg: "#F3F3F3", ratio: "6.13" },
    ],
    never: [
      { fg: "#22C55E", bg: "#F3F3F3", ratio: "2.05" },
      { fg: "#00B8D9", bg: "#F3F3F3", ratio: "2.14" },
    ],
  },
  {
    colour: "#22C55E / #00B8D9 fills",
    allowed: [
      { fg: "#1C1C1E", bg: "#22C55E", ratio: "7.47" },
      { fg: "#1C1C1E", bg: "#00B8D9", ratio: "7.0" },
    ],
    never: [{ fg: "#FFFFFF", bg: "#22C55E", ratio: "2.28" }],
  },
  {
    colour: "#6A6A6C / #B3B5B9",
    allowed: [{ fg: "#6A6A6C", bg: "#F3F3F3", ratio: "4.86" }],
    never: [{ fg: "#B3B5B9", bg: "#F3F3F3", ratio: "1.85" }],
  },
  {
    colour: "Destructive",
    allowed: [
      { fg: "#FFFFFF", bg: "#CE2C31", ratio: "5.21" },
      { fg: "#1C1C1E", bg: "#FF6369", ratio: "5.87" },
    ],
    never: [{ fg: "#FFFFFF", bg: "#FF5630", ratio: "3.17" }],
  },
  {
    colour: "Warning",
    allowed: [
      { fg: "#1C1C1E", bg: "#F76B15", ratio: "5.73" },
      { fg: "#A04A00", bg: "#F3F3F3", ratio: "5.45" },
    ],
    never: [{ fg: "#F76B15", bg: "#F3F3F3", ratio: "2.9" }],
  },
];

function PairChip({ pair }: { pair: Pair }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-flex h-7 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-bold"
        style={{ color: pair.fg, backgroundColor: pair.bg }}
      >
        Aa
      </span>
      <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
        {pair.fg} / {pair.bg} · {pair.ratio}
      </span>
    </span>
  );
}

/**
 * Failing samples are excluded from the axe contrast run (spec §3.4): the
 * swatch text is aria-hidden inside `data-a11y-demo`, and the pair is named
 * in passing text beside it. Use `data-a11y-demo` only here and in colors.tsx.
 */
function NeverChip({ pair }: { pair: Pair }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span data-a11y-demo="">
        <span
          aria-hidden
          className="inline-flex h-7 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-bold line-through"
          style={{ color: pair.fg, backgroundColor: pair.bg }}
        >
          Aa
        </span>
      </span>
      <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
        {pair.fg} / {pair.bg} · {pair.ratio}
      </span>
    </span>
  );
}

const logoCode = `import { LogoMark } from "@/components/brand/logo";
import { PixelLogo, PixelMark, PixelLogoCycle } from "@/components/brand/pixel-logo";
<PixelLogo suffix="STUDIO" cell={3} />            // 34×18 cells → 102×54px
<PixelMark cell={2} className="md:[--cell:3px]" /> // responsive: a cell class, never size-*
<LogoMark cell={4} />                               // compatibility layer (44px)
<PixelLogoCycle cell={3} />                         // TEAM→STUDIO→CODE once, 4.2s`;

const iconCode = `import { PixelIcon, PixelText, PixelAvatar } from "@/components/brand/pixel-art";
<PixelIcon name="studio" cell={2} />          // 24px
<PixelIcon name="arrow" mirror />             // points to inline-end in fa and en
<PixelIcon name={item.pixel} cell={2} />      // panel dock: nav-config NavItem.pixel
<PixelText text="GOOD-IN-TEAM/WORK" cell={2} />
<PixelAvatar pose="wave" cell={6} />          // literal colours, never on yellow
<PixelAvatar part="head" cell={2} />          // 20px head (menu bar, Me tile)`;

const digitsCode = `import { pixelDigits } from "@/components/brand/pixel-font";
<PixelText text={pixelDigits("404", locale)} cell={8} />  // fa ۴۰۴ · en 404
// FrameSection does it for its strip: strip={{ index: 3 }} → ۰۳ on fa, 03 on en`;

/** One icon set at cell 2 and cell 1, each with its name and accent share. */
function IconSet({ names, label }: { names: readonly PixelIconName[]; label: string }) {
  return (
    <div className="w-full space-y-2">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <ul className="grid w-full grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-x-2 gap-y-4">
        {names.map((name) => (
          <li key={name} className="flex flex-col items-center gap-1.5">
            <PixelIcon name={name} cell={2} mirror={name === "arrow"} />
            <PixelIcon name={name} cell={1} mirror={name === "arrow"} />
            <code
              className="flex flex-col items-center text-[10px] leading-4 text-muted-foreground"
              dir="ltr"
            >
              <span>{name}</span>
              <span>y {Math.round(accentShare(pixelIcons[name]) * 100)}%</span>
            </code>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The panel icons on dock tiles: brand (current theme), brand in dark, accent (yellow). */
function TileRow({ variant, dark }: { variant: DockVariant; dark?: boolean }) {
  return (
    <div
      className={
        dark ? "dark flex flex-wrap gap-2 rounded-xl bg-[#161618] p-2" : "flex flex-wrap gap-2 p-2"
      }
    >
      {panelIconNames.map((name) => (
        <span key={name} className="block size-12">
          <DockTile variant={variant}>
            <PixelIcon name={name} cell={2} />
          </DockTile>
        </span>
      ))}
    </div>
  );
}

export function BrandSection({ t }: { t: Messages }) {
  const d = t.designSystem;
  return (
    <DsSection id="brand" title={d.sec_brand} description={d.brandIntro} icon={SparklesIcon}>
      <div className="space-y-3">
        <DsSubheading hint={d.brandFamilyHint}>{d.brandFamily}</DsSubheading>
        <div className="grid gap-4 lg:grid-cols-3">
          {brands.map((b) => (
            <figure
              key={b.id}
              className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-card"
            >
              <figcaption className="flex items-center gap-2 text-sm font-bold">
                <PixelIcon name={b.icon} cell={1} />
                {t.nav[b.label]}
                <span className="font-mono text-[11px] font-normal text-muted-foreground" dir="ltr">
                  {b.suffix}
                </span>
              </figcaption>
              <div className="flex flex-wrap items-end gap-4" dir="ltr">
                <PixelLogo suffix={b.suffix} cell={2} />
                <PixelLogo suffix={b.suffix} cell={3} />
                <PixelLogo suffix={b.suffix} cell={4} />
              </div>
              <p className="text-sm text-muted-foreground">{t.site[b.tagline]}</p>
            </figure>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Example title={d.brandMark} code={logoCode} previewClassName="items-end gap-6">
          <PixelMark cell={2} />
          <PixelMark cell={3} />
          <PixelMark cell={4} />
          <LogoMark cell={6} />
          <span className="rounded-xl bg-[#161618] p-3">
            <PixelMark cell={3} />
          </span>
          <PixelLogoCycle cell={2} />
        </Example>
        <Example
          title={d.brandIcons}
          description={d.brandIconsHint}
          code={iconCode}
          previewClassName="flex-col items-stretch gap-6"
        >
          <IconSet names={siteIconNames} label={d.brandSiteIcons} />
          <IconSet names={panelIconNames} label={d.brandPanelIcons} />
        </Example>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Example
          title={d.brandPanelTiles}
          description={d.brandPanelTilesHint}
          previewClassName="flex-col items-stretch gap-2"
        >
          <TileRow variant="brand" />
          <TileRow variant="brand" dark />
          <TileRow variant="accent" />
        </Example>
        <Example
          title={d.brandDigits}
          description={d.brandDigitsHint}
          code={digitsCode}
          previewClassName="flex-col items-start gap-4"
        >
          <div className="flex flex-col gap-3" dir="ltr">
            <PixelText text="0123456789" cell={3} />
            <PixelText text={PERSIAN_DIGITS} cell={3} />
          </div>
          <div className="flex flex-wrap items-center gap-4" dir="ltr">
            {["01", "۰۱", "07", "۰۷", "404", "۴۰۴"].map((n) => (
              <PixelText key={n} text={n} cell={2} />
            ))}
          </div>
          {/* a strip as each locale lays it out: en (LTR) and fa (RTL, number beside the lights) */}
          <div className="flex w-full flex-col gap-2">
            {(
              [
                ["ltr", "03"],
                ["rtl", "۰۳"],
              ] as const
            ).map(([dir, n]) => (
              <div key={n} dir={dir} className="frame-strip rounded-lg border">
                <OsLights size={10} />
                <PixelText text={n} cell={2} />
                <PixelText text="GOOD-IN-TEAM/WORK" cell={2} className="frame-path" />
              </div>
            ))}
          </div>
        </Example>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Example title={d.brandAvatar} description={d.brandAvatarHint}>
          <div className="flex flex-wrap items-end gap-5">
            {POSES.map((pose) => (
              <span key={pose} className="flex flex-col items-center gap-1.5">
                <PixelAvatar pose={pose} cell={4} />
                <code className="text-[10px] text-muted-foreground" dir="ltr">
                  {pose}
                </code>
              </span>
            ))}
            <span className="flex flex-col items-center gap-1.5">
              <PixelAvatar part="head" cell={2} />
              <code className="text-[10px] text-muted-foreground" dir="ltr">
                head
              </code>
            </span>
          </div>
        </Example>
        <Example title={d.brandSprite} description={d.brandSpriteHint}>
          <div className="grid w-full grid-cols-5 gap-2">
            {STATES.map((state) => (
              <span key={state} className="flex flex-col items-center gap-1.5">
                <span className="grid w-full place-items-center rounded-lg bg-[#f3f3f3] p-2">
                  <PixelAvatarSprite state={state} cell={3} />
                </span>
                <span className="grid w-full place-items-center rounded-lg bg-[#161618] p-2">
                  <PixelAvatarSprite state={state} cell={3} />
                </span>
                <code className="text-[10px] text-muted-foreground" dir="ltr">
                  {state}
                </code>
              </span>
            ))}
          </div>
        </Example>
      </div>

      <div className="space-y-3">
        <DsSubheading hint={d.brandContrastHint}>{d.brandContrast}</DsSubheading>
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-start text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-start font-bold">{d.brandColour}</th>
                <th className="px-4 py-2.5 text-start font-bold">{d.brandAllowed}</th>
                <th className="px-4 py-2.5 text-start font-bold">{d.brandNever}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {CONTRAST.map((row) => (
                <tr key={row.colour}>
                  <td className="px-4 py-3 align-top font-mono text-xs font-semibold" dir="ltr">
                    {row.colour}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="flex flex-col gap-2">
                      {row.allowed.map((p) => (
                        <PairChip key={p.fg + p.bg} pair={p} />
                      ))}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="flex flex-col gap-2">
                      {row.never.map((p) => (
                        <NeverChip key={p.fg + p.bg} pair={p} />
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Example title={d.brandNonText} description={d.brandNonTextHint} previewClassName="gap-6">
        <label className="inline-flex items-center gap-2">
          <Switch defaultChecked />
          <code className="text-xs" dir="ltr">
            Switch ✓
          </code>
        </label>
        <label className="inline-flex items-center gap-2">
          <Switch />
          <code className="text-xs" dir="ltr">
            Switch
          </code>
        </label>
        <label className="inline-flex items-center gap-2">
          <Checkbox defaultChecked />
          <code className="text-xs" dir="ltr">
            Checkbox ✓
          </code>
        </label>
        <RadioGroup defaultValue="a" className="flex gap-3">
          <label className="inline-flex items-center gap-2">
            <RadioGroupItem value="a" />
            <code className="text-xs" dir="ltr">
              Radio ✓
            </code>
          </label>
          <label className="inline-flex items-center gap-2">
            <RadioGroupItem value="b" />
            <code className="text-xs" dir="ltr">
              Radio
            </code>
          </label>
        </RadioGroup>
        <div className="w-40 space-y-1">
          <Progress value={64} />
          <code className="text-xs" dir="ltr">
            Progress
          </code>
        </div>
        <div className="w-40 space-y-1">
          <Slider defaultValue={[40]} />
          <code className="text-xs" dir="ltr">
            Slider
          </code>
        </div>
        <div className="os-menu w-56">
          <div className="os-menu-item">
            <code dir="ltr">.os-menu-item</code>
          </div>
          <div className="os-menu-item" data-highlighted="">
            <code dir="ltr">[data-highlighted]</code>
          </div>
          <div className="os-menu-item" data-variant="destructive" data-highlighted="">
            <code dir="ltr">destructive</code>
          </div>
        </div>
        <span className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold ring-2 ring-ring ring-offset-2 ring-offset-card">
          <code dir="ltr">ring-2 ring-ring</code>
        </span>
      </Example>

      <div className="min-w-0 space-y-3">
        <DsSubheading hint={d.brandTokensHint}>{d.brandTokens}</DsSubheading>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {[...inkTokens, ...chromeTokens].map((tok) => (
            <Swatch
              key={tok.name}
              color={`var(--${tok.name})`}
              label={`--${tok.name}`}
              value={tok.light === tok.dark ? tok.light : `${tok.light} · ${tok.dark}`}
              copy={tok.tw ? `bg-${tok.tw}` : `var(--${tok.name})`}
            />
          ))}
        </div>
        <CodeBlock
          code={`<p className="text-primary-ink" />          // text, links, icons on light surfaces
<span className="bg-success/16 text-success-ink" />
<div className="bg-primary text-primary-foreground" /> // yellow fill + #1C1C1E`}
          className="overflow-hidden rounded-2xl border bg-muted/30"
        />
      </div>
    </DsSection>
  );
}
