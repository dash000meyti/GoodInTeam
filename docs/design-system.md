# Design system

**Structure** follows [shadcn/ui](https://ui.shadcn.com) (owned component source in
`src/components/ui`, semantic CSS variables, `cva` variants, `data-slot` attributes).
**Look** is "Good In OS" (spec: [`design/os-redesign.md`](design/os-redesign.md)): brand yellow
`#FFC50D` as the only accent, neutral greys, ink text, a macOS-like shell (menu bar, dock,
windows) and, on the public site, Cloudflare-style **framed boxes** on a dotted desktop. Panel
content keeps the soft Minimals surfaces (rounded cards, alpha badges). Brand assets (pixel
logo, icons, the "virtual me" sprite) are documented in [brand.md](brand.md).

A live catalog is at **Panel → Design system** (`/panel/design-system`, owner/admin): every
token and component with a live preview and a copyable usage snippet. Its sections live in
`src/app/[locale]/panel/design-system/_components/sections/*` — **when you add or change a
shared component, add or update its example there** (see [modules/settings.md](modules/settings.md#design-system-catalog)).

## Tokens (`src/app/globals.css`)

| Token                                                                                                                               | Light                                                        | Dark                                             | Use                                   |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------- |
| `--background` / `--card` / `--popover`                                                                                             | `#F3F3F3` / `#FFF` / `#FFF`                                  | `#161618` / `#1F1F22` / `#232326`                | page / cards / menus                  |
| `--foreground`                                                                                                                      | `#1C1C1E`                                                    | `#F5F5F7`                                        | text                                  |
| `--muted` / `-foreground`                                                                                                           | `#E8E8EA` / `#636366`                                        | `#2A2A2D` / `#A1A1A6`                            | subtle surfaces / secondary text      |
| `--primary` (+ `-lighter/-light/-dark/-darker`)                                                                                     | yellow scale (preset)                                        | preset                                           | fills only on light surfaces          |
| `--primary-ink`                                                                                                                     | `var(--primary-dark)` `#7A5A00`                              | `var(--primary-light)` `#FFDB66`                 | text, links, icons, focus rings       |
| `--primary-hover`                                                                                                                   | `color-mix(primary 86%, black)`                              |                                                  | hover of yellow fills                 |
| `--success` `--warning` `--info` `--destructive` `--violet`                                                                         | `#22C55E` `#F76B15` `#00B8D9` `#CE2C31` `#8E33FF`            | destructive `#FF6369`                            | status fills (`/16` for soft)         |
| `--success-ink` `--warning-ink` `--info-ink`                                                                                        | `#0B6B42` `#A04A00` `#00618C`                                | `#22C55E` `#FF9F43` `#00B8D9`                    | status text and icons                 |
| `--*-foreground` on status fills                                                                                                    | `#1C1C1E` (destructive: `#FFF`)                              | `#1C1C1E`                                        | text on solid fills                   |
| `--border` / `--input`                                                                                                              | `rgb(106 106 108 / .18 / .32)`                               | `rgb(255 255 255 / .1 / .16)`                    | lines                                 |
| `--chart-1…5`                                                                                                                       | `var(--primary-ink)` `#8E33FF` `#0086A8` `#118D57` `#CE2C31` | `var(--primary)` … `#00B8D9` `#22C55E` `#FF6369` | charts                                |
| `grey-50 … grey-900`                                                                                                                | `#FAFAFA` … `#1C1C1E` (neutral)                              |                                                  | neutrals                              |
| chrome: `--brand-*`, `--desktop`, `--dots`, `--frame-line`, `--frame-rail`, `--marker-*`, `--light-*`, `--guide-line`, `--dock-dot` | see `chromeTokens`                                           |                                                  | logo tones, wallpaper, frames, lights |
| `shadow-card`, `shadow-dropdown`, `shadow-dialog`, `shadow-primary`, `shadow-window`                                                |                                                              |                                                  | elevation                             |

Tailwind utilities exist for `primary-ink`, `primary-hover`, `success-ink`, `warning-ink`,
`info-ink`, `desktop`, `frame-line`, `brand-yellow`, `brand-ink`, `brand-frame`.

**Color presets** (`<html data-preset="…">`, persisted in `localStorage gt-preset`): `yellow`
(default, in `:root`, `DEFAULT_PRESET` in `theme.ts`), `green`, `cyan`, `purple`, `blue`,
`orange`, `red`. A saved preset is applied before first paint by `presetInitScript`; the five
dark-fill presets set `--primary-foreground: #fff`, yellow and orange keep ink.
**Preset previews** render `className={PRESET_SCOPE_CLASS}` together with
`style={presetStyle(p)}`: `.preset-scope` re-derives every `var(--primary…)`-based token (ink,
hover, ring, sidebar, `chart-1`, shadows), so the preview shows that preset's own ink and ring.

**Dark mode**: `.dark` class via `next-themes` (`system` default).

`design-tokens.ts` mirrors all of it as data (`presetScales`, `surfaceTokens`, `statusTokens`,
`statusForegroundTokens`, `inkTokens`, `chartTokens`, `chromeTokens`, `greyScale`) and
`design-tokens.test.ts` parses `globals.css` against it. Keep the `:root`, `.dark`,
`@theme inline`, `[data-preset]` and `.preset-scope` blocks **flat** (the parser reads each to
its first `}`); never write a literal `:root {` / `.dark {` inside a comment above them.

## Contrast (spec §3.4, measured)

- **Yellow is a fill, never text, an icon or a thin line on a light surface** (1.43:1 on
  `#F3F3F3`). Text on yellow is `#1C1C1E` (10.7:1); never white on yellow.
- Text, links, icons and rings use the **-ink tokens**: `text-primary-ink` (5.75:1),
  `text-success-ink`, `text-info-ink`, `text-warning-ink`. The bright `text-primary`,
  `text-success`, `text-info`, `text-warning` are allowed only under `dark:`.
- A bright colour kept on a surface that is dark in both modes (terminals, `tone="ink"` cells)
  uses the arbitrary form `text-[color:var(--success)]` (greppable, ignored by the guard).
- `#9A7200` is for dashed outlines (guide), `#B3B5B9`/`#CACCCE` for frames and rails only.
- **ESLint guard** (`eslint.config.mjs`, `no-restricted-syntax` on string literals and template
  parts) fails on a light-mode bright text token. Never silence it with `eslint-disable`.
- **Non-text states** (WCAG 1.4.11) are fixed once in `components/ui`: focus rings are solid
  `ring-2 ring-ring` (never `ring-ring/40`); checked switch tracks, progress fills and slider
  ranges get an inset `--primary-dark` edge; checkbox/radio/slider borders use
  `border-primary-ink`; menu rows highlight with a yellow fill, ink text and an inset
  `--primary-dark` ring (destructive rows use the destructive fill).
- Badges: `success`/`info` use the ink tokens; `warning` `#A04A00`/`#FF9F43`; `destructive`
  `#B0242A`/`#FF9592`.
- The catalog's **Brand** section shows the full allowed/never table; failing samples sit in
  `data-a11y-demo` (excluded from the axe contrast run; use that attribute nowhere else).

## Typography

- `fa`: Vazirmatn (Persian glyphs) → Public Sans (Latin glyphs). `en`: Public Sans.
- Code: JetBrains Mono. All self-hosted via `next/font/local` (no network at build).
- Headings `font-extrabold`/`font-black`, tight tracking. Body 15–17px, line-height ~1.8 for fa.
- Long-form content: `.prose-gt` class (headings with anchors, Shiki code blocks light/dark).
  It is **layered** (`@layer components`), so a utility on the same element wins: never put a
  size class on a `.prose-gt` element "for show" (they used to be dead, now they apply).
- Type scale (spec §3.5): display 56/1.02 en · 48/1.3 fa (mobile 36 · 32), h2 40/1.08 · 36/1.35,
  OS UI 13px en / 14px fa (`--menubar-fs`). Negative tracking only under `:lang(en)`; never on
  Vazirmatn. `FrameHeaderCell` applies the heading scale.

## CSS architecture (D17)

`globals.css` holds the tokens, the base layer, the utilities and the **legacy** `.prose-gt` and
`/* site */` rules — the latter are wrapped in `@layer components` and frozen ("never add rules
here"). Everything new lives in owned partials under `src/app/styles/`, imported right after
`tw-animate-css` in this order:

| Partial           | Owner (track) | Holds                                                                                 |
| ----------------- | ------------- | ------------------------------------------------------------------------------------- |
| `os-shell.css`    | foundation    | shell variables, offset utilities, menu bar, menus, dock, lights, window, clock, boot |
| `frame.css`       | foundation    | `.os-desktop` wallpaper, frame boxes, grids, cells, strips, eyebrow, `.frame-cv`      |
| `pixel.css`       | foundation    | `.px-art` sizing, `.px-set`, `.px-corners`, sprite frames, logo cycle                 |
| `site-shell.css`  | site-shell    | site menu bar, popovers, site dock, footer, auth                                      |
| `home.css`        | home          | home sections                                                                         |
| `site-pages.css`  | site-pages    | other public pages                                                                    |
| `guide.css`       | assistant     | the pixel guide                                                                       |
| `panel-shell.css` | panel-shell   | panel menu bar, window, dock                                                          |

Rules for partials: class rules in `@layer components`, `html` variables in `@layer base`,
`@keyframes`/`@property` at top level; never `:root {` or `.dark {` (use `html {}` / `.dark .x`);
no `@apply dark:`. Because partials load first, an override of a legacy `.gt-*`/`.prose-gt` rule
needs a selector at least one class more specific. Shiki's `!important` colour rules stay
unlayered on purpose (an important declaration inside a layer would beat every utility).

**Shell variables** (`os-shell.css`): `--menubar-h` (32px desktop + fine pointer, 44px
otherwise), `--chrome-top`, `--dock-space` (both registered with `@property`, so
`getComputedStyle(...).getPropertyValue()` returns px — read them with
`shell/chrome-vars.ts`), `--gutter`, `--section-gap`, `--cell-pad`, `--frame-max: 1200px`,
`--dir` (±1). Offsets use the utilities **`below-chrome`** (sticky asides), **`top-chrome`**
(sticky bars), **`above-dock`** (bottom bars), **`pb-dock`**, **`max-h-chrome`** — never a
hard-coded `top-24`/`bottom-4` for the chrome. Fragment/focus scrolling uses only
`html { scroll-padding-top/bottom }`; elements never add a chrome-sized `scroll-margin`.

**Blur**: only the menu bar and the dock blur (≥768px, ≤20px). Everything else is opaque
(92–97%); the dialog scrim and the chart tooltip are the only transient exceptions.

## OS shell (`src/components/shell`)

How the site and panel shells, the frame system, the pixel brand and the guide fit together
(Suspense map, CSS variable contract, menus, dock, guide authoring, storage keys, budgets):
**[os-shell.md](os-shell.md)**.

| Export                                                            | Notes                                                                                                                  |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `MenuBarShell` + class constants (`MB_ITEM_CLASS`, `MENU_CLASS`…) | server-safe `<header class="os-menubar">` with a labelled start `<nav>` and end group                                  |
| `Dock`, `DockTile`, `DockSeparator`, `DockSlot`, `DockEntry`      | server-safe dock frame; `tabbar="md"` (site) / `"lg"` (panel) turns it into a tab bar                                  |
| `DockLinks`                                                       | client; internal Suspense, `aria-current` via `isActivePath`, running dots, launch bounce (`useLinkStatus`), `srExtra` |
| `OsLights`, `Window`                                              | octagon lights; a window with a pixel path bar (`path` list → one `PixelTextSet`)                                      |
| `OsClock`, `ClockSkeleton`, `clock-format.ts`                     | client-only studio clock with a fixed width (`--clock-w`)                                                              |
| `ThemeToggle`, `AppearanceModeToggle`, `useMotionPref`            | no Radix (safe for public pages)                                                                                       |
| `guide-events.ts`                                                 | guide storage keys/events, `guideAttrs`, `spotAttrs`, `dispatchGuide`                                                  |
| `match.ts`, `shortcuts.ts`, `normalize.ts`, `chrome-vars.ts`      | pure helpers (active path, ⌘K, Persian-aware filter, chrome variables)                                                 |

## Frame (public site, `src/components/site/frame.tsx`)

Every public section is a **framed box**: `FrameSection` (a square `.frame-box` on the 1200px
column, logo L-frame at inline-start, ringed markers) → one or more stacked `FrameGrid`s →
`FrameCell`s. Boxes are square; only `Window`s are rounded. Rules:

- Every `FrameCell` is a child of a `FrameGrid`; rows of different shapes are stacked grids
  (the hairline between them is kept by `.frame-grid:has(+ .frame-grid)`).
- `FrameGrid cols`: `1`, `2`, `3`, `4`, `"2-1"`, `"hero"`; `FrameCell span`: `2`, `3`, `md2`
  (full row at md, one track at lg — header cells), `lg2`, `full`, `row2`.
- Tones: `default`, `card`, `dots` (decoration only: never text; sets `data-decor`), `ink`,
  `yellow`. `FrameHeaderCell` replaces `SectionHeading` and marks `data-frame-header`.
- **No mid-grid holes**: list every span layout with each streamed count in a test
  (`packRows(spans, cols, bp)` must return `holes === 0` at md and lg) and complete the last
  row with `<FrameFiller units={{ md: packRows(s, cols, "md").trailing, lg: … }} />`. A missing
  item in a fixed row becomes a `tone="dots"` slot cell in place.
- `first` on a page's first box (half gap, a 56px roof for the guide at ≥1024px); its first row
  ends at inline-end in a `[data-decor]` cell ≥312×200px.
- `cv={px}` wraps below-the-fold bodies in `.frame-cv` (never around sticky children). Never
  `overflow:hidden`/`content-visibility` on `.frame-box`/`.frame-grid`, never transform the
  `.os-desktop`.
- Shared site pieces: `StatsCells` (the `FrameGrid 4`, no box — the caller owns the section and
  the Suspense) and `CtaBand` (renders its own `FrameSection id="contact-cta"`; never wrap it).
  Cards take `variant="cell"` inside frame cells.
- Narration: every box carries `guide={{ key, say }}` (→ `data-guide`/`data-guide-say`) and
  special parts `spot`; lines live in the server-only `guide` i18n namespace and only
  paraphrase copy visible in that section.

## Components

| Primitive (`components/ui`)                                                                                     | Notes                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                                                                                        | variants: `default` (primary + glow on hover), `inherit` (Minimals black), `soft`, `outline`, `secondary`, `ghost`, `link`, `destructive`; sizes `sm/default/lg/icon/icon-sm/icon-lg` |
| `Badge`                                                                                                         | soft by default: `default/success/warning/info/violet/destructive/neutral/outline/solid`                                                                                              |
| `Card` (+Header/Title/Description/Action/Content/Footer)                                                        | `rounded-2xl shadow-card`                                                                                                                                                             |
| `Input`, `Textarea`, `Label`, `Field`                                                                           | `Field` = label + control + hint/error, auto-wired (see [Forms & accessibility](#forms--accessibility))                                                                               |
| `Select`, `Checkbox`, `RadioGroup`, `Switch`, `ToggleGroup`                                                     | Radix, RTL-aware                                                                                                                                                                      |
| `Dialog`, `Sheet`, `AlertDialog`, `Popover`, `Tooltip`, `DropdownMenu`, `Command`                               | overlays; `Sheet side` is logical: `start` / `end` / `top` / `bottom`; close button label is `t.common.close`                                                                         |
| `Tabs`, `Accordion`, `Collapsible`, `Table`, `Progress`, `Skeleton`, `ScrollArea`, `Avatar`, `Kbd`, `Separator` |                                                                                                                                                                                       |
| `ChartContainer`, `ChartTooltip(Content)`, `ChartLegend(Content)`                                               | shadcn-style Recharts wrappers; config key → `--color-<key>`                                                                                                                          |

| Shared (`components/shared`)                                          |                                                                                                                                                              |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DatePicker`                                                          | Jalali (fa, Persian digits) / Gregorian (en), emits `YYYY-MM-DD`, form-friendly; named month/day buttons; wires to its `Field`                               |
| `SelectField`                                                         | Select + hidden input + optional "none"                                                                                                                      |
| `SwitchInput`                                                         | Switch that submits `"true"/"false"`                                                                                                                         |
| `ConfirmDialog`, `CopyButton`, `ColorDot`, `LiveDuration`, `Markdown` |                                                                                                                                                              |
| `MarkdownEditor`                                                      | textarea + server-rendered preview (Shiki), form-friendly                                                                                                    |
| `useActionForm`, `useAction`                                          | server-action wiring with toasts + field errors; `<form onSubmit={form.submit}>` (keeps input on validation errors)                                          |
| `ThemeToggle`, `AppearanceMenu`, `usePreset`, `LocaleSwitcher`        | `usePreset()` stays in sync across components; `ThemeToggle` and the mode toggle live in `shell/appearance.tsx` (re-exported)                                |
| `design-tokens.ts`                                                    | tokens as data (see [Tokens](#tokens-srcappglobalscss)), `presetStyle(p)` + `PRESET_SCOPE_CLASS` — verified against `globals.css` by `design-tokens.test.ts` |

| Panel (`components/panel`)                                                                                       |                                                                                        |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `PageHeader`                                                                                                     | title, breadcrumbs, description, actions — every page                                  |
| `EmptyState`                                                                                                     | every empty list                                                                       |
| `StatCard`                                                                                                       | KPI tiles (`tone`: primary/info/warning/violet/destructive/success)                    |
| `nav-config.ts`                                                                                                  | source of truth for the dock, menu bar, Launchpad and ⌘K (role filters, dock pins)     |
| `panel-prefs.ts`                                                                                                 | `gt-shell` cookie (dock size, magnify, auto-hide, wide) + pre-paint script; ⌘K matcher |
| `session-chrome.tsx`, `menu-bar.tsx`, `panel-dock.tsx`, `launchpad.tsx`, `control-center.tsx`, `panel-guide.tsx` | the panel OS chrome (see [os-shell.md](os-shell.md#shells-and-their-suspense-map))     |

| Brand (`components/brand`)                                                   |                                                                      |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `LogoMark`, `Logo`                                                           | compatibility layer; sized only by `cell` (3 → 33px)                 |
| `PixelLogo`, `PixelMark`, `PixelLogoCycle`, `PixelLogoSwap`                  | one path per tone; `cell` 1/2/3/4/6/8/10/12 or an inherited `--cell` |
| `PixelText`, `PixelTextSet`, `PixelIcon`, `PixelAvatar`, `PixelAvatarSprite` | see [brand.md](brand.md)                                             |
| `brands.ts`                                                                  | the brand registry (team, studio, code), `brandOf`, `isValidSuffix`  |

## Forms & accessibility

- **Field wiring is automatic.** `<Field label hint error required>` generates ids (`useId`) and
  passes them to its control through context: `Input`, `Textarea`, `SelectTrigger`/`SelectField`,
  `DatePicker` (and `TimezoneSelect`) get `id`, `aria-describedby` (hint/error), `aria-invalid`
  and `aria-required`; the label gets `htmlFor`. No `htmlFor`/`id` needed — explicit ones still win.
- **One Field = one control.** Two id-taking controls in one Field would share an id; split them.
- **Groups**: `RadioGroup`, `ToggleGroup` and the color swatch picker are labelled with
  `aria-labelledby` (a `<label for>` can't name a group). For an ad-hoc group of buttons, use
  `<Field label="…" group>` (wrapper becomes `role="group"`).
- **Custom controls**: spread `useFieldControl({ id, …props })` on the focusable element
  (`"group"` as 2nd argument for groups). Popover/Dialog/Sheet content resets the context.
- **Forms** submit with `onSubmit={form.submit}` (never `action=`): React resets a form after an
  action, which would wipe input on a server validation error.
- **Icon-only buttons** always get an `aria-label` from i18n — no hard-coded English in
  `components/*`.
- **Row actions revealed on hover** must also show on `focus-visible`, `group-focus-within` and
  touch (`pointer-coarse:opacity-100`) — see the milestone list.
- **Small muted text** (menu group labels, captions) uses full `text-muted-foreground`
  (4.9:1 light / 6.4:1 dark); `/80` and lighter fail WCAG AA.
- **Keyboard shortcuts** match layout-independently (`isCommandPaletteShortcut`: Latin `e.key`,
  else `e.code`) so ⌘K works on a Persian keyboard.
- **Client-only preferences** that change layout (the `gt-shell` dock size / auto-hide / wide
  window) live in a cookie applied by an inline script before paint — never `localStorage` +
  effect.

## RTL rules

- Use logical utilities only: `ms-* me-* ps-* pe-* start-* end-* text-start text-end border-s border-e rounded-s rounded-e`.
- Directional icons (chevrons, arrows) get `rtl:rotate-180` (or swap by `dir`).
- Numbers, emails, URLs, code: wrap with `dir="ltr"`.
- Radix components read direction from `DirectionProvider` (set in the root layout).

## Patterns

- **Panel page**: `PageHeader` → KPI row (`StatCard` grid) → content `Card`s → `EmptyState` when empty.
- **Create/edit**: `Dialog` with a form (≤ 12 fields) or a dedicated page for long editors.
- **Destructive**: always `ConfirmDialog` (including small row actions).
- **Status**: `Badge` soft variants; colors consistent per status across modules.
- **Motion**: CSS transitions/keyframes only on the public site; no endless main-thread motion
  (packets capped at 6 iterations, static ants, the logo cycle runs once, the sprite blink 5
  times). Respect `prefers-reduced-motion` and the site's Reduce motion switch
  (`html[data-motion=reduce]`), both handled globally; give every animation a meaningful
  static frame.

## Charts

- Use `ChartContainer` + Recharts; colors come from config keys (`var(--color-<key>)`) mapped
  to `--chart-1…5` **in fixed order** (chart-1 follows the primary preset).
- One series → no legend (the title names it); ≥ 2 series → always a legend; donuts get a
  value legend beside them (identity is never color-only). Tooltips on every chart.
- Marks: bars `radius={[4, 4, 0, 0]}`, lines `strokeWidth={2}`, 2px `var(--card)` stroke between
  pie slices. One y-axis — never dual-axis. In RTL, `reversed` the X axis and put the Y axis on
  the right.
- Palette check (re-run for the Good In palette): every light mark is ≥3:1 on white and on
  `#F3F3F3` (chart-1 `#7A5A00` 6.4/5.8, chart-2 `#8E33FF` 5.2/4.7, chart-3 `#0086A8` 4.2/3.8,
  chart-4 `#118D57` 4.2/3.8, chart-5 `#CE2C31` 5.2/4.7); dark marks on `#1F1F22`: chart-1
  `#FFC50D` 10.4, chart-2 3.2, chart-3 6.9, chart-4 7.2, chart-5 5.7. chart-4 (green) and
  chart-5 (red) are close for red-green CVD: never encode identity by colour alone (legend,
  labels), and prefer chart-1/chart-2 for two-series charts. `--chart-1` follows a saved preset
  in both modes.

## Settings UI patterns

- Settings pages: `SettingsHeader` + `SettingsCard` (icon-led card) from
  `panel/settings/_components/section.tsx`; long forms end with a sticky `SaveBar`.
- Bilingual settings use `BilingualField` (fa/en side by side on md+, a fa/en switch on phones,
  error dot on the tab that has an error).
- One-time secrets (API tokens, temporary passwords) are shown once in a dialog with a copy
  button and a clear warning; never store or re-display them.
