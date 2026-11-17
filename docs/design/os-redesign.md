# Good In OS: final redesign spec

**Scope**
- Public site: fa is the default (RTL, no URL prefix); en is LTR under `/en`.
- Private panel, including the client portal.

**Stack**
- Next.js 16.4 with Cache Components and Partial Prefetching.
- React 19.3, Tailwind v4, Radix (panel only), SQLite.

**Base and grafts.** The `perf` proposal is the base. Grafts come from `wow` and `structure`, and every flaw the three judges raised is fixed (see §1, Decisions).

**Status.** Ready to implement in 7 tracks: `foundation` first, then 5 parallel tracks, then `qa-docs`.

**Binding constraints.** Everything in `docs/design/research/codebase-maps.json` is binding:
- Cache Components and Suspense rules
- client-only clock
- plain `<a>` locale switch
- header-height couplings
- bottom-anchored collisions
- yellow contrast
- must-not-rename identifiers
- e2e selectors
- `design-tokens.test.ts` parser rules
- no Radix Tooltip or sonner on public pages

---

## 0. Principles

| # | Principle | Rule |
|---|---|---|
| P1 | Server first | All chrome is server-rendered and prerendered per locale. Client islands only do what HTML and CSS cannot: active state from `usePathname`, the clock, toggles, the guide engine. |
| P2 | CSS before JS | Site menus use the native Popover API. Dock magnification uses `:hover`, sibling selectors and `:has()`. Reveals, the "focused window" lights and the footer wordmark are scroll-driven CSS. **No scroll listeners anywhere.** |
| P3 | One lazy engine | The site guide is vanilla TypeScript loaded with `import()` after `load` plus idle. It uses one IntersectionObserver and one ResizeObserver, and reads layout only when it activates. |
| P4 | Zero layout shift | Every fixed bar and every streamed hole has a reserved size. The guide and the docks are overlays. |
| P5 | Minimal blur | Exactly two `backdrop-filter` surfaces: the menu bar and the dock, at ≥768px only, with blur ≤20px. Everything else is opaque, at 92–97%. |
| P6 | No new font files | Pixel lettering is SVG built from `pixel-font.ts`, one `<path>` per tone. Persian is always Vazirmatn. |
| P7 | The logo is the theme | The logo's L-frame (top and inline-start bars plus a dark corner cell) appears on every frame box, dock brand tile and window. Yellow #FFC50D is the only accent and is never used as text on light surfaces. |

---

## 1. Decisions

| # | Decision | Why / source |
|---|---|---|
| D1 | `perf` is the base. Grafts: L-frame motif, arc-hop flight with pixel trail, tour, Control Center with Reduce motion, Persian-normalised Spotlight filter, a restrained once-per-session boot, the panel's "Me" dock tile (from `wow`); narration in `data-guide-say` attributes, sprite as a real `<button>` with a live region only for explicit actions, once-only logo cycle, status ordering, pointer-only panel lights with menu equivalents, destructive and warning hues, 14px Vazirmatn UI text (from `structure`). | All three judges |
| D2 | Persian brand form: **«گودین تیم»**, with «گودین استودیو» and «گودین کد». This follows the «لینکدین» pattern. «گود این» with a space reads as "the pit of this" and is rejected. The pixel logo is always Latin. **Owner sign-off required.** Alternatives are «گوداین تیم» or Latin-only. Changing it is a 4-key edit: `common.appName`, `nav.brandTeam/brandStudio/brandCode`. | Judges 1 and 3 |
| D3 | The default colour preset is a new `yellow`, set in `:root`. Green moves to a flat `[data-preset="green"]` block. Dark mode stays `system`. A saved `gt-preset` is respected. | perf |
| D4 | Contrast is handled by tokens, not by patching call sites: `--primary-ink`, `--primary-hover` and `--warning-ink` are new. Destructive becomes #CE2C31 (light) / #FF6369 with ink foreground (dark); warning becomes #F76B15. Codemods cover `text-primary`, `hover:text-primary`, `hover:bg-primary-dark`, `ring-primary`, `border-primary` (state) and `text-warning`. | Judge 3 measured #FF5630 with white at 3.17:1 |
| D5 | Pixel art is rendered as **one `<path>` per tone** with integer cell sizes only. A sub-brand suffix is valid when `pixelTextWidth(suffix) ≤ 31`, which keeps the logo at 34×18. Validate this with zod `refine`, not a length regex. | Judge 2 counted 128–157 rects per logo; a 6-glyph word can be 38 cells wide |
| D6 | Frame hairlines use cell `border-inline-end` / `border-block-end` with the grid at `-1px` end margins. The `wow` border technique has no grey holes in incomplete rows. Server-side `FrameFiller` cells complete rows for the pure Cloudflare look. | The `structure` stretch rule was broken |
| D7 | The L-frame is a box-shadow outside the 1px border (`calc(-3px*var(--dir)) -3px 0 var(--brand-frame)`) plus a 3×3 ink corner cell at top-start. The other three box corners get ringed 9px markers. Cell markers at md+ go at each cell's top-start and bottom-end. The box geometry is unaffected. | wow + perf |
| D8 | Below-the-fold frame bodies use `content-visibility:auto` inside a `.frame-cv` wrapper (−5px margin, 5px padding), so markers are not clipped. Never on boxes with sticky children. | perf |
| D9 | Site menus are native popovers using the WAI-ARIA disclosure pattern. There is no Radix on public pages; Radix DropdownMenu is removed from them. The panel uses Radix Menubar. | perf |
| D10 | Narration lives in the server-only i18n namespace `guide`, rendered into `data-guide-say` attributes on sections and spots. There is **no sr-only hidden text**. Screen-reader users get lines through explicit actions, announced by one polite live region. | Judges 2 and 3 |
| D11 | The site guide is on by default. It speaks once per section per session after a 600ms dwell. It never auto-speaks under `navigator.webdriver` unless `localStorage gt-guide-test=1`. The panel guide is quiet: a dock "Me" tile, plus a one-time peek per module that can be turned off. | perf + wow |
| D12 | The logo cycle (TEAM → STUDIO → CODE → TEAM) runs **once**, in ≤4.2s, in the hero hub (WCAG 2.2.2). The brand-family section swaps the suffix with `:has()` on hover or focus. No infinite logo animation. | Judges 2 and 3 |
| D13 | A once-per-session boot moment uses transforms only: the menu bar slides down and the dock rises. The hero `<h1>` is never animated. There are **no page ViewTransitions in v1**, because they interact with streamed Suspense reveals. | Judges |
| D14 | The panel window's title bar is **not sticky** (only the menu bar is). The traffic lights are pointer-only (`tabIndex=-1`, `aria-hidden`); their commands exist in the App menu. | Judge 3, structure |
| D15 | Panel prefs live in the cookie `gt-shell` = `size.magnify.autohide.wide` (e.g. `48.1.0.0`). A pre-paint script sets only the layout-affecting html attributes. The dock skeleton is invisible: the dock is fixed and its space is CSS-reserved, so CLS is 0 with no item-count bookkeeping. | Judge 2 |
| D16 | Sub-brands are `/services#studio` and `/services#code` in v1. `/studio` and `/code` routes are phase 2. | Judges |
| D17 | Shell CSS is split into partial files (`src/app/styles/*.css`) imported by `globals.css`, one owner each. Tokens stay in `globals.css` (the token test parses only that file). Partials use `@layer components` / `@layer base` so Tailwind utilities can still override them. | Parallel ownership |
| D18 | All header-height and dock collisions (sticky tops, bottom bars, Toc rootMargins, prose scroll-margin) are replaced in `foundation` using shell CSS variables and utilities. | Avoids file conflicts |
| D19 | Both clocks (site and panel) show **studio time** (`appTimezone()`, through a cached `getPublicTimezone()`), inside Suspense. | structure flagged that `env.timezone` was wrong |
| D20 | The sprite design is the perf 16×16 "virtual me" with a yellow hoodie. It uses the same palette in both modes, faces its direction of travel, and its art is never mirrored. | perf |

---

## 2. Brand and naming

| Thing | en | fa | Pixel suffix | Role |
|---|---|---|---|---|
| Master brand (team, site, panel) | Good In Team | گودین تیم | `TEAM` | umbrella; blog, learn and about live here |
| Design services | Good In Studio | گودین استودیو | `STUDIO` | UI/UX, brand, motion, product design |
| Engineering services | Good In Code | گودین کد | `CODE` | web, mobile, AI agents, technical consulting |
| Future | Good In X | گودین X | width ≤31 cells | added through the registry |

**Rules**
- "Good In" never changes; the second word does.
- The canonical mark is the Latin pixel logo.
- Latin brand text inside Persian sentences is wrapped in `<span lang="en" dir="ltr">`. Attribute strings (`data-guide-say`) use the Persian form.

**Registry: `src/components/brand/brands.ts`** (static, prerendered)
```ts
export interface BrandDef { id: string; suffix: string; label: "brandTeam"|"brandStudio"|"brandCode"; tagline: "brandTeamTagline"|"brandStudioTagline"|"brandCodeTagline"; href: string; icon: PixelIconName; master?: true }
export const brands = [
  { id: "team",   suffix: "TEAM",   label: "brandTeam",   tagline: "brandTeamTagline",   href: "/about",           icon: "about",  master: true },
  { id: "studio", suffix: "STUDIO", label: "brandStudio", tagline: "brandStudioTagline", href: "/services#studio", icon: "studio" },
  { id: "code",   suffix: "CODE",   label: "brandCode",   tagline: "brandCodeTagline",   href: "/services#code",   icon: "code" },
] as const satisfies readonly BrandDef[];
export type BrandId = (typeof brands)[number]["id"];
export const brandIds = brands.map((b) => b.id) as [BrandId, ...BrandId[]];
export const brandOf = (meta?: { brand?: unknown } | null): BrandId =>
  brandIds.includes(meta?.brand as BrandId) ? (meta!.brand as BrandId) : "team";
export const isValidSuffix = (s: string) => toPixelText(s) === s && s.length > 0 && pixelTextWidth(s) <= 31;
```
- `label` keys live in `nav`; `tagline` keys live in `site`.
- Unit test: every brand passes `isValidSuffix`, and `brandLogoLayout(suffix)` is exactly 34×18.

**Services → brand.** `posts.meta.brand: z.enum(brandIds).optional()`, following the `meta.icon` pattern. Touch:
- `content/schemas.ts` (`postMetaInput`)
- the `PostCard.meta` type in `queries.ts`
- `editor-types.ts` and `editor-data.ts`
- a "Brand" select next to the icon select in `post-editor.tsx`

Set the brand on both locale rows (same `translationKey`).

**Seed mapping** (owner to confirm):
- `svc-web`, `svc-mobile` and `svc-ai` → `code`
- `svc-consult` → `team`
- add demo service `svc-design` (fa and en, `icon: "palette"`, slug `product-design`) → `studio`, so Studio is not empty in the demo

**Rename touchpoints (labels only)**
- `common.appName` and `appTagline`, `site.metaTitle`
- `settings.subtitle` and `apiSubtitle`
- `vault.recoveryFileHeader` and `importInvalid`
- `designSystem.subtitle`, `sampleFa` and `sampleEn`
- `typography.tsx:76` → `t.common.appName`
- the `settingsSchemas.profile.brandName` default `{fa:"گودین تیم",en:"Good In Team"}`, and `seed.ts` profile
- MCP `title` and instructions (keep `name: "good-team"`), OpenAPI title "Good In Team API"
- feed.xml `<generator>`
- ICS default PRODID `-//Good In Team//Calendar//EN` and the feed name `Good In Team — …`
- `vault-settings.tsx:622` source label
- README, AGENTS and package.json `description`
- `globals.css` and `logo.tsx` comments
- JSON-LD Organization `alternateName: ["Good In Team","گودین تیم"]`
- Add `goodin` and `goodinteam` to both weak-password lists (keep `goodteam`)

**Never renamed**
- `gt_session` and the `gt_` token prefix
- every `gt-*` cookie and storage key, and `gt_cal_hidden`
- `good-team-vault-backup`
- the calendar UID host `goodteam`
- MCP `SERVER_INFO.name 'good-team'` and realm `good-team`
- the `goodteam-data` volume, `/srv/goodteam` and `goodteam-backup-*`
- the package name `good-team`
- the demo credentials and test domains `goodteam.ir`
- invoice prefix `GT-`
- test fixtures that pass `"Good Team"` as data (`ics.test.ts`, `placeholders.test.ts`)

**Production data.** `settings.profile.brandName` is stored. After deploy, change it in Settings → Profile. Add this to the `docs/HANDOFF.md` deployment checklist.

### Logo usage map (integer cells only; sizes via `cell` / `--cell`)

| Surface | Component | Cells → px |
|---|---|---|
| Menu bar brand | `PixelMark` (11×11) | 2 → 22px |
| Dock Home tile, panel Dashboard tile | `PixelMark` | 3 → 33px (inside 48 tile) |
| Favicon `src/app/icon.svg` | mark paths on paper | viewBox 0 0 11 11 |
| Hero diagram hub | `PixelLogoCycle` once | 2 (<lg) / 3 (lg+) |
| Brand family big logo | `PixelLogo` + `:has()` swap | 4 (<md) / 6 (md) / 8 (lg+) |
| Brand cells, /services brand headers, footer brand column, brand menu header | `PixelLogo` | 2 or 3 |
| Footer wordmark | `PixelLogo TEAM paper=false` | 6 (<md) / 8 (md) / 12 (lg+) |
| OG images | paths in `og.tsx` | 10 |
| `LogoMark`/`Logo` (11 call sites, print docs) | same API on `PixelMark`/`PixelLogo` | `size-8` default |

---

## 3. Design tokens

### 3.1 Rules for `globals.css`
- `:root {`, `.dark {`, `@theme inline {` and every `[data-preset="x"] {` stay **flat** (no nesting, no `@media` inside). The test reads each block up to the first `}`.
- Export `DEFAULT_PRESET = "yellow"` from `theme.ts`. Use it in `presetInitScript` (`p!==DEFAULT`), in `usePreset` (fallback, server snapshot, remove-attribute) and in `design-tokens.test.ts:45`.
- `colorPresets = ["yellow","green","cyan","purple","blue","orange","red"]`, with `presetSwatches.yellow = "#FFC50D"`.
- `AppearanceMenu` becomes `grid-cols-7`. The swatch `aria-label` is `t.settings["preset_"+p]`, which fixes the raw-id bug.
- **`--primary-foreground: #ffffff` must be added explicitly** to the `green`, `cyan`, `purple`, `blue` and `red` blocks, because `:root` is now ink (otherwise purple is 2.68:1). Orange keeps `#1c252e`. Mirror all of this in `presetScales`.
- `viewport.themeColor`: light `#F3F3F3`, dark `#161618`. Manifest `background_color` and `theme_color`: `#F3F3F3`.

