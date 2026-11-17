# Good In OS: final redesign spec

**Scope**
- Public site: fa is the default (RTL, no URL prefix); en is LTR under `/en`.
- Private panel, including the client portal.

**Stack**
- Next.js 16.4 with Cache Components and Partial Prefetching.
- React 19.3, Tailwind v4, Radix (panel only), SQLite.

**Base and grafts.** The `perf` proposal is the base. Grafts come from `wow` and `structure`, and every flaw the three judges raised is fixed (see §1, Decisions).

**Status.** Ready to implement in 7 tracks: `foundation` first, then 5 parallel tracks, then `qa-docs`. Every gap from the completeness critic and from recheck rounds 1 and 2 (`docs/design/os-redesign-review.md`) is resolved in this text. Acceptance criteria in §20 are numbered `A1`–`A43`; each track brief in `os-redesign-tracks.json` names the criteria it owns.

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

Two map constraints are deliberately changed, and the change is recorded here so nobody "fixes" it back:
- **Site map: "keep site CSS inside the `/* ─── site ─── */` block in `globals.css`."** Replaced by D17: new shell and site CSS lives in owned partial files under `src/app/styles/`. The existing site block stays in `globals.css` but is wrapped in `@layer components` (§5.1) so partials and utilities can override it. No new rule is ever added to that block.
- **Reference map: "the assistant's content must also exist as normal page text."** Replaced by D10: narration lives only in `data-guide-say` attributes, but every line is a paraphrase of copy that is visible on the same page (§10.3, "Paraphrase rule"). The information is always on the page; only the sentence is not.

---

## 0. Principles

| # | Principle | Rule |
|---|---|---|
| P1 | Server first | All chrome is server-rendered and prerendered per locale. Client islands only do what HTML and CSS cannot: active state from `usePathname`, the clock, toggles, the guide engine. |
| P2 | CSS before JS | Site menus use the native Popover API. Dock magnification uses `:hover`, sibling selectors and `:has()`. Reveals, the "focused window" lights and the footer wordmark are scroll-driven CSS. **No scroll listeners anywhere.** |
| P3 | One lazy engine | The site guide is vanilla TypeScript loaded with `import()` after `load` plus idle. It uses one IntersectionObserver and one ResizeObserver, and reads layout only when it activates. |
| P4 | Zero layout shift | Every fixed bar and every streamed hole has a reserved size. The guide and the docks are overlays. |
| P5 | Minimal blur | At most two `backdrop-filter` surfaces per page, and only these two: the menu bar (`.os-menubar`) and the dock (`.os-dock-list::before`), at ≥768px only, with blur ≤20px. Pages with a dock have exactly two; the auth pages have one. Everything else is opaque, at 92–97%. Every existing `backdrop-blur*`/`.glass` use is removed by a named owner (§12, "Blur removal"). The only exceptions are two transient panel overlays: the Radix dialog scrim (`dialog.tsx`, 2px) and the chart tooltip (`chart.tsx`). |
| P6 | No new font files | Pixel lettering is SVG built from `pixel-font.ts`, one `<path>` per tone. Persian is always Vazirmatn. |
| P7 | The logo is the theme | The logo's L-frame (top and inline-start bars plus a dark corner cell) appears on every frame box, dock brand tile and window. Yellow #FFC50D is the only accent and is never used as text on light surfaces. |

---

## 1. Decisions