### 3.2 Values
```css
:root {
  --radius: 0.75rem;
  --primary-lighter: #fff3c4; --primary-light: #ffdb66; --primary: #ffc50d;
  --primary-dark: #7a5a00; --primary-darker: #4d3800;
  --primary-foreground: #1c1c1e; --primary-rgb: 255 197 13;
  --primary-ink: var(--primary-dark);
  --primary-hover: color-mix(in oklab, var(--primary) 86%, black);
  --background: #f3f3f3; --foreground: #1c1c1e;
  --card: #ffffff; --card-foreground: #1c1c1e;
  --popover: #ffffff; --popover-foreground: #1c1c1e;
  --secondary: #e8e8ea; --secondary-foreground: #1c1c1e;
  --muted: #e8e8ea; --muted-foreground: #636366;
  --accent: rgb(106 106 108 / 0.08); --accent-foreground: #1c1c1e;
  --destructive: #ce2c31; --destructive-foreground: #ffffff;
  --border: rgb(106 106 108 / 0.18); --input: rgb(106 106 108 / 0.32);
  --ring: var(--primary-ink);
  --success: #22c55e; --success-foreground: #ffffff;
  --warning: #f76b15; --warning-foreground: #1c1c1e; --warning-ink: #a04a00;
  --info: #00b8d9; --info-foreground: #ffffff;
  --violet: #8e33ff; --violet-foreground: #ffffff;
  --chart-1: #9a7200; --chart-2: #8e33ff; --chart-3: #0086a8; --chart-4: #118d57; --chart-5: #ce2c31;
  --sidebar: #ffffff; --sidebar-foreground: #636366;
  --sidebar-primary: var(--primary); --sidebar-primary-foreground: var(--primary-foreground);
  --sidebar-accent: color-mix(in oklab, var(--primary) 14%, transparent);
  --sidebar-accent-foreground: var(--primary-ink);
  --sidebar-border: rgb(106 106 108 / 0.12); --sidebar-ring: var(--primary-ink);
  --shadow-card: 0 0 0 1px rgb(0 0 0 / 0.04), 0 1px 2px rgb(0 0 0 / 0.05), 0 8px 24px -10px rgb(0 0 0 / 0.12);
  --shadow-dropdown: 0 0 0 0.5px rgb(0 0 0 / 0.08), 0 10px 30px -6px rgb(0 0 0 / 0.22);
  --shadow-dialog: 0 0 0 0.5px rgb(0 0 0 / 0.1), 0 30px 80px -12px rgb(0 0 0 / 0.35);
  --shadow-primary: 0 8px 16px 0 rgb(var(--primary-rgb) / 0.32);
  --shadow-window: 0 0 0 0.5px rgb(0 0 0 / 0.12), 0 22px 70px -14px rgb(0 0 0 / 0.3);
  --surface-grid: rgb(106 106 108 / 0.14); --surface-glow: rgb(var(--primary-rgb) / 0.2);
  --grey-rgb: 106 106 108;
  --brand-yellow: #ffc50d; --brand-ink: #6a6a6c; --brand-frame: #b3b5b9; --brand-soft: #caccce; --brand-paper: #f3f3f3;
  --desktop: #e6e6e9; --dots: rgb(106 106 108 / 0.28);
  --frame-line: #d8d9dc; --frame-rail: #c2c4c8;
  --marker-ring: #b3b5b9; --marker-fill: #f3f3f3; --marker-dot: #6a6a6c;
  --light-close: #ff5f57; --light-min: #febc2e; --light-zoom: #28c840; --light-idle: #caccce;
  --guide-line: #9a7200; --dock-dot: rgb(28 28 30 / 0.72);
}
.dark {
  --background: #161618; --foreground: #f5f5f7;
  --card: #1f1f22; --card-foreground: #f5f5f7;
  --popover: #232326; --popover-foreground: #f5f5f7;
  --secondary: #2a2a2d; --secondary-foreground: #f5f5f7;
  --muted: #2a2a2d; --muted-foreground: #a1a1a6;
  --accent: rgb(255 255 255 / 0.06); --accent-foreground: #f5f5f7;
  --border: rgb(255 255 255 / 0.1); --input: rgb(255 255 255 / 0.16);
  --primary-ink: var(--primary-light);
  --destructive: #ff6369; --destructive-foreground: #1c1c1e;
  --warning-foreground: #1c1c1e; --warning-ink: #ff9f43;
  --chart-1: var(--primary); --chart-3: #00b8d9; --chart-4: #22c55e; --chart-5: #ff6369;
  --sidebar: #161618; --sidebar-foreground: #a1a1a6;
  --sidebar-accent-foreground: var(--primary-light); --sidebar-border: rgb(255 255 255 / 0.08);
  --shadow-card: 0 0 0 1px rgb(255 255 255 / 0.06), 0 8px 24px -10px rgb(0 0 0 / 0.5);
  --shadow-dropdown: 0 0 0 0.5px rgb(255 255 255 / 0.1), 0 10px 30px -6px rgb(0 0 0 / 0.6);
  --shadow-window: 0 0 0 0.5px rgb(255 255 255 / 0.14), 0 26px 80px -12px rgb(0 0 0 / 0.7);
  --surface-grid: rgb(255 255 255 / 0.06); --surface-glow: rgb(var(--primary-rgb) / 0.16);
  --brand-ink: #a3a4a8; --brand-frame: #4a4b4f; --brand-soft: #5e5f63; --brand-paper: #2a2a2d;
  --desktop: #0e0e10; --dots: rgb(255 255 255 / 0.07);
  --frame-line: #2c2c30; --frame-rail: #3a3b3f;
  --marker-ring: #4a4b4f; --marker-fill: #161618; --marker-dot: #a3a4a8;
  --light-idle: #3a3b3f; --guide-line: #ffc50d; --dock-dot: #ffc50d;
}
[data-preset="green"] { --primary-lighter: #c8fad6; --primary-light: #5be49b; --primary: #00a76f; --primary-dark: #007867; --primary-darker: #004b50; --primary-rgb: 0 167 111; --primary-foreground: #ffffff; }
/* cyan / purple / blue / red keep their values and gain --primary-foreground: #ffffff; orange unchanged */
```

**`@theme inline` additions**
- Colors: `--color-primary-ink`, `--color-primary-hover`, `--color-warning-ink`, `--color-desktop`, `--color-frame-line`, `--color-brand-yellow`, `--color-brand-ink`, `--color-brand-frame`, plus `--shadow-window`.
- Neutral grey scale:

  | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 |
  |---|---|---|---|---|---|---|---|---|---|
  | #fafafa | #f3f3f3 | #e8e8ea | #caccce | #b3b5b9 | #8e8e93 | #6a6a6c | #48484a | #2c2c2e | #1c1c1e |

- Replace all 17 `rgb(145 158 171 / α)` with `rgb(var(--grey-rgb) / α)`. This includes `design-tokens.ts`, `og.tsx` and the print components.

**`design-tokens.ts`.** Mirror the yellow scale and all surface, status, chart and grey changes. Add a `chromeTokens` array (brand, frame, marker, lights, guide, dock-dot) with a new test case. Add `warning-ink` and `primary-ink`/`primary-hover` to whichever arrays the test reads.

### 3.3 Token migrations (codemods, run once in foundation)

| Find | Replace with | Count |
|---|---|---|
| `text-primary` (not followed by `-`) | `text-primary-ink` | 83 |
| `hover:text-primary` | `hover:text-primary-ink` | 46 |
| `hover:bg-primary-dark` | `hover:bg-primary-hover` | ~12 |
| `ring-primary` used as a focus or state ring | `ring-primary-ink` | 23 |
| `border-primary` with no alpha, marking state | `border-primary-ink` | — |

- `border-primary/NN` is decorative and stays.
- `text-warning` → `text-warning-ink` (36).
- Button `link` variant → `text-primary-ink`.
- Badges: `warning` text becomes `text-[#a04a00] dark:text-[#ff9f43]`; `destructive` text becomes `text-[#b0242a] dark:text-[#ff9592]`.
- Any `bg-destructive text-white` → `text-destructive-foreground`.
- `.prose-gt a`, the blockquote border and `h2 a:hover::after` → `var(--primary-ink)`.
- `* { outline-ring/50 }` → `outline-ring`.
- `.gt-accent` becomes a highlighter:
  - Light: `background: linear-gradient(transparent 58%, rgb(var(--primary-rgb)/.55) 58% 92%, transparent 92%)`, `color: inherit`, `box-decoration-break: clone`.
  - Dark: `color: var(--primary); background: none`.
  - Delete the `[dir=rtl]` variant.
- `.text-gradient` → `primary-ink → foreground`.
- `.gt-ring` → `rgb(var(--primary-rgb)/.55)` to `rgb(var(--grey-rgb)/.14)`, with no violet.
- `.gt-glow` → `background: radial-gradient(closest-side, var(--surface-glow), transparent)` with **no `filter: blur`**.
- `.gt-dot` → a 6px square `var(--primary)` with a `0 0 0 1px var(--brand-ink)` ring.
- `.gt-ants` → static dashes (no animation). `.gt-packet` → `animation-iteration-count: 6`.
- Cover palette (`cover.tsx`): `["#FFC50D","#1C1C1E","#6A6A6C","#FFDB66","#48484A","#B3B5B9"]`. The icon is ink on light covers and white on dark ones.
- Catalog swatches (`data-display.tsx:142`): `["#FFC50D","#00A76F","#078DEE","#7635DC","#F76B15","#CE2C31"]`. Update the `colors.tsx` page colours to #F3F3F3 / #161618.

### 3.4 Contrast rules (measured)

| Colour | Allowed | Never |
|---|---|---|
| #FFC50D | Fills (buttons, chips, CTA panel, markers, handles, highlighter); dark-mode text (11.4:1 on #161618) | Text, icon or thin line on light surfaces (1.43:1 on #F3F3F3); white on yellow (1.59) |
| Text on yellow | #1C1C1E (10.73) | anything lighter than #3A3A3C |
| #7A5A00 (`--primary-ink` light) | text, links, icons, focus rings (5.75 on #F3F3F3, 6.38 on #FFF; 4.03 as an inset ring on yellow) | — |
| #9A7200 | chart marks, guide dashed outline, dashed chip borders (3.96 on #F3F3F3) | body text |
| #FFDB66 (`--primary-ink` dark) | text in dark mode (13.4 on #161618) | light surfaces |
| #636366 / #A1A1A6 | muted text (5.40 / 4.89 on #E8E8EA; 7.03 / 5.56 on #2A2A2D) | — |
| #6A6A6C brand ink | logo, markers, large text | small muted text |
| #B3B5B9, #CACCCE | frames, rails, idle lights, logo suffix | any text or meaningful icon |
| Destructive | #CE2C31 + white (5.21); dark #FF6369 + ink (5.87); dark text 6.23 | white on #FF5630 |
| Warning | fill #F76B15 + ink (5.73); text uses `--warning-ink` (#A04A00 5.45 / #FF9F43 8.86) | `text-warning` |
| Menu row highlight | yellow fill + #1C1C1E text + inset 1.5px `--primary-dark` ring on focus | yellow as the only focus signal |

Re-run the dataviz check (`docs/design-system.md` L115–127) after the chart changes.

### 3.5 Typography

**Fonts.** No new font files.
- Vazirmatn (fa) at 400/500/700/800.
- Public Sans (en) at 400/500/600/700.
- JetBrains Mono (`preload:false`) is never used above the fold on home.

| Token | en | fa | Mobile en / fa |
|---|---|---|---|
| display (hero h1) | 56/1.02, 700, −0.035em | 48/1.3, 800 | 36/1.08 · 32/1.35 |
| h2 | 40/1.08, 700, −0.03em | 36/1.35, 800 | 28/1.15 · 28/1.4 |
| h3 | 20/1.3, 700 | 20/1.6, 700 | 18 |
| lead | 18/1.6 muted | 18/1.9 | 17 |
| body | 16/1.6 | 16/1.9 | — |
| OS UI (menu bar, menus, dock labels) | 13px, 500 (`--menubar-fs`) | 14px, 500 | mobile dock labels: en 11px, fa 12px |

**Rules**
- Negative tracking only under `:lang(en)`.
- `text-balance` on headings, `text-pretty` on leads.
- `tabular-nums` for numbers.
- Digits go through `fmtNum`.

---

## 4. Pixel asset system

### 4.1 `src/components/brand/pixel-font.ts` (extend; existing tests stay green)
- **Glyphs:**
  - `/`: `["..#","..#",".#.",".#.",".#.","#..","#.."]`
  - `.`: `[".",".",".",".",".",".","#"]`
  - `:`: `[".",".","#",".",".","#","."]`
  - `+`: `[".....","..#..","..#..","#####","..#..","..#..","....."]`
  - `~`: `[".....",".....",".#..#","#.##.",".....",".....","....."]`
- `PixelTone` adds `"face" | "eye"`.
- `layoutFromGrid(rows: string[], tones: Record<string, PixelTone>): BrandLogoLayout`.
- `toPaths(cells): Partial<Record<PixelTone, string>>`. It merges horizontal runs (same algorithm as `toRects`) and emits `M{x} {y}h{w}v1h-{w}z` per run, **one `d` string per tone**.
- Keep `toRects` for back-compat and tests.

### 4.2 Rendering components
**`pixel-logo.tsx` (rewrite internals, keep exports).** `PixelSvg` renders a paper `<rect>` (when `paper`) plus one `<path fill=… d=…>` per tone. It uses `shapeRendering="crispEdges"`, `className="px-art"`, and inline style `--px-w`/`--px-h` (cells).
- `cell?: 1|2|3|4|6|8|10|12` maps through a **literal class map** to `[--cell:Npx]`. Responsive sizes are added through `className` (e.g. `md:[--cell:6px] lg:[--cell:8px]`).
- `pixel.css`: `.px-art{inline-size:calc(var(--px-w)*var(--cell,2px));block-size:calc(var(--px-h)*var(--cell,2px))}`.
- Never use `%` or `vw` sizing.

New exports:
- `PixelLogoCycle({ suffixes = ["TEAM","STUDIO","CODE"], play = true, cell, className, title })`: the frame and `GOOD IN` once, plus one `<g class="gi-sfx" data-sfx=…>` path per suffix. With `play`, runs the once-only cycle (§4.4).
- `PixelLogoSwap({ id, cell })`: all three suffixes, TEAM visible, swapped by `:has()` (§4.4).

**`pixel-art.tsx` (new, server-safe, no hooks):**
- `PixelText({ text, cell, tone })`: Latin only; always `aria-hidden`; `dir="ltr"`.
- `PixelIcon({ name, cell = 2 })`: 12×12.
- `PixelAvatar({ pose = "idle", cell })`: static, a single frame.
- `PixelAvatarSprite({ cell })`: every variable part as its own `<g>` for CSS frame switching.

Fills use `var(--px-accent, var(--brand-yellow))` and `var(--px-ink, var(--brand-ink))`, so tiles can re-tone them (the yellow Contact tile sets `--px-accent:#1C1C1E`).

**Budget.** Pixel-art SVG elements on home ≤250 (svg + g + path + rect).

### 4.3 Data files
**`pixel-icons.ts`.** 12×12 icons using `#` = ink, `y` = accent, `.` = empty. The set is exactly perf §3.1: work, services, blog, learn, about, studio, code, contact, sign-in, more, plus `search`, `globe`. Test: 12×12 and allowed characters only.

**`pixel-avatar.ts`.** The perf 16×16 sprite.
- Tones: `k` ink #6A6A6C, `f` face #F3F3F3, `e` eyes #1C1C1E, `y` hoodie #FFC50D. The same palette applies in both modes.
- Variable groups: `.eyes`, `.eyes-closed`, `.mouth`, `.mouth-talk`, `.feet-idle`, `.feet-a`, `.feet-b`, `.wave`.
- `head` = rows 1–10, used for the menu-bar extra and the panel Me tile.
- Test: 16×16 and valid tones.

```
r1  .....kkkkkk.....   r2  ....kkkkkkkk....   r3  ...kkkkkkkkkk...   r4  ...kkffffffkk...
r5  ...kffffffffk...   r6  ...kfeffffefk...   r7  ...kffffffffk...   r8  ...kfffeefffk...
r9  ....kffffffk....   r10 .....kkkkkk.....   r11 ....yyyyyyyy....   r12 ...yyyyyyyyyy...
r13 ..yyyyyyyyyyyy..   r14 ..yyy.yyyy.yyy..   r15 ....kk....kk....  (r0 empty)
blink r6 ...kffffffffk...  talk r8 ...kffeeeeffk... r9 ....kffeeffk....  walkA r15 ...kk......kk...  walkB r15 .....kk..kk.....
wave overlay: f (14,8),(14,9); y (13,10),(13,11)
```

### 4.4 CSS in `src/app/styles/pixel.css`

**Frames.** `.px-sprite[data-state=…]` switches groups with `steps(1)`:
- blink: 120ms every 4.2s
- walk: 2 frames × 160ms
- talk: 2 frames × 180ms
- wave: 4 frames × 2 iterations

Under `prefers-reduced-motion` or `html[data-motion=reduce]`: `animation:none`, and the idle groups are visible.

**Once-only cycle** (`.gi-cycle[data-play]`), 4.2s total, ending on TEAM:
- TEAM visible 0–24% and 76–100%.
- STUDIO 24–50%.
- CODE 50–76%.
- Each entrance does a 3-step `clip-path: inset(0 100% 0 0) → inset(0)` wipe.
- The logo is Latin and sits in a `dir=ltr` wrapper.
- Reduced motion: TEAM only, static.

**Swap.** `.gi-swap:has(…)` hooks, keyed by `data-sfx`. Consumers write the `:has()` rules in their own partial, e.g. `.brand-family:has([data-brand=studio]:is(:hover,:focus-within)) .gi-sfx[data-sfx=STUDIO]{opacity:1}`.

**`.px-corners`.** 4px stepped corners via an 8-point `clip-path`. Focus rings go on an unclipped parent.

---

## 5. Shared OS primitives and CSS architecture

### 5.1 CSS files
Add these imports in `globals.css` right after `@import "tw-animate-css";`, in this order:
```css
@import "./styles/os-shell.css";   /* foundation */
@import "./styles/frame.css";      /* foundation */
@import "./styles/pixel.css";      /* foundation */
@import "./styles/site-shell.css"; /* site-shell */
@import "./styles/home.css";       /* home */
@import "./styles/site-pages.css"; /* site-pages */
@import "./styles/guide.css";      /* assistant */
@import "./styles/panel-shell.css";/* panel-shell */
```
**Rules for partials**
- Class rules go in `@layer components`; `html` variables go in `@layer base`; `@keyframes` stay at top level.
- **Never write `:root {` or `.dark {` in a partial.** Use `html {}` and `.dark .x`.
- Partials do not use `@apply dark:`.
- Foundation creates every file; non-foundation files start as headed stubs.

### 5.2 Shell variables and utilities (`os-shell.css`)
```css
@layer base {
  html { --menubar-h:44px; --menubar-fs:13px; --dock-pref:48px; --dock-pad:6px; --dock-gap:12px;
    --dock-h:calc(var(--dock-pref) + 2*var(--dock-pad));
    --dock-space:calc(var(--dock-h) + 2*var(--dock-gap) + env(safe-area-inset-bottom));
    --chrome-top:var(--menubar-h);
    --frame-max:1200px; --gutter:16px; --section-gap:48px; --cell-pad:24px; --frame-l:3px; --dir:1;
    --ease-os:cubic-bezier(.2,.8,.2,1); --ease-out-expo:cubic-bezier(.22,1,.36,1);
    scroll-padding-top:calc(var(--chrome-top) + 16px); scroll-padding-bottom:calc(var(--dock-space) + 8px); }
  html:lang(fa) { --menubar-fs:14px; }
  html[dir=rtl] { --dir:-1; }
  @media (width<48rem) { html:not(:has(.panel-shell)) { --dock-h:60px; --dock-gap:8px; } }
  @media (width<64rem) { html:has(.panel-shell) { --dock-h:60px; --dock-gap:8px; } }
  @media (width>=48rem) { html { --cell-pad:32px; } }
  @media (width>=48rem) and (pointer:fine) { html:not(:has(.panel-shell)) { --menubar-h:32px; } }
  @media (width>=64rem) { html { --gutter:24px; --section-gap:64px; } }
  @media (width>=64rem) and (pointer:fine) { html:has(.panel-shell) { --menubar-h:32px; } }
  @media (width>=80rem) { html { --gutter:32px; --section-gap:80px; } }
  html[data-dock-size="40"]:has(.panel-shell) { --dock-pref:40px; }
  html[data-dock-size="56"]:has(.panel-shell) { --dock-pref:56px; }
  html[data-dock-autohide]:has(.panel-shell) { --dock-space:calc(16px + env(safe-area-inset-bottom)); }
  html:has([data-reading]) { --dock-pref:40px; }
}
@utility below-chrome { top: calc(var(--chrome-top) + 1.5rem); }
@utility top-chrome { top: var(--chrome-top); }
@utility above-dock { bottom: calc(var(--dock-space) + .5rem); }
@utility pb-dock { padding-bottom: calc(var(--dock-space) + 1.5rem); }
@utility max-h-chrome { max-height: calc(100dvh - var(--chrome-top) - var(--dock-space) - 3rem); }
```
- `html:has(.panel-shell)` is a class-only `:has()` subject, so it is cheap. It stays correct across soft navigation between the site and the panel, which an attribute set by a pre-paint script would not.
- `--dock-space` always uses the preferred size (the upper bound), so content reservation never depends on the session.

### 5.3 Menu bar base (`src/components/shell/menubar-shell.tsx`, server-safe)
`<MenuBarShell label start end className>` renders:
```html
<header class="os-menubar">
  <nav aria-label={label} class="os-mb-start">{start}</nav>
  <div class="os-mb-spacer" />
  <div class="os-mb-end">{end}</div>
</header>
```
```css
.os-menubar{position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:2px;block-size:var(--menubar-h);padding-inline:8px;
  font-size:var(--menubar-fs);line-height:1;background:var(--background);border-block-end:1px solid var(--frame-line)}
@media (width>=48rem){@supports (backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px)){.os-menubar{
  background:color-mix(in oklab,var(--background) 78%,transparent);-webkit-backdrop-filter:saturate(180%) blur(16px);backdrop-filter:saturate(180%) blur(16px);
  border-block-end-color:rgb(var(--grey-rgb)/.16)}}}
@media (prefers-reduced-transparency:reduce){.os-menubar{background:var(--background);backdrop-filter:none}}
.os-mb-spacer{flex:1}
.os-mb-item{block-size:24px;padding-inline:10px;border-radius:6px;display:inline-flex;align-items:center;gap:6px;font-weight:500;color:var(--foreground);white-space:nowrap}
.os-mb-icon{inline-size:28px;block-size:24px;justify-content:center;padding:0}
.os-mb-item:hover,.os-mb-item[aria-current=page],.os-mb-item[aria-expanded=true],.os-mb-item[data-state=open]{background:rgb(var(--grey-rgb)/.14)}
.os-mb-item[aria-current=page]{font-weight:700}
.os-mb-item:focus-visible{outline:2px solid var(--ring);outline-offset:-2px}
@media (width<48rem),(pointer:coarse){.os-mb-item{block-size:36px;min-inline-size:36px}}
```

### 5.4 Menus
- `.os-menu` is visual only, shared by site popovers and panel Radix content.
- `.os-popmenu` is native-popover positioning on the site only.
```css
.os-menu{min-inline-size:224px;max-inline-size:min(320px,100vw - 16px);padding:5px;border-radius:10px;border:1px solid rgb(var(--grey-rgb)/.2);
  color:var(--popover-foreground);background:color-mix(in oklab,var(--popover) 97%,transparent);box-shadow:var(--shadow-dropdown)}
.os-popmenu{position:fixed;inset:auto;margin:0;top:calc(var(--menubar-h) + 4px);transform-origin:top center;
  transition:opacity .12s,scale .12s var(--ease-os),display .12s allow-discrete,overlay .12s allow-discrete}
.os-popmenu:not(:popover-open){opacity:0;scale:.98}
@starting-style{.os-popmenu:popover-open{opacity:0;scale:.98}}
.os-popmenu[data-align=start]{inset-inline-start:8px}.os-popmenu[data-align=end]{inset-inline-end:8px}
@supports (anchor-name:--a){.os-popmenu[data-anchor]{position-anchor:var(--anchor)}
  .os-popmenu[data-anchor][data-align=start]{inset-inline-start:anchor(start)}
  .os-popmenu[data-anchor][data-align=end]{inset-inline-start:auto;inset-inline-end:anchor(end)}}
.os-menu-item{display:flex;align-items:center;gap:8px;min-block-size:28px;padding-inline:10px;border-radius:6px;font-size:var(--menubar-fs);outline:none}
.os-menu-item:hover,.os-menu-item:focus-visible,.os-menu-item[data-highlighted]{background:var(--primary);color:var(--primary-foreground)}
.os-menu-item:focus-visible,.os-menu-item[data-highlighted]{box-shadow:inset 0 0 0 1.5px var(--primary-dark)}
.os-menu-sep{block-size:1px;margin:5px 10px;background:rgb(var(--grey-rgb)/.2)}
.os-menu-label{padding:6px 10px 2px;font-size:12px;color:var(--muted-foreground)}
.os-menu-shortcut{margin-inline-start:auto;color:var(--muted-foreground);direction:ltr;unicode-bidi:isolate;font-size:12px}
@media (pointer:coarse){.os-menu-item{min-block-size:40px}}
@media (prefers-reduced-motion:reduce){.os-popmenu{transition:none}}
```
- Trigger buttons set `style={{anchorName:"--x"}}` and popovers set `style={{"--anchor":"--x"}}` (or use the CSS class equivalents).
- Menus have **no blur**, so blurred layers never stack.

### 5.5 Dock base (`src/components/shell/dock.tsx` server-safe + `dock-links.tsx` client)

**Markup**
```html
<nav class="os-dock" data-magnify data-tabbar="md|lg" aria-label=… style="--dock-n:N;--dock-seps:S">
  <ul class="os-dock-list">
    <li data-app data-dock="both|desktop|mobile">
      <a class="os-dock-item" aria-current?>
        <span class="os-tile px-corners" data-variant="paper|brand|accent|mark">ICON</span>
        <span class="os-dock-label">Label</span>
        <span class="os-dock-pending" data-on? aria-hidden />
      </a>
    </li>
    <li data-sep aria-hidden></li>
    …
  </ul>
</nav>
```

**API**
```ts
type DockEntry =
  | { kind: "link"; key: string; href: string; section?: string; exact?: boolean; label: string; icon: ReactNode;
      variant?: "paper"|"brand"|"accent"|"mark"; show?: "both"|"desktop"|"mobile"; prefetch?: boolean; external?: boolean; attrs?: Record<string,string> }
  | { kind: "sep"; key: string; show?: "both"|"desktop"|"mobile" }
  | { kind: "slot"; key: string; node: ReactNode; show?: "both"|"desktop"|"mobile" };   // More button, Me tile
<Dock label tabbar="md"|"lg" magnify n seps className>{children}</Dock>
<DockLinks entries={DockEntry[]} running={string[]} />   // client
```
- `DockLinks` computes `aria-current` with `isActivePath(stripLocale(pathname).path, section, exact)` (`shell/match.ts`, unit-tested).
- It wraps itself in `<Suspense>`, with a fallback that is the same list with no active item.
- `DockPending` is a child of each `<Link>` and uses `useLinkStatus()` to toggle `data-on`.
- Icons are server `ReactNode` props.
- An entry with no `section` is never active (the brand tiles).
- `external` → `<a target="_blank" rel="noopener">` with a visually hidden "(opens in a new tab)" from props.

**CSS**
```css
.os-dock{position:fixed;z-index:40;inset-inline:0;bottom:calc(var(--dock-gap) + env(safe-area-inset-bottom));margin-inline:auto;
  inline-size:max-content;max-inline-size:calc(100vw - 2*var(--gutter));pointer-events:none;--dock-tile:var(--dock-pref);--S:calc(var(--dock-tile) + 8px)}
.os-dock-list{pointer-events:auto;position:relative;isolation:isolate;display:flex;align-items:flex-end;margin:0;padding:var(--dock-pad);list-style:none;
  block-size:calc(var(--dock-tile) + 2*var(--dock-pad));contain:layout style}
.os-dock-list::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:18px;border:1px solid rgb(var(--grey-rgb)/.2);background:var(--card);
  box-shadow:0 10px 30px -10px rgb(0 0 0/.25);transition:inset .18s var(--ease-os)}
@media (width>=48rem){@supports (backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px)){.os-dock-list::before{
  background:color-mix(in oklab,var(--background) 72%,transparent);-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px);
  box-shadow:0 10px 30px -10px rgb(0 0 0/.25),inset 0 1px 0 rgb(255 255 255/.35)}}}
@media (prefers-reduced-transparency:reduce){.os-dock-list::before{background:var(--card);backdrop-filter:none}}
.os-dock-list>li{position:relative;inline-size:var(--S);display:flex;justify-content:center;transform-origin:50% 100%;
  transition:scale .18s var(--ease-os),translate .18s var(--ease-os)}
.os-dock-list>li[data-sep]{inline-size:17px;align-self:center;block-size:calc(var(--dock-tile)*.66)}
.os-dock-list>li[data-sep]::before{content:"";position:absolute;inset-block:0;inset-inline-start:8px;inline-size:1px;background:rgb(var(--grey-rgb)/.3)}
.os-dock-item{position:relative;display:grid;place-items:center;inline-size:var(--dock-tile);block-size:var(--dock-tile);border-radius:12px}
.os-tile{inline-size:100%;block-size:100%;display:grid;place-items:center;background:var(--card);box-shadow:inset 0 0 0 1px rgb(0 0 0/.06)}
.dark .os-tile{background:#2a2a2d}
.os-tile[data-variant=accent]{background:var(--primary);--px-accent:#1c1c1e;--px-ink:#1c1c1e}
.os-tile[data-variant=brand]{background:
  linear-gradient(var(--brand-ink) 0 0) left 4px top 4px/3px 3px no-repeat,
  linear-gradient(var(--brand-frame) 0 0) left 4px top 4px/calc(100% - 8px) 3px no-repeat,
  linear-gradient(var(--brand-frame) 0 0) left 4px top 4px/3px calc(100% - 8px) no-repeat,var(--card)}
[dir=rtl] .os-tile[data-variant=brand]{/* mirror: right 4px for the corner cell and the vertical bar */}
/* magnification: only fine pointers, motion allowed, data-magnify present */
@media (hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference){
  html:not([data-motion=reduce]) .os-dock[data-magnify] li[data-app]:hover{scale:1.5;z-index:1}
  html:not([data-motion=reduce]) .os-dock[data-magnify] li[data-app]:hover+li{translate:calc(var(--S)*.375*var(--dir)) 0}
  html:not([data-motion=reduce]) .os-dock[data-magnify] li[data-app]:hover+li[data-app]{scale:1.25}
  html:not([data-motion=reduce]) .os-dock[data-magnify] li[data-app]:hover+li+li{translate:calc(var(--S)*.55*var(--dir)) 0}
  html:not([data-motion=reduce]) .os-dock[data-magnify] li[data-app]:hover+li+li[data-app]{scale:1.1}
  html:not([data-motion=reduce]) .os-dock[data-magnify] li[data-app]:hover+li+li~li{translate:calc(var(--S)*.6*var(--dir)) 0}
  html:not([data-motion=reduce]) .os-dock[data-magnify] li:has(+li[data-app]:hover){translate:calc(var(--S)*-.375*var(--dir)) 0}
  html:not([data-motion=reduce]) .os-dock[data-magnify] li[data-app]:has(+li[data-app]:hover){scale:1.25}
  html:not([data-motion=reduce]) .os-dock[data-magnify] li:has(+li+li[data-app]:hover){translate:calc(var(--S)*-.55*var(--dir)) 0}
  html:not([data-motion=reduce]) .os-dock[data-magnify] li[data-app]:has(+li+li[data-app]:hover){scale:1.1}
  html:not([data-motion=reduce]) .os-dock[data-magnify] li:has(+li+li~li[data-app]:hover){translate:calc(var(--S)*-.6*var(--dir)) 0}
  html:not([data-motion=reduce]) .os-dock[data-magnify] .os-dock-list:has(>li[data-app]:hover)::before{inset-inline:calc(var(--S)*-.6)}
  .os-dock-list:hover>li{will-change:scale,translate}
  .os-dock-item:has(>.os-dock-pending[data-on]) .os-tile{animation:os-bounce .6s var(--ease-os) infinite}
}
@keyframes os-bounce{0%,100%{translate:0 0}40%{translate:0 -14px}}
.os-dock-label{position:absolute;bottom:calc(100% + 10px);inset-inline-start:50%;translate:calc(-50%*var(--dir)) 0;padding:5px 10px;border-radius:6px;
  font:500 12px/1 var(--font-sans);white-space:nowrap;background:color-mix(in oklab,var(--popover) 95%,transparent);border:1px solid rgb(var(--grey-rgb)/.2);
  box-shadow:var(--shadow-dropdown);opacity:0;pointer-events:none;transition:opacity .12s}
:lang(fa) .os-dock-label{font-family:var(--font-fa)}
.os-dock li:hover .os-dock-label{opacity:1}
.os-dock[data-magnify] li[data-app]:hover .os-dock-label{scale:.6667;transform-origin:50% 100%}
.os-dock-item:focus-visible .os-dock-label{opacity:1}
.os-dock-item:focus-visible{outline:2px solid var(--ring);outline-offset:3px}
.os-dock-item[aria-current=page]::after,.os-dock-item[data-running]::after{content:"";position:absolute;bottom:-5px;inset-inline-start:50%;
  translate:calc(-50%*var(--dir)) 0;inline-size:4px;block-size:4px;background:var(--dock-dot)}
```

**Tab-bar mode.** Written twice: under `@media (width<48rem)` for `.os-dock[data-tabbar=md]` and under `@media (width<64rem)` for `.os-dock[data-tabbar=lg]`. Same body:
```css
.os-dock[data-tabbar=X]{inset-inline:12px;inline-size:auto;max-inline-size:none;bottom:calc(8px + env(safe-area-inset-bottom))}
… .os-dock-list{justify-content:space-around;block-size:60px}  … li{flex:1;inline-size:auto}
… .os-dock-item{inline-size:100%;block-size:48px;display:flex;flex-direction:column;gap:3px}
… .os-tile{inline-size:28px;block-size:28px;background:none;box-shadow:none}
… .os-dock-label{position:static;opacity:1;translate:none;padding:0;border:0;box-shadow:none;background:none;font-size:11px}
:lang(fa) … .os-dock-label{font-size:12px}
… li:active{scale:.92}  … [data-dock=desktop]{display:none}  … .os-dock-list::before{background:var(--card);backdrop-filter:none}
```
Outside tab-bar widths, `[data-dock=mobile]{display:none}`.

**Magnification maths.** The constants are exact for neighbouring tiles. A separator neighbour translates but never scales, which is accepted.

### 5.6 Lights, window, clock, boot, motion
**`OsLights({ size: 10|12 })`** (server): three `<span aria-hidden>` in `.os-lights`, using the octagon `clip-path: polygon(2px 0,8px 0,10px 2px,10px 8px,8px 10px,2px 10px,0 8px,0 2px)` (scaled for 12). Colours come from `--light-*`. Each `::after` has `background: var(--on)`.