| # | Decision | Why / source |
|---|---|---|
| D1 | `perf` is the base. Grafts: L-frame motif, arc-hop flight with pixel trail, tour, Control Center with Reduce motion, Persian-normalised Spotlight filter, a restrained once-per-session boot, the panel's "Me" dock tile (from `wow`); narration in `data-guide-say` attributes, sprite as a real `<button>` with a live region only for explicit actions, once-only logo cycle, status ordering, pointer-only panel lights with menu equivalents, destructive and warning hues, 14px Vazirmatn UI text (from `structure`). | All three judges |
| D2 | Persian brand form: **«گودین تیم»**, with «گودین استودیو» and «گودین کد». This follows the «لینکدین» pattern. «گود این» with a space reads as "the pit of this" and is rejected. The pixel logo is always Latin. **Owner sign-off required.** Alternatives are «گوداین تیم» or Latin-only. Changing it is **not** a 4-key edit: the root «گودین» appears in every place listed in §2 "Persian brand touchpoints". The procedure is one `git grep -n "گودین"` replace over exactly those files, plus the stored `profile.brandName` in production. A guard unit test (`src/i18n/messages/brand-form.test.ts`) fails if any fa message still contains «گود تیم» or «گود این». | Judges 1 and 3 |
| D3 | The default colour preset is a new `yellow`, set in `:root`. Green moves to a flat `[data-preset="green"]` block. Dark mode stays `system`. A saved `gt-preset` is respected. | perf |
| D4 | Contrast is handled by tokens, not by patching call sites: `--primary-ink`, `--primary-hover`, `--warning-ink`, `--success-ink` and `--info-ink` are new. Destructive becomes #CE2C31 (light) / #FF6369 with ink foreground (dark); warning becomes #F76B15; success and info solid fills get ink foregrounds. Codemods cover `text-primary`, `hover:text-primary`, `hover:bg-primary-dark`, `ring-primary`, `border-primary` (state), `text-warning`, `text-success`, `text-info` and the alpha focus rings `ring-ring/40`. Non-text states (switch, radio, checkbox, progress, slider, menu highlights) follow the §3.4 state table, fixed once in `components/ui`. | Judge 3 measured #FF5630 with white at 3.17:1; the critic measured `text-success` 2.05:1 and `text-info` 2.14:1 on #F3F3F3 |
| D5 | Pixel art is rendered as **one `<path>` per tone** with integer cell sizes only. A sub-brand suffix is valid when `pixelTextWidth(suffix) ≤ 31`, which keeps the logo at 34×18. Validate this with zod `refine`, not a length regex. | Judge 2 counted 128–157 rects per logo; a 6-glyph word can be 38 cells wide |
| D6 | Frame hairlines use cell `border-inline-end` / `border-block-end` with the grid at `-1px` end margins. The `wow` border technique has no grey holes in incomplete rows. Server-side `FrameFiller` cells complete rows for the pure Cloudflare look. | The `structure` stretch rule was broken |
| D7 | The L-frame is a box-shadow outside the 1px border (`calc(-3px*var(--dir)) -3px 0 var(--brand-frame)`) plus a 3×3 ink corner cell at top-start. The other three box corners get ringed 9px markers. Cell markers at md+ go at each cell's top-start and bottom-end. The box geometry is unaffected. | wow + perf |
| D8 | Below-the-fold frame bodies use `content-visibility:auto` inside a `.frame-cv` wrapper (−5px margin, 5px padding), so markers are not clipped. Never on boxes with sticky children. | perf |
| D9 | Site menus are native popovers using the WAI-ARIA disclosure pattern. There is no Radix on public pages; Radix DropdownMenu is removed from them. The panel uses Radix Menubar. | perf |
| D10 | Narration lives in the server-only i18n namespace `guide`, rendered into `data-guide-say` attributes on sections and spots. There is **no sr-only hidden text**. Screen-reader users get lines through explicit actions, announced by one polite live region. Every line paraphrases copy visible on the same page and adds no new facts (§10.3); this is the recorded deviation from the reference map's "also exists as page text" rule. | Judges 2 and 3 |
| D11 | The site guide is on by default. It speaks once per section per session after a 600ms dwell. It never auto-speaks under `navigator.webdriver` unless `localStorage gt-guide-test=1`. Muting (`gt-guide=off`) stops automatic behaviour only; the explicit "What's this part?" and "Tour" actions still work and load the engine in explicit-only mode (§10.4). The panel guide is quiet: a dock "Me" tile, plus a one-time peek per module that can be turned off. | perf + wow |
| D12 | The logo cycle (TEAM → STUDIO → CODE → TEAM) runs **once**, in ≤4.2s, in the hero hub (WCAG 2.2.2). The brand-family section swaps the suffix with `:has()` on hover or focus. No infinite logo animation. | Judges 2 and 3 |
| D13 | A once-per-session boot moment uses transforms only: the menu bar slides down and the dock rises. The hero `<h1>` is never animated. There are **no page ViewTransitions in v1**, because they interact with streamed Suspense reveals. | Judges |
| D14 | The panel window's title bar is **not sticky** (only the menu bar is). The traffic lights are pointer-only (`tabIndex=-1`, `aria-hidden`); their commands exist in the App menu. | Judge 3, structure |
| D15 | Panel prefs live in the cookie `gt-shell` = `size.magnify.autohide.wide` (e.g. `48.1.0.0`). A pre-paint script sets only the layout-affecting html attributes. The dock skeleton is invisible: the dock is fixed and its space is CSS-reserved, so CLS is 0 with no item-count bookkeeping. | Judge 2 |
| D16 | Sub-brands are `/services#studio` and `/services#code` in v1. `/studio` and `/code` routes are phase 2. | Judges |
| D17 | Shell CSS is split into partial files (`src/app/styles/*.css`) imported by `globals.css`, one owner each. Tokens stay in `globals.css` (the token test parses only that file). Partials use `@layer components` / `@layer base` so Tailwind utilities can still override them. **The existing unlayered `.prose-gt` block and `/* site */` block in `globals.css` are wrapped in `@layer components` by foundation** (§5.1); otherwise every partial override of `.gt-*`/`.prose-gt` (e.g. the marquee pause in `home.css`) would silently lose to unlayered rules. | Parallel ownership; critic verified the blocks are unlayered (L389–706) |
| D18 | All header-height and dock collisions (sticky tops, bottom bars, Toc rootMargins, scroll offsets) are replaced in `foundation` using shell CSS variables and utilities. Fragment and focus scrolling uses **one** mechanism: `html { scroll-padding-top/bottom }`. Elements never add their own chrome-sized `scroll-margin`. | Avoids file conflicts and double-counted offsets |
| D19 | Both clocks (site and panel) show **studio time** (`appTimezone()`, through a cached `getPublicTimezone()`), inside Suspense. | structure flagged that `env.timezone` was wrong |
| D20 | The sprite design is the perf 16×16 "virtual me" with a yellow hoodie. It uses the same palette in both modes (literal fills, `AVATAR_FILLS` in §4.2, never the re-tonable `--px-*`/`--brand-*` variables), faces its direction of travel, and its art is never mirrored. Its poses are exactly `idle, blink, talk, walkA, walkB, wave, sit` (§4.3). | perf |
| D21 | **Compact guide** below 1024px or on coarse pointers: the sprite is pinned above the dock, hops and shows a badge on each new section, and opens a bubble only on tap (plus the one-time greeting). It does not walk to each section there. This is a deliberate deviation from the owner's "comes to each section" wish on phones and tablets (likely most fa traffic), listed in §19 and in the HANDOFF owner sign-off items. | Judges (wow's auto bubbles covered content on phones) |
| D22 | Everything two parallel tracks share is built by `foundation`: frame primitives, card `variant="cell"`, `StatsCells` (home §8 row 07 and `/about`; it renders the `FrameGrid 4`, never the box), `CtaBand` (home §8 row 10 and the other pages; it renders its own `FrameSection`), and the `id` + `data-guide` attributes on the current home sections (so the assistant's e2e runs before the home rewrite lands). No parallel track waits on, or edits, another parallel track's file (§16). | Critic: cross-track dependencies |

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
- **Registry order is the only display order**: team, studio, code. Every list of brands renders `brands` as is, never re-sorted: home brand cells (§8 row 02), the `/services` brand boxes (§9), the footer `nav.brands` list (§7.5), and the `/services` box-order test (§17). A different order is a change to this array, which foundation owns.
- Unit test: every brand passes `isValidSuffix`, and `brandLogoLayout(suffix)` is exactly 34×18.

**Services → brand.** `posts.meta.brand: z.preprocess(emptyToUndefined, z.enum(brandIds).optional())`, the same empty-to-undefined preprocess that `meta.icon` gets through `zOptString`. A bare `z.enum(…)` would reject the editor's "None" option (`""`), so a brand could never be cleared. Touch:
- `src/lib/zod-helpers.ts`: export its module-private `emptyToUndefined` (foundation)
- `content/schemas.ts` (`postMetaInput`)
- the `PostCard.meta` type in `queries.ts`
- `editor-types.ts` and `editor-data.ts`
- a "Brand" select next to the icon select in `post-editor.tsx`

**Brand sync across locales (service layer, not the editor).** The editor saves one locale row, so the rule lives in `src/server/modules/content/service.ts`, which every adapter (server action, REST, MCP) goes through:
- Three states, read from the **parsed** input. zod 4 keeps a key that was present in the input even when its parsed value is `undefined`, and `cleanMeta` already relies on this to delete keys:
  - **set**: `meta.brand !== undefined`;
  - **cleared**: `"brand" in meta && meta.brand === undefined` (the editor sent `""`);
  - **absent**: `!("brand" in meta)`, or no `meta` at all. No sync.
- In `createPost` and `updatePost`, when the row's `type` is `service`, the brand is set or cleared, and the row has a non-null `translationKey`, the same transaction runs `UPDATE posts SET meta = json_set(meta, '$.brand', ?) WHERE translationKey = ? AND id != ? AND type = 'service'` (or `json_remove(meta, '$.brand')` when cleared). Last write wins.
- `createTranslation` already copies `meta`, so a new sibling inherits the brand.
- Readers still use `brandOf(meta)`, so a missing or invalid brand falls back to `team`.
- Test: `src/server/modules/content/service.test.ts` (new, the throwaway-SQLite pattern of `projects/service.test.ts`): updating the fa row's brand updates the en row; clearing it (`meta: { brand: "" }` through `updatePostInput`) clears both; an update whose `meta` has no `brand` key leaves both rows' brand unchanged; a non-service post with the same `translationKey` is untouched.

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
- `Dockerfile` (L2 heading comment) and `.env.example` (L1 heading comment)
- `globals.css` and `logo.tsx` comments
- JSON-LD Organization `alternateName: ["Good In Team","گودین تیم"]`
- Add `goodin` and `goodinteam` to both weak-password lists (keep `goodteam`)
- **Seed copy** (`scripts/seed.ts`), so `/about` and the demo documents show the new brand after `pnpm db:reset && pnpm db:seed`:
  - L76 profile `brandName` → `{ fa: "گودین تیم", en: "Good In Team" }`
  - L110 payment instructions «… به نام گود تیم» → «… به نام گودین تیم»
  - L235 project name «وب‌سایت و پنل Good Team» → «وب‌سایت و پنل Good In Team». **Keep the slug `good-team-site`** (quick-add examples and tests reference it).
  - L912 contract party «**طرف اول:** گود تیم» → «**طرف اول:** گودین تیم»
  - L1434–1448 the about-page post: fa excerpt «داستان گودین تیم» and body «ما گودین تیم هستیم…»; en excerpt "The Good In Team story" and body "We are Good In Team, …"
  - Leave every `@goodteam.local` address, `goodteam-demo-pass` and `github.com/goodteam/…` URL unchanged (fixtures).

**Persian brand touchpoints** (everything a change of D2's Persian form must touch; the guard test in D2 covers the i18n files):
- i18n: `common.appName`; `nav.brandTeam`, `brandStudio`, `brandCode`, `brandMenu`; `site.metaTitle`, `brandsEyebrow`, `brandsSubtitle`; `settings.preset_yellow`; `guide.greetingNoName`, `greetingCompactNoName`, `home_brands`, `home_services`, `panel_content`; every other `guide` line that names the brand.
- Code: the `settingsSchemas.profile.brandName` default; JSON-LD `alternateName` in `json-ld.tsx`.
- Data: `scripts/seed.ts` (the lines above); the stored `settings.profile.brandName` in production (Settings → Profile).

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
| Dock Home tile, panel Dashboard tile | `PixelMark` | 3 → 33px (inside the 48 tile); **2 → 22px in tab-bar mode** (site `<768`: `cell={2} className="md:[--cell:3px]"`; panel `<1024`: `cell={2} className="lg:[--cell:3px]"`), because the tab-bar `.os-tile` is 28px |
| Favicon `src/app/icon.svg` | mark paths on paper | viewBox 0 0 11 11 |
| Hero diagram hub | `PixelLogoCycle` once | 2 (<lg) / 3 (lg+) |
| Brand family big logo | `PixelLogo` + `:has()` swap | 4 (<md) / 6 (md) / 8 (lg+) |
| Brand cells, /services brand headers, footer brand column, brand menu header | `PixelLogo` | 2 or 3 |
| Footer wordmark | `PixelLogo TEAM paper=false` | 6 (<md) / 8 (md) / 12 (lg+) |
| OG images | paths in `og.tsx` built from `toPaths()` with **literal** hex fills (Satori resolves no CSS variables) | 10 |
| `LogoMark`/`Logo` compatibility layer | `LogoMark({ cell = 3, className })` → `PixelMark`; `Logo({ label, cell = 3, className })` → `PixelLogo TEAM` + sr label. Size comes **only** from `cell`; `className` must never carry `size-*`/`w-*`/`h-*` (Tailwind utilities beat `.px-art` and would give fractional cells). | 3 → 33px default |

**The 11 `LogoMark`/`Logo` call sites** (verified) and who edits each:

| Call site | Today | After | Owner |
|---|---|---|---|
| `(auth)/layout.tsx` ×2 | `Logo` | replaced by the auth menu bar `PixelMark` and the window's `PixelLogo` (§7.6) | site-shell |
| `site-header.tsx`, `site-footer.tsx` | `Logo` | replaced by `PixelMark`/`PixelLogo` (§7.2, §7.5) | site-shell |
| `panel/sidebar.tsx` | `size-8` | foundation's sweep strips the class (`<LogoMark />`, 33px) so the A8 grep is empty when foundation merges; panel-shell then deletes the file (§11.1) | foundation (sweep), panel-shell |
| `home/hero-diagram.tsx` | `size-[9cqw]` | foundation's sweep strips the class (`<LogoMark cell={4} />`, 44px, interim); home then replaces it with `PixelLogoCycle` (§8 row 01) | foundation (sweep), home |
| `i/[token]/page.tsx`, `sign/[token]/page.tsx`, `contract-sheet.tsx` | `size-9` (36px) | `<LogoMark cell={3} />` (33px) | foundation |
| `p/[token]/page.tsx` | `size-10` (40px) | `<LogoMark cell={4} />` (44px) | foundation |
| `invoice-document.tsx` | `size-11` (44px) | `<LogoMark cell={4} />` (44px) | foundation |

Verification: `git grep -nE "<(LogoMark|Logo|PixelMark|PixelLogo)[^>]*className=\"[^\"]*\b(size|w|h)-"` returns nothing once foundation's sweep has run (today it lists exactly the seven `size-*` call sites above, all edited by foundation), so foundation's own VERIFY can pass before home and panel-shell merge.

---

## 3. Design tokens

### 3.1 Rules for `globals.css`
- `:root {`, `.dark {`, `@theme inline {` and every `[data-preset="x"] {` stay **flat** (no nesting, no `@media` inside). The test reads each block up to the first `}`.
- Export `DEFAULT_PRESET = "yellow"` from `theme.ts`. Use it in `presetInitScript` (`p!==DEFAULT`), in `usePreset` (fallback, server snapshot, remove-attribute) and in `design-tokens.test.ts:45`.
- `colorPresets = ["yellow","green","cyan","purple","blue","orange","red"]`, with `presetSwatches.yellow = "#FFC50D"`.
- `AppearanceMenu` becomes `grid-cols-7`. The swatch `aria-label` is `t.settings["preset_"+p]`, which fixes the raw-id bug.
- **`--primary-foreground: #ffffff` must be added explicitly** to the `green`, `cyan`, `purple`, `blue` and `red` blocks, because `:root` is now ink (otherwise purple is 2.68:1). Orange keeps `#1c252e`. Mirror all of this in `presetScales`.
- `viewport.themeColor`: light `#F3F3F3`, dark `#161618`. Manifest `background_color` and `theme_color`: `#F3F3F3`.
- **Preset previews (`presetStyle`).** `--primary-ink`, `--primary-hover`, `--ring`, `--sidebar-primary*`, `--sidebar-accent*`, `--sidebar-ring`, `--chart-1`, `--shadow-primary` and `--surface-glow` are `var()`-derived on `:root`/`.dark`. A custom property inherits its already-substituted value, so a subtree that only overrides `--primary*` inline keeps yellow's ink, hover and ring. Fix, mode-aware and without JS:
  - `globals.css` gets two more **flat** blocks right after the preset blocks, in this order (the test finds `.preset-scope {` before `.dark .preset-scope {`):
    ```css
    .preset-scope { --primary-ink: var(--primary-dark); --primary-hover: color-mix(in oklab, var(--primary) 86%, black);
      --ring: var(--primary-ink); --sidebar-primary: var(--primary); --sidebar-primary-foreground: var(--primary-foreground);
      --sidebar-accent: color-mix(in oklab, var(--primary) 14%, transparent); --sidebar-accent-foreground: var(--primary-ink);
      --sidebar-ring: var(--primary-ink); --chart-1: var(--primary-ink); --shadow-primary: 0 8px 16px 0 rgb(var(--primary-rgb) / 0.32);
      --surface-glow: rgb(var(--primary-rgb) / 0.2); }
    .dark .preset-scope { --primary-ink: var(--primary-light); --sidebar-accent-foreground: var(--primary-light);
      --chart-1: var(--primary); --surface-glow: rgb(var(--primary-rgb) / 0.16); }
    ```
    Declarations on the same element resolve against that element's inline `--primary*`, so the derived tokens follow the previewed preset in both modes.
  - `design-tokens.ts` exports `PRESET_SCOPE_CLASS = "preset-scope"`. `presetStyle(p)` keeps its signature and return value. Every preview element renders `className={PRESET_SCOPE_CLASS}` together with `style={presetStyle(p)}`: Settings → Appearance swatch previews (`appearance-settings.tsx`, panel-shell) and the catalog sample in `colors.tsx` (foundation).
  - `design-tokens.test.ts` adds: every `:root` variable whose value contains `var(--primary` or `--primary-rgb` is redeclared in `.preset-scope`, and every such `.dark` variable is redeclared in `.dark .preset-scope`.

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
  --success: #22c55e; --success-foreground: #1c1c1e; --success-ink: #0b6b42;
  --warning: #f76b15; --warning-foreground: #1c1c1e; --warning-ink: #a04a00;
  --info: #00b8d9; --info-foreground: #1c1c1e; --info-ink: #00618c;
  --violet: #8e33ff; --violet-foreground: #ffffff;
  --chart-1: var(--primary-ink); --chart-2: #8e33ff; --chart-3: #0086a8; --chart-4: #118d57; --chart-5: #ce2c31;
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
  --success-ink: #22c55e; --info-ink: #00b8d9;
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

**`--chart-1` follows the preset in both modes**: `var(--primary-ink)` in light, `var(--primary)` in dark, and it is redeclared in `.preset-scope` (§3.1). A literal light value would give a user with a saved green, purple or blue preset yellow-brown charts in light mode and their own colour in dark mode. For yellow it resolves to #7A5A00 (5.75:1 on #F3F3F3).

**`@theme inline` additions**
- Colors: `--color-primary-ink`, `--color-primary-hover`, `--color-warning-ink`, `--color-desktop`, `--color-frame-line`, `--color-brand-yellow`, `--color-brand-ink`, `--color-brand-frame`, plus `--shadow-window`.
- Colors (continued): `--color-success-ink`, `--color-info-ink`.
- Neutral grey scale:

  | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 |
  |---|---|---|---|---|---|---|---|---|---|
  | #fafafa | #f3f3f3 | #e8e8ea | #caccce | #b3b5b9 | #8e8e93 | #6a6a6c | #48484a | #2c2c2e | #1c1c1e |

**Old grey `rgb(145 158 171 / α)` replacement** (verified: 17 lines in `globals.css`, 5 in `design-tokens.ts`, 1 each in `og.tsx`, `contract-sheet.tsx`, `print-styles.tsx`, `invoice-document.tsx`, plus a comment in `colors.tsx`). The replacement depends on where the value lives:

| Where | Write | Why |
|---|---|---|
| Token values inside the flat `:root {` / `.dark {` blocks | the literal `rgb(106 106 108 / α)` (as in §3.2) | `design-tokens.test.ts` compares the raw strings |
| `design-tokens.ts` | the same literal `rgb(106 106 108 / α)` strings | must equal the `:root` text, never `var(--grey-rgb)` |
| Other `globals.css` rules (utilities, `.gt-lift`, `.gt-ring`, scrollbar) and partials | `rgb(var(--grey-rgb) / α)` | follows the token |
| `og.tsx` | literal `rgba(255,255,255,0.06)` for the grid (§9 OG row) | Satori resolves no CSS variables |
| Print components (`contract-sheet.tsx`, `print-styles.tsx`, `invoice-document.tsx`) | literal `rgb(106 106 108 / α)` | print forces light values; keep them literal |
| `colors.tsx` comment | update the example text | documentation only |

**`design-tokens.ts`.** Mirror the yellow scale and all surface, status, chart and grey changes. Add a `chromeTokens` array (brand, frame, marker, lights, guide, dock-dot) with a new test case. Add `warning-ink`, `success-ink`, `info-ink` and `primary-ink`/`primary-hover` to whichever arrays the test reads. Add `PRESET_SCOPE_CLASS` (see §3.1).

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
- `text-success` (not followed by `-`) → `text-success-ink` (25 lines, e.g. `stat-card.tsx`, `kpi-card.tsx`, `how-we-work.tsx`, `lesson.tsx`, `strength-meter.tsx`).
- `text-info` (not followed by `-`) → `text-info-ink` (25 lines, e.g. `stat-card.tsx`, `hero-diagram.tsx`, `task-bits.tsx`, `notifications-bell.tsx`).
- Exception for the three status codemods and `text-primary`: a hit that sits on a dark or solid-colour surface in both modes (e.g. inside `bg-grey-900` terminals or `tone=ink` cells) keeps the **bright colour**. It is written in the arbitrary-value form of the same token: `text-[color:var(--success)]`, `text-[color:var(--info)]`, `text-[color:var(--warning)]` or `text-[color:var(--primary)]`.
  - The ESLint guard (§19 risk 2) does not match that form, so `pnpm lint` stays green with **no `eslint-disable` comments**.
  - Every kept hit stays greppable: `git grep -n "text-\[color:var(--"`.
  - The codemod script prints every hit, and foundation reviews the list in the PR.
- Focus rings in `components/ui` (11 files: `accordion`, `button`, `checkbox`, `dialog`, `radio-group`, `scroll-area`, `sheet`, `switch`, `tabs`, `toggle-group`, plus `slider`'s `ring-primary/24`): `focus-visible:ring-[3px] focus-visible:ring-ring/40` → `focus-visible:ring-2 focus-visible:ring-ring`; `focus-visible:ring-destructive/30` → `focus-visible:ring-destructive`. The same replacement runs over the rest of `src/**` (24 lines in total).
- Button `link` variant → `text-primary-ink`.
- Badges: `warning` text becomes `text-[#a04a00] dark:text-[#ff9f43]`; `destructive` text becomes `text-[#b0242a] dark:text-[#ff9592]`; `success` text becomes `text-success-ink`; `info` text becomes `text-info-ink`.
- Any `bg-destructive text-white` → `text-destructive-foreground`. Any `bg-success text-white` / `bg-info text-white` → `text-success-foreground` / `text-info-foreground`.
- `.prose-gt a`, the blockquote border and `h2 a:hover::after` → `var(--primary-ink)`.
- `.prose-gt` headings: `scroll-margin-top: 6rem` → **removed** (D18: `html { scroll-padding-top }` is the only offset).
- `.gt-lift:hover` box-shadow (now `rgb(var(--grey-rgb)/…)`) gets `!important`, because after layering (§5.1) the `shadow-card` utility on the same element would otherwise win.
- `* { outline-ring/50 }` → `outline-ring`.
- `.gt-accent` becomes a highlighter:
  - Light: `background: linear-gradient(transparent 58%, rgb(var(--primary-rgb)/.55) 58% 92%, transparent 92%)`, `color: inherit`, `box-decoration-break: clone`.
  - Dark: `color: var(--primary); background: none`.
  - Delete the `[dir=rtl]` variant.
- `.text-gradient` → `primary-ink → foreground`.
- `.gt-ring` → `rgb(var(--primary-rgb)/.55)` to `rgb(var(--grey-rgb)/.14)`, with no violet.
- `.gt-glow` is **not** restyled: it keeps today's rule (absolute, round, `filter: blur(80px)`), only layered. Every call site colours the blob with a `bg-primary/NN` or `bg-violet/NN` utility, which would beat a layered `background` and, without the blur, turn each glow into a hard-edged disc. The glows go away by deletion instead: every call site has a named removal owner in §12 "Glow removal", and qa-docs deletes the `.gt-glow` rule once `git grep -n "gt-glow " -- 'src/**/*.tsx'` is empty. New soft light (the hero diagram's one layer, §8 row 01) is written in the owner's partial as `radial-gradient(closest-side, var(--surface-glow), transparent)`, never with `.gt-glow`.
- `.gt-dot` → a 6px square `var(--primary)` with a `0 0 0 1px var(--brand-ink)` ring.
- `.gt-ants` → static dashes (no animation). `.gt-packet` → `animation-iteration-count: 6`.
- Cover palette (`cover.tsx`): `["#FFC50D","#1C1C1E","#6A6A6C","#FFDB66","#48484A","#B3B5B9"]`. The icon is ink on light covers and white on dark ones.
- Catalog swatches (`data-display.tsx:142`): `["#FFC50D","#00A76F","#078DEE","#7635DC","#F76B15","#CE2C31"]`. Update the `colors.tsx` page colours to #F3F3F3 / #161618.
- **Contrast leftovers outside the class codemods** (inline CSS, SVG strokes; verified with `git grep`; the ESLint guard of §19 risk 2 matches only `text-*` classes, so these are fixed by hand):
  - `panel/docs/[id]/page.tsx:32` inline CSS `.doc-prose :is(h1,h2,h3,h4) > a:hover { color: var(--primary) }` → `var(--primary-ink)` (foundation).
  - `components/vault/totp-code.tsx:64` countdown ring `stroke-primary` (a thin line on a light card) → `stroke-primary-ink` (the `@theme` mapping of §3.2 generates it; 5.75:1 light, #FFDB66 dark) (foundation sweep).
  - `home/hero-diagram.tsx:140` endpoint rings `stroke="var(--primary)"` (1.5px on `--background`) → `var(--primary-ink)`; packets stay yellow fills (home, in its rewrite, §8 row 01).
  - Reviewed and kept: `start-timer-bar.tsx:64` `fill-primary` (a yellow-filled play icon whose outline becomes `text-primary-ink` through the codemod, so the shape keeps 5.75:1); every `text-primary-dark` hit, because each already has a `dark:…text-primary-light` pair (including `ui/toggle-group.tsx:34` and `settings-nav.tsx:52`).
  - Foundation's VERIFY runs `git grep -nP "(?<![\w-])(?:[\w\[\]=-]+:)*(?:stroke|fill|outline|decoration|caret|divide|border-[setblrxy])-primary(?![\w/-])|color:\s*var\(--primary\)" -- 'src/**/*.tsx'` and lists only the reviewed `start-timer-bar.tsx` hit (and the `logo.tsx` line until commit 4 rewrites it).

### 3.4 Contrast rules (measured)

| Colour | Allowed | Never |
|---|---|---|
| #FFC50D | Fills (buttons, chips, CTA panel, markers, handles, highlighter); dark-mode text (11.4:1 on #161618) | Text, icon or thin line on light surfaces (1.43:1 on #F3F3F3); white on yellow (1.59) |
| Text on yellow | #1C1C1E (10.73) | anything lighter than #3A3A3C |
| #7A5A00 (`--primary-ink` light) | text, links, icons, focus rings, chart marks (`--chart-1`) (5.75 on #F3F3F3, 6.38 on #FFF; 4.03 as an inset ring on yellow) | — |
| #9A7200 | guide dashed outline, dashed chip borders (3.96 on #F3F3F3) | body text |
| #FFDB66 (`--primary-ink` dark) | text in dark mode (13.4 on #161618) | light surfaces |
| #636366 / #A1A1A6 | muted text (#636366: 5.40 on #F3F3F3, 4.89 on #E8E8EA; #A1A1A6: 7.03 on #161618, 5.56 on #2A2A2D) | — |
| `--success-ink` #0B6B42 / dark #22C55E | success text and icons (5.92 on #F3F3F3, 5.24 on the `bg-success/16` badge; dark 7.93 on #161618) | #22C55E text on light (2.05) |
| `--info-ink` #00618C / dark #00B8D9 | info text and icons (6.13 on #F3F3F3, 5.37 on the `bg-info/16` badge; dark 7.62) | #00B8D9 text on light (2.14) |
| Success / info solid fills | #22C55E / #00B8D9 with #1C1C1E text (7.47 / ≥7) | white on them (2.28) |
| #6A6A6C brand ink | logo, markers, large text | small muted text |
| #B3B5B9, #CACCCE | frames, rails, idle lights, logo suffix | any text or meaningful icon |
| Destructive | #CE2C31 + white (5.21); dark #FF6369 + ink (5.87); dark text 6.23 | white on #FF5630 |
| Warning | fill #F76B15 + ink (5.73); text uses `--warning-ink` (#A04A00 5.45 / #FF9F43 8.86) | `text-warning` |
| Menu row highlight | yellow fill + #1C1C1E text + inset 1.5px `--primary-dark` ring on focus | yellow as the only focus signal |
| Destructive menu row highlight | `--destructive` fill + `--destructive-foreground` (5.21) | destructive red text on the yellow highlight (3.29) |

**Non-text states (WCAG 1.4.11), fixed once in `components/ui` by foundation.** Light-mode values; dark mode keeps the same structure with `--primary-ink` = #FFDB66.

| Control (file) | Rule | Measured |
|---|---|---|
| Focus ring (all `components/ui`) | solid `ring-2 ring-ring`, never an alpha ring | #7A5A00: 5.75 on #F3F3F3, 4.03 on yellow |
| Switch (`switch.tsx`) | checked: track `bg-primary` + `shadow-[inset_0_0_0_1px_var(--primary-dark)]`, thumb `bg-[#1c1c1e]`; unchecked: track `bg-grey-200` + `shadow-[inset_0_0_0_1px_var(--color-grey-600)]`, thumb white + `shadow-[0_0_0_1px_var(--color-grey-600)]` | track ring 5.75 / 4.41; thumb on yellow 10.73 |
| Radio (`radio-group.tsx`) | checked: border and inner dot `--primary-ink` | 5.75 |
| Checkbox (`checkbox.tsx`) | checked: fill `bg-primary`, border `border-primary-ink`, check icon #1C1C1E | border 5.75, icon 10.73 |
| Progress (`progress.tsx`) and slider (`slider.tsx`) | track `bg-grey-900/10`; fill `bg-primary` + `shadow-[inset_0_0_0_1px_var(--primary-dark)]`; slider thumb `border-primary-ink` | fill edge 4.98 on the track |
| Menu items (`.os-menu-item`, `dropdown-menu.tsx`) | as the two highlight rows above; `[data-variant=destructive]` uses the destructive highlight | 10.73 / 5.21 |

Re-run the dataviz check (`docs/design-system.md` L115–127) after the chart changes.

**Contrast verification is automated** (A6): `e2e/a11y.spec.ts` (qa-docs) runs `@axe-core/playwright` (devDependency added by foundation, pinned with `pnpm add -D -E`) with the `color-contrast` rule only, in light mode, on `/`, `/en`, `/services`, `/login`, `/panel`, `/panel/design-system` and `/panel/settings/appearance`. It fails on violations; `incomplete` results (text over images or gradients) are logged, not failed.

- **Intentional failures in the catalog are excluded.** These are the "Never" column of the table above, rendered by foundation's `sections/brand.tsx`, and any text-on-swatch sample in `sections/colors.tsx` that does not pass.
- Each such sample sits inside an element with `data-a11y-demo`. Its sample text is `aria-hidden`, and the pair is named in passing text beside it.
- The spec runs `new AxeBuilder({ page }).withRules(["color-contrast"]).exclude("[data-a11y-demo]")`.
- `data-a11y-demo` is allowed only in those two catalog files; qa-docs checks this with `git grep -l data-a11y-demo`.

Non-text states are checked by the catalog screenshots in qa-docs' manual pass against the table above.

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
| OS UI (menu bar, menus, desktop dock label bubbles) | 13px, 500 (`--menubar-fs`) | 14px, 500 (`--menubar-fs`) | mobile tab-bar labels: en 11px, fa 12px |

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
- When a component is rendered **without** `cell` (and has no default), it emits no class. The size then comes from an inherited `--cell` (fallback 2px).
- The guide sprite relies on this (§10.2): a `[--cell:Npx]` utility on the `<svg>` would beat any `@layer components` rule.
- `pixel.css`: `.px-art{inline-size:calc(var(--px-w)*var(--cell,2px));block-size:calc(var(--px-h)*var(--cell,2px))}`.
- Never use `%` or `vw` sizing.

New exports:
- `PixelLogoCycle({ suffixes = ["TEAM","STUDIO","CODE"], play = true, cell, className, title })`: the frame and `GOOD IN` once, plus one `<g class="gi-sfx" data-sfx=…>` path per suffix. With `play`, runs the once-only cycle (§4.4).
- `PixelLogoSwap({ id, cell })`: all three suffixes, TEAM visible, swapped by `:has()` (§4.4).

**`pixel-art.tsx` (new, server-safe, no hooks):**
- `PixelText({ text, cell, tone, className })`: Latin only; always `aria-hidden`; `dir="ltr"`; one `<path>`.
- `PixelTextSet({ items: readonly { id: string; text: string }[], cell, tone, className })`: several Latin strings in **one** `<svg class="px-art px-set">`, one `<path data-path-id={id}>` per item, all in `tone`; the svg is as wide as the widest item, so swapping items never changes its size. `pixel.css` shows only the first item (`.px-set>[data-path-id]:not(:first-child){display:none}`); a consumer swaps items with its own `:has()` rules (zero JS). Used by `Window` when `path` is a list (§5.6, §8 row 06).
- `PixelIcon({ name, cell = 2, mirror, className })`: 12×12. `mirror` adds the literal class `rtl:-scale-x-100` for directional icons (only `arrow`, §4.3), so the art points to inline-end in both directions.
- `PixelAvatar({ pose = "idle", part = "full", cell })`: static, a single frame. `pose: PixelPose` (§4.3). `part="head"` crops to the `AVATAR_HEAD` box (10×10 cells) and is what the site menu-bar extra and the panel Me tile use, at `cell={2}` (20px).
- `PixelAvatarSprite({ cell, state = "idle" })`: the base tones plus every variable part as its own element, for CSS frame switching (§4.4). Its root is `<svg class="px-art px-sprite" data-state={state}>` with `state: "idle"|"walk"|"talk"|"wave"|"sit"`. **The animation hook is this attribute on the sprite's own root svg**: `pixel.css` keys every frame rule on `.px-sprite[data-state=…]`, and the guide engine writes the state to `#gt-guide svg.px-sprite` (§10.2, §10.5), never to `#gt-guide`. The prop only sets the first frame (catalog demos pass it to show each state). `cell` has no default; the guide renders the sprite without one and sizes it from `guide.css` (§10.1).

Every pixel component's root is `<svg class="px-art">` (so budgets can be measured with one selector) with `shapeRendering="crispEdges"`.
- **Fills of the logo, mark, text and icons** (`TONE_FILLS`): `accent` → `var(--px-accent, var(--brand-yellow))`, `ink` and `corner` → `var(--px-ink, var(--brand-ink))`, `soft` → `var(--brand-soft)`, `frame` → `var(--brand-frame)`, so tiles can re-tone them (the yellow Contact tile sets `--px-accent:#1C1C1E`) and they follow light/dark.
- **Fills of the avatar** (`AVATAR_FILLS`, used only by `PixelAvatar` and `PixelAvatarSprite`): literal hex in both modes, never a variable, so no tile, panel or dark mode re-tones the person: `ink` (`k`) #6A6A6C, `face` (`f`) #F3F3F3, `eye` (`e`) #1C1C1E, `accent` (`y`, the hoodie) #FFC50D (D20). A dark-mode `--brand-paper` (#2A2A2D) can therefore never become the face. Because the hoodie is always #FFC50D and has no ink outline, the avatar never sits directly on a yellow surface; the CTA panel puts it on a paper tile (§8 row 10).

**Element counts** (`svg` + `g` + `path` + `rect`, one path per tone): `PixelMark` 6 · `PixelLogo` 7 · `PixelLogoCycle`/`PixelLogoSwap` 12 · `PixelIcon` ≤3 · `PixelText` 2 · `PixelTextSet` 1 + one per item (5 for four paths) · `PixelAvatar` ≤5 (head 4) · `PixelAvatarSprite` 16.

**Budget on `/` (fa and en, desktop and mobile DOM): ≤260 pixel-art elements**, measured as `document.querySelectorAll("svg.px-art, svg.px-art *").length`, allocated per owner:

| Owner | Allocation | What it covers (count) |
|---|---|---|
| site-shell | ≤125 | menu-bar brand `PixelMark` (6) + brand menu (`PixelLogo` 7 + 2 icons 6) + guide extra head (4) + Spotlight quick links (8 icons, 24) + Launchpad (header `PixelMark` 6 + 6 tile icons 18; **no logo row**) + dock (Home `PixelMark` 6 + 9 icons 27 + More 3) + footer (brand `PixelLogo` 7 + giant `PixelLogo` 7) = 122 |
| assistant | ≤20 | `PixelAvatarSprite` (16) |
| home | ≤115 | 7 strips × 2 `PixelText` (28) + hero cycle (12) + hero window path (2) + brand swap (12) + 3 brand `PixelLogo`s (21) + view-all icon (3) + ≤5 service brand icons (15) + process window path set (`PixelTextSet` of 4 paths, 5) + course window path (2) + `CtaBand` avatar (5) and 3 tiles (9; foundation builds it, home places it) = 114 |

The allocations add up to exactly 260; the counted total is 252. A track that needs more must take it from its own allocation. `e2e/perf.spec.ts` asserts the total.

### 4.3 Data files
**`pixel-icons.ts`.** 12×12 icons using `#` = ink, `y` = accent, `.` = empty; `export type PixelIconName = keyof typeof pixelIcons`.

**Foundation draws the grids.** The `perf` proposal's icon sheet is not in the repo, so foundation draws them to the motifs below. The owner reviews them in the catalog's Brand section before the parallel phase starts.

**Drawing rules**
- Art stays inside the inner 10×10 (a 1-cell empty margin).
- Strokes are 1 cell wide.
- At most two tones, with the accent on ≤20% of the filled cells.
- No shape is made only of single-cell diagonals.
- Legible at cell 2 (24px) and at cell 1 (12px; the home services brand chip uses `about`, `studio` and `code` at cell 1).
- Only `arrow` is directional.

| Name | Motif | Used by |
|---|---|---|
| `work` | briefcase: body, handle, accent clasp | dock, Spotlight |
| `services` | gear: toothed ring, accent hub | dock, Spotlight |
| `blog` | page with a folded top-end corner and three text lines, the first accent | dock, Spotlight, Launchpad |
| `learn` | mortarboard with an accent tassel | dock, Spotlight, Launchpad |
| `about` | head-and-shoulders bust, accent shirt (echoes the sprite) | dock, Spotlight, Launchpad, Team brand chip |
| `studio` | pen nib with an accent slit | dock, brand menu, Spotlight, Launchpad, Studio brand |
| `code` | `</>`, the slash accent | dock, brand menu, Spotlight, Launchpad, Code brand |
| `contact` | envelope with an accent seal | dock, Spotlight |
| `sign-in` | key with an accent bit (a key, not an arrow, so it never needs mirroring) | dock, Launchpad |
| `more` | 2×2 grid of 3×3 squares, one accent | mobile dock |
| `search` | magnifier, handle toward bottom-end (never mirrored, like macOS) | catalog (the Spotlight trigger uses lucide `Search`) |
| `globe` | circle with an equator and one meridian | panel View site |
| `arrow` | given below; rendered with `mirror` | home view-all cell (§8 row 04) |

The `arrow` grid points to inline-end in LTR. It is vertically symmetric, so `rtl:-scale-x-100` and AGENTS.md's `rtl:rotate-180` give the same pixels:
```
r0  ............   r1  ............   r2  ......##....   r3  .......##...
r4  ........##..   r5  .##########.   r6  .##########.   r7  ........##..
r8  .......##...   r9  ......##....   r10 ............   r11 ............
```
**Test** (`pixel-icons.test.ts`):
- the set is exactly the 13 names above;
- every icon is 12×12 and uses allowed characters only;
- the outer ring of cells is empty;
- each icon has at most two tones.

**`pixel-avatar.ts`.** The perf 16×16 sprite.
- Tones: `k` ink #6A6A6C, `f` face #F3F3F3, `e` eyes #1C1C1E, `y` hoodie #FFC50D. The same palette applies in both modes: the components paint them with the literal `AVATAR_FILLS` map (§4.2), keyed by the `PixelTone`s `ink`, `face`, `eye` and `accent`.
- Reference frame (idle, all parts shown):

```
r1  .....kkkkkk.....   r2  ....kkkkkkkk....   r3  ...kkkkkkkkkk...   r4  ...kkffffffkk...
r5  ...kffffffffk...   r6  ...kfeffffefk...   r7  ...kffffffffk...   r8  ...kfffeefffk...
r9  ....kffffffk....   r10 .....kkkkkk.....   r11 ....yyyyyyyy....   r12 ...yyyyyyyyyy...
r13 ..yyyyyyyyyyyy..   r14 ..yyy.yyyy.yyy..   r15 ....kk....kk....  (r0 empty)
```

- **Base** (`AVATAR_BASE: string[]`, 16 rows): the reference frame with the variable cells neutralised: r6 eye cells (x 5 and 10) are `f`, r8 mouth cells (x 7–8) are `f`, r15 is empty.
- **Parts** (`AVATAR_PARTS: Record<AvatarPart, PixelCell[]>`), each a delta of **one tone**, drawn over the base:

  | Part | Cells |
  |---|---|
  | `eyes` | `e` (5,6), (10,6) |
  | `mouth` | `e` (7,8), (8,8) |
  | `mouthTalk` | `e` (6..9,8), (7..8,9) |
  | `armsLap` | `y` (5,14), (10,14) |
  | `feetIdle` | `k` (4,15), (5,15), (10,15), (11,15) |
  | `feetA` | `k` (3,15), (4,15), (11,15), (12,15) |
  | `feetB` | `k` (5,15), (6,15), (9,15), (10,15) |
  | `feetSit` | `k` (2..5,15), (10..13,15) |
  | `waveFace` | `f` (14,8), (14,9) |
  | `waveSleeve` | `y` (13,10), (13,11) |

- **Poses** (`export type PixelPose = "idle"|"blink"|"talk"|"walkA"|"walkB"|"wave"|"sit"`; `AVATAR_POSES: Record<PixelPose, AvatarPart[]>`):

  | Pose | Parts |
  |---|---|
  | idle | eyes, mouth, feetIdle |
  | blink | mouth, feetIdle (eyes hidden → face colour) |
  | talk | eyes, mouthTalk, feetIdle |
  | walkA / walkB | eyes, mouth, feetA / feetB |
  | wave | eyes, mouth, feetIdle, waveFace, waveSleeve |
  | sit | eyes, mouth, armsLap, feetSit |

- `AVATAR_HEAD = { x: 3, y: 1, w: 10, h: 10 }`: the crop used by `PixelAvatar part="head"`.
- `composeAvatar(pose): PixelCell[]` (pure) merges base and parts, later parts winning per cell.
- Tests (`pixel-avatar.test.ts`): base and every part fit in 16×16; each part has exactly one tone; every pose composes to valid tones; `composeAvatar("idle")` equals the reference frame above; the head crop lies inside the grid and contains no `y` cells.

### 4.4 CSS in `src/app/styles/pixel.css`

**Frames.** `PixelAvatarSprite` renders the base as four tone paths and each part as its own element: `<path class="px-p-eyes">`, `px-p-mouth`, `px-p-mouthTalk`, `px-p-armsLap`, `px-p-feetIdle`, `px-p-feetA`, `px-p-feetB`, `px-p-feetSit`, and `<g class="px-p-wave">` holding the two wave paths (16 elements). The sprite's root `<svg class="px-art px-sprite" data-state>` (§4.2) is the only element the frame rules read: `.px-sprite[data-state=…] .px-p-…` shows the parts of the matching pose (§4.3) and switches frames with `steps(1)`. Nothing in `pixel.css` reads `data-state` on an ancestor (Radix also uses `data-state`), and the guide engine sets the attribute on that svg (§10.5):
- `idle`: blink is a 120ms hide of `.px-p-eyes` every 4.2s, **5 iterations per activation** (≈21s); the engine restarts it by re-setting `data-state` on the svg on the next activation, so no animation runs indefinitely.
- `walk`: `feetA`/`feetB` alternate, 2 frames × 160ms, for the duration of the move only.
- `talk`: `mouth`/`mouthTalk` alternate, 2 frames × 180ms, until the text wipe ends.
- `wave`: 4 frames × 2 iterations.
- `sit`: static.

Under `prefers-reduced-motion` or `html[data-motion=reduce]`: `animation:none`, and the parts of the `idle` pose are visible (or `sit` when `data-state=sit`).

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

**Layering the existing `globals.css` rules (foundation, commit 2, the theme commit; commit 1 adds the i18n keys every later commit uses).** Today `.prose-gt` (L389–504) and the `/* ─── site ─── */` block (L506–706: `.gt-wordmark`, `.gt-accent`, `.gt-dot`, `.gt-glow`, `.gt-packet`, `.gt-ants`, `.gt-live`, `.gt-rise`, `.gt-draw`, `.gt-mobile-menu`, `.gt-marquee`, `.gt-lift`, `.gt-ring`, `.gt-faq`, the `.prose-gt` niceties) sit **after** `@layer utilities {}` and are **unlayered**. Unlayered rules beat every layered rule regardless of specificity, so a partial's `@layer components` override (the marquee pause on `:focus-within` and the reduced-motion `flex-wrap` in `home.css`, any `.prose-gt` tweak in `site-pages.css`) would silently lose.
- Wrap the class rules of both blocks in one `@layer components { … }`. Move their `@keyframes` (`gt-packet`, `gt-ping`, `gt-rise`, `gt-draw`, `gt-menu-in`) to top level right after the layer block.
- Partial files are imported at the top of `globals.css`, so for equal specificity inside `components` the later `globals.css` rules would win over a partial. Partials that override a `.gt-*`/`.prose-gt` rule therefore use a selector at least one class more specific (e.g. `.home-trust .gt-marquee-wrap:focus-within .gt-marquee`).
- Side effects to handle in the same commit (both verified):
  - `.gt-lift:hover` box-shadow gets `!important` (§3.3), or `shadow-card` on the same element would cancel the lift.
  - `.prose-gt` now loses to utilities, so every dead size class on a `.prose-gt` element would start to apply (17px → 15px). Delete them so rendering stays identical (verified list):
    - `text-[15px] sm:text-base` in `contracts/contract-document.tsx` and `text-[15px]` in `shared/markdown-editor.tsx`;
    - `<Markdown className="text-[15px]">` (the class lands on the `.prose-gt` div) in `panel/projects/[id]/page.tsx:203` and `:315`, `p/[token]/page.tsx:87`, catalog `sections/typography.tsx:103` (keep its `max-w-2xl`) and `sections/interactive.tsx:413`, plus the matching code sample string at `interactive.tsx:411`.
    - Update the "prose-gt is unlayered, overrides need `!`" comments in `contract-document.tsx` and `panel/design-system/_components/example.tsx`.
  - Afterwards `git grep -nE "prose-gt[^\"]*text-\[|<Markdown[^>]*className=\"[^\"]*text-" -- src` returns nothing.
- The block's header comment changes to: "Legacy site utilities, layered. New site CSS goes in `src/app/styles/*.css` (D17); never add rules here."

### 5.2 Shell variables and utilities (`os-shell.css`)
```css
/* registered so getComputedStyle returns a resolved px length; top level, outside any layer */
@property --chrome-top { syntax: "<length>"; inherits: true; initial-value: 0px; }
@property --dock-space { syntax: "<length>"; inherits: true; initial-value: 0px; }
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
  @media (width>=64rem) { html[data-dock-autohide]:has(.panel-shell) { --dock-space:calc(16px + env(safe-area-inset-bottom)); } }  /* desktop dock only: the <1024px tab bar never hides (§11.3) */
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
- **Registered variables.** Without registration, `getComputedStyle(…).getPropertyValue("--dock-space")` returns the substituted but unevaluated string `calc(calc(48px + 2*6px) + 2*12px + 0px)`, and `parseFloat` gives `NaN`. Only `--chrome-top` happens to resolve today (to `44px`).
  - The two `@property` rules make the computed values px lengths (e.g. `"84px"`). JS readers (the guide engine in §10.5, the Toc rootMargins in §15.3) therefore get numbers.
  - Every browser of §19 risk 3 supports `@property` (Safari 16.4+, Firefox 128+). A reader still treats a non-finite value as unsupported and falls back to measuring (§10.5).
  - Registration changes nothing for CSS consumers.
- **One scroll-offset mechanism (D18).** `scroll-padding-top/bottom` on `html` is the only chrome offset for fragment navigation, `scrollIntoView` and focus scrolling. It adds to any `scroll-margin` on the target, so nothing else may add a chrome-sized margin: the `.prose-gt` heading `scroll-margin-top: 6rem` is removed, and the catalog's `DsSection` (`design-system/_components/section.tsx`) changes `scroll-mt-32 xl:scroll-mt-24` to `scroll-mt-14 xl:scroll-mt-0` (it only clears its own sticky chip bar, which exists below xl). A `scroll-margin` is allowed only for an element's own extra sticky bar, never for the menu bar.

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
.os-mb-item:hover,.os-mb-item[aria-current=page],.os-mb-item:has(+ :popover-open),.os-mb-item[data-state=open]{background:rgb(var(--grey-rgb)/.14)}
/* detached top-layer popovers (not adjacent to their trigger) */
html:has(#os-spotlight:popover-open) .os-mb-item[popovertarget=os-spotlight],
html:has(#os-cc:popover-open) .os-mb-item[popovertarget=os-cc]{background:rgb(var(--grey-rgb)/.14)}
.os-mb-item[aria-current=page]{font-weight:700}
.os-mb-item:focus-visible{outline:2px solid var(--ring);outline-offset:-2px}
@media (width<48rem),(pointer:coarse){.os-mb-item{block-size:36px;min-inline-size:36px}}
```
- **Open state.** A native `popovertarget` trigger's expanded state is exposed to accessibility only; browsers do **not** set an `aria-expanded` DOM attribute, so `[aria-expanded=true]` never matches. The open style uses `:has(+ :popover-open)` (each menu popover immediately follows its trigger, §7.2) and the two `html:has(#…:popover-open)` rules for Spotlight and Control Center, which live at layout level. Radix triggers in the panel keep `[data-state=open]`.

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
.os-menu-item[data-variant=destructive]{color:var(--destructive)}
.os-menu-item[data-variant=destructive]:is(:hover,:focus-visible,[data-highlighted]){background:var(--destructive);color:var(--destructive-foreground);box-shadow:none}
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
      variant?: "paper"|"brand"|"accent"|"mark"; show?: "both"|"desktop"|"mobile"; prefetch?: boolean; external?: boolean;
      srExtra?: string;                     // visually hidden text appended to the label, e.g. ", 2 timers running"
      attrs?: Record<string,string> }
  | { kind: "sep"; key: string; show?: "both"|"desktop"|"mobile" }
  | { kind: "slot"; key: string; node: ReactNode; show?: "both"|"desktop"|"mobile" };   // More button, Me tile
<Dock label tabbar="md"|"lg" magnify n seps className>{children}</Dock>
<DockLinks entries={DockEntry[]} running={string[]} />   // client
```
- `srExtra` renders as `<span className="sr-only">{srExtra}</span>` right after `.os-dock-label`, inside the link, so the accessible name is "label + srExtra" while the visible label stays short. The caller computes it per render (the panel passes `format(t.time.runningCount, {n})` on the Time tile when `n > 0`, §11.3).
- `running` lists entry keys that get `data-running` (the dot).
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
  font:500 var(--menubar-fs)/1 var(--font-sans);white-space:nowrap;   /* 13px en, 14px fa (§3.5) */background:color-mix(in oklab,var(--popover) 95%,transparent);border:1px solid rgb(var(--grey-rgb)/.2);
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
… .os-tile{inline-size:28px;block-size:28px;background:none;box-shadow:none}   /* icons inside must be ≤28px: PixelIcon cell 2 (24px), PixelMark cell 2 (22px) */
… .os-dock-label{position:static;opacity:1;translate:none;padding:0;border:0;box-shadow:none;background:none;font-size:11px}
:lang(fa) … .os-dock-label{font-size:12px}
… li:active{scale:.92}  … [data-dock=desktop]{display:none}  … .os-dock-list::before{background:var(--card);backdrop-filter:none}
```
Outside tab-bar widths, `[data-dock=mobile]{display:none}`.

**Magnification maths.** The constants are exact for neighbouring tiles. A separator neighbour translates but never scales, which is accepted.

### 5.6 Lights, window, clock, boot, motion
**`OsLights({ size: 10|12 })`** (server): three `<span aria-hidden>` in `.os-lights`, using the octagon `clip-path: polygon(2px 0,8px 0,10px 2px,10px 8px,8px 10px,2px 10px,0 8px,0 2px)` (scaled for 12). Colours come from `--light-*`. Each `::after` has `background: var(--on)`.

**`Window({ path, elevated, tone: "default"|"ink", className, children })`** (server):
- `path: string | readonly { id: string; text: string }[]`.
- `.os-win`: radius 10px, 1px `--frame-line`, `bg-card`, `shadow-card` (`elevated` → `--shadow-window`; only the hero window and the panel window).
- Bar: 32px with `OsLights 10` at inline-start, then the path (`aria-hidden`, `dir=ltr`, `cell=2 tone=ink`): a string renders one `PixelText` (2 elements); a list renders one `PixelTextSet` (§4.2; 1 + one path per item), whose first item shows by default and whose other items the consumer swaps with `:has()` on `.px-set>[data-path-id=…]` (zero-JS tabs, §8 row 06). One window, one svg, whatever the number of paths.
- `tone=ink`: background #1C1C1E, text #F3F3F3, in both modes.

**`OsClock({ locale, tz, label })`** (client, `shell/os-clock.tsx`):
- `useSyncExternalStore`: the server snapshot is `""`; the client snapshot is the formatted current minute.
- Subscribe: `setTimeout` to the next minute boundary, then 60,000ms intervals. Paused while `document.hidden`. Cleared on unmount.
- Formatting is a **pure helper**, `shell/clock-format.ts` (+ `clock-format.test.ts`): `formatClock(date: Date, locale: Locale, tz: string): { text: string; iso: string }`, `msToNextMinute(now: number): number` and `CLOCK_LONGEST: Record<Locale, Date>`. `OsClock` only wires it to the store. Formats:
  - fa: `Intl.DateTimeFormat("fa-IR-u-ca-persian",{weekday:"long",day:"numeric",month:"long",hour:"2-digit",minute:"2-digit",hourCycle:"h23",timeZone:tz})`.
  - en: `"en-GB"` with `weekday:"short",day:"numeric",month:"short"` and the same time options.
  - **The text is assembled from the typed parts only**: `${weekday} ${day} ${month} ${hour}:${minute}`. Every `literal` part is dropped, which removes the en comma **and** fa's « ساعت » literal (verified with Node's ICU: the raw fa format is «چهارشنبه ۳۰ اردیبهشت ساعت ۱۱:۳۰»). Results: «چهارشنبه ۳۰ اردیبهشت ۱۱:۳۰», "Wed 20 May 11:30". This also keeps the text stable across ICU versions that change literals.
  - Measured range (every day of a year at 23:59 Tehran): fa 15 to 26 characters («جمعه ۴ دی ۲۳:۵۹» … «چهارشنبه ۱۶ اردیبهشت ۲۳:۵۹»), en up to 17 ("Thu 10 Sept 23:59"; ICU writes "Sept"). `CLOCK_LONGEST` holds one instant per locale whose text is the longest: fa `2026-05-20T20:29:00Z` (Wednesday 30 Ordibehesht 1405, 23:59 in Tehran), en `2026-09-30T20:29:00Z` (Wed 30 Sept, 23:59).
  - Tests: a fixed instant in `Asia/Tehran` gives the expected fa string (Persian digits, Jalali month, no comma, no «ساعت») and en string; for every day of 2026 at 23:59 Tehran, `formatClock(day).text.length ≤ formatClock(CLOCK_LONGEST[locale]).text.length`; `msToNextMinute` at :59.5 is 500.
- Output: `<time className="os-clock tabular-nums" dateTime={iso} title={label} aria-label={label+": "+text}>`.
- **Fixed width, not a minimum.** `.os-clock{display:inline-block;inline-size:var(--clock-w);white-space:nowrap;overflow:hidden;text-overflow:clip;text-align:end}` with `html{--clock-w:15em}` and `html:lang(en){--clock-w:9.5em}` (starting values). Foundation measures `formatClock(CLOCK_LONGEST[l])` rendered in `.os-clock` in Chromium (Vazirmatn 14px/500 and Public Sans 13px/500, `tabular-nums`) and sets each value to the measured width in em rounded up plus 0.25em, recording the measurement in a comment in `os-shell.css`. `ClockSkeleton` renders the same class, so the hole streams with zero shift whatever the date. The clock is the outermost end item (§7.2 item 9, §11.2), so a wider string would push every item between it and the spacer; a fixed width makes that impossible.
- **No `Date` during server render.** It is not a button.

**Boot and motion.** `bootInitScript` in `theme.ts`, rendered in the root `<head>` next to `presetInitScript`:
```js
try{var h=document.documentElement,b=function(){h.setAttribute("data-booted","")};if(localStorage.getItem("gt-motion")==="reduce")h.setAttribute("data-motion","reduce");
if(sessionStorage.getItem("gt-boot"))b();else{sessionStorage.setItem("gt-boot","1");addEventListener("load",function(){setTimeout(b,1e3)},{once:true})}}catch(e){}
```
- On the first load of a session, `data-booted` is also set, 1s after `load`. Both boot animations (≤0.56s) start at first paint, which comes before `load`, so they have finished by then.
- `<html>` persists across soft navigations, because there is one root layout (`[locale]/layout.tsx`). So a `.os-menubar` or `.os-dock` that another layout mounts later (site → `/login` → `/panel`) never replays the boot (A23). Before this change the attribute appeared only on the next hard load.
- `globals.css` base layer mirrors the reduced-motion kill switch for `html[data-motion=reduce] *`. Scroll-driven animations get `animation:none`.
- `os-shell.css`, under `(prefers-reduced-motion:no-preference)`:
  - `html:not([data-booted]):not([data-motion=reduce]) .os-menubar{animation:os-boot-bar .32s var(--ease-out-expo) both}` with `from{translate:0 -100%}`.
  - `… .os-dock{animation:os-boot-dock .44s var(--ease-out-expo) .12s both}` with `from{translate:0 calc(100% + 32px)}`.
  - Transforms only; the `<h1>` is untouched.
- **`shell/appearance.tsx`** (client, imports **no Radix**, so the site never pulls Popover/ToggleGroup through it) exports:
  - `useMotionPref()` → `{ reduced, setReduced }` (writes `localStorage gt-motion` and the `html[data-motion]` attribute).
  - `AppearanceModeToggle({ className })`: a native segmented control (three `<button aria-pressed>` for Light/Dark/System via `useTheme`, labels from `common`).
  - `ThemeToggle` moves here unchanged (it uses only `Button` and lucide). `theme-controls.tsx` re-exports all three for existing panel imports; site files import from `@/components/shell/appearance`.

**Guide contract (`shell/guide-events.ts`, pure)**
- Constants:
  - `GUIDE_PREF_KEY = "gt-guide"` (`"off"` or absent)
  - `GUIDE_TIPS_KEY = "gt-guide-tips"` (`"off"` or absent)
  - `GUIDE_TEST_KEY = "gt-guide-test"`
  - `GUIDE_SEEN_KEY = "gt-guide-seen"` (sessionStorage JSON array of `pathname#key`)
  - `GUIDE_GREETED_KEY = "gt-guide-greeted"` (sessionStorage `"1"` once the greeting has played)
  - `GUIDE_IDLE_KEY = "gt-guide-idle"` (sessionStorage `"1"` once the idle line has played)
  - `GUIDE_MOD_PREFIX = "gt-guide-mod:"` (localStorage, panel peek per module)
  - `GUIDE_EVENT = "gt:guide"` with `detail: {type: "explain"|"tour"|"show"|"hide"}`
  - `GUIDE_PREF_EVENT = "gt:guide-pref"`
- Functions: `readGuidePref()`, `writeGuidePref(on)` (dispatches the pref event), `readSessionFlag(key)` / `writeSessionFlag(key)`, `dispatchGuide(type)`, `guideAttrs(key, say)` → `{ "data-guide": key, "data-guide-say": say }`, `spotAttrs(key, say)` → `{ "data-guide-spot": key, "data-guide-say": say }`.
- All storage access is wrapped in try/catch.

**`shell/shortcuts.ts`** (+ test): `isCommandPaletteShortcut`, copied from `panel-prefs.ts`. The panel later re-exports it.

**`shell/normalize.ts`** (+ `normalize.test.ts`, pure): `normalizeQuery(s: string): string` — maps `ي→ی`, `ى→ی`, `ك→ک`, `ة→ه`; removes ZWNJ (U+200C), tatweel and Arabic diacritics (U+064B–U+065F); maps Persian (U+06F0–9) and Arabic-Indic (U+0660–9) digits to ASCII; lower-cases; collapses whitespace. `matchesQuery(label, query)` = `normalizeQuery(label).includes(normalizeQuery(query))`. Tests cover each mapping, «علي» matching «علی», «مي‌خواهم» matching «میخواهم», and «۱۲» matching "12". `SiteChrome` (site-shell) uses it for the Spotlight filter.

---

## 6. Framed grid system

### 6.1 Primitives (`src/components/site/frame.tsx`, server-only)
- `FrameSection({ as = "section", id, labelledBy?, ariaLabel?, guide?: {key, say}, strip?: { index?: number; path?: string; action?: ReactNode } | false, cv?: number, first?: boolean, className, children })`:
  - Renders `<section id aria-labelledby class="frame-box" {...guideAttrs}>`. With `as="footer"` (used only by the site footer, §7.5) it renders `<footer class="frame-box">` instead, which takes no `aria-labelledby`. Then `FrameStrip` (when `strip`), then children (wrapped in `.frame-cv` with `--cis` when `cv`).
  - `first` sets `data-first`: a half section gap below 1024px, and at ≥1024px a gap of `max(56px, half gap)` so the 48px desktop sprite fits on the first box's roof (§6.2, §10.5).
- `FrameStrip({ index, path, action })`: 36px. `OsLights 10` at inline-start; `PixelText` index (`01`); `PixelText` path with `className="frame-path"` (hidden below md by `frame.css`; both `aria-hidden`); `action` at inline-end.
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
- `FrameCell({ span?: FrameSpan, tone?: "default"|"card"|"dots"|"ink"|"yellow", pad?: "none"|"md"|"lg", hover?, spot?: {key, say}, decor?: boolean, header?: boolean, as?, className, children })`. It always renders `data-pad` (`md` by default) and `data-tone`. **Guide markers** (§10.5, §15.1): `decor` → `data-decor` (a cell holding only decoration: an `aria-hidden` illustration, a cover or portrait window; `tone="dots"` cells always get it, since they never hold text, §6.2); `header` → `data-frame-header` (the cell holding a box's `h1`/`h2`; `FrameHeaderCell` always sets it, and any custom header cell such as `ArticleHeader`'s passes `header`). `FrameSpan` and its literal class map:
  ```
  2:"md:col-span-2"                        // 2 tracks at md and lg
  3:"md:col-span-2 lg:col-span-3"          // a full row in FrameGrid 3
  md2:"md:col-span-2 lg:col-span-1"        // full row at md (2 cols), one track at lg (header cells)
  lg2:"lg:col-span-2"                      // one track at md, two at lg
  full:"col-span-full"
  row2:"lg:row-span-2"
  ```
- `FrameHeaderCell({ eyebrow?, title, titleId, subtitle?, action?, as: "h1"|"h2", span?, children? })`: replaces `SectionHeading` inside frames; renders a `FrameCell header` (so `data-frame-header`), with `children` after the subtitle (breadcrumbs, a facets/count line).
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
- `packRows(spans: (FrameSpan|undefined)[], cols: FrameCols, bp: "md"|"lg"): { holes: number; trailing: number }` (pure, `frame-plan.ts`): simulates CSS Grid sparse auto-placement (a 2D occupancy grid, so `row2` is handled) for any `FrameGrid` and returns the number of empty tracks left **before** the last row (`holes`, must be 0) and the empty tracks at the end (`trailing`, fed to `FrameFiller`). `FrameCols` is the `FrameGrid` `cols` union; the track counts come from one literal map that mirrors the class map above: `1` → md 1 / lg 1, `2` → 2 / 2, `3` → 2 / 3, `4` → 2 / 4, `"2-1"` → 1 / 2, `hero` → 1 / 2. Spans resolve per breakpoint from the `FrameSpan` class map (e.g. `md2` = 2 tracks at md and 1 at lg; `full` = all tracks). Callers write `<FrameFiller units={{ md: packRows(s,3,"md").trailing, lg: packRows(s,3,"lg").trailing }} />`, with `s` the span list of the cells actually rendered.
- **Mid-grid holes are design errors, not filler cases.** A cell that wraps because it does not fit the remaining tracks leaves a hole that no trailing filler can fix. Every grid layout is listed with each possible streamed count in a unit test that asserts `holes === 0` at md and lg, split by owner so no track edits another's test:
  - `src/components/site/frame-plan.test.ts` (foundation): `packRows` and `fillerPlan` themselves, every home layout of §8 (kind-words' 0–6 testimonials included), footer row 1 (`cols 4`, four cells), `StatsCells` (`cols 4`) and `CtaBand`.
  - `src/components/site/page-frame-plan.test.ts` (site-pages): every grid site-pages renders (§9): the `PageHero` row (`2-1`), the `/work` grid at 0–12 works per page, the `/blog` featured `span=2` cell plus the post grid at 0–12 posts, the `/learn` series grid, each `/services` brand box (header row plus 0–6 service cells, or the `full` ask cell), the process (4) and values (4) boxes, the detail-page header rows and `2-1` bodies, and the `/contact` and 404 rows. It imports `packRows` and never re-implements it.
  - The two layouts the critic found are fixed in §8: the work and latest header cells use `span="md2"`, and the latest "read the blog" cell uses `span="lg2"`.
- `framePath(...segments)` → `"GOOD-IN-TEAM/WORK"` (Latin data, never copy).

### 6.2 CSS (`frame.css`)
```css
.os-desktop{position:relative;display:flow-root;background:   /* flow-root keeps the first box's top margin inside (layout rules below) */
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
@media (width>=64rem){.frame-box[data-first]{margin-block-start:max(56px,calc(var(--section-gap)/2))}}  /* reserved roof for the 48px sprite (§10.5) */
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
.frame-grid:has(+ .frame-grid){margin-block-end:0}   /* stacked grids: keep the line between them (the next grid's opaque cells would paint over it) */
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
- **Every `FrameCell` is a child of a `FrameGrid`.** A box that needs several rows of different shapes stacks grids (a header row, a chip row, the main grid, a pagination row: §8 row 06, §9 `/work` and `/blog`, the footer rows); a single full-width row is `FrameGrid cols={1}`. A bare cell outside a grid would draw its inline-end line 1px inside the box border (a double line).
- **Stacked grids keep their hairline.** Each grid's `margin-block-end:-1px` exists to tuck the last row's bottom line under the box border. Between two grids it would let the second grid's opaque, positioned first-row cells paint over the first grid's last bottom line, so `.frame-grid:has(+ .frame-grid){margin-block-end:0}` turns it off there (`:has()` is in every browser of §19 risk 3). `:has(+ …)` rather than `:not(:last-child)`, so a trailing non-grid child (a JSON-LD `<script>`) never doubles the box's bottom line. The catalog OS-shell stub (foundation) shows a box with a header row stacked on a 3-column grid, and foundation's VERIFY checks the line between them in light and dark.
- **Never** `overflow:hidden` or `content-visibility` on `.frame-box` or `.frame-grid` directly.
- **Never** `.frame-cv` around sticky children.
- Boxes are square. Rounded corners are only for `Window`s inside cells, and for the panel window. On the public site this overrides the AGENTS.md "rounded-2xl cards" Minimals rule (AGENTS.md is updated to say so).
- Dots appear only in the desktop margins and in `tone=dots` cells. **A `tone=dots` cell never holds text**: it holds only fillers, opaque windows, or `aria-hidden` pixel art (hero end cell, brand-family logo cell, footer wordmark). Text cells use `default`, `card`, `ink` or `yellow`.
- Never put `transform`, `filter`, `perspective`, `contain`, `backdrop-filter` or `will-change` on `.os-desktop` (it holds the guide layer, whose compact sprite is `position:fixed`).
- **`.os-desktop` is `display:flow-root`.** `main` is `overflow-x:clip`, and `clip` (unlike `hidden`) creates no block formatting context. Without `flow-root`, the first `FrameSection`'s `margin-block-start` collapses through `main` and `.os-desktop`, and `.os-desktop`'s top equals the box's top. Effects:
  - On every page the gap under the menu bar shows the body background instead of the dotted wallpaper, and the rails start late.
  - At ≥1024px the greeting sprite on the reserved 56px roof sits above `.os-desktop`, where `.gt-guide{overflow:clip}` cuts it off. Verified in Chromium: desktop top = box top = 88px, sprite top 41px, sprite not painted.
- `flow-root` creates a BFC without creating a containing block for fixed descendants, so the rule above still holds. Never replace it with `overflow` or `contain`.
- At ≥1024px with a fine pointer, the first box's top is then exactly `chromeTop + 56`, the top of the roof-perch band (§10.5, inclusive).
- Pages contain no ad-hoc section `py-*`.

| Breakpoint | Gutter | Section gap | Cell padding | Grid | Markers |
|---|---|---|---|---|---|
| <768 | 16 | 48 | 24 | 1 col | box corners and L-frame only |
| 768–1023 | 16 | 48 | 32 | 2 col | all |
| 1024–1279 | 24 | 64 | 32 | 3 col | all |
| ≥1280 | 32 | 80 | 32 | 3 col | all |

**Row completion.** Design cell counts in multiples of 6. Rows with a fixed structure render fixed slots, and a missing item becomes a `tone=dots` slot cell (`aria-hidden`, `hidden md:block`) in place, so later cells never wrap. Streamed sections append `FrameFiller` from the server using `packRows(...).trailing`. The border technique keeps unexpected counts clean (no grey blocks), and `frame-plan.test.ts` (foundation) plus `page-frame-plan.test.ts` (site-pages) prove `holes === 0` for every listed layout (§6.1).

---

## 7. Public site shell

### 7.1 Layout (`(site)/layout.tsx`)
```tsx
<I18nProvider locale messages={pickMessages(locale, ["common","nav"])}>
 <AlternatesProvider>
  <a href="#main" className="skip-link …">{t.common.skipToContent}</a>          {/* stays first */}
  <SiteMenuBar locale t />                                                   {/* header.os-menubar, sticky */}
  <div className="os-desktop">                                                {/* display:flow-root, never transformed (§6.2) */}
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
3. Spotlight quick-link filtering with `matchesQuery` from `shell/normalize.ts` (ی/ي, ک/ك, ZWNJ, Arabic and Persian digits, case; unit-tested in foundation). It sets `hidden` on non-matching rows. With no match it shows `common.noMatches`.

**Removed:** `HeaderShell` (scroll listener), `NavLinks`, `MobileMenu` and the Radix DropdownMenu `LanguageMenu`. `site-header.tsx` keeps exporting `siteSections` and `staticSitePaths`, and re-exports `SiteMenuBar`. `useSwitchHref` is exported for reuse.

### 7.2 Menu bar items (DOM start → end; mirrors in fa)

| # | Item | Visible | Behaviour |
|---|---|---|---|
| 1 | Brand menu: `button.os-mb-item` with `PixelMark` 22px (`aria-hidden`) plus `<span class="sr-only lg:not-sr-only">{appName}</span>` (700), `popovertarget="mb-brand"`. The label is always in the DOM, so the button's accessible name is `appName` at every width (below lg the trigger is icon-only, and most fa traffic is there); at lg+ the visible text equals the name (WCAG 2.5.3). No `aria-label`. | always | `.os-menu.os-popmenu`. Header card: `PixelLogo TEAM cell=2` + `appTagline`. Rows: About · sep · Good In Studio, Good In Code (PixelIcon + `nav.brand*`) · sep · Contact · Sign in (`/login`, `prefetch={false}`). Static links only. |
| 2 | Section links: Work, Services, Blog, Learn, About | md+ | `SiteMenuLinks` (client, internal Suspense, fallback without active state) sets `aria-current="page"`. |
| — | spacer | | |
| 3 | Availability (Suspense hole **A**) | lg+ | `<Suspense fallback={<AvailabilitySkeleton/>}><MenuBarAvailability/></Suspense>` (`site-shell`, `menubar-studio.tsx`). Server: `await connection()`, cached `getPublicProfile()`. Renders `<a class="os-mb-item os-mb-avail" href="/contact">`: a 6px square dot (success/warning) + a label slot. The label slot is an `inline-grid` stacking **both** `site.availableShort` and `site.unavailableShort` in one cell; the inactive one is `visibility:hidden` + `aria-hidden`, so the slot is always as wide as the longer label. The label slot shows at xl; below xl only the dot shows and the active label is `sr-only`. `AvailabilitySkeleton` renders the same `a`-sized box: a `bg-muted` dot plus the same stacked label slot with both labels hidden, so swapping in the real item shifts nothing. |
| 4 | Virtual-me extra: 28px button with `PixelAvatar part="head" cell={2}` (20px) (`aria-label=guide.toggle`), `popovertarget="mb-guide"` | lg+ | Menu rows: `guide.explain` (dispatch `explain`), `guide.tour` (dispatch `tour`), sep, `role="switch"` `guide.show` bound to `gt-guide`. The Explain and Tour rows first call `hidePopover()` on `#mb-guide`, then `dispatchGuide()`. A click inside an auto popover does not light-dismiss it, and the guide must not open its bubble under an open menu. Explain and Tour work while the guide is muted (§10.4). Below lg the same two actions are in Control Center and Launchpad (§7.3). |
| 5 | Spotlight: 28px button, lucide `Search`, `popovertarget="os-spotlight"` | always | `aria-label=common.spotlight`, `aria-keyshortcuts="Meta+K Control+K"`. At xl a visual `⌘K` kbd (`aria-hidden`, `dir=ltr`). |
| 6 | Language: glyph «فا» / `EN` (13px/600, min 28px), `popovertarget="mb-lang"` | always | Accessible name `${common.language} (${glyph})`. Rows are plain `<a href hrefLang lang aria-current>` via `useSwitchHref` (full page load). |
| 7 | Theme: `ThemeToggle` from `shell/appearance.tsx` (28px, `rounded-md`) | md+ | light ↔ dark |
| 8 | Control Center: lucide `SlidersHorizontal` (`aria-hidden`), `popovertarget="os-cc"`, `aria-label={t.common.controlCenter}` (icon-only, so the name comes from i18n) | always | See §7.3. |
| 9 | Clock (Suspense hole **B**) | lg+ | `<Suspense fallback={<ClockSkeleton/>}><MenuBarClock locale/></Suspense>` (`menubar-studio.tsx`). Server: `await connection()`, cached `getPublicTimezone()`, then `<OsClock locale tz label={common.studioTime}/>`. `.os-clock` and `ClockSkeleton` share one fixed `inline-size` sized for the longest date (§5.6), so this outermost item never pushes items 3–8 when the hole streams, on any day of the year. Studio time. |

On mobile: items 1, 5, 6 and 8 only (44px tall, 36px targets). Items 3 and 9 are two independent holes because they are not adjacent in the DOM (items 4–8 sit between them); both read cached functions, so the second `connection()` costs nothing.

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
2. Pixel guide: the switch, plus two text buttons, `guide.explain` and `guide.tour`. Each button calls `hidePopover()` on `#os-cc`, then `dispatchGuide()`, and works while the guide is muted (§10.4). Labels come from the server `guide` namespace as props, like the menu-bar extra. Below lg, where the menu-bar extra is hidden, this tile and the Launchpad are where a visitor asks for an explanation (A31).
3. Reduce motion: switch (`useMotionPref`).
4. Language: two `<a hrefLang>` chips.

No colour presets on the site.

**Launchpad `#os-launchpad`** (`popover=auto`, the mobile "More"; full-screen, 96% `--background`):
- Header: PixelMark + appName + close (`popovertargetaction=hide`, `common.close`).
- A 3-column grid of 64px tiles: Blog, Learn, About, Studio, Code, Sign in (Studio and Code tiles use the `brand` tile variant, so the brand family is visible without extra logos; no logo row, to stay inside the pixel budget of §4.2).
- Settings: language links, `AppearanceModeToggle`, guide switch, reduce-motion switch, and the `guide.explain` / `guide.tour` buttons. Each button hides `#os-launchpad` first, then dispatches; labels come as server props.
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
- Icon sizes: Home `PixelMark cell={2} className="md:[--cell:3px]"` (22px in the 28px tab-bar tile, 33px in the 48px desktop tile); every `PixelIcon` at `cell={2}` (24px) in both modes.
- Labels are visible text and are the accessible name (no `aria-label`).
- Detail pages carry `[data-reading]` on the article root. The CSS then uses a 40px dock.

### 7.5 Footer (one framed box)
- Rendered as `<FrameSection as="footer" id="site-footer" guide={{ key: "footer", say: t.guide.footer }} strip={false}>`, i.e. `<footer class="frame-box" data-guide="footer">`.
  - It is the `contentinfo` landmark, never a `<section>`, so `main section.frame-box` counts only page boxes (§17).
  - The line is read from the server-side `getMessages(locale).guide`; the namespace is never shipped.
- **Row 1, 4 cells:**
  1. Brand: `PixelLogo TEAM cell=3`, `site.footerAbout`, streamed socials with an `h-9` skeleton. The socials are site-pages' `SocialLinks` (`social-links.tsx`): its signature and its single row of 36px (`size-9`) items are frozen (§16 rule 4), because this skeleton's height depends on them.
  2. Explore.
  3. Resources.
  4. Connect, plus a `nav.brands` sub-list of the 3 brands in registry order (§2).
- Row 1 and the rows below are stacked `FrameGrid`s (`cols={4}`, then `cols={1}`), per §6.2.
- **Row 2:** a `span=full`, `tone=dots` cell with the giant `PixelLogo TEAM paper=false` (cell 6/8/12), `aria-hidden`. Scroll-driven `translate:0 56px→0; opacity:.5→1`, `animation-range: entry 0% entry 80%`. Static fallback, static under reduced motion. Replaces `.gt-wordmark`.
- **Row 3:** `© <CurrentYear/> {appName}. {footerRights}` · `footerMadeWith` · RSS, with `padding-block-end: var(--dock-space)`.

### 7.6 Auth layout (`(auth)/layout.tsx`, serves `/login` and `/setup`)
The `(auth)` group counts as a **public route**: no Radix DropdownMenu, Tooltip or sonner. Today it uses `LocaleSwitcher` (Radix DropdownMenu, panel-shell's file), which is replaced, not imported.
- **Layout** (server): `pickMessages(["common","auth"])` as today. Background: the `.os-desktop` wallpaper (dots and rails, no frame boxes). No dock.
- **Login-screen menu bar.** `MenuBarShell label={common.menuBar}`, like the macOS login window's minimal bar:
  - start: a `PixelMark cell={2}` link to `/` with `aria-label={common.appName}`.
  - end: two plain language links (`<a href hrefLang lang aria-current>` per locale, glyph «فا» / `EN`, accessible name `${common.language} (${glyph})`) to the same path in the other locale, `localePath(l, stripLocale(usePathname()).path)`, rendered by a tiny client `AuthLanguageLinks` inside `<Suspense>` (fallback: links to `localePath(l,"/login")`), then `ThemeToggle` from `shell/appearance.tsx`.
  - No popovers, no clock, no guide. It is the page's only blurred surface.
- **Window per page.** Each page wraps its content in a centred `Window` (max 440px, `elevated`), so the path is correct per route:
  - `login/page.tsx`: `Window path="LOGIN"`; header: `PixelLogo TEAM cell={3}` (aria-hidden; the h1 names the page), h1 `auth.loginTitle`, hint, `SetupHint`, form.
  - `setup/page.tsx`: `Window path="SETUP"`; same header with h1 `auth.setupTitle`.
- Keep `#email`, `#password`, `button[type=submit]`, the `common.signIn` label and the `/panel` redirect (`shots.mjs` and `vault.spec` depend on them).
- Delete the decorative aside (grid, blurred blob) and the `Logo` uses.

---

## 8. Home page (`(site)/page.tsx`)

**Rules for every section**
- Each section is a `FrameSection` with `id`, `aria-labelledby` (or `aria-label`), `guide={{key, say}}` and a strip.
- The `id`s and `data-guide` keys below are a **contract** (§15.1): foundation already puts them on the current home sections (D22), the assistant's e2e targets them, and the home rewrite must keep them and keep their DOM order.
- Static parts stay in the shell.
- Every DB part stays an async server component that calls `await connection()` inside `<Suspense>`. Its skeleton renders **the same cells** (Suspense adds no DOM).
- From section 03 on, the box body sits in `.frame-cv` with a `--cis` value, and the grid uses `reveal`.
- Shared pieces come from foundation and are imported, never re-implemented: `StatsCells`/`StatsCellsSkeleton` (`src/components/site/stats-cells.tsx`) and `CtaBand` (`src/components/site/cta-band.tsx`). Which component renders the box is fixed:
  - `StatsCells` and `StatsCellsSkeleton` each render the complete `FrameGrid cols={4}` (grid and 4 cells) and **no** box. The caller wraps them in its own `FrameSection`.
  - `CtaBand` renders its **own** `FrameSection` (`id="contact-cta"`, `strip={false}`, `guide` from its `guide` prop). No page wraps it or passes it spacing classes.
- **No blur and no endless motion.** Remove every `backdrop-blur*` in home files (verified: `hero-diagram.tsx` L49, L189, L210; `home/sections.tsx` L33, L141; `(site)/page.tsx` L93) and the infinite `animate-float` (3 diagram cards) and `animate-[spin_40s_linear_infinite]` (orbit ring). Use opaque `bg-card` (or `bg-card/95` without blur).
- **No `.gt-glow`.** Delete every home glow layer (verified: `(site)/page.tsx` L68, L70; `home/sections.tsx` L132, L246; `how-we-work.tsx` L292; §12 "Glow removal"). Foundation's sweep already removed L358 and L360 with the old `CtaBand`.

| # | id / `data-guide` | Strip | Layout and content | Data |
|---|---|---|---|---|
| 01 | `top` / `home_hero` (`first`) | `01 · GOOD-IN-TEAM/~` | `FrameGrid hero`. **Start cell:** streamed `AvailabilityBadge` as `FrameEyebrow` (skeleton `h-[26px] w-48`) · **static, never-animated `<h1>`** with `HeroTitle` and the `.gt-accent` highlighter · lead · CTAs (48px pill `bg-primary text-primary-foreground hover:bg-primary-hover`; outline pill `border-frame-line bg-card`) · proof list (`CheckIcon text-primary-ink`). Lead, CTAs and proof use `gt-rise` at 60ms steps. **End cell** (`tone=dots`): `<Window path="SYSTEM.APP" elevated>` with `HeroDiagram` as `spot={{key:"diagram", say: guide.spot_diagram}}`. Diagram: hub = `PixelLogoCycle play cell 2/3` inside a fixed-size hub chip; violet removed; node tones yellow-soft / ink / grey; packets are 3px yellow squares capped at 6 iterations; the 1.5px endpoint rings (today `stroke="var(--primary)"`, L140) use `var(--primary-ink)`; ants static; the orbit ring and the three floating cards are **static** (no `animate-float`, no spin); terminal uses `OsLights`; one `radial-gradient(var(--surface-glow))` layer; no `backdrop-blur`. At ≥1024px the box uses `first`'s reserved 56px roof for the guide's greeting, and the end cell (`tone=dots`, so `data-decor`) is where the greeting and the `home_hero` line land as candidate B (§10.5 first-box rule). | existing badge |
| 02 | `brands` / `home_brands` | `02 · GOOD-IN/` | Static, no DB. **Row 1** (`span=full`, two columns at lg): header cell (`FrameEyebrow brandsEyebrow`, h2 `brandsTitle`, `brandsSubtitle`) and a `tone=dots` cell with `PixelLogoSwap` (cell 4/6/8, `role=img`, `aria-label=appName`, `dir=ltr`). **Row 2:** 3 brand cells in registry order (team, studio, code; §2) (`hover`, `spot={{key:"brand-"+id, say: tagline}}`, `data-brand=id`), each with `PixelLogo suffix cell=3`, h3 name, the visible tagline and `ArrowLink format(brandExplore,{brand})`. Hovering or focusing a cell swaps the big logo's suffix (`home.css` `:has()`). | — |
| 03 | `trust` / `home_trust` | none | Single `tone=default` cell (text never sits on dots; §6.2), class `home-trust`. Streamed `TrustMarquee` with an unchanged query; separators are 6px yellow squares; the track is `dir=ltr`; **pauses on `:hover` and `:focus-within`** (`home.css`, selector `.home-trust .gt-marquee-wrap:is(:hover,:focus-within) .gt-marquee`, which beats the layered legacy rule, §5.1). Reduced motion: `animation:none; flex-wrap:wrap; justify-content:center`, duplicate hidden. The box renders `null` with fewer than 2 names; the skeleton is the same box. | existing |
| 04 | `work` / `home_work` | `03 · GOOD-IN-TEAM/WORK` + action `viewAllWork` | `FrameGrid 3`. **Row 1:** static `FrameHeaderCell span="md2"` (full row at md, one track at lg), then `<Suspense fallback={<FeaturedWorkCellsSkeleton/>}><FeaturedWorkCells/></Suspense>`. Work 1 is `span="2"` `WorkCard variant="cell" size="lg"`; with no works, slot 1 is a `tone=dots` slot cell with `span="2"`. **Row 2:** works 2 and 3 plus a "view all" link cell (`viewAllCell`, `<PixelIcon name="arrow" mirror />`, §4.3). Trailing `FrameFiller` from `packRows(spans, 3, bp)`. Span lists (tested, `holes === 0`): 3 works `[md2, 2, ·, ·, ·]`, 2 works `[md2, 2, ·, ·]`, 1 work `[md2, 2, ·]`, 0 works `[md2, 2(slot), ·]`. Work cells are spots (`say` = excerpt clamped to 140). Skeletons: 420 / 360px, same spans. `--cis` 900. | `listPublished({types:["work"]})`, featured first, top 3 |
| 05 | `services` / `home_services` | `04 · …/SERVICES` + `allServices` | `FrameGrid 3`. Static header cell, then streamed `ServicesCells` (at most 5). Each cell (hover + spot) has: a brand chip (`nav.brand*` from `brandOf(meta)` + the brand's 12×12 `PixelIcon` — `about` for team, `studio`, `code` — at cell 1, 12px) · a 44px `brand`-variant tile with `ServiceIcon` (ink) · h3 · excerpt · first 3 highlights as check rows. Fillers complete to 6. `--cis` 760. | `listServices` |
| 06 | `process` / `home_process` | `05 · …/PROCESS` | Static CSS tabs (radios + `:has()`, literal `tabCls` kept). **Row 1** (`FrameGrid 1`): centred header `span=full`. **Row 2** (a second, stacked `FrameGrid 2-1`, §6.2): **one** `<Window path={[{id:"PORTAL",text:"PORTAL"},{id:"PROGRESS",…},{id:"CONTRACTS",…},{id:"INVOICES",…}]}>` (§5.6), which renders a single `PixelTextSet` (5 elements, §4.2). The visible path follows the checked radio with zero JS through literal `home.css` rules on the box (class `home-process`), e.g. `.home-process:has(#how-progress:checked) .px-set>[data-path-id]{display:none}` plus `.home-process:has(#how-progress:checked) .px-set>[data-path-id=PROGRESS]{display:inline}` (PORTAL, the default-checked tab, is the first item and shows without a rule). It holds the existing mocks (one per tab, toggled as today); `MockFrame` is replaced by this one `Window`. Tabs are stacked cells, each a spot (`guide.home_process_<tab>`). Checked tab: `bg-card`, a 3px `--primary` inline-start bar plus `inset 4px 0 0 rgb(0 0 0/.12)` (mirrored with `--dir`), bold. Mobile: chip row above the window. Chart stays `dir=ltr`. `--cis` 680. | — |
| 07 | `stats` / `home_stats` | none (`aria-label=statsEyebrow`) | Home's `FrameSection` holding foundation's streamed `StatsCells`, which renders the `FrameGrid 4` itself (`<Suspense fallback={<StatsCellsSkeleton/>}>`): number 48px (en 700 −0.03em; fa 800), `tabular-nums`, `fmtNum`, `+` in `text-primary-ink`, 14px muted label. Alternate cells `tone=card` (never dots behind text). Same-cell skeleton. The same component fills the `/about` stats box (`about_stats`, §9). | `getSiteStats` |
| 08 | `latest` / `home_latest` | `06 · …/BLOG` + `readBlog` | `FrameGrid 3`. **Row 1:** header cell `span="md2"` plus two post slots (`PostCard variant=cell`; a missing post becomes a `tone=dots` slot cell). **Row 2:** if a course exists, a `span="3"` `tone=ink` cell (a `COURSE.APP` `Window tone=ink` with course info, the first 6 lessons in 2 columns, and a yellow `courseCta` pill, as a spot). Otherwise post 3 (or a slot cell) plus a `span="lg2"` read-the-blog cell. Span lists (tested, `holes === 0`): course `[md2, ·, ·, 3]`, no course `[md2, ·, ·, ·, lg2]`. Skeleton row 2 is 280px with the same spans. `--cis` 820. | existing |
| 09 | `kind-words` / `home_testimonials` | `07 · …/KIND-WORDS` | **Static** header cell `span=full`, then streamed `TestimonialCells` (`listTestimonials(locale,6)`, 3 columns). `TestimonialCard variant=cell` keeps per-quote `lang`/`dir`; the avatar falls back to a framed initial tile. `--cis` 620. | existing |
| 10 | `contact-cta` / `home_cta` | none | Static. A yellow `px-corners` panel inset 8px: `#FFC50D` with an ink dot texture `rgb(28 28 30/.14)`, text #1C1C1E. h2 `ctaTitle` (48px), subtitle, proof. Buttons: `bg-[#1C1C1E] text-[#FFC50D]` and an outline `border-[#1C1C1E]/40`. At inline-end: `PixelAvatar pose="wave" cell=6` (static wave frame) standing on a square paper tile (`#F3F3F3`, 2px solid `#1C1C1E` border, no `px-corners`, so the border is not clipped). The hoodie is always #FFC50D with no ink outline (§4.2 `AVATAR_FILLS`), so directly on the yellow panel the body would vanish and only a floating head would show; the tile keeps the whole figure readable and the brand hoodie yellow. Then three static pixel dock tiles at ±8°. **Built by foundation** as `CtaBand({ locale, t, guide = "cta", className })` in `src/components/site/cta-band.tsx`: today's props plus an optional `guide: "home_cta" \| "cta"`. It renders the whole box, `<FrameSection id="contact-cta" labelledBy=… strip={false} guide={{ key: guide, say: t.guide[guide] }}>`, with the panel inside. Home places `<CtaBand locale={locale} t={t} guide="home_cta" />`; the other pages place `<CtaBand locale={locale} t={t} />` (key `cta`). Nobody wraps it in another `FrameSection` or passes margin classes. Foundation's sweep deletes the old `CtaBand` from `home/sections.tsx` (no re-export) and repoints all five importers to `cta-band.tsx`: `(site)/page.tsx`, `about/page.tsx`, `services/page.tsx`, `work/page.tsx` and `work/[slug]/page.tsx`. The same sweep repoints `/about`'s `StatsStrip`/`StatsStripSkeleton` to `StatsCells`/`StatsCellsSkeleton` (§16 rule 2). | — |

**Budgets for home.** DOM ≤1,800 nodes; pixel-art elements: home content ≤115 of the page's ≤260 (§4.2); no infinite main-thread animation after 20s.

---

## 9. Other site pages

| Page | Frame layout | `data-guide` key |
|---|---|---|
| `PageHero` (`ui.tsx`) | `FrameSection first` with strip `GOOD-IN-TEAM/<SECTION>`, holding one `FrameGrid 2-1`: `FrameHeaderCell as="h1"` with `Breadcrumbs` (keeps BreadcrumbList JSON-LD), title, subtitle, and the page's facets/count line when it has one (as `children`); then the **decor end cell**: `FrameCell tone="dots"` (so `data-decor`), `hidden lg:block`, `lg:min-h-[200px]`, holding an opaque `Window path="<SECTION>.APP"` with the section's `PixelIcon` at `cell={6}` (`aria-hidden`). It is the landing spot for the guide's first-box line (§10.5). No glow layers (delete the `.gt-glow` at L159). `Eyebrow` renders `FrameEyebrow` (drops today's `backdrop-blur`, L50). | — |
| `/work` | `PageHero` → grid box of stacked grids (§6.2): filter chips in a `FrameGrid 1` row (`searchParams` stays in Suspense) → `FrameGrid 3` of `WorkCard variant=cell` (each a spot) + fillers → `Pagination` in a `FrameGrid 1` row → `CtaBand` | `work_index` (hero) · `work_grid` · `cta` |
| `/work/[slug]` | header box `FrameSection first`, `FrameGrid 2-1`: header cell (title, meta; `header`) and the cover in `Window path="CASE-STUDY"` in a `decor` end cell → body box `FrameGrid 2-1`: article cell (`prose-gt`, 70ch) and aside cell (client, year, role, stack `dir=ltr`, links, metrics as stat rows) → `CtaBand` | `work_detail` (header) · `work_story` (body) · `cta` |
| `/services` | `PageHero` → one `FrameSection` per brand in registry order (team, studio, code; §2), `id=<brand.id>` (anchor targets; they clear the menu bar through `html { scroll-padding-top }` alone, with no `scroll-margin`). Strip `GOOD-IN/<SUFFIX>`. Header cell: `PixelLogo cell=4`, name, tagline. Service cells, or one `span=full` "ask" cell (`site.brandEmpty` + `format(brandAsk,{brand})` → `/contact`). Then a process box (4 cells), a FAQ box (native `<details>`, hairlines) and `CtaBand`. ItemList JSON-LD unchanged. | `services_index` (hero) · `services_brand_<id>` (each brand box; its header cell is a spot) · `services_process` · `services_faq` · `cta` |
| `/services/[slug]` | header box `FrameSection first`, `FrameGrid 2-1`: header cell (brand chip, h1, excerpt; `header`) and a `tone=dots` end cell with the brand's `PixelLogo cell={4}` → body box: article cell + sticky aside (`below-chrome`, no `.frame-cv`) with the CTA → FAQ box. No glow (delete L92). | `service_detail` (header) · `service_body` · `service_faq` |
| `/blog` | search form in the strip end (shares `?q=` with Spotlight; the input drops today's `backdrop-blur`, L212) → grid box of stacked grids: type/tag chips in a `FrameGrid 1` row → featured `span=2` plus the post grid → `Pagination` in a `FrameGrid 1` row (featured and post cells are spots) | `blog_index` (hero) · `blog_grid` |
| `/blog/[slug]`, lessons | header box `FrameSection first`: a `FrameGrid 2-1` row with `ArticleHeader` in a `header` cell and a `tone=dots` end cell (`hidden lg:block`) holding `Window path="POST"` (lessons `"LESSON"`) with the cover when there is one, else the `blog` (lessons `learn`) `PixelIcon` at `cell={6}`; then `Tldr` in a stacked `FrameGrid 1` row as a `tone=card` cell → `FrameGrid 2-1` with a sticky TOC cell (`below-chrome`) → end box: `ShareBar`/`AuthorBox` cells (lessons: previous/next lesson cells). Root carries `data-reading`. Keep `h-entry`/`p-name`/`e-content`. No `.frame-cv`. | `post_detail` · `post_body` · `post_share` / `lesson` · `lesson_body` · `lesson_nav` (header · body · end box) |
| `/learn`, `/learn/[series]` | `PageHero` → `SeriesCard variant=cell` grid (each card a spot); series: `PageHero` (its decor window shows the series cover, else the `learn` icon; delete the glow at L127) → the lesson list as a `Window` | `learn_index` · `learn_grid` / `course` · `course_lessons` |
| `/about` | intro box `FrameSection first`, `FrameGrid 2-1`: the text cell (h1, bio, body; `header`, `span="row2"`) at inline-start; at inline-end a `decor` cell with `Window path="ABOUT.APP"` holding only the portrait (avatar, or `PixelAvatar cell=8` fallback), and below it the profile card cell (name, headline, location, `SocialLinks`; sticky `below-chrome`) → values box (4 cells) → stats box: site-pages' `FrameSection` holding foundation's `StatsCells` in its own Suspense → `CtaBand` (foundation's `cta-band.tsx`). No glows (delete L88 and L145). | `about` (intro) · `about_values` · `about_stats` · `cta` |
| `/contact` | one box (`FrameSection first`) of two stacked grids: row 1 `FrameGrid 2-1` = header cell (h1 `contactTitle`, `contactSubtitle`, breadcrumbs) + `tone=dots` end cell (`hidden lg:block`) with `Window path="CONTACT.APP"` and the `contact` `PixelIcon` at `cell={6}`; row 2 `FrameGrid 2-1` = `ContactForm` in `Window path="NEW-MESSAGE"` + `DirectContact` cell (drops today's `bg-card/70 backdrop-blur` wrapper, L144, and the glow, L131); `?service=` preselect kept | `contact` |
| `(site)/not-found.tsx` and root `not-found.tsx` | macOS-alert box (`FrameSection first`, `FrameGrid 2-1`): text cell (`notFoundTitle`/`notFoundBody` + Home/Contact pills; `header`) and a `tone=dots` end cell with `PixelText "404" cell=8` + `PixelAvatar pose="blink"` (below lg the two stack). No glow (delete `(site)/not-found.tsx` L27). | `not_found` |
| Share pages (`p`, `i`, `sign`) | logo swap through `LogoMark` with an explicit `cell` (foundation edits these call sites, §2) | — |
| Print documents (`contract-sheet.tsx`, `contracts/print-styles.tsx`, `invoice-document.tsx` + `InvoicePrintStyles`) | foundation, see "Print" below | — |
| OG (`og.tsx`) | `#161618` background, grid `rgba(255,255,255,0.06)`, glow `rgba(255,197,13,.28)` full-canvas, eyebrow `rgba(255,197,13,.16)` with `#FFDB66` text, domain `#FFDB66`, footer `#A1A1A6`, bottom bar `#FFC50D → #6A6A6C`. The logo is an inline `<svg>` built from `brandLogoLayout("TEAM")` + `toPaths()` at 10px cells with **literal** dark-mode fills (accent #FFC50D, ink and corner #A3A4A8, frame #4A4B4F, soft #5E5F63, paper #2A2A2D). Never `var()` and never the React `PixelLogo` component (Satori resolves no CSS variables). Persian is still pre-shaped. | — |
| Favicon | PixelMark paths on a `#F3F3F3` square; `<style>@media (prefers-color-scheme:dark){.paper{fill:#2A2A2D}.ink{fill:#A3A4A8}}</style>` | — |

**Guide coverage (owner wish: the guide comes to each section and special part).**
- **Every `FrameSection` on a public page carries `guide={{key, say}}`**, with the keys in the table above. All of them are in §14, and the lines come from the server-side `getMessages(locale).guide`.
  - The footer carries `footer` (site-shell, §7.5).
  - `CtaBand` carries `cta`, or `home_cta` on home (foundation).
  - A box without a key is a review error, not a style choice.
- **Spots** (`FrameCell spot`, with `say` = the visible tagline, or the excerpt clamped to 140 chars):
  - the brand header cell of each `/services` brand box (`brand-<id>`, with the brand tagline);
  - every work cell on `/work` (`work-<slug>`);
  - the featured and post cells on `/blog` (`post-<slug>`);
  - the series cards on `/learn` (`series-<slug>`).
- `services_brand_<id>` is typed: `` `services_brand_${BrandId}` `` must be a key of `Messages["guide"]`, so a brand added to the registry without a line fails `pnpm check`.
- In compact mode (below 1024px) every keyed box still gets the hop and badge, and "What's this part?" is in Control Center and Launchpad (§7.3).

**First-box rule (owner wish: the guide explains the first part of every page too).** At ≥1024px the first box of a page sits right under the menu bar even at `scrollY = 0` (its roof is at `chromeTop + 56`), so candidate A (a bubble above the roof) can never fit there, and with A alone the first box of every page would only ever get a badge. The first box therefore speaks into its own decorative cell (candidate B, §10.5), which this layout rule guarantees:
- Every public page's first `main` box is a `FrameSection first` whose **first row ends, at inline-end, in a `[data-decor]` cell** (a `tone=dots` cell, or a cell with `decor`) that is at least 312px wide and 200px tall at ≥1024px, with no `[data-frame-header]` cell beside it in that inline range. Per page: the home hero's diagram cell (§8 row 01); the `PageHero` decor window (`/work`, `/services`, `/blog`, `/learn`, `/learn/[series]`); the case-study cover window (`/work/[slug]`); the brand-logo cell (`/services/[slug]`); the post or lesson cover window (`/blog/[slug]`, lessons); the `ABOUT.APP` portrait window (`/about`); the `CONTACT.APP` window (`/contact`); the 404 art cell.
- `FrameGrid 2-1` at ≥1024px gives the end cell `1fr` of the column (325px at 1024, 400px at ≥1280), wide enough for B (≤300px plus the 12px inset).
- site-pages.spec checks this on every page above (§17); home.spec checks the hero.

**Glows.** Every `.gt-glow` layer on these pages is deleted by site-pages (§12 "Glow removal"); none is restyled.

**Print (foundation).** Contracts and invoices print from panel pages (`/panel/contracts/[id]`, `/panel/invoices/[id]`) and share pages (`/i/[token]`, `/sign/[token]`), with `print-color-adjust: exact` on everything. Without changes the new chrome would print:
- `contracts/print-styles.tsx` hides chrome by `aside`/`header` selectors and resets only `#main`. Add, inside its `@media print`: `.os-menubar, .os-dock, .os-dock-zone, .os-titlebar, .gt-guide, #panel-guide { display: none !important }`; `.panel-shell, .os-desktop { background: #fff !important; min-block-size: 0 !important }`; `.os-window { margin: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: #fff !important }`; `.os-window-body { padding: 0 !important }`.
- Both `print-styles.tsx` (`:root, :root.dark` block) and `InvoicePrintStyles` (`#invoice-doc` block) also set the light brand tones, so the logo never prints dark-mode tones on #2A2A2D paper: `--brand-yellow:#ffc50d; --brand-ink:#6a6a6c; --brand-frame:#b3b5b9; --brand-soft:#caccce; --brand-paper:#ffffff`.
- `InvoicePrintStyles` already prints only `#invoice-doc` (`visibility`), so it needs only the brand tones.
- The grey literals in all three files become `rgb(106 106 108 / α)` (§3.2 table).
- `frame.css` keeps its own `@media print` rule hiding the site menu bar, dock, guide and rails.
- Verification: print-preview (Chrome "Save as PDF") of `/panel/contracts/<seed id>` and `/i/<seed token>` in **dark** mode shows white paper, the pixel mark in light tones and no chrome; record the two PDFs' first pages as PNGs in the foundation PR.

---

## 10. The assistant: "virtual me"

### 10.1 Look
- **Sprite:** §4.3. 3px cells (48px) in desktop mode, 2px (32px) in compact mode (§10.5), with a 1-row grey shadow when standing on a roof.
  - The size is set in `guide.css` on the button: `.gt-guide-sprite{--cell:3px}` and `.gt-guide[data-compact] .gt-guide-sprite{--cell:2px}`.
  - The sprite's `<svg class="px-art">` inherits it. It is rendered **without** a `cell` prop (§4.2), because a `[--cell:3px]` utility on the svg would beat the compact rule.
- **Name:** `guide.name`.
- **Bubble:**
  - `max-inline-size:300px`, padding 10px 12px, 13.5px/1.6 (fa 14px/1.8), radius 10px. Typical height: 100–130px for an automatic line (≤160 chars, no actions), 130–160px with the actions row. Placement never assumes it fits in a section gap (48–80px); it is measured (§10.5).
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
<div id="gt-guide" class="gt-guide" hidden>                            <!-- absolute; inset:0; overflow:clip; pointer-events:none; z-index:30 -->
  <div class="gt-guide-sel" aria-hidden="true"></div>
  <div class="gt-guide-x"><div class="gt-guide-y">                       <!-- nested translate for arcs -->
    <button type="button" class="gt-guide-sprite" aria-label="{guide.name}" aria-expanded="false" aria-controls="gt-guide-bubble">
      <PixelAvatarSprite /><i class="gt-guide-badge" aria-hidden="true"></i></button>
      <!-- renders <svg class="px-art px-sprite" data-state="idle">; no cell prop: --cell comes from guide.css (§10.1);
           the engine writes every state change (idle/walk/talk/wave/sit) to this svg's data-state, the hook pixel.css reads (§4.4) -->
    <span class="gt-guide-trail" aria-hidden="true"><i></i><i></i><i></i></span>
  </div></div>
  <div id="gt-guide-bubble" class="gt-guide-bubble" role="group" aria-labelledby="gt-guide-name" hidden>
    <p id="gt-guide-name">{name}</p><p class="gt-guide-text"></p><div class="gt-guide-actions">…</div></div>
  <p id="gt-guide-live" class="sr-only" role="status" aria-live="polite"></p>
  <GuideLoader greeting={…} labels={…} />
</div>
```
- The sprite button and the bubble are the only `pointer-events:auto` parts.
- `.gt-guide` clips to `.os-desktop`, so everything the guide draws on desktop must lie inside it. The first box's roof is inside `.os-desktop` only because `.os-desktop` is `display:flow-root` (§6.2). guide.spec asserts that the greeting sprite's top is ≥ the `.os-desktop` top.
- **Fixed children in compact mode.** Any ancestor with a non-`none` `transform`, `translate`, `scale`, `rotate`, `filter`, `perspective`, `contain: paint/layout`, `backdrop-filter` or a `will-change` naming one of them becomes the containing block of a `position:fixed` descendant. So:
  - `.gt-guide` and `.os-desktop` never carry any of them (§6.2).
  - In compact mode the engine sets `data-compact` on `.gt-guide`, and `guide.css` forces `.gt-guide[data-compact] :is(.gt-guide-x,.gt-guide-y){translate:none;transition:none;will-change:auto}`. The arc and walk translates are desktop-only. The compact "hop" animates the **sprite button's own** `translate` (a transform on the fixed element itself does not change its containing block).
  - The bubble is a child of `.gt-guide`, outside the `x`/`y` wrappers, so it can be fixed in compact mode as well.
- In DOM order the guide comes after the footer and before the dock, so it is never a tab stop before content.

### 10.3 Data flow
- **Section lines.** Server components put `data-guide="<key>" data-guide-say="<line>"` on section roots (via `FrameSection guide`).
- **Spot lines.** `data-guide-spot` plus `data-guide-say` (visible tagline or excerpt, ≤140 chars).
- The engine reads attributes. There is no JSON blob, no client i18n and no fetch.
- **Greeting.** `GuideMount` runs `await connection()` and cached `getPublicProfile()`, then formats **two** greetings: `full = format(guide.greeting,{owner: ownerName[locale]})` (fallback `greetingNoName`) and `compact = format(guide.greetingCompact,{owner})` (fallback `greetingCompactNoName`). Desktop versus compact is only known on the client (matchMedia), so both go to the loader as `greeting: { full, compact }`, and the engine uses `compact` whenever it runs in compact mode: there no automatic bubble opens, so the greeting must not promise "as you reach each part, I'll tell you"; it says to tap the sprite when its "!" badge shows. It passes the labels (`name`, `hide`, `next`, `endTour`, `tourDone`, `idle`, `close`) as props.
- Lines must read well aloud without the visual. A visual reference ("the diagram beside it") may appear, but never as the only referent.
- **Paraphrase rule (D10).** Every section line restates, in the guide's first-person voice, information that is visible as text in that section (its h2, subtitle, eyebrow, visible taglines or visible UI labels); it never adds a fact that is not on the page. Spot lines are the visible tagline or excerpt itself (≤140 chars). Shell lines (`idle`, `footer`, `not_found`) refer only to visible UI (dock, footer links, Home button). The assistant track checks each line against the page and lists, per key, the visible string it paraphrases in its PR; a line with no visible source is rewritten (for example, if no section says "I usually reply within a working day", `home_cta` drops that clause).

### 10.4 Loading
`GuideLoader` (client, ≤0.8KB gz):
- **Automatic boot** is skipped if `readGuidePref()==="off"`, `navigator.connection?.saveData`, print, or `navigator.webdriver` without `gt-guide-test=1`.
- After `load`: `requestIdleCallback(go,{timeout:3000})`, with a `setTimeout(go,1500)` fallback. Also runs on the first `pointerdown` or `keydown`.
- `go = import("./guide-engine").then(m => m.start({ root, dir, reduced, compact, mode: "auto", greeting, labels }))`:
  - `reduced` = `matchMedia('(prefers-reduced-motion: reduce)')` OR `html[data-motion=reduce]`.
  - `compact` = `matchMedia('(max-width: 1023px), (pointer: coarse)')` (D21), re-evaluated on its `change` event (the engine switches modes without a reload).
- On `usePathname` change it calls `engine.rescan()`.
- It always listens for `gt:guide` and `gt:guide-pref`, even when muted. Turning the guide off stops automatic behaviour (disconnects observers, removes listeners, sets `hidden`); turning it on boots `auto` mode without a reload.
- **While muted** (`gt-guide=off`, Save-Data, or webdriver without the flag), an explicit `explain` or `tour` event still imports the engine and starts it with `mode: "explicit"`: no observers, no greeting, no idle, no auto lines, no seen-list writes. The sprite appears for that action only (explain: on the target section; tour: through the steps) and the layer is hidden again when the bubble closes or the tour ends. The mute preference is not changed. `show` turns the guide back on (`writeGuidePref(true)`), `hide` turns it off.
- **Engine sentinel.** `guide-engine.ts` exports `GUIDE_ENGINE_ID = "gt-guide-engine@1"`, and `start()` writes it to `root.dataset.engine`.
  - Because the string is used at runtime, it survives tree-shaking and minification.
  - It is defined **only** in `guide-engine.ts`: never in `guide-events.ts`, the loader, or any module the loader imports. So a JS response body that contains it is the engine chunk.
  - `e2e/perf.spec.ts` identifies the engine request this way, because Turbopack chunk names are hashed (§12). Bump the suffix only if the engine is split.

### 10.5 Engine (`guide-engine.ts`, vanilla TS, ≤6KB gz)
**Observers and listeners**
- One IntersectionObserver over `[data-guide]` with `rootMargin:"-35% 0px -50% 0px"`.
- One ResizeObserver on `<main>`, rAF-debounced, to re-anchor when streams or images land.
- Delegated `pointerover` (fine pointer only) and `focusin` on `.os-desktop`; `keydown` (Esc); `visibilitychange`.
- **No scroll listener.** Layout reads (2–3 rects) happen only on activation, resize, RO or tour step. Writes are batched in one rAF as CSS variables `--gx --gy --bx --by --sx --sy --sw --sh`, in coordinates relative to `.os-desktop`.

**Chrome values.** `chromeTop` and `dockSpace` are read as `parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--chrome-top"))`, and the same for `"--dock-space"`.
- Both are registered `<length>` properties (§5.2), so the values are resolved px strings. Unregistered, `--dock-space` would read as an unevaluated `calc(…)` string, `parseFloat` would give `NaN`, and every roof-perch and bubble "fits" test would be false: always the rail perch, and no bubble at all.
- They are re-read on start, on every ResizeObserver callback and on a compact-mode change, because `--menubar-h` changes at 768px and with the pointer type.
- If either value is not finite, the engine falls back to the bottom of `.os-menubar`'s rect and to `innerHeight − (.os-dock-list rect top) + 12`.

**Placement (desktop mode, ≥1024px with a fine pointer).** Inputs per activation: the target box rect `r` (the `[data-guide]` element), its strip height `s` (36 when it has a `.frame-strip`, else 0), the viewport height `vh`, `chromeTop` and `dockSpace` (see "Chrome values" below), the sprite size (48×48) and the **measured** bubble size `bw × bh` (the bubble is filled with the line while `visibility:hidden` and read in the same layout pass). Coordinates are viewport values converted to `.os-desktop`-relative ones on write. Two sprite perches:
1. **Roof perch** (default) when the roof is comfortably visible, `r.top ≥ chromeTop + 56` and `r.top ≤ vh − dockSpace − 56`: the sprite stands on the box's top border at inline-end, inside the section gap (gaps are 64/80px at ≥1024; the first box reserves 56px, §6.2):
   - `x = rtl ? r.left + 12 : r.right - 12 - 48`
   - `y = r.top - 48 + 1`
2. **Rail perch** when the roof is above that band (a tall box whose top has scrolled away): the sprite clings to the box's inline-end border at `y = chromeTop + 24` (viewport), straddling it with 24px inside the box (`x = rtl ? r.left - 24 : r.right - 24`). 24px is less than the 32px cell padding (`data-pad` `md`/`lg`), so it covers only padding. **Unpadded cells:** the engine reads the inline-end cell under the perch (`elementFromPoint` at the perch centre, then `closest(".frame-cell")`, one read on activation). If it is `[data-pad=none]` (a flush window, cover or image), the 24px straddle would cover content, so:
   - **outside rail perch** when the desktop margin beside the box is at least 52px (viewport ≥1304px): the sprite stands fully outside the border, `x = rtl ? r.left - 52 : r.right + 4`;
   - otherwise **no perch**: the sprite fades out for that activation (an explicit bubble still opens, at C without a tail).

Bubble candidates, in order (the first one that fits wins; "fits" = fully inside `[chromeTop + 8, vh − dockSpace − 8]` vertically and inside the frame column horizontally):
- **A, above the roof** (roof perch only): bottom edge at `r.top − 6`, extending up through the gap and over the bottom of the previous box (content the reader has already passed). **Horizontal anchor: the bubble's inline-end edge is 8px beyond the sprite's inline-end edge** (LTR: `bubble.right = sprite.right + 8`; RTL: `bubble.left = sprite.left − 8`), and the bubble extends from there toward inline-start (to the left of the sprite in en, to the right of it in fa); then it is clamped to the frame column. The tail sits at the bubble's inline-end bottom, above the sprite.
- **B, inside the box below the strip**: top at `r.top + s + 8` (or at the rail-perch sprite's top), inline-end edge 12px inside the box border; tail pointing at the sprite. It overlays the box's inline-end top cell, so **B is used only when it is clear**:
  - the cell under B's top inline-end corner (`elementFromPoint`, then `closest(".frame-cell")`) is `[data-decor]`, and B's rect lies inside that cell's rect;
  - B's rect intersects no `[data-frame-header]` cell of the box. Header cells can span the full row (§8 rows 06 and 09, any `span=full` header), so "headers sit at inline-start" is never assumed;
  - the markers come from `FrameCell decor` / `tone=dots` and `FrameHeaderCell` / `FrameCell header` (§6.1, §15.1). At most three rect reads, on activation only.
  - A B that is not clear is skipped like one that does not fit.
- **C, pinned under the menu bar**: top at `chromeTop + 12`, inline-end at the frame column edge − 12px; no tail. It may overlay whatever is under it, so it is used only for the greeting and for explicit bubbles.

Which candidates each kind of bubble may use:
- **Automatic section lines: A only, except on the page's first box.** If A does not fit (roof too close to the menu bar, or rail perch), the sprite still moves there and shows the badge (the 6px yellow "!"), but no bubble opens and the section is **not** added to the seen list, so it can speak once its roof is in view. With the activation band (`-35% / -50%`), a section's roof is normally between 35% and 50% of the viewport, where A fits (≥200px above it at 800px tall).
- **First box** (the first `main [data-guide]` in DOM order, which §9's first-box rule makes a `FrameSection first` with a decor cell): **A, else a clear B, else the badge**. At `scrollY = 0` its roof is at `chromeTop + 56`, where A never fits, so without this the first box of every page (`home_hero` after the greeting, `work_index`, `services_index`, `blog_index`, `learn_index`, `course`, `about`, `work_detail`, `service_detail`, `post_detail`, `lesson`, `contact`, `not_found`) would never speak automatically. The §9 first-box rule guarantees a clear B on every public page at ≥1024px.
- **Greeting: A, else a clear B on the first box, else C.** The greeting plays once per session on whatever page comes first, often a deep link (`/blog/<slug>`, `/services`), so it never assumes the home hero's layout; C is the last resort because the greeting must appear, and it is dismissible.
- **Spots: A relative to the spot's own top edge**, else the spot is skipped (spots never overlay content).
- **Explicit bubbles** (sprite click, `explain`, tour steps): A, else a clear B, else C. They are user-initiated and dismissible, so C may overlay content.
- **Never** (desktop): the sprite on cell content (roof perch in the gap; rail perch only over padding, else outside the border or faded out); an automatic or spot bubble over any `[data-frame-header]` cell or any non-`[data-decor]` cell content; any bubble over a hovered spot.

The pure maths lives in `geometry.ts` (`placeSprite`, `placeBubble`; the engine passes the measured rects and the cell markers in, so the functions stay pure) and is unit-tested for: LTR and RTL; roof versus rail perch; the rail perch beside a `pad=none` cell (outside perch at ≥1304px, no perch below); A's anchor (inline-end edge = sprite inline-end + 8px, extending toward inline-start, in both directions); each candidate's fit test; B rejected when its cell is not `[data-decor]` or when it intersects a `[data-frame-header]` rect (a `span=full` header row); the first-box rule (A, else clear B, else badge) for automatic lines; the greeting (A, else clear B, else C); clamping to the column; and the "no automatic bubble" result.

**Activation.** A section activates after a **600ms dwell** in the band. It speaks the section line once per session per `pathname#key` (`gt-guide-seen`), counted only when the bubble actually opened. Last activation wins, with at least 2.5s between lines.

**Movement.** Every `data-state=…` below and under "Speaking" is written to the sprite's root `svg.px-sprite` (§4.2, §4.4); `#gt-guide` itself carries no state.
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

**Greeting.** If `scrollY < 200` and `gt-guide-greeted` is not set this session: drop onto the first `[data-guide]` box (roof perch on the reserved 56px gap), wave twice, say `greeting.full` (candidate A, else a clear B, else C), then set `gt-guide-greeted`. The first box's own line follows on its next activation (first-box rule above). In compact mode the one-time greeting is `greeting.compact` (§10.3). The reserved roof is inside `.os-desktop`, and so inside the clipped guide layer, only because of `display:flow-root` (§6.2).

**Idle.** 30s without input → `guide.idle` once per session (`gt-guide-idle`). Blink: 5 iterations per activation (§4.4). 60s → the `sit` pose (static) until the next input.

**Explicit mode**
- Triggers: a sprite click, an `explain` event (menu-bar extra, Control Center or Launchpad; each closes its popover first), or a tour step. Shows the line of the active anchor (the last activated section; if none, the `[data-guide]` element whose rect is nearest the viewport centre, found with one read pass) with actions.
- Updates `#gt-guide-live` (polite, `lang` set).
- Sets `aria-expanded=true` on the sprite.
- Esc or × closes it and returns focus to the invoker when focus was inside the bubble or on the sprite.

**Tour** (`gt:guide` `tour`)
- Visits each `[data-guide]` in DOM order. It scrolls so that the box roof lands at `chromeTop + bh + 24` from the viewport top (room for candidate A): `window.scrollTo({ top: absTop − chromeTop − bh − 24, behavior: reduced ? "auto" : "smooth" })`, with `bh` measured as above. In compact mode it uses `scrollIntoView({ block: "start" })` (the bubble sits above the dock). Then it waits for `scrollend` (900ms fallback), moves, and opens an explicit bubble with "Next ({i} of {n})" and "End tour".
- **Focus moves to Next**, the only focus move, and only because the user started the tour.
- Esc ends the tour. The last step says `tourDone`.

**Hide.** Hide (bubble, menu bar, Control Center, Launchpad) → `writeGuidePref(false)`.

**Compact mode (below 1024px, or any coarse pointer; D21)**
- `.gt-guide[data-compact]`. The sprite is `position:fixed` at `inset-inline-end:12px; bottom:calc(var(--dock-space) + 8px)`, 2px cells (32px). Its wrappers carry no translate (§10.2).
- On activation: a hop (the button's own `translate`, 2 × 180ms) plus a 6px yellow "!" badge, with **no auto bubble**. The only exception is the one-time greeting (4s) per session on the first page, which uses the compact text (`guide.greetingCompact`: tap the sprite when its "!" shows), never the desktop promise to speak at each part.
- Tapping toggles an explicit bubble, also `position:fixed`, above the sprite: `inset-inline-end:12px; bottom:calc(var(--dock-space) + 48px); inline-size:min(300px,100vw - 32px)`. Tapping outside closes it.
- No spots, no walking, no arcs.
- Hidden while any `:popover-open` exists (`html:has(:popover-open) .gt-guide[data-compact]{visibility:hidden}`, compact mode only), and while an input or textarea has focus. On desktop the guide stays visible under popovers, which render in the top layer anyway. Every menu entry point that dispatches `explain` or `tour` closes its own popover first (§7.2 item 4, §7.3), so the explain bubble and the tour are never hidden behind a menu.

**Reduced motion.** No walking, hopping, trail, wipe, typing dots or wiggle. The sprite moves instantly with a fade. Static idle frame.

**Never**
- No `role=dialog`, no `aria-modal`, no `aria-hidden` on the bubble.
- No focus move except the tour.
- No auto-speak under webdriver.
- The sprite never covers cell content on desktop (roof perch in the gap; rail perch inside the cell padding, or outside the border beside a `pad=none` cell, or no perch); bubbles follow the candidate rules above.

### 10.6 Panel "virtual me" (quiet)
- A **"Me" tile** at the inline-start of the panel dock (`PixelAvatar part="head" cell={2}` on a `brand` tile). It is a `<button type="button" aria-expanded aria-controls="panel-guide">` whose accessible name is its visible dock label `guide.name` («منِ مجازی» / "Virtual me"), like every dock tile; no `aria-label`.
- It opens a bubble `<div id="panel-guide" popover="manual" role="group" aria-labelledby="panel-guide-name">` (`<p id="panel-guide-name">` = `guide.name`). Content:
  - a 3px `PixelAvatar`
  - `t.guide["panel_"+navKey]` for the active module (`navKey` from the same longest-prefix match `CurrentAppName` uses; `/panel` maps to `panel_dashboard` or `panel_portalHome` by role)
  - a switch `guide.tipsAuto` (`gt-guide-tips`)
  - a close button (`common.close`)
  - **No docs link in v1**: the repo's `docs/` are not served and `/panel/docs` is the team knowledge base, so there is no per-module help page to link to (deferred, §18).
- **Position.** At ≥1024px it is anchored above the Me tile (`position:fixed`, `bottom: calc(var(--dock-space) + 8px)`, inline-start aligned with the tile, CSS anchor positioning when supported). Below 1024px the dock is a tab bar and the Me tile is hidden, so the bubble is `position:fixed; inset-inline:12px; bottom:calc(var(--dock-space) + 8px); margin-inline:auto; max-inline-size:420px` (centred above the tab bar), opened only from the App menu's "About {module}".
- Esc, the close button and outside click close it; focus returns to the invoker (Me tile, or the menu bar's App trigger). Opening by click updates a polite live region.
- **Peek:** when tips are on, the first visit to each module per browser (`localStorage gt-guide-mod:<key>`) shows the bubble for 5s after 1.5s idle. Only at ≥1024px (never over content in tab-bar mode). Skipped under webdriver. Never a dialog.
- The App menu item "About {module}" dispatches `gt:guide` `explain`, which the panel guide handles at either position.

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
1. **Brand** (PixelMark 22px, `aria-label=nav.brandMenu`). It is drawn in the static shell, outside the session Suspense holes, so every item is **role-neutral**. Items:
   - `panel.desktop` («میز کار» / "Desktop") → `/panel` (the dashboard for staff, the portal home for clients; the label is the same for both)
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
  3. Dashboard / Portal (`mark` variant): the `groupOverview` item of `navForRole` (`dashboard` for staff, `portalHome` for clients), and the only place that item appears
  4. separator, then one group per `navForRole` group **except `groupOverview`**, consecutive groups separated by a separator (`navForRole` returns `groupOverview` first; rendering it as a group would show the dashboard twice)
  5. separator
  6. **View site** (globe, external)
- Role items carry `data-dock-app`: **the mark tile and every group item**, never the Me tile, View site or separators. Verified against `nav-config.ts`: owner/admin 1 + 15 = 16, member 1 + 8 = 9, client 1 + 4 = 5. For owner that is 18 tiles (with Me and View site) and 7 separators, the numbers the tile-size rule below uses.
- **Tile size:** `.panel-shell .os-dock{--dock-tile:max(36px,min(var(--dock-pref),calc((100vw - 2*var(--gutter) - 12px - var(--dock-seps)*17px)/var(--dock-n) - 8px)))}`. At 1024px with owner (18 tiles, 7 separators) that is about 39px; it reaches 48px at about 1280px.
- **Tiles:** `brand` variant with the lucide module icon at 22px, stroke 1.75, `--foreground` at 80%.
- **Labels:** the CSS label bubble. No Radix Tooltip in the dock.
- **Indicators:**
  - `aria-current` plus the 4px dot.
  - The Time tile gets `data-running` (pulsing dot; static under reduced motion) when `getRunning() > 0`. `chrome-store.ts` (`getRunning`, `setRunning`, `subscribe`) is fed by `HeaderLive`; the dock uses `useSyncExternalStore` with server snapshot 0. `PanelDock` passes `running={n > 0 ? ["time"] : []}` and, on the Time entry, `srExtra={n > 0 ? format(t.time.runningCount, { n }) : undefined}` (the `DockEntry.srExtra` field of §5.5), so the accessible name becomes e.g. "Time, 2 running".
- **Launch bounce:** `useLinkStatus`.
- **Auto-hide:**
  - `@media (width>=64rem){html[data-dock-autohide] .panel-shell .os-dock{translate:0 calc(100% + var(--dock-gap));transition:translate .2s var(--ease-os)}}` (`panel-shell.css`).
  - Revealed by `:hover`, by `:focus-within` (keyboard always reveals it), and by a fixed 8px `.os-dock-zone` hot strip (`.os-dock-zone:hover + .os-dock`), which is `display:none` below 64rem.
  - **Desktop only.** Both auto-hide rules, this one and the `--dock-space` rule in `os-shell.css` (§5.2), sit inside `@media (width>=64rem)`. Below 1024px the tab bar is the only navigation (the Me tile is hidden) and there is no hover to bring it back. So it never hides, and content keeps its full bottom padding even when the saved preference is on.
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
- **Settings → Appearance:** the Sidebar card becomes **Desktop & Dock** (its hint `desktopDockHint` says these apply on large screens; auto-hide never applies to the tab bar, §11.3):
  - ToggleGroup S/M/L
  - Magnification, Auto-hide, Full-width windows and Guide tips switches
  - a `DesktopMock` preview
- Remove the `settings.sidebar*` keys.

### 11.6 Collisions
**Toaster** (`interactive-providers.tsx`):
- `offset={{ bottom: "var(--toast-bottom, 24px)" }}` and `mobileOffset={{ bottom: "var(--toast-bottom, 16px)" }}`.
- `panel-shell.css` sets `html:has(.panel-shell){--toast-bottom:calc(var(--dock-space) + 8px)}`.
- The sign page is unaffected.

**Blur in the panel (P5).** The menu bar and the dock are the only blurred surfaces. Foundation removes `glass`/`backdrop-blur` from the sticky bars it migrates (§15.3: `save-bar.tsx`, `contract-editor.tsx` action bar, `activity/page.tsx` sticky heading, `doc-editor.tsx` mobile bar, the catalog `toc.tsx` chip bar) and from the `/sign` mobile action bar (`sign/[token]/_components/sign-panel.tsx` L330), using `bg-background/95` (dark `bg-card/95`). Panel-shell removes `backdrop-blur-xl` from `ui/popover.tsx` and `ui/dropdown-menu.tsx` content (they become `.os-menu`-like 97% surfaces), so no blurred layer ever stacks on the blurred menu bar. The dialog scrim (`dialog.tsx`, `backdrop-blur-[2px]`) and the chart tooltip (`chart.tsx`) are transient and stay.

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
| Guide | loader ≤0.8KB gz initial; engine ≤6KB gz, lazy after load + idle; 0 engine bytes when off or under Save-Data until the visitor explicitly asks ("What's this part?" or "Tour", explicit mode) |
| CSS added | ≤6KB gz (≤22KB raw) across `os-shell`, `frame`, `pixel`, `site-shell`, `home`, `site-pages` and `guide` |
| Fonts | 0 new files; JetBrains Mono not requested above the fold on home |
| Images | 0 new rasters; pixel art inline SVG, one path per tone; ≤260 pixel-art elements on `/`, allocated site-shell ≤125, assistant ≤20, home ≤115 (§4.2) |
| DOM | ≤1,800 nodes on home |
| Blur | exactly 2 surfaces on pages with a dock (menu bar and dock, ≥768px, ≤20px); 1 on the auth pages |
| Animation | no infinite main-thread animation after 20s (packets capped, ants static, diagram float and orbit spin removed, sprite blink capped at 5 iterations per activation); infinite compositor-only allowed for the marquee (pausable) and the live dot |
| Panel | chrome JS ≤ +10KB gz vs removed sidebar/header; no new polling; 0 CLS across module navigations |

**Blur removal (who removes each existing `backdrop-blur*`/`.glass`; verified with `git grep`)**

| Owner | Files (line) |
|---|---|
| foundation | `cover.tsx` L91; `cards.tsx` L100 and L205 (the cell variants it creates must not blur); the panel sticky bars of §11.6; `sign-panel.tsx` L330 |
| site-shell | `header-client.tsx` L30 (`data-scrolled:glass`) and L211 (mobile menu), deleted with `HeaderShell`/`MobileMenu` |
| home | `hero-diagram.tsx` L49, L189, L210; `home/sections.tsx` L33, L141; `(site)/page.tsx` L93 |
| site-pages | `ui.tsx` L50 (`Eyebrow`); `blog/page.tsx` L212; `contact/page.tsx` L144 |
| panel-shell | `ui/popover.tsx` L30; `ui/dropdown-menu.tsx` L31; `components/panel/header.tsx` (deleted) |

After all tracks merge, `git grep -nE "backdrop-blur|\bglass\b" -- 'src/**/*.tsx'` lists only `ui/dialog.tsx` and `ui/chart.tsx`.

**Glow removal (who deletes each `.gt-glow` layer; verified with `git grep -n "gt-glow " -- 'src/**/*.tsx'`).** `.gt-glow` itself is not restyled (§3.3): every layer is deleted, never re-coloured.

| Owner | Files (line) |
|---|---|
| foundation | `home/sections.tsx` L358, L360 (inside the old `CtaBand`, deleted by the sweep; the new `cta-band.tsx` has no glow) |
| home | `(site)/page.tsx` L68, L70; `home/sections.tsx` L132, L246; `home/how-we-work.tsx` L292 |
| site-pages | `ui.tsx` L159 (`PageHero`); `about/page.tsx` L88, L145; `contact/page.tsx` L131; `learn/[series]/page.tsx` L127; `services/[slug]/page.tsx` L92; `(site)/not-found.tsx` L27 |

After all tracks merge the grep is empty, and qa-docs deletes the `.gt-glow` rule from `globals.css`. (`hero-diagram.tsx`'s SVG `<filter id="gt-glow">` is not the class and is home's to keep or drop.)

**Verification**
- `pnpm build` route-size table compared to the baseline recorded in each PR.
- `node scripts/shots.mjs` (fa/en, `--dark`, `--mobile`) with 0 console errors and 0 responses ≥400.
- `e2e/perf.spec.ts` (qa-docs), every test with `page.addInitScript(() => localStorage.setItem("gt-guide-test","1"))`, because under `navigator.webdriver` the loader otherwise never requests the engine and "no engine request before load" would pass vacuously:
  - **Blocking in CI** (deterministic): layout-shift sum < 0.01 on `/` and `/en` under CDP `Emulation.setCPUThrottlingRate(4)` at 390×844; the guide engine chunk (the JS response whose body contains the sentinel `gt-guide-engine@1`, §10.4) is requested **after** the `load` event (its resource-timing `startTime` ≥ the navigation entry's `loadEventStart`) and **is** requested within 5s after it (proves the test is not vacuous), and `#gt-guide[data-engine]` appears; with `gt-guide=off` no response body contains the sentinel within 8s after `load`; `document.querySelectorAll('*').length ≤ 1800` on `/`; `svg.px-art, svg.px-art *` count ≤ 260 on `/`; at 1440×900, exactly two elements where `getComputedStyle(el).backdropFilter` **or** `getComputedStyle(el, "::before").backdropFilter` (and the `-webkit-` variant) is not `none`, and they are `.os-menubar` and `.os-dock-list`; no JavaScript response body loaded by `/` or `/login` contains the strings `"DropdownMenuContent"`, `"TooltipContent"` or `"data-sonner-toaster"` (Radix display names and sonner's attribute survive minification).
  - **Tagged `@perf`, not blocking** (timing is noisy on shared CI runners): the LCP element is the hero `<h1>` and its time is ≤1.8s under throttling. These run only when `PERF=1` (`test.skip(!process.env.PERF)`) and qa-docs records the numbers in `docs/os-shell.md`.
- CI's e2e job runs every `e2e/*.spec.ts` (`testDir: "e2e"`) against `pnpm start` with seed data, so each track's spec gates that track's PR and every later one. No CI workflow change is needed.

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

**Guide.** The sprite is a labelled button. The bubble is never a dialog and never steals focus (except the user-started tour). The live region speaks only explicit actions. Esc dismisses. The mute is persisted and keyboard-reachable (menu bar, Control Center, Launchpad). "What's this part?" and "Tour" are offered in the same three places: the menu-bar extra at lg+, and Control Center and Launchpad at every size. They stay keyboard-reachable while muted (explicit-only mode). Lines live in attributes and paraphrase visible copy (§10.3), so there is no hidden text and no information exists only in narration. The panel Me tile is named by its visible dock label.

**Motion**
- the OS setting, plus the site **Reduce motion** switch (`html[data-motion=reduce]`)
- explicit `animation:none` for scroll-driven animations, the dock, the guide and the logo cycle
- every animated thing has a meaningful static frame
- the logo cycle runs once (<5s)
- the marquee pauses on hover and focus

**Transparency and forced colours.** `prefers-reduced-transparency` gives solid bars. In forced colours, markers, rails and dots are hidden and borders become system colours.

**Contrast.** Per §3.4, including the non-text state table; automated with axe (`e2e/a11y.spec.ts`, `color-contrast` rule).

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

**guide** (new namespace, server-only on the site, full in the panel). `format()` placeholders: `{owner}`, `{i}`, `{n}`, `{module}`. It holds every key of the §9 "Guide coverage" map, including `services_brand_<id>` for every `BrandId`.

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
| greetingCompact | سلام! من نسخهٔ پیکسلیِ {owner} هستم. هر وقت علامت «!» را کنارم دیدی، رویم بزن تا آن بخش را توضیح بدهم. | Hi! I'm {owner}'s pixel twin. When you see my "!", tap or click me and I'll explain that part. |
| greetingCompactNoName | سلام! من نسخهٔ پیکسلیِ گودین تیم هستم. هر وقت علامت «!» را کنارم دیدی، رویم بزن تا آن بخش را توضیح بدهم. | Hi! I'm Good In Team's pixel twin. When you see my "!", tap or click me and I'll explain that part. |
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
| cta | پروژهٔ بعدی‌ات را با هم بسازیم؟ بنویس؛ کمتر از یک روز کاری جواب می‌دهیم. | Shall we build your next project together? Write to us; we reply within one business day. |
| work_index | همهٔ کارها این‌جاست؛ با فیلترها بر اساس فناوری یا سال بگرد. | All our work is here. Filter by stack or year. |
| work_grid | هر کارت یک مطالعهٔ موردی است: چالش، راه‌حل، تکنولوژی و نتیجه. | Each card is a case study: the challenge, the solution, the stack and the results. |
| work_detail | ماجرای کامل این پروژه: مسئله، تصمیم‌ها و نتیجه. | The full story of this project: the problem, the decisions, the result. |
| work_story | ماجرا این‌جاست و کنارش مشتری، سال، نقش و تکنولوژی آمده. | The story is here, with the client, year, role and stack beside it. |
| services_index | طراحی و توسعهٔ محصول، اپ موبایل، عامل‌های هوش مصنوعی و مشاوره؛ همه با فرایندی شفاف. | Product design and engineering, mobile apps, AI agents and consulting, all with a transparent process. |
| services_brand_team | گودین تیم محصول کامل را می‌سازد، از ایده تا انتشار. | Good In Team builds whole products, from idea to launch. |
| services_brand_studio | گودین استودیو رابط، برند و تجربه را طراحی می‌کند. | Good In Studio designs interfaces, brands and experiences. |
| services_brand_code | گودین کد وب، موبایل و عامل‌های هوشمند را مهندسی می‌کند. | Good In Code engineers web, mobile and AI agents. |
| services_process | همکاری در چهار قدم: گفتگو، طراحی و برنامه، ساخت با گزارش زنده، تحویل و پشتیبانی. | We work together in four steps: discovery, design and plan, build with live reports, launch and support. |
| services_faq | جواب سؤال‌های رایج: هزینه، زمان، پیگیری پیشرفت، پشتیبانی و مالکیت کد. | Common questions answered: cost, timing, tracking progress, support and who owns the code. |
| service_detail | جزئیات این خدمت و چیزی که تحویل می‌گیری. سؤالی داشتی، بپرس. | What this service includes and what you'll get. Questions? Just ask. |
| service_body | برای این خدمت آماده‌ای؟ کادر کنار متن جزئیات پروژه‌ات را می‌گیرد؛ ظرف یک روز کاری جواب می‌دهیم. | Ready for this service? The box beside the text takes your project details; we reply within one business day. |
| service_faq | سؤال‌های رایج همین خدمت، با جواب. | Common questions about this service, answered. |
| blog_index | نوشته‌ها، ویدیوها و یادداشت‌های کوتاه؛ جستجو هم کار می‌کند. | Articles, videos and short notes. Search works too. |
| blog_grid | تازه‌ترین نوشته‌ها اول می‌آیند؛ با برچسب‌های بالا بر اساس نوع یا موضوع فیلتر کن. | The newest posts come first; the chips above filter by type or tag. |
| post_detail | اول خلاصه آمده؛ متن کامل بعد از آن است. | The summary comes first; the full text follows. |
| post_body | فهرست «در این مطلب» کنار متن به هر بخش می‌بردت. | The "On this page" list beside the text jumps to any part. |
| post_share | این‌جا می‌توانی مطلب را به اشتراک بگذاری و نویسنده را بشناسی. | Share this post here, or read about the author. |
| learn_index | دوره‌های قدم‌به‌قدم؛ از پایه تا انتشار. | Step-by-step courses, from the basics to launch. |
| learn_grid | هر کارت یک دوره است، با سطح و تعداد درس‌هایش. | Each card is a course, with its level and number of lessons. |
| course | درس‌ها به ترتیب‌اند؛ هر کدام کوتاه و عملی. | Lessons run in order; each is short and hands-on. |
| course_lessons | سرفصل‌های دوره به ترتیب؛ از درس اول شروع کن. | The course contents, in order. Start with the first lesson. |
| lesson | جای این درس در دوره بالای صفحه آمده: درس چندم از چند. | This lesson's place in the course is at the top: lesson n of the total. |
| lesson_body | متن درس این‌جاست و فهرست کنارش به هر بخش می‌بردت. | The lesson is here, and the list beside it jumps to any part. |
| lesson_nav | درس قبلی و بعدی همین‌جا هستند. | The previous and next lessons are right here. |
| about | این‌جا خودم را معرفی کرده‌ام و چیزهایی که برایمان مهم است. | This is me, and what we care about. |
| about_values | چهار چیزی که برایمان مهم است: شفافیت، کیفیت، یادگیری و سرعت. | Four things we value: transparency, quality, learning and speed. |
| about_stats | به زبان اعداد: پروژه‌های تحویل‌شده، ساعت‌های ثبت‌شده، مشتری‌ها و مقاله‌ها. | By the numbers: projects delivered, hours tracked, clients and articles. |
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
- desktop: میز کار / Desktop (role-neutral first item of the Brand menu, §11.2)
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
| `data-guide="<key>" data-guide-say="<line>"` | home and site-pages via `FrameSection guide`, on **every** box (§9 coverage map); site-shell on the footer (`footer`); foundation's `CtaBand` (`cta`, or `home_cta` when home passes it) | section narration |
| `data-guide-spot="<key>" data-guide-say` | home and site-pages via `FrameCell spot` / `spotAttrs` (§8; §9 coverage map) | hover/focus "special parts" |
| Home section `id` + `data-guide`, in this DOM order: `top`/`home_hero`, `brands`/`home_brands`, `trust`/`home_trust`, `work`/`home_work`, `services`/`home_services`, `process`/`home_process`, `stats`/`home_stats`, `latest`/`home_latest`, `kind-words`/`home_testimonials`, `contact-cta`/`home_cta` | foundation adds them to the current home sections (`brands` is added by home, which creates that section); home keeps them | guide e2e, anchors, `home.spec.ts` |
| `data-reading` | site-pages (article and lesson roots) | small 40px dock |
| `data-brand="<id>"` | home brand cells | `:has()` logo swap |
| `data-compact` | assistant engine on `.gt-guide` | compact guide mode (§10.5) |
| `data-frame-header` | foundation's `FrameHeaderCell` (always) and `FrameCell header` (custom header cells, e.g. `ArticleHeader`'s) | the cell holding a box's `h1`/`h2`; no automatic guide bubble may cover it (§10.5) |
| `data-decor` | foundation's `FrameCell decor` and every `tone="dots"` cell; placed by home and site-pages per the §9 first-box rule | decoration only; the guide's candidate B may land on it (§10.5) |
| `data-pad="none"\|"md"\|"lg"` | foundation's `FrameCell` (always) | cell padding; the rail perch moves outside the border beside `none` (§10.5) |
| `svg.px-sprite[data-state="idle"\|"walk"\|"talk"\|"wave"\|"sit"]` | foundation's `PixelAvatarSprite` (initial value); the assistant engine writes every change to this svg | the only hook of the sprite frame rules in `pixel.css` (§4.4); `#gt-guide` carries no `data-state` |
| `.px-set>[data-path-id]` | foundation's `PixelTextSet` (via `Window path=[…]`) | one path per item; consumers swap the visible one with `:has()` (§8 row 06) |
| `.os-desktop` | site layout | wallpaper, rails, guide container; `display:flow-root`, never transformed (§6.2) |
| `data-booted` | foundation's `bootInitScript`, on `html` | boot animation done for this session (§5.6) |
| `data-engine="gt-guide-engine@1"` | assistant engine, on `#gt-guide` once started | proof that the engine ran (§10.4, §12) |
| `data-a11y-demo` | foundation, only in catalog `sections/brand.tsx` and `sections/colors.tsx` | intentionally failing contrast samples, excluded by a11y.spec (§3.4) |
| `.panel-shell` | panel layout | panel variables |
| `.preset-scope` | preset previews | re-derives preset tokens (§3.1) |

### 15.2 Storage keys and events (all new, none renamed)
- `localStorage`: `gt-guide`, `gt-guide-tips`, `gt-guide-test`, `gt-motion`, `gt-guide-mod:<key>`.
- `sessionStorage`: `gt-guide-seen`, `gt-guide-greeted`, `gt-guide-idle`, `gt-boot`.
- Cookie: `gt-shell`.
- Events: `gt:guide`, `gt:guide-pref`.
- Registered CSS properties (foundation, `os-shell.css`, §5.2): `--chrome-top`, `--dock-space` (`<length>`). JS reads them with `parseFloat`.
- Engine sentinel: `gt-guide-engine@1` (§10.4).

### 15.3 Offset utilities migrated by foundation

| Location | Before → after |
|---|---|
| `article.tsx:140`, `lesson.tsx:184`, `about/page.tsx:87` | → `below-chrome` |
| `.prose-gt` headings (`globals.css` L406) | `scroll-margin-top: 6rem` → removed (D18: `html { scroll-padding-top }` alone) |
| `design-system/_components/section.tsx:22` (`DsSection`) | `scroll-mt-32 xl:scroll-mt-24` → `scroll-mt-14 xl:scroll-mt-0` (clears only the <xl sticky chip bar) |
| `islands.tsx` Toc rootMargin, `doc-toc.tsx` rootMargin | computed once: `-(parseInt(getComputedStyle(documentElement).getPropertyValue('--chrome-top'))+16)px 0px -70% 0px` |
| `settings/security/activity/page.tsx:106` | → `top-chrome`; drops `backdrop-blur` (`bg-card` opaque) |
| `settings-nav.tsx:63`, `tasks-app.tsx:181`, `invoice-editor.tsx:419`, `docs/[id]/page.tsx:168`, `doc-editor.tsx:342`, `post-editor.tsx:699` | → `below-chrome` (with the same breakpoint prefixes) |
| `design-system/_components/toc.tsx:69,75` | → `top-chrome` / `below-chrome`, plus computed rootMargin; the chip bar drops `glass` (`bg-background/95`) |
| `docs-sidebar.tsx:121` | → `below-chrome max-h-chrome` |
| `save-bar.tsx:12` | → `sticky above-dock`; drops `glass` (`bg-background/95 dark:bg-card/95`) |
| `contract-editor.tsx:387` | → `sticky above-dock`; drops `backdrop-blur` |
| `doc-editor.tsx:445` | → `bottom-[var(--dock-space)]` (keeps `z-30`, under the dock's `z-40`); drops `backdrop-blur` |
| panel `main pb-20` | removed by panel-shell (window body pads) |
| every `.gt-glow` layer (the `-top-16`/`-top-40` blobs of the hero, `PageHero`, about, contact, not-found, learn series, service detail and the home sections) | deleted by the owners named in §12 "Glow removal"; `.gt-glow` is not restyled (§3.3) |

---

## 16. File map and ownership
See `os-redesign-tracks.json` (`owns_files`) for exact ownership. Summary:
- **foundation:** tokens, brand assets, shell primitives (including `shell/appearance.tsx`, `normalize.ts`, `clock-format.ts`), frame primitives and `frame-plan`, card `variant="cell"`, `StatsCells`, `CtaBand`, i18n keys, data plumbing (brand on services, brand sync), offsets, codemods, the `components/ui` contrast fixes, print documents and share-page logos, layering of the legacy CSS, the ESLint guard, the axe devDependency, AGENTS.md.
- **site-shell:** site layout, menu bar, popovers, dock, footer, auth layout and the login/setup pages, `common`/`nav` copy.
- **home:** home page and home components, `site` copy.
- **site-pages:** every other public page, `ui.tsx`, `cards.tsx` (after foundation), article and lesson.
- **assistant:** guide layer, engine, loader, `guide` copy.
- **panel-shell:** panel layout and chrome, prefs, settings appearance, panel/settings/designSystem copy, catalog OS shell, `ui/popover.tsx`, `ui/dropdown-menu.tsx`, `ui/menubar.tsx`.
- **qa-docs:** cross-cutting e2e (perf, a11y) and docs, final cleanup.

**Ownership rules**
1. **Exclusive and complete.** Every file that must change belongs to exactly one of foundation and the five parallel tracks. A parallel track edits only its own files.
2. **Foundation's sequential sweeps.** Before the parallel phase starts, foundation may touch any file for the mechanical sweeps it is given (codemods §3.3 including the contrast leftovers it owns there, e.g. `vault/totp-code.tsx`, offsets §15.3, legacy-CSS side effects §5.1 including the six `<Markdown className="text-[15px]">` uses, the A8 `size-*` strip on all seven `LogoMark` call sites of §2 including `home/hero-diagram.tsx` and `panel/sidebar.tsx`, the `id`/`data-guide` attributes on the current home sections, import repointing for `CtaBand` (all five importers, old `CtaBand` deleted from `home/sections.tsx`, §8 row 10) and for `/about`'s `StatsStrip` → `StatsCells`, the i18n key additions of §14). After foundation merges, only the owning track edits that file.
3. **No cross-track dependency inside the parallel phase.** Anything two parallel tracks need is built by foundation (D22). Tests in a parallel track target only foundation contracts (§15) or the track's own markup.
   - Chrome geometry is read from the registered `--chrome-top`/`--dock-space` variables, never from `.os-menubar` or `.os-dock`. Those are site-shell's markup, and until site-shell merges the old 64px header sits under a 32px `--menubar-h` (risk 10).
   - Guide entry points are split the same way: site-shell.spec proves that its menu rows close their popover and dispatch `gt:guide`, and guide.spec fires `gt:guide` itself with `page.evaluate`.
   - CI runs every `e2e/*.spec.ts` on every PR (§12), so a spec that reads another parallel track's markup would fail until that track merges.
4. **Frozen shared exports.** A parallel track may import, but must not rename, remove or change the signature of, these exports from another track's file (verified with `git grep` against today's imports, so none breaks only after merge):
   - site-pages' files, imported by home, site-shell or foundation:
     - `ui.tsx`: `ArrowLink`, `Container`, `fmtNum`, `fmtDate`, `siteFmt`, `Chip`, and `SectionHeading` (home imports it until its rewrite drops it);
     - `cards.tsx`: `PostCard`, `WorkCard`, `SeriesCard`, `TestimonialCard` and their `variant="cell"` output, which foundation defines and site-pages must not restyle;
     - `skeletons.tsx`: `CardSkeleton` (home);
     - `service-icon.tsx`: `ServiceIcon` (home) and `serviceIconNames` (foundation's `panel/content/_components/editor-data.ts`);
     - `seo.ts`: `pageMetadata` (home);
     - `json-ld.tsx`: `JsonLd`, `organizationLd`, `personLd`, `websiteLd` and the `Thing` type (site-shell's `(site)/layout.tsx`);
     - `social-links.tsx`: `SocialLinks`, including its rendered size (one row of 36px `size-9` items), because site-shell's footer skeleton is `h-9` (§7.5).
   - site-shell's files, imported by site-pages: `useSwitchHref` (`header-client.tsx`), `siteSections`/`staticSitePaths` (`site-header.tsx`), and `SetAlternates`/`AlternatesProvider`/`useAlternates` (`alternates.tsx`; `about`, `blog/[slug]`, `services/[slug]`, `work/[slug]` and `lesson.tsx` use `SetAlternates`).
   - General rule: before deleting or renaming any export, the owning track runs `git grep -n "<name>" -- src`; an export that another track's file imports stays until qa-docs, which deletes exports left unused after all merges. Internal restyling of anything else is free.
5. **qa-docs** runs alone after all merges. It owns the files listed for it and may make minimal integration fixes anywhere, each as a separate commit naming the owner track.
6. A shared primitive that turns out wrong during the parallel phase is not forked: the track leaves a `// TODO(foundation): …` note and lists it in its PR; qa-docs fixes it.

---

## 17. Testing and QA

**Unit tests** (all run in `pnpm check`; owner in brackets)
- `pixel-font`: new glyphs, `toPaths` covers all cells exactly once, one `d` per tone, 34×18 for TEAM/STUDIO/CODE. [foundation]
- `pixel-icons` (exactly the 13 names of §4.3, 12×12, allowed characters, empty outer ring, ≤2 tones), `pixel-avatar` (base and parts fit, one tone per part, every pose composes, idle equals the reference frame, head crop). [foundation]
- `brands`: `isValidSuffix`, `brandOf` fallback, every brand's logo is 34×18. [foundation]
- `frame-plan`: `fillerPlan` classes; `packRows(spans, cols, bp)` for every `FrameCols` value (track map of §6.1, `row2` included) and every layout listed in §8 (work 0–3 items, latest with and without a course, services 0–5, kind-words testimonials 0–6 under their `full` header, the process header row stacked on `2-1`), footer row 1 (`cols 4`), `StatsCells` (`cols 4`) and `CtaBand`, with `holes === 0` at md and lg and the expected `trailing`. [foundation]
- `page-frame-plan` (`src/components/site/page-frame-plan.test.ts`): every grid site-pages renders (§6.1 list: `PageHero` row, `/work` 0–12, `/blog` featured plus 0–12, `/learn`, each `/services` brand box with 0–6 services or the ask cell, process, values, detail headers and bodies, `/contact`, 404), `holes === 0` at md and lg, importing foundation's `packRows`. [site-pages]
- `shell/match` (active path), `shell/shortcuts`, `shell/normalize` (Persian normalisation, §5.6), `shell/clock-format` (fa and en strings for a fixed instant and zone, assembled from typed parts with no comma and no «ساعت»; `CLOCK_LONGEST[l]` is at least as long as every day of 2026 at 23:59 Tehran; `msToNextMinute`). [foundation]
- `design-tokens`: yellow root, green block, white foreground on 5 presets, `chromeTokens`, the status inks, and `.preset-scope` covering every `var(--primary…)`-derived variable (§3.1). [foundation]
- `brand-form.test.ts`: no fa message contains «گود تیم» or «گود این» (D2). [foundation]
- `content/service.test.ts`: service `meta.brand` sync across `translationKey` siblings: set, cleared with `""`, absent, and a non-service sibling (§2). [foundation]
- `guide/geometry`: roof versus rail perch and the `pad=none` outside/no perch; candidate A's anchor (inline-end edge = sprite inline-end + 8px, extending toward inline-start) in LTR and RTL; A/B/C fit tests; B rejected over a non-`[data-decor]` cell or a `[data-frame-header]` rect (`span=full` header); first box: automatic A, else clear B, else badge; greeting: A, else clear B, else C; "no automatic bubble"; clamping (§10.5). [assistant]
- `panel-prefs`: cookie round-trip, invalid values, init-script regex. [panel-shell]

**e2e** (Playwright, `e2e/*.spec.ts`; CI runs all of them against `pnpm start` with seed data)
- `site-shell.spec.ts` (site-shell):
  - menu bar landmark; brand menu opens on click and closes on Esc; its trigger shows the open background (`:has(+ :popover-open)`); at 390×844 (label hidden) and 1440×900 the trigger's accessible name is `common.appName`
  - language links have `hreflang` and cause a full load to `/en`; `/login` has the same language links and no Radix menu
  - dock Home has `aria-current` on `/`
  - Ctrl+K opens Spotlight and focuses `input[name=q]`; typing «علي» keeps the row whose label contains «علی» visible (normalisation wired)
  - Control Center Reduce motion sets `html[data-motion]`, which survives a reload
  - the availability and clock holes cause no layout shift: a `PerformanceObserver` on `/` at 1440×900 records a layout-shift sum of 0 inside `header.os-menubar`, run twice with `page.clock.setFixedTime` on foundation's `CLOCK_LONGEST.fa` (on `/`) and `CLOCK_LONGEST.en` (on `/en`); in both runs `.os-clock` has the same `inline-size` as `ClockSkeleton` and `scrollWidth ≤ clientWidth` (the longest date fits)
  - no horizontal overflow at 375px
  - `/en` mirrors to LTR
  - `header.os-menubar`'s bottom edge equals the computed `--chrome-top` (±1px) at 1440×900 and 390×844. This ties the variable that site-pages.spec and guide.spec measure against to the real bar.
  - the `#mb-guide` "What's this part?" row (1440×900) and the Control Center row (390×844) close their popover and dispatch `gt:guide` with `{type: "explain"}`, recorded by a `window` listener added with `page.evaluate`
  - the Control Center trigger's accessible name is `common.controlCenter`
  - boot: 1.2s after `load`, `html` has `data-booted`. After a soft navigation to `/login` (the dock's Sign in tile), `.os-menubar` has `animation-name: none`.
- `home.spec.ts` (home):
  - `/` and `/en` have exactly the ten `main section.frame-box` ids of §15.1 in order (the footer is a `<footer class="frame-box">` outside `main` and is not counted, §7.5), each with the listed `data-guide` and a non-empty `data-guide-say`
  - exactly one `h1`; every box has an accessible name (`aria-labelledby` or `aria-label`); `#top` is `section.frame-box[data-first]` (the reserved roof guide.spec's greeting case waits for)
  - hovering the Studio brand cell shows the STUDIO suffix of the big logo (`.gi-sfx[data-sfx=STUDIO]` has opacity 1); the brand cells' `data-brand` order is `team`, `studio`, `code` (registry order, §2)
  - at 1440×900 the hero's first row ends at inline-end in a `[data-decor]` cell (first-box rule, §9)
  - in the process box, checking the PROGRESS tab shows only `.px-set>[data-path-id=PROGRESS]` in the window bar
  - with `reducedMotion: "reduce"` the hero cycle shows TEAM only and the marquee has `animation-name: none`
- `site-pages.spec.ts` (site-pages):
  - chrome geometry comes only from `chromeTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--chrome-top"))`, never from `.os-menubar`, which site-shell builds in parallel (§16 rule 3)
  - `/services#studio` and `/services#code` (fa and en): after load, the target box's top is ≥ `chromeTop` and ≤ `chromeTop + 24` (anchors clear the bar through `scroll-padding-top` alone)
  - `/services` has boxes with ids `team`, `studio`, `code`, in that order (registry order, §2)
  - first-box rule (§9): at 1440×900, on `/work`, `/services`, `/blog`, `/learn`, a seed series, `/about`, `/contact`, a seed case study, a seed service, a seed post, a seed lesson and `/does-not-exist`, the first `main section.frame-box` has `data-first` and a `[data-decor]` cell whose inline-end edge equals the box's inline-end border (±1px), whose top equals the first row's top, which is at least 312×200px, and which intersects no `[data-frame-header]` cell
  - no `.gt-glow` element exists on any of those pages
  - on a seed blog post at 1440×900 the TOC is sticky below the chrome (its top ≥ `chromeTop` after scrolling) and the root has `data-reading`
  - every `main section.frame-box` on `/services`, `/about` and a seed blog post has a `data-guide` key and a non-empty `data-guide-say` (§9 coverage map), and each `/services` brand header cell has `data-guide-spot`
  - `/does-not-exist` returns 404 and renders the alert box with a Home link
- `guide.spec.ts` (assistant), with `gt-guide-test=1` set by `addInitScript`, at 1440×900 (desktop mode):
  - greeting text equals the formatted greeting and the sprite stands on the first box's roof (sprite bottom within 2px of the box top). The sprite's top is ≥ the `.os-desktop` top, and the first box's top is ≥ `.os-desktop` top + 56 (the roof is inside the clipped layer, §6.2).
  - `--chrome-top` and `--dock-space` read from `getComputedStyle(document.documentElement)` parse to finite px numbers (registered properties, §5.2), and `#gt-guide` has `data-engine="gt-guide-engine@1"` once started
  - scrolling `[data-guide=home_work]` into the activation band shows the bubble with its `data-guide-say`, and the bubble's bottom is above that box's top (candidate A)
  - scrolling so the `home_work` box's top sits 40px below the viewport top (roof hidden under the menu bar, box still in the band) moves the sprite to the rail perch with the badge and opens no bubble
  - Hide persists across a reload (layer `hidden`). While hidden, `page.evaluate(() => dispatchEvent(new CustomEvent("gt:guide", { detail: { type: "explain" } })))` still opens a visible bubble, and the layer hides again after Esc. The spec never clicks site-shell's menu bar; site-shell.spec covers that click.
  - reduced motion never sets `data-state=walk` on `#gt-guide svg.px-sprite` (the only element that carries the state; `#gt-guide` has no `data-state`)
  - first box speaks (owner wish): with `gt-guide-greeted=1` already in sessionStorage, at `scrollY = 0` the `home_hero` line opens after the dwell inside the hero's `[data-decor]` cell rect (candidate B) and `/#home_hero` is added to `gt-guide-seen`; this case uses the same skip condition as the greeting case
  - the sprite button toggles `aria-expanded`; Esc closes and returns focus
  - at 390×844 (compact): the one-time greeting's text equals the formatted `greetingCompact` (not `greeting`); after it closes, the sprite is fixed above the dock (its rect does not move while scrolling) and no bubble opens on activation
  - These target only the foundation contract of §15.1, so they run before and after the home rewrite. The one exception is the greeting case, which needs the reserved roof that only the rewritten hero has (`FrameSection first`). It calls `test.skip(!(await page.locator("section#top.frame-box[data-first]").count()), "needs the home rewrite's reserved roof")`. home.spec asserts that `#top` is `section.frame-box[data-first]`, and qa-docs checks that guide.spec reports no skipped test after all merges.
- `panel-shell.spec.ts` (panel-shell):
  - owner dock has 16 `[data-dock-app]` (the mark tile plus 15 group items; the dashboard appears once), member 9, client 5
  - ⌘K opens the palette
  - keyboard into the menu bar, ArrowRight, Enter opens a menu, an item navigates; the Brand menu's first item reads `panel.desktop` for both owner and client
  - the dock-size cookie gives `html[data-dock-size]` before hydration
  - with a running timer, the Time tile's accessible name contains the running count
  - with `gt-shell=48.1.1.0` (auto-hide on): at 1440×900 the dock is off-screen until hovered; at 390×844 the tab bar stays visible and in place
  - at 1280×720 the last vault button is clickable
- `perf.spec.ts` (qa-docs): see §12 "Verification" for the blocking and `@perf`-tagged checks.
- `a11y.spec.ts` (qa-docs): axe `color-contrast` in light mode on the routes of §3.4, excluding `[data-a11y-demo]`.
- `vault.spec.ts` unchanged and green.

**Shots:** `node scripts/shots.mjs / /work /services /blog /about /contact /login --dark --mobile`, plus `--login owner@goodteam.local:goodteam-demo-pass /panel /panel/time /panel/settings/appearance /panel/vault`.

---

## 18. Deferred (phase 2)
- `/studio` and `/code` brand landing routes (with `loading.tsx` and `staticSitePaths`).
- A `settings.brands` and `settings.guide` owner override, read through cached `getPublicBrands()`/`getPublicGuide()` inside existing Suspense holes.
- A panel window ViewTransition crossfade, only after an INP trace review.
- **Compact "peek chip"** (if the owner wants more guide presence on phones, D21): on each new section, a one-line, `aria-hidden`, non-interactive chip (≤40 characters + "…", 32px tall, max 70vw) above the pinned sprite for 2.5s; tap opens the full bubble.
- Per-module help pages for the panel guide (a served help route or MDX pages), then a "Learn more" link in the panel bubble.
- Persian pixel digits.
- Pixel module icons for the panel dock.
- Server-side Persian normalisation of `?q=` blog search.

---

## 19. Risks
1. **Persian brand form** awaits the owner (D2). The stored `profile.brandName` must be edited in production.
2. **Contrast regressions** that the codemods miss (dynamic class strings, inline styles, print docs, charts). Mitigation: the ESLint guard (foundation, `eslint.config.mjs`: `no-restricted-syntax` with `Literal[value=/…/]` and `TemplateElement[value.raw=/…/]` selectors using `(?<!dark:(?:[\w-]+:)*)\b(?:(?!dark:)[\w-]+:)*text-(?:primary|warning|success|info)(?![\w-])`, which forbids the light-mode bright text tokens, bare or with `/alpha`, under any variant except `dark:`; bright hits kept on fixed dark surfaces use the arbitrary-value form `text-[color:var(--…)]` of §3.3, never `eslint-disable`), the automated axe `color-contrast` spec on seven routes, and the manual non-text pass of the catalog against the §3.4 state table.
3. **Browser gaps**: anchor positioning, scroll timelines, `@starting-style`, `:has()` magnification. All are progressive with static fallbacks; QA on Safari 18+ and Firefox ESR.
4. **Docks covering reading content.** Mitigations: `--dock-space`, `scroll-padding-bottom`, the 40px reading dock, the solid mobile tab bar.
5. **Guide perceived as noisy.** Mitigations: 600ms dwell, once per session, gap placement, persistent mute, quiet panel. Tune with owner feedback.
6. **Panel sidebar removal changes muscle memory.** Mitigations: group menus, ⌘K, Launchpad, focus labels. Run `vault.spec` early.
7. **Cache Components.** A missed Suspense around `usePathname`, the clock or the profile fails `pnpm build`. Run it every commit.
8. **`content-visibility` and sticky.** Never wrap sticky asides in `.frame-cv`. Intrinsic sizes are per section.
9. **Fractional DPR** can make pixel cells uneven (accepted); the integer-cell rule minimises it.
10. **Interim misalignment.** Until site-shell or panel-shell land, the old 64/72px headers sit under the new `--chrome-top` values; sticky offsets look off by a few px in their worktrees. Don't "fix" offsets locally. Specs never measure against the old header (§16 rule 3).
11. **Seed demo service `svc-design`** is demo-only; real Studio services come from the owner.
12. **Owner wish versus compact guide (D21). Owner sign-off required.** Below 1024px and on any touch device (most likely the majority of fa traffic) the guide does **not** walk to each section: it stays pinned above the dock, hops and shows a badge, opens no automatic bubble (except the one-time greeting) and has no spots. Reason: a bubble on every section covers a large share of a phone screen. Alternative ready in §18: the one-line peek chip.
13. **Sprite likeness and voice. Owner sign-off required.** The 16×16 sprite (yellow hoodie, D20) is a generic "virtual me", not a portrait, and the guide copy speaks in the owner's first person («من…», "I write and film…"). The owner confirms both, or supplies a likeness brief and a voice (first person singular, or "we").
14. **Layering the legacy CSS (§5.1)** changes cascade order: utilities on the same element now beat `.gt-*` and `.prose-gt`. The verified side effects (the `.gt-lift` shadow and every dead size class on a `.prose-gt` element, including the six `<Markdown className="text-[15px]">` uses) are handled in foundation's theme commit (commit 2); `.gt-glow` is deliberately left unrestyled (§3.3). Foundation compares `shots.mjs` captures of `/blog/<slug>`, `/panel/docs/<id>`, `/panel/contracts/<id>`, `/panel/projects/<id>`, `/p/<token>` and `/panel/design-system` before and after.
15. **Guide placement on unusual layouts.** Automatic bubbles open above a visible roof (A), and on the page's first box also inside its decorative end cell (a clear B, §10.5). Without that exception the first box of every page could never speak on desktop: its roof sits at `chromeTop + 56` even at `scrollY = 0`, where A never fits. The §9 first-box rule gives every public page's first box a `[data-decor]` end cell at ≥1024px (site-pages.spec and home.spec check it, geometry.test covers the A → clear B → badge chain). A page whose other boxes are all taller than the viewport would still mostly show the badge. Acceptable (lines stay one click away); qa-docs reports any page where the first box does not speak at `scrollY = 0`, or where fewer than half the sections speak during a normal scroll. Every box, the footer and `CtaBand` carry a key (§9 "Guide coverage"), so this check measures placement, not missing keys.

---

## 20. Acceptance criteria

Each criterion has an id (`A1`…) and an owner track; the owner proves it in its PR with the "VERIFY" and "TESTS" steps of its brief in `os-redesign-tracks.json`, and qa-docs re-checks all of them after the merge.

### Brand and tokens
- [ ] **A1** (foundation) fa `appName` is «گودین تیم» and en is "Good In Team" everywhere: chrome, `<title>` template, manifest, OG, feed, MCP and OpenAPI titles, ICS PRODID, `Dockerfile`/`.env.example` headings, and the seed copy of §2 (after `pnpm db:reset && pnpm db:seed`, `/about` shows the new brand). `brand-form.test.ts` passes.
- [ ] **A2** (foundation) No identifier from the never-renamed list changed. `git grep` shows `gt_session`, the `gt_` token prefix, `good-team-vault-backup`, `goodteam-data`, `SERVER_INFO name 'good-team'` and the seed slug `good-team-site` intact.
- [ ] **A3** (foundation) Default preset is yellow on first paint with no JS. A saved `gt-preset=green` still shows green.
- [ ] **A4** (foundation) `design-tokens.test.ts` passes. The 5 non-orange, non-yellow presets have `--primary-foreground:#ffffff`. `.preset-scope` redeclares every `var(--primary…)`-derived token, so a purple preview shows purple ink, hover and ring in both modes.
- [ ] **A5** (foundation) No light-mode `text-primary`, `hover:text-primary`, `hover:bg-primary-dark`, `text-warning`, `text-success`, `text-info` (bare or with `/alpha`) or `ring-ring/NN` focus ring remains in `src/**/*.tsx`; the ESLint guard fails on a reintroduced one.
- [ ] **A6** (qa-docs; tokens by foundation) `e2e/a11y.spec.ts`: axe reports no `color-contrast` violation in light mode on `/`, `/en`, `/services`, `/login`, `/panel`, `/panel/design-system` and `/panel/settings/appearance`. The non-text states match the §3.4 table in the catalog. Only the intentional samples inside `[data-a11y-demo]` (catalog `brand.tsx`/`colors.tsx`) are excluded.
- [ ] **A7** (foundation) Changing a service's brand on one locale row changes it on its `translationKey` sibling (`content/service.test.ts`); the seed maps web/mobile/ai → code, consult → team, design → studio on both rows. Choosing "None" in the editor clears the brand on both rows.

### Pixel art
- [ ] **A8** (foundation) `PixelLogo` renders ≤6 SVG children. Every pixel asset renders at integer px per cell at every breakpoint; no `LogoMark`/`Logo`/`PixelMark`/`PixelLogo` call site carries a `size-*`/`w-*`/`h-*` class (the `git grep` of §2 is empty from foundation's merge on: its sweep strips all seven call sites, `home/hero-diagram.tsx` and `panel/sidebar.tsx` included). The avatar paints with the literal `AVATAR_FILLS` in both modes, and the CTA avatar stands on a paper tile (§4.2, §8 row 10).
- [ ] **A9** (foundation) The favicon, OG images and every `LogoMark`/`Logo` call site show the pixel brand. Printed invoices and contracts (print preview in **dark** mode) show white paper, light brand tones and no OS chrome.
- [ ] **A10** (qa-docs; allocations by site-shell, assistant and home) `/` has ≤260 pixel-art elements (`svg.px-art, svg.px-art *`), within the per-owner allocation of §4.2.

### Frame
- [ ] **A11** (home, site-pages; the footer box: site-shell) Every public page section is a framed box on the 1200px column. Rails line up with box borders at 375, 768, 1024, 1280 and 1440px in both directions, and the wallpaper starts right under the menu bar (`.os-desktop` is `display:flow-root`). Every box, the footer included, carries the `data-guide` key of the §9 coverage map. Stacked grids inside a box keep the hairline between them (§6.2), and no `.gt-glow` layer remains (§12 "Glow removal").
- [ ] **A12** (foundation) The L-frame and the ink corner cell sit at inline-start (right in fa). Ringed markers sit at the other corners and cell intersections (md+).
- [ ] **A13** (home, site-pages; `packRows` by foundation) No grey hole appears in any grid row: `packRows(spans, cols, bp)` handles every `FrameGrid` shape; `frame-plan.test.ts` (foundation: home, footer, `StatsCells`, `CtaBand`) and `page-frame-plan.test.ts` (site-pages: every other page) prove `holes === 0` for every listed layout, and fillers complete the grids at md and lg.
- [ ] **A14** (foundation) Strip lights light up when a box is centred (scroll-timeline), and are static under reduced motion.
- [ ] **A15** (foundation) The legacy `.prose-gt` and site rules are layered: a `@layer components` rule in a partial overrides them (verified with the trust marquee pause), and `shots.mjs` of a blog post, a doc, a contract, a project (`/panel/projects/<id>`), a share page (`/p/<token>`) and the catalog are unchanged by the layering commit: every dead size class on a `.prose-gt` element, the six `<Markdown className="text-[15px]">` uses included, is deleted, and `.gt-glow` is not restyled.
- [ ] **A16** (qa-docs; removals by each owner) Exactly two blurred surfaces on `/` at 1440px (`.os-menubar` and `.os-dock-list::before`), counted with `getComputedStyle` on elements **and** `::before`; after all merges, `backdrop-blur`/`glass` remain only in `ui/dialog.tsx` and `ui/chart.tsx`.

### Site shell
- [ ] **A17** (site-shell) The site menu bar has brand, links, availability, virtual-me extra, Spotlight, language, theme, Control Center and clock as specified, with availability and clock in two separate Suspense holes whose fallbacks have the final widths (layout-shift sum 0 inside the bar). The clock has a fixed `inline-size` that fits the longest date (`CLOCK_LONGEST`, checked in fa and en with a fixed page clock). The brand trigger's accessible name is `appName` at every width. It is 32px on desktop with fine pointers and 44px on mobile, and mirrors in fa.
- [ ] **A18** (site-shell) No Radix DropdownMenu, Tooltip or sonner code loads on any public route, `(auth)` included (the perf.spec string check passes). Public first-load JS is ≤ baseline.
- [ ] **A19** (site-shell) The locale switch is a plain `<a hrefLang>` doing a full page load, on the site and on `/login` and `/setup`.
- [ ] **A20** (site-shell) Dock magnification works with a mouse in LTR and RTL. It is off for touch and reduced motion. The active dot and `aria-current` are correct. The launch bounce appears on slow navigations. Dock label bubbles use 13px (en) / 14px (fa); tab-bar labels 11px / 12px.
- [ ] **A21** (site-shell) The mobile tab bar has Home, Work, Services, Contact and More; every tile icon fits its 28px tile. More opens the Launchpad. Popovers close on navigation. An open menu's trigger shows the open background. Control Center and Launchpad offer "What's this part?" and "Tour", and every guide row closes its popover before dispatching. The icon-only Control Center trigger is named `common.controlCenter`.
- [ ] **A22** (site-shell; helper by foundation) Ctrl/⌘K opens Spotlight. The quick-link filter matches «ي» typed for «ی» (`normalize.test.ts` and the e2e). Enter goes to `/blog?q=`.
- [ ] **A23** (foundation) The boot animation plays once per session and never touches the `<h1>`. It does not replay after a soft navigation that mounts another menu bar or dock (site → `/login` → `/panel`), because `data-booted` is set 1s after the first `load`.
- [ ] **A24** (site-shell) `/login` and `/setup` show the wallpaper, a login-screen menu bar with language and theme, and a `Window` with the correct path (`LOGIN` / `SETUP`); `#email`, `#password`, the submit button and the `/panel` redirect still work (`shots.mjs --login`, `vault.spec`).

### Home
- [ ] **A25** (home) Home has 10 framed sections in the specified order with the §15.1 ids and `data-guide` keys (`home.spec.ts`), all existing queries and same-size skeletons. CLS ≤0.01 under 4× throttle.
- [ ] **A26** (home) The hero hub logo cycles TEAM→STUDIO→CODE→TEAM once in ≤4.2s (static under reduced motion). The brand-family logo swaps suffix on hover/focus of brand cells.
- [ ] **A27** (home) The hero diagram has no infinite animation (no dash, float or orbit spin); packets stop after 6 iterations; no home file contains `backdrop-blur`; no text sits on a `tone=dots` cell.

### Guide
- [ ] **A28** (assistant) It loads after `load` + idle and fetches nothing. Engine chunk ≤6KB gz. Automatic mode does not load when muted, under Save-Data, or under webdriver without the test flag; perf.spec proves the engine (identified by the `gt-guide-engine@1` sentinel) **is** requested after `load` with the flag and never with `gt-guide=off`.
- [ ] **A29** (assistant) In desktop mode it speaks each section once per session after a dwell, **the first box of every page included** (A, else a clear B inside its `[data-decor]` cell, §10.5 and the §9 first-box rule). The sprite never covers cell content (roof perch in the gap; rail perch inside the cell padding, or outside the border beside a `pad=none` cell, or no perch). Other automatic bubbles open only above a visible roof; B opens only when it lies inside a `[data-decor]` cell and intersects no `[data-frame-header]` cell; explicit bubbles follow candidates A→clear B→C; no automatic bubble covers a header cell at ≥1024px. Candidate A's inline-end edge is 8px beyond the sprite's, and the bubble extends toward inline-start. Sprite frames switch through `data-state` on `svg.px-sprite`. It walks, hops or drops correctly in LTR and RTL. At 1440×900 the greeting sprite lies inside `.os-desktop` and is painted, and placement uses finite `--chrome-top`/`--dock-space` values.
- [ ] **A30** (assistant) In compact mode (<1024px or coarse pointer) the sprite stays fixed above the dock while the page scrolls (no translated wrapper), hops with a badge, and opens bubbles only on tap (plus the one-time greeting, which uses `greetingCompact` and never promises automatic explanations).
- [ ] **A31** (assistant) The sprite is a button. The live region only speaks explicit actions. Tour focus moves only to Next. Esc closes. Mute persists and is reachable by keyboard; "What's this part?" and "Tour" still work while muted, without un-muting, and below 1024px they are reachable from Control Center and Launchpad. The compact sprite renders at 2px cells.
- [ ] **A32** (assistant) Narration exists only in `data-guide-say` attributes; there is no sr-only narration text; every line paraphrases visible copy (the PR lists each key's visible source).

### Panel
- [ ] **A33** (panel-shell) The panel shows menu bar, window and role dock. Owner sees 16 dock apps, member 9, client 5 (the mark tile counts, `groupOverview` is never rendered as a group, so the dashboard appears once), plus Me and View site. The client never sees staff items.
- [ ] **A34** (panel-shell) Menu bar menus are fully keyboard-operable (Radix Menubar) and mirror in fa. ⌘K works on a Persian layout. The Brand menu is role-neutral (`panel.desktop` first).
- [ ] **A35** (panel-shell) `gt-shell` prefs apply before paint with no flash. Auto-hide, size and wide work and persist. Auto-hide applies only at ≥1024px; the tab bar never hides. `gt-sidebar-collapsed` is expired.
- [ ] **A36** (panel-shell; offsets by foundation) SaveBar, contract action bar, doc-editor mobile bar and toasts sit above the dock. `vault.spec.ts` passes at 1280×720.
- [ ] **A37** (panel-shell) All 56 `loading.tsx` files exist. There is a skip link in the panel. No always-mounted `role=dialog`.
- [ ] **A38** (panel-shell) The Me tile is named by its visible label (`guide.name`); its bubble opens above the tile at ≥1024px and centred above the tab bar below 1024px ("About {module}"); the Time tile's accessible name includes the running count when a timer runs.
- [ ] **A39** (panel-shell) Settings → Appearance swatch previews and the catalog sample render with `PRESET_SCOPE_CLASS`, showing each preset's own ink and ring.

### Repo-wide
- [ ] **A40** (every track for its files; qa-docs overall) `pnpm check` and `pnpm build` pass. `shots.mjs` reports 0 console errors and 0 responses ≥400 (fa/en, dark, mobile, panel, `/login`).
- [ ] **A41** (each spec's owner; qa-docs overall) The e2e suites `site-shell`, `home`, `site-pages`, `guide`, `panel-shell`, `perf` (blocking part), `a11y` and `vault` pass in CI.
- [ ] **A42** (foundation) AGENTS.md documents `components/shell/`, the `src/app/styles/*` partials and their owners, the `below-chrome`/`top-chrome`/`above-dock` utilities instead of hard-coded `top-*`/`bottom-*`, the frame rule that replaces "rounded-2xl cards" on the public site, `data-guide`/`guideAttrs`/`spotAttrs` authoring with the paraphrase rule, and "no blur outside the menu bar and dock".
- [ ] **A43** (qa-docs; module docs by their owners) Docs are updated: `brand.md`, `os-shell.md`, `design-system.md`, `architecture.md`, `modules/settings.md`, `modules/content.md`, `HANDOFF.md` (deployment checklist: brandName, brand mapping; owner sign-off on the Persian name, the compact-guide deviation, the sprite likeness and the copy voice). Catalog Brand and OS shell sections are live.