**`Window({ path, elevated, tone: "default"|"ink", className, children })`** (server):
- `.os-win`: radius 10px, 1px `--frame-line`, `bg-card`, `shadow-card` (`elevated` → `--shadow-window`; only the hero window and the panel window).
- Bar: 32px with `OsLights 10` at inline-start, and `PixelText path cell=2 tone=ink` (`aria-hidden`, `dir=ltr`).
- `tone=ink`: background #1C1C1E, text #F3F3F3, in both modes.

**`OsClock({ locale, tz, label })`** (client, `shell/os-clock.tsx`):
- `useSyncExternalStore`: the server snapshot is `""`; the client snapshot is the formatted current minute.
- Subscribe: `setTimeout` to the next minute boundary, then 60,000ms intervals. Paused while `document.hidden`. Cleared on unmount.
- Formats:
  - fa: `Intl.DateTimeFormat("fa-IR-u-ca-persian",{weekday:"long",day:"numeric",month:"long",hour:"2-digit",minute:"2-digit",hourCycle:"h23",timeZone:tz})`. Join `formatToParts`, dropping literal commas.
  - en: `"en-GB"` with `weekday:"short",day:"numeric",month:"short"`.
- Output: `<time className="os-clock tabular-nums" dateTime={iso} title={label} aria-label={label+": "+text}>`.
- `.os-clock{min-inline-size:11.5em;text-align:end}`; `:lang(en) .os-clock{min-inline-size:9.5em}`. Export `ClockSkeleton` with the same width.
- **No `Date` during server render.** It is not a button.

**Boot and motion.** `bootInitScript` in `theme.ts`, rendered in the root `<head>` next to `presetInitScript`:
```js
try{var h=document.documentElement;if(localStorage.getItem("gt-motion")==="reduce")h.setAttribute("data-motion","reduce");
if(sessionStorage.getItem("gt-boot"))h.setAttribute("data-booted","");else sessionStorage.setItem("gt-boot","1")}catch(e){}
```
- `globals.css` base layer mirrors the reduced-motion kill switch for `html[data-motion=reduce] *`. Scroll-driven animations get `animation:none`.
- `os-shell.css`, under `(prefers-reduced-motion:no-preference)`:
  - `html:not([data-booted]):not([data-motion=reduce]) .os-menubar{animation:os-boot-bar .32s var(--ease-out-expo) both}` with `from{translate:0 -100%}`.
  - `… .os-dock{animation:os-boot-dock .44s var(--ease-out-expo) .12s both}` with `from{translate:0 calc(100% + 32px)}`.
  - Transforms only; the `<h1>` is untouched.
- `theme-controls.tsx` exports:
  - `useMotionPref()` → `{ reduced, setReduced }` (writes `localStorage gt-motion` and the `html[data-motion]` attribute).
  - `AppearanceModeToggle({ className })`: a native segmented control (three `<button aria-pressed>` for Light/Dark/System via `useTheme`, labels from `common`). It is site-safe (no Radix).

**Guide contract (`shell/guide-events.ts`, pure)**
- Constants:
  - `GUIDE_PREF_KEY = "gt-guide"` (`"off"` or absent)
  - `GUIDE_TIPS_KEY = "gt-guide-tips"` (`"off"` or absent)
  - `GUIDE_TEST_KEY = "gt-guide-test"`
  - `GUIDE_SEEN_KEY = "gt-guide-seen"` (sessionStorage JSON)
  - `GUIDE_EVENT = "gt:guide"` with `detail: {type: "explain"|"tour"|"show"|"hide"}`
  - `GUIDE_PREF_EVENT = "gt:guide-pref"`
- Functions: `readGuidePref()`, `writeGuidePref(on)` (dispatches the pref event), `dispatchGuide(type)`, `guideAttrs(key, say)` → `{ "data-guide": key, "data-guide-say": say }`, `spotAttrs(key, say)` → `{ "data-guide-spot": key, "data-guide-say": say }`.
- All storage access is wrapped in try/catch.

**`shell/shortcuts.ts`** (+ test): `isCommandPaletteShortcut`, copied from `panel-prefs.ts`. The panel later re-exports it.

---

## 6. Framed grid system

### 6.1 Primitives (`src/components/site/frame.tsx`, server-only)
- `FrameSection({ id, labelledBy?, ariaLabel?, guide?: {key, say}, strip?: { index?: number; path?: string; action?: ReactNode } | false, cv?: number, first?: boolean, className, children })`:
  - Renders `<section id aria-labelledby class="frame-box" {...guideAttrs}>`, then `FrameStrip` (when `strip`), then children (wrapped in `.frame-cv` with `--cis` when `cv`).
  - `first` uses a half section gap.
- `FrameStrip({ index, path, action })`: 36px. `OsLights 10` at inline-start; `PixelText` index (`01`); `PixelText` path (md+ only, `aria-hidden`); `action` at inline-end.
- `FrameGrid({ cols, reveal?, className, children })`. Literal map:
  ```
  1:"grid-cols-1"
  2:"md:grid-cols-2"
  3:"md:grid-cols-2 lg:grid-cols-3"
  4:"grid-cols-2 lg:grid-cols-4"
  "2-1":"lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
  hero:"lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
  ```
  `reveal` adds `.gt-reveal` to the grid.
- `FrameCell({ span?: "2"|"3"|"full"|"row2", tone?: "default"|"card"|"dots"|"ink"|"yellow", pad?: "none"|"md"|"lg", hover?, spot?: {key, say}, as?, className, children })`. Spans:
  ```
  2:"md:col-span-2"
  3:"md:col-span-2 lg:col-span-3"
  full:"col-span-full"
  row2:"lg:row-span-2"
  ```
- `FrameHeaderCell({ eyebrow?, title, titleId, subtitle?, action?, as: "h1"|"h2", span? })`: replaces `SectionHeading` inside frames.
- `FrameEyebrow` (dashed accent chip):
  - Light: `bg rgb(var(--primary-rgb)/.14)`, `1px dashed #9A7200`, text `--foreground`.
  - Dark: `rgb(var(--primary-rgb)/.12)`, dashed `rgb(var(--primary-rgb)/.6)`, text `#FFDB66`.
  - 6px square dot; 12px/600; height 26px.
- `FrameFiller({ units: {md, lg} })`: uses `fillerPlan(unitsMd, unitsLg)` (pure, in `frame-plan.ts`, unit-tested). It returns visibility per filler from this literal map:
  ```
  {md,lg}:"hidden md:block"
  {md}:"hidden md:block lg:hidden"
  {lg}:"hidden lg:block"
  ```
  Fillers are `tone=dots`, `aria-hidden`.
- `framePath(...segments)` → `"GOOD-IN-TEAM/WORK"` (Latin data, never copy).

### 6.2 CSS (`frame.css`)
```css
.os-desktop{position:relative;background:
  linear-gradient(var(--background) 0 0) 50% 0/min(calc(100% - 2*var(--gutter)),var(--frame-max)) 100% no-repeat,
  radial-gradient(var(--dots) 1px,transparent 1.5px) 0 0/12px 12px,var(--desktop)}
.os-desktop::before,.os-desktop::after{content:"";position:absolute;inset-block:0;inline-size:1px;pointer-events:none;
  background:linear-gradient(to bottom,var(--frame-rail) 50%,transparent 0) 0 0/1px 16px repeat-y}
.os-desktop::before{left:max(var(--gutter),calc(50% - var(--frame-max)/2))}
.os-desktop::after{right:max(var(--gutter),calc(50% - var(--frame-max)/2))}
.frame-box{position:relative;inline-size:min(100% - 2*var(--gutter),var(--frame-max));margin-inline:auto;margin-block-start:var(--section-gap);
  border:1px solid var(--frame-line);background:var(--background);
  box-shadow:calc(-1*var(--frame-l)*var(--dir)) calc(-1*var(--frame-l)) 0 0 var(--brand-frame);  /* logo L-frame, outside the border */
  view-timeline:--box block}
.frame-box[data-first]{margin-block-start:calc(var(--section-gap)/2)}
.frame-box::before,.frame-box::after{content:"";position:absolute;z-index:2;inset-inline:-5px;block-size:9px;pointer-events:none}
.frame-box::before{inset-block-start:-5px;background:   /* top-start: logo corner cell · top-end: ringed marker */
  linear-gradient(var(--brand-ink) 0 0) left 1px top 1px/3px 3px no-repeat,
  linear-gradient(var(--marker-dot) 0 0) right 3px top 3px/3px 3px no-repeat,
  linear-gradient(var(--marker-fill) 0 0) right 1px top 1px/7px 7px no-repeat,
  linear-gradient(var(--marker-ring) 0 0) right top/9px 9px no-repeat}
[dir=rtl] .frame-box::before{background:
  linear-gradient(var(--brand-ink) 0 0) right 1px top 1px/3px 3px no-repeat,
  linear-gradient(var(--marker-dot) 0 0) left 3px top 3px/3px 3px no-repeat,
  linear-gradient(var(--marker-fill) 0 0) left 1px top 1px/7px 7px no-repeat,
  linear-gradient(var(--marker-ring) 0 0) left top/9px 9px no-repeat}
.frame-box::after{inset-block-end:-5px;background:
  linear-gradient(var(--marker-dot) 0 0) left 3px top 3px/3px 3px no-repeat,linear-gradient(var(--marker-dot) 0 0) right 3px top 3px/3px 3px no-repeat,
  linear-gradient(var(--marker-fill) 0 0) left 1px top 1px/7px 7px no-repeat,linear-gradient(var(--marker-fill) 0 0) right 1px top 1px/7px 7px no-repeat,
  linear-gradient(var(--marker-ring) 0 0) left top/9px 9px no-repeat,linear-gradient(var(--marker-ring) 0 0) right top/9px 9px no-repeat}
/* hairlines: each cell draws its end + bottom line; the grid overlaps the box border by 1px → no holes in incomplete rows */
.frame-grid{display:grid;margin-inline-end:-1px;margin-block-end:-1px}
.frame-cell{position:relative;min-inline-size:0;padding:var(--cell-pad);background:var(--background);
  border-inline-end:1px solid var(--frame-line);border-block-end:1px solid var(--frame-line);transition:background-color .16s}
.frame-cell[data-pad=none]{padding:0}.frame-cell[data-pad=lg]{padding:calc(var(--cell-pad) + 8px)}
.frame-cell[data-tone=card],.frame-cell[data-hover]:hover{background:var(--card)}
.frame-cell[data-tone=dots]{background:radial-gradient(var(--dots) 1px,transparent 1.5px) 0 0/12px 12px,var(--background)}
.frame-cell[data-tone=ink]{background:#1c1c1e;color:#f3f3f3}
.frame-cell[data-tone=yellow]{background:var(--primary);color:var(--primary-foreground)}
@media (width>=48rem){
  .frame-cell::before,.frame-cell::after{content:"";position:absolute;z-index:1;inline-size:9px;block-size:9px;pointer-events:none;
    background:linear-gradient(var(--marker-dot) 0 0) 3px 3px/3px 3px no-repeat,linear-gradient(var(--marker-fill) 0 0) 1px 1px/7px 7px no-repeat,var(--marker-ring)}
  .frame-cell::before{inset-block-start:-5px;inset-inline-start:-5px}
  .frame-cell::after{inset-block-end:-5px;inset-inline-end:-5px}
  :is(.frame-box,.frame-cv)>.frame-grid:first-child>.frame-cell:first-child::before{display:none}  /* box origin is the logo corner */
  .frame-cell[data-hover]:hover::before,.frame-cell[data-hover]:hover::after{--marker-dot:var(--brand-yellow)}
}
.frame-strip{display:flex;align-items:center;gap:12px;block-size:36px;padding-inline:12px;border-block-end:1px solid var(--frame-line)}
.frame-strip .frame-strip-action{margin-inline-start:auto}
@media (width<48rem){.frame-strip .frame-path{display:none}}
.frame-strip .os-lights>span::after{opacity:1}
@supports (animation-timeline:view()){@media (prefers-reduced-motion:no-preference){
  html:not([data-motion=reduce]) .frame-strip .os-lights>span::after{animation:os-focus linear both;animation-timeline:--box;animation-range:cover 20% cover 80%}
  html:not([data-motion=reduce]) .gt-reveal{animation:gt-reveal linear both;animation-timeline:view();animation-range:entry 0% entry 40%}}}
@keyframes os-focus{0%,100%{opacity:0}12%,88%{opacity:1}}
@keyframes gt-reveal{from{opacity:0;translate:0 20px}to{opacity:1;translate:0 0}}
.frame-cv{content-visibility:auto;contain-intrinsic-size:auto var(--cis,640px);margin:-5px;padding:5px}
@media (forced-colors:active){.os-desktop{background:Canvas}.os-desktop::before,.os-desktop::after,.frame-box::before,.frame-box::after,
  .frame-cell::before,.frame-cell::after{display:none}}
@media print{.os-menubar,.os-dock,.gt-guide,.os-desktop::before,.os-desktop::after{display:none!important}}
```

**Layout rules**
- **Never** `overflow:hidden` or `content-visibility` on `.frame-box` or `.frame-grid` directly.
- **Never** `.frame-cv` around sticky children.
- Boxes are square. Rounded corners are only for `Window`s inside cells, and for the panel window.
- Dots appear only in the desktop margins and in `tone=dots` cells. Never behind body text.
- Pages contain no ad-hoc section `py-*`.

| Breakpoint | Gutter | Section gap | Cell padding | Grid | Markers |
|---|---|---|---|---|---|
| <768 | 16 | 48 | 24 | 1 col | box corners and L-frame only |
| 768–1023 | 16 | 48 | 32 | 2 col | all |
| 1024–1279 | 24 | 64 | 32 | 3 col | all |
| ≥1280 | 32 | 80 | 32 | 3 col | all |

**Row completion.** Design cell counts in multiples of 6. Streamed sections append `FrameFiller` from the server. The border technique keeps unexpected counts clean (no grey blocks).

---

## 7. Public site shell

### 7.1 Layout (`(site)/layout.tsx`)
```tsx
<I18nProvider locale messages={pickMessages(locale, ["common","nav"])}>
 <AlternatesProvider>
  <a href="#main" className="skip-link …">{t.common.skipToContent}</a>          {/* stays first */}
  <SiteMenuBar locale t />                                                   {/* header.os-menubar, sticky */}
  <div className="os-desktop">
    <main id="main" className="overflow-x-clip">{children}</main>
    <SiteFooter locale t />
    <Suspense fallback={null}><GuideMount locale={locale} /></Suspense>     {/* assistant track; absolute layer */}
  </div>
  <SiteDock locale t />                                                      {/* after footer + guide in DOM */}
  <Spotlight locale t /> <SiteControlCenter locale t /> <Launchpad locale t />   {/* native popovers */}
  <Suspense fallback={null}><SiteChrome /></Suspense>
  <Suspense fallback={null}><SiteJsonLd locale={locale} /></Suspense>
 </AlternatesProvider>
</I18nProvider>
```
**`SiteChrome`** (client, ≤1.2KB gz):
1. On every pathname change after the first, it runs `hidePopover()` on `:popover-open` elements. This replaces `CloseOnNavigate`.
2. ⌘K / Ctrl+K via `isCommandPaletteShortcut` toggles `#os-spotlight`, respecting `defaultPrevented`.
3. Spotlight quick-link filtering. It normalises ی/ي, ک/ك, ZWNJ, Arabic and Persian digits and case, and sets `hidden` on non-matching rows. With no match it shows `common.noMatches`.

**Removed:** `HeaderShell` (scroll listener), `NavLinks`, `MobileMenu` and the Radix DropdownMenu `LanguageMenu`. `site-header.tsx` keeps exporting `siteSections` and `staticSitePaths`, and re-exports `SiteMenuBar`. `useSwitchHref` is exported for reuse.

### 7.2 Menu bar items (DOM start → end; mirrors in fa)

| # | Item | Visible | Behaviour |
|---|---|---|---|
| 1 | Brand menu: `button.os-mb-item` with `PixelMark` 22px plus `appName` (lg+, 700), `popovertarget="mb-brand"` | always | `.os-menu.os-popmenu`. Header card: `PixelLogo TEAM cell=2` + `appTagline`. Rows: About · sep · Good In Studio, Good In Code (PixelIcon + `nav.brand*`) · sep · Contact · Sign in (`/login`, `prefetch={false}`). Static links only. |
| 2 | Section links: Work, Services, Blog, Learn, About | md+ | `SiteMenuLinks` (client, internal Suspense, fallback without active state) sets `aria-current="page"`. |
| — | spacer | | |
| 3 | Availability | lg+ | `<Suspense fallback={<span class="size-1.5 bg-muted"/>}><MenuBarStudio/></Suspense>`. `await connection()`, cached `getPublicProfile()` and `getPublicTimezone()`. A 6px square dot (success/warning) + `site.availableShort`/`unavailableShort` at xl (dot plus sr-only label below xl). Links to /contact. **Also renders item 8 (the clock).** |
| 4 | Virtual-me extra: 28px button with the `PixelAvatar` head at 1px cells (`aria-label=guide.toggle`), `popovertarget="mb-guide"` | lg+ | Menu rows: `guide.explain` (dispatch `explain`), `guide.tour` (dispatch `tour`), sep, `role="switch"` `guide.show` bound to `gt-guide`. |
| 5 | Spotlight: 28px button, lucide `Search`, `popovertarget="os-spotlight"` | always | `aria-label=common.spotlight`, `aria-keyshortcuts="Meta+K Control+K"`. At xl a visual `⌘K` kbd (`aria-hidden`, `dir=ltr`). |
| 6 | Language: glyph «فا» / `EN` (13px/600, min 28px), `popovertarget="mb-lang"` | always | Accessible name `${common.language} (${glyph})`. Rows are plain `<a href hrefLang lang aria-current>` via `useSwitchHref` (full page load). |
| 7 | Theme: existing `ThemeToggle` (28px, `rounded-md`) | md+ | light ↔ dark |
| 8 | Control Center: lucide `SlidersHorizontal`, `popovertarget="os-cc"` | always | See §7.3. |
| 9 | Clock: `OsClock` (inside item 3's Suspense) | lg+ | studio time |

On mobile: items 1, 5, 6 and 8 only (44px tall, 36px targets).

**Menu semantics.** WAI-ARIA disclosure navigation:
- Each popover immediately follows its trigger in the DOM.
- Esc and light dismiss are native.
- No `role=menu`.

### 7.3 Popovers (server markup)
**Spotlight `#os-spotlight`** (`popover=auto`):
- Size: `inline-size:min(640px,100vw - 32px)`; `top:18vh`; radius 14px; `--popover` at 97%; `--shadow-dialog`.
- Content:
  - `<form role="search" aria-label={common.spotlight} action={localePath(locale,"/blog")} method="get">` with an `<input type="search" name="q" autoFocus enterKeyHint="search" aria-label placeholder>`.
  - A hint line.
  - `<nav aria-label={common.quickLinks}>` with rows for sections, brands and contact (each a PixelIcon plus label).
- The popover element itself has **no role and no aria-label**; the form provides the landmark name.

**Control Center `#os-cc`** (`popover=auto`, 320px, `data-align=end`), as tiles:
1. Appearance: `AppearanceModeToggle` (span 2).
2. Pixel guide: switch.
3. Reduce motion: switch (`useMotionPref`).
4. Language: two `<a hrefLang>` chips.

No colour presets on the site.

**Launchpad `#os-launchpad`** (`popover=auto`, the mobile "More"; full-screen, 96% `--background`):
- Header: PixelMark + appName + close (`popovertargetaction=hide`, `common.close`).
- A 3-column grid of 64px tiles: Blog, Learn, About, Studio, Code, Sign in.
- A brands row: 3 × `PixelLogo cell=2`.
- Settings: language links, `AppearanceModeToggle`, guide switch, reduce-motion switch.
- Uses the `gt-menu-item` stagger.

### 7.4 Site dock (`SiteDock`, server → `Dock tabbar="md" magnify` + `DockLinks`)

| # | Item | Variant | Icon | Href | Shown |
|---|---|---|---|---|---|
| 1 | `nav.home` | mark | PixelMark | `/` | both |
| 2 | Work | paper | work | `/work` | both |
| 3 | Services | paper | services | `/services` | both |
| 4 | Blog | paper | blog | `/blog` | desktop |
| 5 | Learn | paper | learn | `/learn` | desktop |
| 6 | About | paper | about | `/about` | desktop |
| — | sep | | | | desktop |
| 7 | Good In Studio | brand | studio | `/services#studio` (no section) | desktop |
| 8 | Good In Code | brand | code | `/services#code` | desktop |
| — | sep | | | | desktop |
| 9 | Contact | accent | contact | `/contact` | both |
| 10 | `common.signIn` | paper | sign-in | `/login`, `prefetch=false` | desktop |
| m | `common.more` (button, `popovertarget="os-launchpad"`) | paper | more | — | mobile |

- Desktop: 10 tiles + 2 separators, about 606px.
- Labels are visible text and are the accessible name (no `aria-label`).
- Detail pages carry `[data-reading]` on the article root. The CSS then uses a 40px dock.

### 7.5 Footer (one framed box)
- **Row 1, 4 cells:**
  1. Brand: `PixelLogo TEAM cell=3`, `site.footerAbout`, streamed socials with an `h-9` skeleton.
  2. Explore.
  3. Resources.
  4. Connect, plus a `nav.brands` sub-list of the 3 brands.
- **Row 2:** a `span=full`, `tone=dots` cell with the giant `PixelLogo TEAM paper=false` (cell 6/8/12), `aria-hidden`. Scroll-driven `translate:0 56px→0; opacity:.5→1`, `animation-range: entry 0% entry 80%`. Static fallback, static under reduced motion. Replaces `.gt-wordmark`.
- **Row 3:** `© <CurrentYear/> {appName}. {footerRights}` · `footerMadeWith` · RSS, with `padding-block-end: var(--dock-space)`.

### 7.6 Auth layout
- Background: the `.os-desktop` wallpaper.
- A centred `Window path="LOGIN"` holding `PixelLogo TEAM cell=3` and the form.
- Keep `#email`, `#password` and `button[type=submit]`. The label stays `common.signIn`.
- No dock and no menu bar.

---

## 8. Home page (`(site)/page.tsx`)

**Rules for every section**
- Each section is a `FrameSection` with `id`, `aria-labelledby` (or `aria-label`), `guide={{key, say}}` and a strip.
- Static parts stay in the shell.
- Every DB part stays an async server component that calls `await connection()` inside `<Suspense>`. Its skeleton renders **the same cells** (Suspense adds no DOM).
- From section 03 on, the box body sits in `.frame-cv` with a `--cis` value, and the grid uses `reveal`.

| # | id / `data-guide` | Strip | Layout and content | Data |
|---|---|---|---|---|
| 01 | `top` / `home_hero` (`first`) | `01 · GOOD-IN-TEAM/~` | `FrameGrid hero`. **Start cell:** streamed `AvailabilityBadge` as `FrameEyebrow` (skeleton `h-[26px] w-48`) · **static, never-animated `<h1>`** with `HeroTitle` and the `.gt-accent` highlighter · lead · CTAs (48px pill `bg-primary text-primary-foreground hover:bg-primary-hover`; outline pill `border-frame-line bg-card`) · proof list (`CheckIcon text-primary-ink`). Lead, CTAs and proof use `gt-rise` at 60ms steps. **End cell** (`tone=dots`): `<Window path="SYSTEM.APP" elevated>` with `HeroDiagram` as `spot={{key:"diagram", say: guide.spot_diagram}}`. Diagram: hub = `PixelLogoCycle play cell 2/3` inside a fixed-size hub chip; violet removed; node tones yellow-soft / ink / grey; packets are 3px yellow squares capped at 6 iterations; ants static; terminal uses `OsLights`; one `radial-gradient(var(--surface-glow))` layer. | existing badge |
| 02 | `brands` / `home_brands` | `02 · GOOD-IN/` | Static, no DB. **Row 1** (`span=full`, two columns at lg): header cell (`FrameEyebrow brandsEyebrow`, h2 `brandsTitle`, `brandsSubtitle`) and a `tone=dots` cell with `PixelLogoSwap` (cell 4/6/8, `role=img`, `aria-label=appName`, `dir=ltr`). **Row 2:** 3 brand cells (`hover`, `spot={{key:"brand-"+id, say: tagline}}`, `data-brand=id`), each with `PixelLogo suffix cell=3`, h3 name, the visible tagline and `ArrowLink format(brandExplore,{brand})`. Hovering or focusing a cell swaps the big logo's suffix (`home.css` `:has()`). | — |
| 03 | `trust` / `home_trust` | none | `tone=dots` single cell. Streamed `TrustMarquee` with an unchanged query; separators are 6px yellow squares; the track is `dir=ltr`; **pauses on `:hover` and `:focus-within`**. Reduced motion: `animation:none; flex-wrap:wrap; justify-content:center`, duplicate hidden. The box renders `null` with fewer than 2 names; the skeleton is the same box. | existing |
| 04 | `work` / `home_work` | `03 · GOOD-IN-TEAM/WORK` + action `viewAllWork` | `FrameGrid 3`. **Row 1:** static `FrameHeaderCell`, then `<Suspense fallback={<FeaturedWorkCellsSkeleton/>}><FeaturedWorkCells/></Suspense>`. Work 1 is `span=2` `WorkCard variant="cell" size="lg"`. **Row 2:** works 2 and 3 plus a "view all" link cell (`viewAllCell`, pixel arrow). Fewer works get fillers. Work cells are spots (`say` = excerpt clamped to 140). Skeletons: 420 / 360px. `--cis` 900. | `listPublished({types:["work"]})`, featured first, top 3 |
| 05 | `services` / `home_services` | `04 · …/SERVICES` + `allServices` | `FrameGrid 3`. Static header cell, then streamed `ServicesCells` (at most 5). Each cell (hover + spot) has: a brand chip (`nav.brand*` from `brandOf(meta)` + 16px PixelMark) · a 44px `brand`-variant tile with `ServiceIcon` (ink) · h3 · excerpt · first 3 highlights as check rows. Fillers complete to 6. `--cis` 760. | `listServices` |
| 06 | `process` / `home_process` | `05 · …/PROCESS` | Static CSS tabs (radios + `:has()`, literal `tabCls` kept). **Row 1:** centred header `span=full`. **Row 2** (`FrameGrid 2-1`): `<Window path=…>`. The path swaps per checked tab through a literal map (PORTAL / PROGRESS / CONTRACTS / INVOICES). It holds the existing mocks; `MockFrame` is replaced by `Window`. Tabs are stacked cells, each a spot (`guide.home_process_<tab>`). Checked tab: `bg-card`, a 3px `--primary` inline-start bar plus `inset 4px 0 0 rgb(0 0 0/.12)` (mirrored with `--dir`), bold. Mobile: chip row above the window. Chart stays `dir=ltr`. `--cis` 680. | — |
| 07 | `stats` / `home_stats` | none (`aria-label=statsEyebrow`) | `FrameGrid 4`. Streamed `StatsCells`: number 48px (en 700 −0.03em; fa 800), `tabular-nums`, `fmtNum`, `+` in `text-primary-ink`, 14px muted label. Alternate cells `tone=dots`. Same-cell skeleton. | `getSiteStats` |
| 08 | `latest` / `home_latest` | `06 · …/BLOG` + `readBlog` | `FrameGrid 3`. **Row 1:** header cell plus `PostCard variant=cell` ×2. **Row 2:** if a course exists, a `span=3` `tone=ink` cell (a `COURSE.APP` `Window tone=ink` with course info, the first 6 lessons in 2 columns, and a yellow `courseCta` pill, as a spot). Otherwise post 3 plus a `span=2` read-the-blog cell. Skeleton row 2 is 280px. `--cis` 820. | existing |
| 09 | `kind-words` / `home_testimonials` | `07 · …/KIND-WORDS` | **Static** header cell `span=full`, then streamed `TestimonialCells` (`listTestimonials(locale,6)`, 3 columns). `TestimonialCard variant=cell` keeps per-quote `lang`/`dir`; the avatar falls back to a framed initial tile. `--cis` 620. | existing |
| 10 | `contact-cta` / `home_cta` | none | Static. A yellow `px-corners` panel inset 8px: `#FFC50D` with an ink dot texture `rgb(28 28 30/.14)`, text #1C1C1E. h2 `ctaTitle` (48px), subtitle, proof. Buttons: `bg-[#1C1C1E] text-[#FFC50D]` and an outline `border-[#1C1C1E]/40`. At inline-end: `PixelAvatar pose="wave" cell=6` (static wave frame) and three static pixel dock tiles at ±8°. `CtaBand` keeps its API (reused on other pages). | — |

**Budgets for home.** DOM ≤1,800 nodes; pixel-art elements ≤250; no infinite main-thread animation after 20s.

---

## 9. Other site pages

| Page | Frame layout | `data-guide` key |
|---|---|---|
| `PageHero` (`ui.tsx`) | `FrameSection` with strip `GOOD-IN-TEAM/<SECTION>`. `FrameHeaderCell as="h1"` with `Breadcrumbs` (keeps BreadcrumbList JSON-LD), title, subtitle. Optional end cell (facets/count). No glow layers. `Eyebrow` renders `FrameEyebrow`. | — |
| `/work` | filter chips in a strip cell (`searchParams` stays in Suspense) → `FrameGrid 3` of `WorkCard variant=cell` + fillers → `Pagination` in a full-width cell → `CtaBand` | `work_index` |
| `/work/[slug]` | header box (title, meta, cover in `Window path="CASE-STUDY"`) → body `FrameGrid 2-1`: article cell (`prose-gt`, 70ch) and aside cell (client, year, role, stack `dir=ltr`, links, metrics as stat rows) | `work_detail` |
| `/services` | one `FrameSection` per brand in registry order, `id=<brand.id>` (anchor targets). Strip `GOOD-IN/<SUFFIX>`. Header cell: `PixelLogo cell=4`, name, tagline. Service cells, or one `span=full` "ask" cell (`site.brandEmpty` + `format(brandAsk,{brand})` → `/contact`). Then a process box (4 cells) and a FAQ box (native `<details>`, hairlines). ItemList JSON-LD unchanged. | `services_index` (first box) |
| `/services/[slug]` | header with brand chip and `PixelLogo cell=3` → article cell + sticky aside (`below-chrome`, no `.frame-cv`) with the CTA → FAQ | `service_detail` |
| `/blog` | search form in the strip end (shares `?q=` with Spotlight) → type/tag chips in a strip cell → featured `span=2` → grid + `Pagination` | `blog_index` |
| `/blog/[slug]`, lessons | header (`ArticleHeader`, `Tldr` in a `tone=card` cell) → `FrameGrid 2-1` with a sticky TOC cell (`below-chrome`) → `ShareBar`/`AuthorBox` cells. Root carries `data-reading`. Keep `h-entry`/`p-name`/`e-content`. No `.frame-cv`. | `post_detail` / `lesson` |
| `/learn`, `/learn/[series]` | `SeriesCard variant=cell` grid; the lesson list as a `Window` | `learn_index` / `course` |
| `/about` | `AboutIntro` in `Window path="ABOUT.APP"` (avatar or `PixelAvatar cell=8` fallback) → values 4 cells → `StatsCells` box → `CtaBand`; sticky card `below-chrome` | `about` |
| `/contact` | `FrameGrid 2-1`: `ContactForm` in `Window path="NEW-MESSAGE"` + `DirectContact` cell; `?service=` preselect kept | `contact` |
| `(site)/not-found.tsx` and root `not-found.tsx` | centred macOS-alert box: `PixelText "404" cell=8` + `PixelAvatar pose="blink"` + `notFoundTitle`/`notFoundBody` + Home/Contact pills | `not_found` |
| Share pages (`p`, `i`, `sign`) | logo swap only (through `LogoMark`) | — |
| OG (`og.tsx`) | `#161618` background, grid `rgb(255 255 255/.06)`, glow `rgba(255,197,13,.28)` full-canvas, `PixelLogo TEAM` paths at 10px, eyebrow `rgba(255,197,13,.16)` with `#FFDB66` text, domain `#FFDB66`, footer `#A1A1A6`, bottom bar `#FFC50D → #6A6A6C`. Persian is still pre-shaped. | — |
| Favicon | PixelMark paths on a `#F3F3F3` square; `<style>@media (prefers-color-scheme:dark){.paper{fill:#2A2A2D}.ink{fill:#A3A4A8}}</style>` | — |

---

## 10. The assistant: "virtual me"

### 10.1 Look
- **Sprite:** §4.3. 3px cells (48px) on desktop, 2px (32px) on mobile, with a 1-row grey shadow when standing on a roof.
- **Name:** `guide.name`.
- **Bubble:**
  - `max-inline-size:300px`, padding 10px 12px, 13.5px/1.6 (fa 14px/1.8), radius 10px.
  - `--popover` at 97%, no blur, hairline border, `--shadow-dropdown`.
  - An 8px stepped pixel tail pointing at the sprite.
  - Name row: 11px/600 muted.
  - Actions row: Next / End tour (tour only), `guide.hide` (text button), × close (`common.close`).
  - `unicode-bidi: plaintext`.
- **Selection** (`.gt-guide-sel`, document-absolute):
  - `outline:1.5px dashed var(--guide-line); outline-offset:6px; background:rgb(var(--primary-rgb)/.06)`.
  - Four 7×7 yellow handles with 1px ink rings on `::before` (`inset:-9px`).
  - One `steps(4)` 0.48s wiggle.

### 10.2 DOM (rendered by `GuideMount`, server, inside `.os-desktop` and Suspense)
```html
<div id="gt-guide" class="gt-guide" hidden data-state="idle">          <!-- absolute; inset:0; overflow:clip; pointer-events:none; z-index:30 -->
  <div class="gt-guide-sel" aria-hidden="true"></div>
  <div class="gt-guide-x"><div class="gt-guide-y">                       <!-- nested translate for arcs -->
    <button type="button" class="gt-guide-sprite" aria-label="{guide.name}" aria-expanded="false" aria-controls="gt-guide-bubble">
      <PixelAvatarSprite cell=3 /><i class="gt-guide-badge" aria-hidden="true"></i></button>
    <span class="gt-guide-trail" aria-hidden="true"><i></i><i></i><i></i></span>
  </div></div>
  <div id="gt-guide-bubble" class="gt-guide-bubble" role="group" aria-labelledby="gt-guide-name" hidden>
    <p id="gt-guide-name">{name}</p><p class="gt-guide-text"></p><div class="gt-guide-actions">…</div></div>
  <p id="gt-guide-live" class="sr-only" role="status" aria-live="polite"></p>
  <GuideLoader greeting={…} labels={…} />
</div>
```
- The sprite button and the bubble are the only `pointer-events:auto` parts.
- The layer has no `transform`, `filter` or `contain`, so mobile `position:fixed` children work.
- In DOM order the guide comes after the footer and before the dock, so it is never a tab stop before content.

### 10.3 Data flow
- **Section lines.** Server components put `data-guide="<key>" data-guide-say="<line>"` on section roots (via `FrameSection guide`).
- **Spot lines.** `data-guide-spot` plus `data-guide-say` (visible tagline or excerpt, ≤140 chars).
- The engine reads attributes. There is no JSON blob, no client i18n and no fetch.
- **Greeting.** `GuideMount` runs `await connection()` and cached `getPublicProfile()`, then `format(guide.greeting,{owner: ownerName[locale]})`, falling back to `greetingNoName`. It passes the labels (`name`, `hide`, `next`, `endTour`, `tourDone`, `idle`, `close`) as props.
- Lines must read well aloud without the visual. A visual reference ("the diagram beside it") may appear, but never as the only referent.

### 10.4 Loading
`GuideLoader` (client, ≤0.8KB gz):
- Skips if `readGuidePref()==="off"`, `navigator.connection?.saveData`, print, or `navigator.webdriver` without `gt-guide-test=1`.
- After `load`: `requestIdleCallback(go,{timeout:3000})`, with a `setTimeout(go,1500)` fallback. Also runs on the first `pointerdown` or `keydown`.
- `go = import("./guide-engine").then(m => m.start({ root, dir, reduced, compact, greeting, labels }))`:
  - `reduced` = `matchMedia('(prefers-reduced-motion: reduce)')` OR `html[data-motion=reduce]`.
  - `compact` = `matchMedia('(max-width: 767px), (pointer: coarse)')`.
- On `usePathname` change it calls `engine.rescan()`.
- It listens for `gt:guide` and `gt:guide-pref`. Turning the guide off stops the engine (disconnects observers, removes listeners, sets `hidden`); turning it on boots without a reload.

### 10.5 Engine (`guide-engine.ts`, vanilla TS, ≤6KB gz)
**Observers and listeners**
- One IntersectionObserver over `[data-guide]` with `rootMargin:"-35% 0px -50% 0px"`.
- One ResizeObserver on `<main>`, rAF-debounced, to re-anchor when streams or images land.
- Delegated `pointerover` (fine pointer only) and `focusin` on `.os-desktop`; `keydown` (Esc); `visibilitychange`.
- **No scroll listener.** Layout reads (2–3 rects) happen only on activation, resize, RO or tour step. Writes are batched in one rAF as CSS variables `--gx --gy --bx --by --sx --sy --sw --sh`, in coordinates relative to `.os-desktop`.

**Placement.** The sprite stands on the target's top border at inline-end:
- `x = rtl ? r.left + 12 : r.right - 12 - spriteW`
- `y = r.top - spriteH + 1`

The bubble opens toward inline-start inside the section gap. If the gap is under the bubble height, or the box top is within 80px of the viewport top, it opens below the sprite and covers the strip only. Pure maths lives in `geometry.ts` and is unit-tested (LTR, RTL, clamping, flip).

**Activation.** A section activates after a **600ms dwell** in the band. It speaks the section line once per session per `pathname#key` (`gt-guide-seen`). Last activation wins, with at least 2.5s between lines.

**Movement**
- Same roof (|dy| < 8px): **walk**. `data-state=walk`; feet frames; translate over `clamp(300ms, |dx|·0.9ms, 900ms)` with `--ease-out-expo`; faces the direction of travel (`scale:-1 1` on the art wrapper only).
- Within 1.5 viewport heights: **arc hop**. `.gt-guide-x` animates X with `cubic-bezier(.45,0,.55,1)`; `.gt-guide-y` animates Y with `cubic-bezier(.3,-.35,.5,1)`; duration `clamp(450ms, dist·0.55ms, 1000ms)`; ±8° tilt; a 3-square trail (6/4/3px, opacity .7/.45/.25, delays 40/80/120ms); a 1-frame landing squash.
- Farther: **drop-in**. Fade out over 120ms, reposition, then a `steps(5)` 400ms drop from −24px.
- `will-change: translate` is set only during flights.

**Speaking**
- The bubble opens (`scale .96→1`, opacity, 140ms).
- 400ms of 3 pixel typing dots, then a `steps(8)` clip-path wipe (mirrored in RTL); `data-state=talk` animates the mouth until the wipe ends.
- Auto-hide after `clamp(4000ms, chars·55ms, 9000ms)`, paused while the bubble is hovered or has focus.

**Spots**
- 350ms hover intent, 1.2s cooldown, fine pointer only; also keyboard `focusin` when `:focus-visible`.
- The selection box wraps the spot.
- Spots may repeat, ignoring the seen list. The bubble hides 1.5s after leaving the spot.

**Greeting.** If `scrollY < 200` and not greeted this session: drop onto the first `[data-guide]` box, wave twice, say the greeting.

**Idle.** 30s without input → `guide.idle` once per session. Blink every 4.2s. 60s → the sit pose.

**Explicit mode**
- Triggers: a sprite click, menu-bar `explain`, or a tour step. Shows the active anchor's line with actions.
- Updates `#gt-guide-live` (polite, `lang` set).
- Sets `aria-expanded=true` on the sprite.
- Esc or × closes it and returns focus to the invoker when focus was inside the bubble or on the sprite.

**Tour** (`gt:guide` `tour`)
- Visits each `[data-guide]` in DOM order: `scrollIntoView({block:"center", behavior: reduced ? "auto" : "smooth"})`, wait for `scrollend` (900ms fallback), move, then an explicit bubble with "Next ({i} of {n})" and "End tour".
- **Focus moves to Next**, the only focus move, and only because the user started the tour.
- Esc ends the tour. The last step says `tourDone`.

**Hide.** Hide (bubble, menu bar, Control Center, Launchpad) → `writeGuidePref(false)`.

**Compact mode (mobile and coarse pointers)**
- The sprite is fixed at `inset-inline-end:12px; bottom:calc(var(--dock-space) + 8px)`, 2px cells.
- On activation: a hop plus a 6px yellow "!" badge, with **no auto bubble**. The only exception is the one-time greeting (4s) per session on the first page.
- Tapping toggles an explicit bubble above the dock (`inline-size:min(300px,100vw - 32px)`). Tapping outside closes it.
- No spots.
- Hidden while any `:popover-open` exists, and while an input or textarea has focus.

**Reduced motion.** No walking, hopping, trail, wipe, typing dots or wiggle. The sprite moves instantly with a fade. Static idle frame.

**Never**
- No `role=dialog`, no `aria-modal`, no `aria-hidden` on the bubble.
- No focus move except the tour.
- No auto-speak under webdriver.
- Does not cover content (it lives in the gaps).

### 10.6 Panel "virtual me" (quiet)
- A **"Me" tile** at the inline-start of the panel dock (`PixelAvatar` head on a `brand` tile). It is a `<button aria-expanded aria-controls="panel-guide">`.
- It opens a bubble `<div id="panel-guide" popover="manual" role="group" aria-labelledby>` anchored above the tile. Content:
  - a 3px `PixelAvatar`
  - `t.guide["panel_"+navKey]` for the active module
  - a link to the docs page when one exists
  - a switch `guide.tipsAuto` (`gt-guide-tips`)
- Esc and outside click close it. Opening by click updates a polite live region.
- **Peek:** when tips are on, the first visit to each module per browser (`localStorage gt-guide-mod:<key>`) shows the bubble for 5s after 1.5s idle. Skipped under webdriver. Never a dialog.
- The App menu item "About {module}" dispatches `gt:guide` `explain`, which the panel guide handles.

---

## 11. Panel OS shell

### 11.1 Layout (`panel/layout.tsx`)
```tsx
<I18nProvider locale messages={getMessages(locale)}>
  <InlineScript html={shellInitScript} />
  <InteractiveProviders>                                   {/* Toaster offset var, see 11.6 */}
    <PanelUIProvider>
      <div className="panel-shell">                        {/* dotted --desktop wallpaper */}
        <a href="#main" className="skip-link …">{t.common.skipToContent}</a>     {/* NEW */}
        <PanelMenuBar
          menus={<Suspense fallback={null}><SessionMenus /></Suspense>}
          status={<Suspense fallback={<StatusSkeleton />}><SessionStatus /></Suspense>}
          avatar={<Suspense fallback={<span className="os-avatar-skeleton" />}><SessionAvatar /></Suspense>}
          clock={<Suspense fallback={<ClockSkeleton />}><SessionClock /></Suspense>} />
        <div className="os-window">
          <Suspense fallback={<WindowTitleFallback />}><WindowTitleBar /></Suspense>
          <main id="main" className="os-window-body">{children}</main>
        </div>
        <Suspense fallback={null}><SessionDock /></Suspense>       {/* dock + CommandPalette + Launchpad + PanelGuide */}
      </div>
    </PanelUIProvider>
  </InteractiveProviders>
</I18nProvider>
```
- Every `Session*` component calls `requireActor({locale})`, which is cached per request. `SessionClock` uses `await connection()` and `getPublicTimezone()`.
- All 56 `loading.tsx` files stay. `PageSkeleton` and `error.tsx` render inside the window body.
- **Deleted:** `components/panel/header.tsx` and `sidebar.tsx`. `NavList` folds into the Launchpad.

### 11.2 Menu bar (Radix Menubar; new `ui/menubar.tsx` in shadcn style using `.os-menu` / `.os-menu-item`)
**Start side (fa: right)**
1. **Brand** (PixelMark 22px, `aria-label=nav.brandMenu`). Items:
   - `nav.dashboard` (or `nav.portalHome` for clients) → `/panel`
   - `panel.viewSite` ↗ (`_blank`)
   - `common.settings` → `/panel/settings`
   - Appearance ▸ (Light/Dark/System `MenubarRadioGroup`)
   - Language ▸ (plain `<a hrefLang lang>`)
   - separator
   - `common.signOut` → `void logout()`
2. **App name**: bold, `CurrentAppName` (client, `usePathname` in Suspense; longest-prefix match in `panelNav`; `/panel` → appName). Items:
   - `format(panel.aboutModule,{module})` → `gt:guide explain`
   - `panel.zoomWindow` (toggle wide)
   - `panel.closeWindow` → `/panel` (disabled on `/panel`)
   - separator
   - `common.commandPalette` (`⌘K` hint)
3. **Navigation**:
   - 1024–1279px: one `nav.goTo` menu with `MenubarLabel` group headings.
   - ≥1280px: one menu per `navForRole` group except `groupOverview`.
   - Items are `MenubarItem asChild` + `<Link>`, with a 16px lucide icon and the label. The current item has `aria-current="page"` and a 4px dot.
   - Rendered by `SessionMenus` → `NavMenus` (client) **inside the same Menubar root**, so roving focus spans all menus.

**End side, DOM start → end**
- `[SessionStatus: TimerPill (staff; idle 28px icon, running 22px pill) · NotificationsBell]` — session items sit innermost, so streaming grows into the spacer.
- `[Spotlight]` — the existing ⌘K button restyled: 28px, or a 200px pill with `searchPlaceholder` + `⌘K` at ≥1280. Keeps `aria-haspopup=dialog` and `aria-keyshortcuts`.
- `[Language FA/EN]` — `LocaleSwitcher variant="text"`.
- `[Control Center]` — Radix Popover, closed by default. Tiles: mode · 7 accent swatches with localized labels · dock size S/M/L (40/48/56) · Magnification · Auto-hide · Full-width windows · Guide tips.
- `[SessionAvatar]` — 22px, `UserMenu`.
- `[SessionClock]` — ≥1280 only.

`StatusSkeleton` reserves the timer (28) and bell (28). The avatar and clock skeletons have fixed widths. **Result: zero shift.**

**Mobile (<1024), 44px:** `[Brand ▾ (+Language, Appearance)] [App name] … [Spotlight] [Timer] [Bell] [Avatar]`.

Sizes: bar 32px; items 24px tall; icon buttons 28×28.

### 11.3 Dock (`SessionDock` → `PanelDock`, client)
- `<nav class="os-dock" aria-label={panel.mainNav} data-tabbar="lg" data-magnify={prefs.magnify||undefined} style="--dock-n:N;--dock-seps:S">`.
- **Entries in order:**
  1. Me tile (slot)
  2. separator
  3. Dashboard / Portal (`mark` variant)
  4. one separator-delimited group per `navForRole` group
  5. separator
  6. **View site** (globe, external)
- Role items carry `data-dock-app` (owner/admin 16, member 9, client 5).
- **Tile size:** `.panel-shell .os-dock{--dock-tile:max(36px,min(var(--dock-pref),calc((100vw - 2*var(--gutter) - 12px - var(--dock-seps)*17px)/var(--dock-n) - 8px)))}`. At 1024px with owner (18 tiles, 7 separators) that is about 39px; it reaches 48px at about 1280px.
- **Tiles:** `brand` variant with the lucide module icon at 22px, stroke 1.75, `--foreground` at 80%.
- **Labels:** the CSS label bubble. No Radix Tooltip in the dock.
- **Indicators:**
  - `aria-current` plus the 4px dot.
  - The Time tile gets `data-running` (pulsing dot; static under reduced motion) when `getRunning() > 0`. `chrome-store.ts` (`getRunning`, `setRunning`, `subscribe`) is fed by `HeaderLive`; the dock uses `useSyncExternalStore` with server snapshot 0. The tile's sr text appends `format(t.time.runningCount,{n})`.
- **Launch bounce:** `useLinkStatus`.
- **Auto-hide:**
  - `html[data-dock-autohide] .panel-shell .os-dock{translate:0 calc(100% + var(--dock-gap));transition:translate .2s var(--ease-os)}`
  - Revealed by `:hover`, by `:focus-within` (keyboard always reveals it), and by a fixed 8px `.os-dock-zone` hot strip (`.os-dock-zone:hover + .os-dock`).
- **No visible skeleton.** The dock is fixed and space is CSS-reserved. The boot rise animation covers its appearance.
- **Mobile (<1024) tab bar.** Pins come from `nav-config.ts` `mobilePins`:
  ```ts
  export const mobilePins: Record<UserRole, (keyof Messages["nav"])[]> = {
    owner: ["dashboard","tasks","time","projects"], admin: ["dashboard","tasks","time","projects"],
    member: ["dashboard","tasks","time","projects"], client: ["portalHome","projects","invoices","contracts","settings"] };
  ```
  - Staff get 4 pins plus **More** (opens the Launchpad).
  - Clients get exactly 5 pins and no More.
  - The Me tile is hidden in tab-bar mode; the guide is reachable from the App menu.
- **Launchpad:** a Radix Dialog, **mounted only while open**. Full-screen on mobile, 880px centred on desktop. Contents: `DialogTitle common.launchpad` (sr-only), a filter `Input`, and an `AppGrid` of 72px tiles grouped by `t.nav[group.label]`, plus Language, Appearance, Guide tips, View site and Sign out. Closes on navigation.

### 11.4 Window
```css
.panel-shell{min-block-size:100dvh;background:radial-gradient(var(--dots) 1px,transparent 1.5px) 0 0/12px 12px,var(--desktop)}
.os-window{margin:12px max(var(--gutter),calc((100% - 1400px)/2)) 0;border-radius:12px;border:1px solid var(--frame-line);
  background:var(--background);box-shadow:var(--shadow-window)}
html[data-window-wide]:has(.panel-shell) .os-window{margin-inline:var(--gutter)}
.os-titlebar{block-size:40px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding-inline:14px;
  border-block-end:1px solid var(--frame-line);border-start-start-radius:12px;border-start-end-radius:12px}   /* NOT sticky */
.os-window-body{padding:20px 16px var(--dock-space)}
@media (width>=64rem){.os-window-body{padding:24px 32px var(--dock-space)}}
@media (width<64rem){.os-window{margin:0;border:0;border-radius:0;box-shadow:none}.os-titlebar{display:none}}
```
**`WindowTitleBar`** (client):
- 12px octagon lights at inline-start. They are pointer-only (`tabIndex=-1`, `aria-hidden`) with 20px hit areas:
  - red → `/panel` (greyed on `/panel`)
  - yellow → decorative
  - green → toggle wide
- Glyphs × and ⤢ show on hover.
- Centred title: a 16px module icon plus the label, `aria-hidden` (the page's `PageHeader` `<h1>` is the heading).
- Every light command also exists in the App menu (WCAG 2.5.8 equivalent-control exception).

### 11.5 Preferences (`panel-prefs.ts`, rewritten and unit-tested)
```ts
export const SHELL_COOKIE = "gt-shell";                      // "48.1.0.0" = dock.magnify.autohide.wide
export interface ShellPrefs { dock: 40|48|56; magnify: boolean; autohide: boolean; wide: boolean }
export const defaultShell: ShellPrefs = { dock: 48, magnify: true, autohide: false, wide: false };
export function shellCookie(p: ShellPrefs): string;          // `${SHELL_COOKIE}=48.1.0.0; path=/; max-age=31536000; samesite=lax`
export function readShellCookie(header?: string|null): ShellPrefs | null;   // strict regex, else null
export const shellInitScript = `try{var m=/(?:^|;\\s*)gt-shell=(40|48|56)\\.([01])\\.([01])\\.([01])(?:;|$)/.exec(document.cookie),h=document.documentElement;
  if(m){h.setAttribute("data-dock-size",m[1]);m[3]==="1"?h.setAttribute("data-dock-autohide",""):h.removeAttribute("data-dock-autohide");
  m[4]==="1"?h.setAttribute("data-window-wide",""):h.removeAttribute("data-window-wide")}}catch(e){}`;
export { isCommandPaletteShortcut } from "@/components/shell/shortcuts";
```
- Magnify is not layout, so `SessionDock` reads the cookie on the server and passes `prefs`.
- `PanelUIProvider` drops `collapsed`, `collapsedPref`, `setCollapsed`, `toggleCollapsed`, the legacy migration and `mobileOpen`.
- It adds:
  - `shell`
  - `setShell(partial)`, which writes the cookie and the html attributes
  - `launchpadOpen` / `setLaunchpadOpen`
- It re-applies the attributes on mount (the init script is inert on soft navigation). On first load it expires `gt-sidebar-collapsed`.
- `paletteOpen` and the static ⌘K listener stay.
- Remove `SIDEBAR_COOKIE`, `sidebarCookie`, `readSidebarCookie`, `sidebarInitScript` and `data-sidebar-collapsed`.
- **Settings → Appearance:** the Sidebar card becomes **Desktop & Dock**:
  - ToggleGroup S/M/L
  - Magnification, Auto-hide, Full-width windows and Guide tips switches
  - a `DesktopMock` preview
- Remove the `settings.sidebar*` keys.

### 11.6 Collisions
**Toaster** (`interactive-providers.tsx`):
- `offset={{ bottom: "var(--toast-bottom, 24px)" }}` and `mobileOffset={{ bottom: "var(--toast-bottom, 16px)" }}`.
- `panel-shell.css` sets `html:has(.panel-shell){--toast-bottom:calc(var(--dock-space) + 8px)}`.
- The sign page is unaffected.

**Offsets.** All other offsets are migrated by foundation (§15.3).

**e2e safety (`vault.spec.ts`, 1280×720)**
- Content ends `--dock-space` above the dock, and `scroll-padding-bottom` keeps targets clear.
- The dock wrapper is `pointer-events:none` except the pill.
- No always-mounted `role=dialog` or `aria-modal`.
- No chrome control is named `Lock`, `Unlock`, `Save`, `Continue`, `New item`, `Let's start`, `Create vault` or `Erase vault completely`, and no menuitem `Login`.
- The clock is `<time>`.

### 11.7 Keyboard
- **⌘K / Ctrl+K:** opens the palette from anywhere.
- **Tab order:** skip link → menu bar (Radix roving; arrows mirrored in RTL) → status items → main → dock.
- **No new unmodified shortcuts.** Every handler respects `defaultPrevented`.
- **`CommandPalette`:**
  - gets `description={t.common.commandHint}` (fixes the English sr default)
  - `extraCommands`: Zoom window, Toggle dock magnification, Toggle dock auto-hide, Guide tips, All apps, View site
  - is mounted in `SessionDock`

---

## 12. Performance budget

Lab conditions: home, fa, Moto G Power on 4G. Field p75 targets are in parentheses.

| Metric | Budget |
|---|---|
| LCP (static hero `<h1>`) | ≤1.8s (≤2.5s) |
| CLS | 0.00 target, ≤0.01 hard |
| INP | ≤100ms lab (≤150ms field) |
| TBT | ≤50ms |
| Site first-load JS | new islands ≤6KB gz in total; **net change ≤0** vs the baseline (Radix DropdownMenu removed from public routes) |
| Guide | loader ≤0.8KB gz initial; engine ≤6KB gz, lazy after load + idle; 0 bytes when off or under Save-Data |
| CSS added | ≤6KB gz (≤22KB raw) across `os-shell`, `frame`, `pixel`, `site-shell`, `home`, `site-pages` and `guide` |
| Fonts | 0 new files; JetBrains Mono not requested above the fold on home |
| Images | 0 new rasters; pixel art inline SVG, one path per tone; ≤250 pixel-art elements on home |
| DOM | ≤1,800 nodes on home |
| Blur | exactly 2 surfaces (menu bar and dock, ≥768px, ≤20px) |
| Animation | no infinite main-thread animation after 20s (packets capped, ants static); infinite compositor-only allowed for the marquee (pausable) and the live dot |
| Panel | chrome JS ≤ +10KB gz vs removed sidebar/header; no new polling; 0 CLS across module navigations |

**Verification**
- `pnpm build` route-size table compared to the baseline recorded in each PR.
- `node scripts/shots.mjs` (fa/en, `--dark`, `--mobile`) with 0 console errors and 0 responses ≥400.
- `e2e/perf.spec.ts`: CDP `Emulation.setCPUThrottlingRate(4)`, then `PerformanceObserver` checks layout-shift sum <0.01 and LCP timing.

---

## 13. Accessibility

**Landmarks**
- skip link (first in both shells)
- `header` with `nav[aria-label=common.menuBar]`
- `main#main`
- `footer`
- dock `nav[aria-label=common.dock]` (site) or `panel.mainNav`
- one `h1` per page; `h2` per box via `FrameHeaderCell`; sections use `aria-labelledby`

**Menus**
- Site: disclosure pattern on native popovers (honest semantics, Esc, light dismiss).
- Panel: full ARIA menubar via Radix.

**Focus**
- 2px `--ring` (#7A5A00 light / #FFDB66 dark), never removed.
- Menu rows: yellow fill plus an inset 1.5px `--primary-dark`.
- `scroll-padding-top` and `scroll-padding-bottom` keep focus clear of the bars (2.4.11).

**Dock.** Visible-text names. Active state is `aria-current` plus a square dot, never colour or scale alone. Labels show on `:focus-visible`. No magnification for coarse pointers or reduced motion.

**Guide.** The sprite is a labelled button. The bubble is never a dialog and never steals focus (except the user-started tour). The live region speaks only explicit actions. Esc dismisses. The mute is persisted and keyboard-reachable (menu bar, Control Center, Launchpad). Lines live in attributes, so there is no hidden text.

**Motion**
- the OS setting, plus the site **Reduce motion** switch (`html[data-motion=reduce]`)
- explicit `animation:none` for scroll-driven animations, the dock, the guide and the logo cycle
- every animated thing has a meaningful static frame
- the logo cycle runs once (<5s)
- the marquee pauses on hover and focus

**Transparency and forced colours.** `prefers-reduced-transparency` gives solid bars. In forced colours, markers, rails and dots are hidden and borders become system colours.

**Contrast.** Per §3.4.

**Targets.** ≥24px on desktop. ≥36px for the mobile menu bar, ≥48px for the tab bar, 40px menu rows on coarse pointers. Panel lights use the equivalent-control exception.

**Language.** Links carry `hrefLang` and `lang`. The trigger's accessible name contains its visible glyph (2.5.3). Latin inside Persian uses `lang=en dir=ltr`. No Vazirmatn tracking. Persian heading line-height ≥1.3.

---

## 14. i18n keys (fa is the source of truth; en mirrors it; foundation adds all of them)

**common** (shipped to the site client; keep it lean)

| key | fa | en |
|---|---|---|
| appName | گودین تیم | Good In Team |
| appTagline | تیم طراحی و مهندسی محصولات دیجیتال | A design & engineering team for digital products |
| menuBar | نوار منو | Menu bar |
| dock | داک | Dock |
| launchpad | همهٔ برنامه‌ها | All apps |
| more | بیشتر | More |
| spotlight | جستجو در سایت | Search the site |
| spotlightPlaceholder | دنبال چه می‌گردی؟ | What are you looking for? |
| spotlightHint | برای جستجو در نوشته‌ها Enter را بزن | Press Enter to search posts |
| quickLinks | میان‌برها | Quick links |
| noMatches | چیزی پیدا نشد | No matches |
| controlCenter | مرکز کنترل | Control Center |
| appearance | ظاهر | Appearance |
| reduceMotion | کاهش حرکت | Reduce motion |
| studioTime | ساعت استودیو | Studio time |
| opensNewTab | (در زبانهٔ تازه باز می‌شود) | (opens in a new tab) |

**nav**

| key | fa | en |
|---|---|---|
| brandTeam | گودین تیم | Good In Team |
| brandStudio | گودین استودیو | Good In Studio |
| brandCode | گودین کد | Good In Code |
| brands | برندها | Brands |
| brandMenu | منوی گودین | Good In menu |
| goTo | رفتن به | Go to |

**site** (server-only)
- metaTitle: «گودین تیم — طراحی و مهندسی محصولات دیجیتال» / "Good In Team — Designing and building digital products"
- brandsEyebrow: خانوادهٔ گودین / The Good In family
- brandsTitle: یک تیم، چند کار خوب / One team, a few good things
- brandsSubtitle: «گودین» ثابت است؛ کلمهٔ دوم می‌گوید در چه کاری خوبیم. / "Good In" stays; the second word says what we're good in.
- brandTeamTagline: محصول کامل، از ایده تا انتشار / Whole products, from idea to launch
- brandStudioTagline: طراحی رابط، برند و تجربه / Interface, brand and experience design
- brandCodeTagline: مهندسی وب، موبایل و عامل‌های هوشمند / Web, mobile and AI-agent engineering
- brandExplore: دیدن {brand} / Explore {brand}
- brandEmpty: خدمت عمومی این برند هنوز این‌جا نیست. / No public services for this brand yet.
- brandAsk: دربارهٔ {brand} بپرس / Ask about {brand}
- viewAllCell: همه را ببین / See everything
- availableShort: پذیرای پروژه / Available
- unavailableShort: ظرفیت تکمیل / Booked

**guide** (new namespace, server-only on the site, full in the panel). `format()` placeholders: `{owner}`, `{i}`, `{n}`, `{module}`.

| key | fa | en |
|---|---|---|
| name | منِ مجازی | Virtual me |
| toggle | راهنمای پیکسلی | Pixel guide |
| show | نمایش راهنما | Show the guide |
| hide | پنهان کردن راهنما | Hide the guide |
| explain | این بخش چیست؟ | What's this part? |
| tour | گشت در این صفحه | Tour this page |
| next | بعدی ({i} از {n}) | Next ({i} of {n}) |
| endTour | پایان گشت | End tour |
| tourDone | همین بود! هر وقت خواستی از نوار بالا صدایم کن. | That's all! Call me from the menu bar any time. |
| tipsAuto | نمایش خودکار نکته‌ها | Show tips automatically |
| greeting | سلام! من نسخهٔ پیکسلیِ {owner} هستم. به هر بخش که برسی، کوتاه می‌گویم چه خبر است. | Hi! I'm {owner}'s pixel twin. As you reach each part, I'll tell you briefly what it's about. |
| greetingNoName | سلام! من نسخهٔ پیکسلیِ گودین تیم هستم. به هر بخش که برسی، کوتاه توضیحش می‌دهم. | Hi! I'm Good In Team's pixel twin. I'll explain each part as you reach it. |
| idle | هنوز این‌جایی؟ داک پایین صفحه تو را به هر بخش سایت می‌برد. | Still here? The dock at the bottom takes you to any part of the site. |
| home_hero | این خلاصهٔ کار ماست. نمودار کنارش مسیر هر پروژه را نشان می‌دهد: ایده، طراحی، کد، انتشار. | That's what we do, in one line. The diagram beside it shows every project's path: idea, design, code, launch. |
| spot_diagram | مسیر هر پروژه همین است و در پورتال مشتری همه‌اش را زنده می‌بینی. | This is every project's path, and you can follow all of it live in your client portal. |
| home_brands | «گودین» نام خانوادگی ماست: تیم کل محصول را می‌سازد، استودیو طراحی می‌کند و کد مهندسی. | "Good In" is our family name: Team builds whole products, Studio designs, Code engineers. |
| home_trust | چند نفر از کسانی که محصولشان را به ما سپردند. | A few of the people who trusted us with their product. |
| home_work | پروژه‌های واقعی با عددهای واقعی. یکی را باز کن تا تصمیم‌های پشتش را ببینی. | Real projects with real numbers. Open one to see the decisions behind it. |
| home_services | هر خدمت مال یکی از برندهای گودین است؛ پس می‌دانی دقیقاً چه کسی رویش کار می‌کند. | Every service belongs to a Good In brand, so you know exactly who works on it. |
| home_process | جعبهٔ سیاه نداریم: پورتال اختصاصی، پیشرفت زنده، قرارداد امضاشده و فاکتور شفاف. | No black boxes: your own portal, live progress, signed contracts and clear invoices. |
| home_process_portal | هر مشتری پورتال خودش را دارد: پروژه‌ها و به‌روزرسانی‌ها یک‌جا. | Every client gets their own portal: projects and updates in one place. |
| home_process_progress | پیشرفت و ساعت‌ها زنده به‌روز می‌شوند. | Progress and hours update live. |
| home_process_contracts | قرارداد را آنلاین می‌خوانی و همان‌جا امضا می‌کنی. | Read the contract online and sign it right there. |
| home_process_invoices | هر خط فاکتور به کار انجام‌شده وصل است. | Every invoice line maps to real work. |
| home_stats | این عددها را سیستم‌عامل کاری خودمان شمرده؛ ساعت‌ها ثبت شده‌اند، نه حدس زده. | Our own work OS counted these. Hours are tracked, not guessed. |
| home_latest | آنچه یاد می‌گیرم را می‌نویسم و ضبط می‌کنم. اگر تازه‌کاری، از دوره شروع کن. | I write and film what I learn. New here? Start with the course. |
| home_testimonials | حرف من را قبول نکن؛ از زبان مشتری‌ها بشنو. | Don't take my word for it. Hear it from clients. |
| home_cta | آماده‌ای؟ ایده‌ات را بگو؛ معمولاً ظرف یک روز کاری جواب می‌دهم. | Ready? Tell me your idea. I usually reply within a working day. |
| footer | لینک‌ها، فید RSS و مستندات API در انتهای صفحه‌اند. | Links, the RSS feed and API docs are at the end of the page. |
| work_index | همهٔ کارها این‌جاست؛ با فیلترها بر اساس فناوری یا سال بگرد. | All our work is here. Filter by stack or year. |
| work_detail | ماجرای کامل این پروژه: مسئله، تصمیم‌ها و نتیجه. | The full story of this project: the problem, the decisions, the result. |
| services_index | خدمات بر اساس برند دسته‌بندی شده‌اند؛ روند کار و پرسش‌های رایج بعد از آن‌ها آمده‌اند. | Services are grouped by brand; our process and the FAQ follow them. |
| service_detail | جزئیات این خدمت و چیزی که تحویل می‌گیری. سؤالی داشتی، بپرس. | What this service includes and what you'll get. Questions? Just ask. |
| blog_index | نوشته‌ها، ویدیوها و یادداشت‌های کوتاه؛ جستجو هم کار می‌کند. | Articles, videos and short notes. Search works too. |
| post_detail | خلاصه اول مطلب است و فهرست مطالب به هر بخش می‌بردت. | The summary comes first, and the table of contents jumps to any part. |
| learn_index | دوره‌های قدم‌به‌قدم؛ از پایه تا انتشار. | Step-by-step courses, from the basics to launch. |
| course | درس‌ها به ترتیب‌اند؛ هر کدام کوتاه و عملی. | Lessons run in order; each is short and hands-on. |
| lesson | درس قبلی و بعدی در انتهای همین صفحه‌اند. | The previous and next lessons are at the end of this page. |
| about | این‌جا خودم را معرفی کرده‌ام و چیزهایی که برایمان مهم است. | This is me, and what we care about. |
| contact | فرم کوتاه است؛ هر چه بیشتر بگویی، دقیق‌تر جواب می‌دهم. | The form is short. The more you tell me, the better my reply. |
| not_found | این صفحه گم شده، ولی من این‌جام. با دکمهٔ خانه یا داک برگرد. | This page is lost, but I'm still here. Head back with the Home button or the dock. |
| panel_dashboard | نمای امروز: تایمرها، کارهای سررسیده و آخرین تغییرات. | Today at a glance: timers, due tasks and the latest changes. |
| panel_portalHome | پروژه‌هایت این‌جاست؛ پیشرفت، فاکتورها و قراردادها یک کلیک فاصله دارند. | Your projects live here; progress, invoices and contracts are one click away. |
| panel_time | چند تایمر را موازی روشن کن؛ هر ساعت ثبت‌شده به گزارش و فاکتور می‌رسد. از نوار بالا هم می‌شود تایمر زد. | Run timers in parallel; every logged hour flows into reports and invoices. You can start one from the menu bar too. |
| panel_calendar | با T به امروز برگرد و با N رویداد تازه بساز. | Press T to jump to today and N to create an event. |
| panel_tasks | با N کار تازه بساز؛ یادآورها سر وقت اعلان می‌شوند. | Press N for a new task; reminders notify you on time. |
| panel_projects | هر پروژه زبانه‌های خودش را دارد و خودت تعیین می‌کنی مشتری چه ببیند. | Each project has its own tabs, and you decide what the client sees. |
| panel_clients | مشتری‌ها و دسترسی پورتالشان را این‌جا مدیریت کن. | Manage clients and their portal access here. |
| panel_finance | حساب‌ها، تراکنش‌ها و تراز، با چند واحد پول. | Accounts, transactions and balances, in several currencies. |
| panel_invoices | فاکتورها لینک عمومی دارند و وضعیت پرداختشان پیگیری می‌شود. | Invoices get a public link, and their payment status is tracked. |
| panel_contracts | قرارداد بنویس، بفرست و امضای آنلاین بگیر. | Write a contract, send it and collect an online signature. |
| panel_docs | پایگاه دانش تیم؛ با ⌘S یا Ctrl+S ذخیره کن. | The team knowledge base; ⌘S or Ctrl+S saves. |
| panel_vault | رمزها فقط در مرورگر رمزگذاری می‌شوند؛ سرور هیچ‌وقت متن اصلی را نمی‌بیند. | Secrets are encrypted in your browser; the server never sees plaintext. |
| panel_content | نوشته‌ها، نمونه‌کارها و خدمات سایت؛ برای هر خدمت برند گودین‌اش را انتخاب کن. | Posts, work and services for the site; pick a Good In brand for each service. |
| panel_inbox | پیام‌های فرم تماس سایت این‌جا می‌رسند. | Messages from the site's contact form land here. |
| panel_media | تصویرها و فایل‌های سایت و پنل. | Images and files for the site and the panel. |
| panel_settings | حساب، امنیت، ظاهر و داک. | Account, security, appearance and the dock. |
| panel_designSystem | کاتالوگ زندهٔ اجزای رابط؛ پیش از ساخت چیز تازه این‌جا را ببین. | The living catalog of UI parts; check here before building something new. |

**panel**
- closeWindow: بستن پنجره / Close window
- zoomWindow: بزرگ‌نمایی پنجره / Zoom window
- windowWide: پنجرهٔ تمام‌عرض / Full-width windows
- dockSize: اندازهٔ داک / Dock size
- dockSmall: کوچک / Small · dockMedium: متوسط / Medium · dockLarge: بزرگ / Large
- dockMagnify: بزرگ‌نمایی آیکون‌ها / Magnification
- dockAutohide: پنهان‌شدن خودکار داک / Automatically hide the dock
- guideTips: نکته‌های راهنما / Guide tips
- aboutModule: دربارهٔ {module} / About {module}

**settings**
- preset_yellow: زرد گودین / Good In yellow
- desktopDock: میز کار و داک / Desktop & Dock
- desktopDockHint: اندازه و رفتار داک و پنجره‌ها در صفحه‌های بزرگ. / Dock and window behaviour on large screens.
- The `sidebar*` keys are removed later by panel-shell.

**designSystem**
- sec_brand: برند / Brand
- sec_osShell: پوستهٔ سیستم‌عامل / OS shell
- brandIntro: لوگوی پیکسلی، خانوادهٔ برندها و قواعد رنگ. / The pixel logo, the brand family and colour rules.
- osShellIntro: نوار منو، داک، پنجره‌ها و قاب‌ها. / Menu bar, dock, windows and frames.

Never add Persian strings containing "Lock", "Save", "Continue" or "New item" to chrome (e2e).

---

## 15. Cross-track contracts (defined by foundation, consumed by everyone)

### 15.1 DOM attributes

| Attribute | Placed by | Meaning |
|---|---|---|
| `data-guide="<key>" data-guide-say="<line>"` | home and site-pages via `FrameSection guide` | section narration |
| `data-guide-spot="<key>" data-guide-say` | home and site-pages via `FrameCell spot` / `spotAttrs` | hover/focus "special parts" |
| `data-reading` | site-pages (article and lesson roots) | small 40px dock |
| `data-brand="<id>"` | home brand cells | `:has()` logo swap |
| `.os-desktop` | site layout | wallpaper, rails, guide container |
| `.panel-shell` | panel layout | panel variables |

### 15.2 Storage keys and events (all new, none renamed)
- `localStorage`: `gt-guide`, `gt-guide-tips`, `gt-guide-test`, `gt-motion`, `gt-guide-mod:<key>`.
- `sessionStorage`: `gt-guide-seen`, `gt-guide-greeted`, `gt-boot`.
- Cookie: `gt-shell`.
- Events: `gt:guide`, `gt:guide-pref`.

### 15.3 Offset utilities migrated by foundation

| Location | Before → after |
|---|---|
| `article.tsx:140`, `lesson.tsx:184`, `about/page.tsx:87` | → `below-chrome` |
| `.prose-gt` headings | `scroll-margin-top: calc(var(--chrome-top) + 24px)` |
| `islands.tsx` Toc rootMargin, `doc-toc.tsx` rootMargin | computed once: `-(parseInt(getComputedStyle(documentElement).getPropertyValue('--chrome-top'))+16)px 0px -70% 0px` |
| `settings/security/activity/page.tsx:106` | → `top-chrome` |
| `settings-nav.tsx:63`, `tasks-app.tsx:181`, `invoice-editor.tsx:419`, `docs/[id]/page.tsx:168`, `doc-editor.tsx:342`, `post-editor.tsx:699` | → `below-chrome` (with the same breakpoint prefixes) |
| `design-system/_components/toc.tsx:69,75` | → `top-chrome` / `below-chrome`, plus computed rootMargin |
| `docs-sidebar.tsx:121` | → `below-chrome max-h-chrome` |
| `save-bar.tsx:12` | → `sticky above-dock` |
| `contract-editor.tsx:387` | → `sticky above-dock` |
| `doc-editor.tsx:445` | → `bottom-[var(--dock-space)]` (keeps `z-30`, under the dock's `z-40`) |
| panel `main pb-20` | removed by panel-shell (window body pads) |
| `-top-16` background layers in hero, `PageHero`, not-found, learn series, work and service detail | removed by their owners when re-framed |

---

## 16. File map and ownership
See the `tracks` field for exact ownership. Summary:
- **foundation:** tokens, brand assets, shell primitives, frame primitives, card `variant="cell"`, i18n keys, data plumbing, offsets, codemods.
- **site-shell:** site layout, menu bar, popovers, dock, footer, auth layout, `common`/`nav` copy.
- **home:** home page and home components, `site` copy.
- **site-pages:** every other public page, `ui.tsx`, `cards.tsx` (after foundation), article and lesson.
- **assistant:** guide layer, engine, loader, `guide` copy.
- **panel-shell:** panel layout and chrome, prefs, settings appearance, panel/settings/designSystem copy, catalog OS shell.
- **qa-docs:** cross-cutting e2e and perf, docs, final cleanup.

---

## 17. Testing and QA

**Unit tests**
- `pixel-font`: new glyphs, `toPaths` covers all cells, 34×18 for TEAM/STUDIO/CODE.
- `pixel-icons`, `pixel-avatar` (dimensions, tones).
- `brands`: `isValidSuffix`, `brandOf` fallback.
- `frame-plan` (fillers).
- `shell/match` (active path).
- `shell/shortcuts`.
- `guide/geometry`.
- `panel-prefs`: cookie round-trip, invalid values, init-script regex.
- `design-tokens`: yellow root, green block, white foreground on 5 presets, `chromeTokens`.

**e2e**
- `site-shell.spec.ts` (site-shell):
  - menu bar landmark; brand menu opens on click and closes on Esc
  - language links have `hreflang` and cause a full load to `/en`
  - dock Home has `aria-current` on `/`
  - Ctrl+K opens Spotlight and focuses `input[name=q]`
  - Control Center Reduce motion sets `html[data-motion]`, which survives a reload
  - no horizontal overflow at 375px
  - `/en` mirrors to LTR
- `guide.spec.ts` (assistant), with `gt-guide-test=1`:
  - greeting text equals the formatted greeting
  - scrolling to `#work` shows the bubble with `[data-guide=home_work]`'s `data-guide-say`
  - Hide persists across a reload (layer `hidden`)
  - reduced motion never sets `data-state=walk`
  - the sprite button toggles `aria-expanded`
  - Esc closes
- `panel-shell.spec.ts` (panel-shell):
  - owner dock has 16 `[data-dock-app]`, client 5
  - ⌘K opens the palette
  - keyboard into the menu bar, ArrowRight, Enter opens a menu, an item navigates
  - the dock-size cookie gives `html[data-dock-size]` before hydration
  - at 1280×720 the last vault button is clickable
- `perf.spec.ts` (qa-docs): CLS and LCP under 4× CPU throttle on `/` and `/en`.
- `vault.spec.ts` unchanged and green.

**Shots:** `node scripts/shots.mjs / /work /services /blog /about /contact --dark --mobile`, plus `--login owner@goodteam.local:goodteam-demo-pass /panel /panel/time /panel/settings/appearance /panel/vault`.

---

## 18. Deferred (phase 2)
- `/studio` and `/code` brand landing routes (with `loading.tsx` and `staticSitePaths`).
- A `settings.brands` and `settings.guide` owner override, read through cached `getPublicBrands()`/`getPublicGuide()` inside existing Suspense holes.
- A panel window ViewTransition crossfade, only after an INP trace review.
- Persian pixel digits.
- Pixel module icons for the panel dock.
- Server-side Persian normalisation of `?q=` blog search.

---

## 19. Risks
1. **Persian brand form** awaits the owner (D2). The stored `profile.brandName` must be edited in production.
2. **Yellow contrast regressions** that the codemods miss (dynamic class strings, inline styles, print docs, charts). Mitigation: a lint guard against `\btext-primary\b(?!-)` and a manual light-mode axe pass of the catalog.
3. **Browser gaps**: anchor positioning, scroll timelines, `@starting-style`, `:has()` magnification. All are progressive with static fallbacks; QA on Safari 18+ and Firefox ESR.
4. **Docks covering reading content.** Mitigations: `--dock-space`, `scroll-padding-bottom`, the 40px reading dock, the solid mobile tab bar.
5. **Guide perceived as noisy.** Mitigations: 600ms dwell, once per session, gap placement, persistent mute, quiet panel. Tune with owner feedback.
6. **Panel sidebar removal changes muscle memory.** Mitigations: group menus, ⌘K, Launchpad, focus labels. Run `vault.spec` early.
7. **Cache Components.** A missed Suspense around `usePathname`, the clock or the profile fails `pnpm build`. Run it every commit.
8. **`content-visibility` and sticky.** Never wrap sticky asides in `.frame-cv`. Intrinsic sizes are per section.
9. **Fractional DPR** can make pixel cells uneven (accepted); the integer-cell rule minimises it.
10. **Interim misalignment.** Until site-shell or panel-shell land, the old 64/72px headers sit under the new `--chrome-top` values; sticky offsets look off by a few px in their worktrees. Don't "fix" offsets locally.
11. **Seed demo service `svc-design`** is demo-only; real Studio services come from the owner.

---

## 20. Acceptance criteria

### Brand and tokens
- [ ] fa `appName` is «گودین تیم» and en is "Good In Team" everywhere: chrome, `<title>` template, manifest, OG, feed, MCP and OpenAPI titles, ICS PRODID.
- [ ] No identifier from the never-renamed list changed. `git grep` shows `gt_session`, the `gt_` token prefix, `good-team-vault-backup`, `goodteam-data` and `SERVER_INFO name 'good-team'` intact.
- [ ] Default preset is yellow on first paint with no JS. A saved `gt-preset=green` still shows green.
- [ ] `design-tokens.test.ts` passes. The 5 non-orange, non-yellow presets have `--primary-foreground:#ffffff`.
- [ ] No `text-primary` (bare), `hover:text-primary`, `hover:bg-primary-dark` or `text-warning` (bare) remains in `src/**/*.tsx`.
- [ ] Light-mode axe shows no contrast failures on `/`, `/en`, `/services`, `/panel`, `/panel/design-system` and `/panel/settings/appearance`.

### Pixel art
- [ ] `PixelLogo` renders ≤6 SVG children. Every pixel asset renders at integer px per cell, at every breakpoint.
- [ ] The favicon, OG images and all 11 `LogoMark`/`Logo` call sites show the pixel brand. Print invoices and contracts stay legible on white.

### Frame
- [ ] Every public page section is a framed box on the 1200px column. Rails line up with box borders at 375, 768, 1024, 1280 and 1440px in both directions.
- [ ] The L-frame and the ink corner cell sit at inline-start (right in fa). Ringed markers sit at the other corners and cell intersections (md+).
- [ ] No grey hole appears in any incomplete grid row. Fillers complete the home grids at md and lg.
- [ ] Strip lights light up when a box is centred (scroll-timeline), and are static under reduced motion.

### Site shell
- [ ] The site menu bar has brand, links, availability, virtual-me extra, Spotlight, language, theme, Control Center and clock as specified. It is 32px on desktop with fine pointers and 44px on mobile, and mirrors in fa.
- [ ] No Radix DropdownMenu, Tooltip or sonner chunk loads on any public route. Public first-load JS is ≤ baseline.
- [ ] The locale switch is a plain `<a hrefLang>` doing a full page load.
- [ ] Dock magnification works with a mouse in LTR and RTL. It is off for touch and reduced motion. The active dot and `aria-current` are correct. The launch bounce appears on slow navigations.
- [ ] The mobile tab bar has Home, Work, Services, Contact and More. More opens the Launchpad. Popovers close on navigation.
- [ ] Ctrl/⌘K opens Spotlight. The quick-link filter matches «ي» typed for «ی». Enter goes to `/blog?q=`.
- [ ] The boot animation plays once per session and never touches the `<h1>`.

### Home
- [ ] Home has 10 framed sections in the specified order, with all existing queries and same-size skeletons. CLS ≤0.01 under 4× throttle.
- [ ] The hero hub logo cycles TEAM→STUDIO→CODE→TEAM once in ≤4.2s (static under reduced motion). The brand-family logo swaps suffix on hover/focus of brand cells.
- [ ] The hero diagram has no infinite dash animation; packets stop after 6 iterations.

### Guide
- [ ] It loads after `load` + idle and fetches nothing. Engine chunk ≤6KB gz. It does not load when muted, under Save-Data, or under webdriver without the test flag.
- [ ] It speaks each section once per session after a dwell, stands in the gap above boxes (never over cell content on desktop), and walks, hops or drops correctly in LTR and RTL.
- [ ] The sprite is a button. The live region only speaks explicit actions. Tour focus moves only to Next. Esc closes. Mute persists and is reachable by keyboard.
- [ ] Narration exists only in `data-guide-say` attributes; there is no sr-only narration text.

### Panel
- [ ] The panel shows menu bar, window and role dock. Owner sees 16 dock apps, member 9, client 5, plus Me and View site. The client never sees staff items.
- [ ] Menu bar menus are fully keyboard-operable (Radix Menubar) and mirror in fa. ⌘K works on a Persian layout.
- [ ] `gt-shell` prefs apply before paint with no flash. Auto-hide, size and wide work and persist. `gt-sidebar-collapsed` is expired.
- [ ] SaveBar, contract action bar, doc-editor mobile bar and toasts sit above the dock. `vault.spec.ts` passes at 1280×720.
- [ ] All 56 `loading.tsx` files exist. There is a skip link in the panel. No always-mounted `role=dialog`.

### Repo-wide
- [ ] `pnpm check` and `pnpm build` pass. `shots.mjs` reports 0 console errors and 0 responses ≥400 (fa/en, dark, mobile, panel).
- [ ] Docs are updated: `brand.md`, `os-shell.md`, `design-system.md`, `architecture.md`, `modules/settings.md`, `modules/content.md`, `HANDOFF.md` (deployment checklist: brandName, brand mapping, Persian name sign-off). Catalog Brand and OS shell sections are live.
