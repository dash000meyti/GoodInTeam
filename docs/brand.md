# Brand

The brand family, the pixel assets and the rules for using them. The full rationale is in
[`design/os-redesign.md`](design/os-redesign.md) §2 and §4; the live catalog is
**Panel → Design system → Brand** (`/panel/design-system#brand`).

## Naming

| Thing                            | en             | fa            | Pixel suffix |
| -------------------------------- | -------------- | ------------- | ------------ |
| Master brand (team, site, panel) | Good In Team   | گودین تیم     | `TEAM`       |
| Design services                  | Good In Studio | گودین استودیو | `STUDIO`     |
| Engineering services             | Good In Code   | گودین کد      | `CODE`       |

- "Good In" never changes; the second word does.
- The canonical mark is the **Latin pixel logo**; Persian text stays in Vazirmatn next to it.
- Latin brand text inside a Persian sentence is wrapped in `<span lang="en" dir="ltr">`.
  Attribute strings (`data-guide-say`) use the Persian form.

### Persian name — approved by the owner (2026-11-17)

«گودین تیم» follows the «لینکدین» pattern. «گود این» (with a space) reads as "the pit of this"
and is rejected; the alternatives are «گوداین تیم» or Latin-only. `src/i18n/messages/brand-form.test.ts`
fails if an fa message contains «گود تیم» or «گود این».

**Changing the Persian form** is not a one-key edit. Run `git grep -n "گودین"` and replace it in
exactly these touchpoints, then update the guard test:

- i18n: `common.appName`; `nav.brandTeam`, `brandStudio`, `brandCode`, `brandMenu`;
  `site.metaTitle`, `brandsEyebrow`, `brandsSubtitle`; `settings.preset_yellow`; every `guide`
  line that names the brand (`greetingNoName`, `greetingCompactNoName`, `home_brands`,
  `home_services`, `services_brand_*`, `panel_content`…); `content.serviceBrand`;
  `designSystem` samples.
- Code: the `settingsSchemas.profile.brandName` default (`server/modules/settings/service.ts`);
  JSON-LD `alternateName` (`components/site/json-ld.tsx`).
- Data: `scripts/seed.ts`, and the stored `settings.profile.brandName` in production
  (Settings → Profile). Changing the zod default only affects empty installs.

### Never renamed

`gt_session`, the `gt_` token prefix, every `gt-*` cookie/storage key and `gt_cal_hidden`,
`good-team-vault-backup`, the calendar UID host `goodteam`, the MCP `SERVER_INFO.name` and
realm `good-team`, the `goodteam-data` volume, `/srv/goodteam`, `goodteam-backup-*`, the package
name `good-team`, demo credentials `@goodteam.local` / `goodteam-demo-pass`, test domains
`goodteam.ir`, invoice prefix `GT-` and the seed slug `good-team-site`. Renaming any of them
logs users out, breaks tokens, backups, calendars or deployments.

## Registry (`src/components/brand/brands.ts`)

```ts
brands = [
  {
    id: "team",
    suffix: "TEAM",
    label: "brandTeam",
    tagline: "brandTeamTagline",
    href: "/about",
    icon: "about",
    master: true,
  },
  {
    id: "studio",
    suffix: "STUDIO",
    label: "brandStudio",
    tagline: "brandStudioTagline",
    href: "/studio",
    icon: "studio",
  },
  {
    id: "code",
    suffix: "CODE",
    label: "brandCode",
    tagline: "brandCodeTagline",
    href: "/code",
    icon: "code",
  },
];
```

- **Registry order is the only display order** (team, studio, code) — home brand cells,
  `/services` boxes, the footer brand list. A different order is a change to this array.
- `label` keys live in `nav`, `tagline` keys in `site`. `brandOf(meta)` reads a service's brand
  and falls back to `team`.
- **Pages**: `href` is where a brand lives. The master brand's is `/about`; every sub-brand
  (`subBrandIds`, `SubBrandId`) has its own landing page at `/studio`, `/code` (the shared
  `BrandPage`; see [modules/content.md](modules/content.md#public-pages)), and every Studio/Code
  entry point links there. A sub-brand's page needs `site.brandXIntro` (mapped in `brandIntro`),
  `guide.brand_x` and `guide.brand_services_x` (typed) and an `x/` route folder like `studio/`.
- **Suffix rule**: `isValidSuffix(s)` — the suffix is already in the pixel alphabet
  (`toPixelText(s) === s`, upper case) and at most **31 cells** wide, which keeps every logo at
  34×18 cells. Validate with this function (zod `refine`), never a length regex.
- **Adding a brand** (e.g. Good In X): a registry row, `nav.brandX`, `site.brandXTagline`,
  `guide.services_brand_x` (typed: a missing line fails `pnpm check`), a 12×12 icon, and the
  services that point to it.

Services point to a brand through `posts.meta.brand` (editor: Content → service → "Good In
brand"); see [modules/content.md](modules/content.md#services-and-brands).

## Pixel assets (`src/components/brand`)

All pixel art is inline SVG with **one `<path>` per tone** (`toPaths` in `pixel-font.ts`), root
`<svg class="px-art">`, `shape-rendering: crispEdges`.

| Component                           | Grid   | Elements            | Notes                                                              |
| ----------------------------------- | ------ | ------------------- | ------------------------------------------------------------------ |
| `PixelMark`                         | 11×11  | 6                   | the old G·I mark: kept in code, no longer shown (see `LogoMark`)   |
| `PixelLogo suffix`                  | 34×18  | 7 (6 without paper) | framed GOOD IN / SUFFIX                                            |
| `PixelLogoCycle`                    | 34×18  | 12                  | TEAM → STUDIO → CODE → TEAM **once** in 4.2s (`data-play`)         |
| `PixelLogoSwap`                     | 34×18  | 12                  | all suffixes; consumers swap with `:has()` on `.gi-sfx[data-sfx]`  |
| `PixelText text`                    | 7 tall | 2                   | Latin + Persian digits, aria-hidden, LTR                           |
| `PixelTextSet items`                | 7 tall | 1 + n               | one svg, one `path[data-path-id]` per item, first shown            |
| `PixelIcon name mirror?`            | 12×12  | ≤3                  | 13 site + 17 panel icons; only `arrow` is directional (`mirror`)   |
| `PixelAvatar pose part`             | 16×16  | ≤5 (head 5)         | static GoodInBot; `part="head"` = the 10×10 `AVATAR_ICON`          |
| `PixelAvatarSprite state`           | 16×16  | 13                  | guide sprite; frames keyed on its own `svg.px-sprite[data-state]`  |
| `LogoMark cell` / `Logo label cell` | 10×10  | 5                   | the mark = the character's icon (`AVATAR_ICON`) / `PixelLogo TEAM` |

### Integer cells only

Size comes **only** from `cell` (`1|2|3|4|6|8|10|12` → the literal class `[--cell:Npx]`) or an
inherited `--cell` (no class is emitted without `cell`; the guide sprite relies on that).
`pixel.css` sizes `.px-art` as `--px-w × --cell` by `--px-h × --cell`. Responsive sizes add a
cell class: `<LogoMark cell={2} className="md:[--cell:3px]" />`. **Never** put
`size-*`/`w-*`/`h-*` on a `LogoMark`/`Logo`/`PixelMark`/`PixelLogo` (utilities beat `.px-art`
and give fractional cells); `git grep -nE "<(LogoMark|Logo|PixelMark|PixelLogo)[^>]*className=\"[^\"]*\b(size|w|h)-"`
must stay empty. Never `%` or `vw` sizing.

### Logo usage map

| Surface                               | Component                           | Cell → px                                        |
| ------------------------------------- | ----------------------------------- | ------------------------------------------------ |
| Menu bar brand (site, panel, login)   | `LogoMark` (the character, no text) | 2 → 20                                           |
| Site dock Home tile                   | `LogoMark`                          | 3 → 30 (2 → 20 in tab-bar mode)                  |
| Panel Desktop/Portal tile             | `NavIcon` (`dashboard` / `portal`)  | 2 → 24 (the Me tile already shows the character) |
| Favicon `src/app/icon.svg`            | the character's icon paths          | viewBox 0 0 10 10, literal fills                 |
| Hero hub                              | `PixelLogoCycle`                    | 2 (<lg) / 3                                      |
| Brand family big logo                 | `PixelLogo`/`PixelLogoSwap`         | 4 / 6 (md) / 8 (lg)                              |
| Brand cells, /services headers, menus | `PixelLogo`                         | 2 or 3                                           |
| Footer wordmark                       | `PixelLogo TEAM paper={false}`      | 6 / 8 / 12                                       |
| OG images (`og.tsx`)                  | `toPaths()` with literal hex fills  | 10 (Satori resolves no CSS variables)            |
| Share pages, invoice, contract        | `LogoMark`                          | 3 (`/i`, `/sign`, contract) · 4 (`/p`, invoice)  |

### Fills

- Logo, mark, text and icons use **variable** fills (`TONE_FILLS`): accent
  `var(--px-accent, var(--brand-yellow))`, ink `var(--px-ink, var(--brand-ink))`, soft and frame
  `--brand-soft`/`--brand-frame`; they follow light/dark and a tile can re-tone them (the yellow
  Contact tile sets `--px-accent: #1C1C1E`).
- The avatar uses **literal** `AVATAR_FILLS` in both modes (ink `#6A6A6C`, frame `#B3B5B9`,
  screen `#1C1C1E`, eyes `#FFC50D`): no tile or dark mode re-tones it. It never sits directly on a
  yellow surface (the CTA puts it on a paper tile).

### GoodInBot, the guide character (owner's pick M3, 2026-11-17; named 2026-11-18)

A small screen creature, not a portrait: a dark screen wearing the logo's frame (ink corner,
light top and left edge, ink right and bottom edges), two 3×3 yellow eyes, stubby ink arms and
legs, and a mouth only while it talks (`pixel-avatar.ts`). Poses: idle (blinks), blink, talk,
walkA/walkB, wave, sit; the eyes' bottom row lives in the base, so hiding the `eyes` part reads
as a blink. Small sizes (menu bar, panel guide button, Me tile) use the separate leg-free 10×10
`AVATAR_ICON` with centred eyes, not a crop of the sprite.

- Print and the contract/invoice paper force the light brand tones (`--brand-paper: #fff`).

### Icons

`src/components/brand/pixel-icons.ts`. 12×12, art inside the inner 10×10, ≤2 tones (`#` ink, `y`
accent) with the **accent on ≤20% of the filled cells** (`accentShare(rows)`), legible at cell 2
(24px) and 1 (12px). `pixel-icons.test.ts` enforces the grid, the empty outer ring, the tones and
the 20% rule for every icon; `more` is the one listed exception. Review both sets in the catalog
(Brand → Pixel icons, with each icon's accent share, and the panel icons on dock tiles).
`PixelIcon` is one `<svg class="px-art px-icon">` with ≤2 paths.

**Site icons** (`siteIcons`, 13): `work`, `services`, `blog`, `learn`, `about`, `studio`, `code`,
`contact`, `sign-in`, `more`, `search`, `globe`, `arrow`. `more` (one accent square of four) is 25%
accent, above the ≤20% rule; the owner approved the set, `more` included, on 2026-11-17.

**Panel icons** (`panelIcons`, 17): one per panel dock app of every role, drawn to the motif of
the module's lucide icon so the dock matches the menus and ⌘K. `NavItem.pixel` in
`components/panel/nav-config.ts` names it (`nav-config.test.ts`: every item has its own); the
lucide `icon` stays for menus, ⌘K, the window title and lists.

| Icon            | Module (nav key)      | Motif                                      | Accent |
| --------------- | --------------------- | ------------------------------------------ | ------ |
| `dashboard`     | Desktop (`dashboard`) | four panes of different heights            | 4%     |
| `portal`        | Portal (`portalHome`) | house, accent door                         | 15%    |
| `time`          | Time tracking         | stopwatch, accent crown button             | 6%     |
| `calendar`      | Calendar              | rings, header band, day dots, accent today | 8%     |
| `tasks`         | Tasks                 | checked box (ink only)                     | 0%     |
| `projects`      | Projects              | folder with kanban columns, accent card    | 9%     |
| `clients`       | Clients               | two people, accent shirt (echoes `about`)  | 9%     |
| `finance`       | Finance               | wallet, accent coin in the tab             | 4%     |
| `invoices`      | Invoices              | receipt with a torn edge, accent total     | 7%     |
| `contracts`     | Contracts             | page signed by an accent pen               | 15%    |
| `docs`          | Docs                  | open book, accent lines                    | 8%     |
| `vault`         | Vault                 | padlock, accent keyhole                    | 11%    |
| `content`       | Content               | newspaper, accent picture                  | 17%    |
| `inbox`         | Inbox                 | tray, accent slot                          | 11%    |
| `media`         | Media                 | picture: mountains, accent sun             | 9%     |
| `settings`      | Settings              | three sliders, accent knob                 | 14%    |
| `design-system` | Design system         | palette, accent paint, thumb hole          | 9%     |

Where they show: the panel dock and the <1024px tab bar (`NavIcon`, cell 2 = 24px in every dock
size, like the site dock), and the panel Launchpad. The Desktop/Portal tile shows `dashboard` /
`portal` (the Me tile next to it already shows the character). View site reuses
`globe` and the tab bar's More reuses `more`. **Adding a panel module** means drawing its icon
into `panelIcons` and setting `pixel` on its nav item.

**Tones.** Ink is `--brand-ink` (`#6A6A6C` light, `#A3A4A8` dark, ≥4.8:1 on both tile colours);
the current tab-bar item inks its icon with `--foreground`. A yellow (`accent`) tile re-tones
both tones to `#1C1C1E` (10.7:1 on `#FFC50D`). **Forced colours** keep SVG fills but turn tiles to
Canvas, so `pixel.css` paints every `.px-icon` CanvasText there (both tones): no icon vanishes,
the site's yellow Contact tile included.

### Pixel digits

`PIXEL_GLYPHS` has the Latin `0`–`9` and the **Persian digits `۰`–`۹`** (U+06F0–U+06F9) on the same
5×7 grid with the 1-cell gap, drawn from Vazirmatn's forms: `۰` is a small ring at mid height,
`۲`/`۳` carry one and two teeth on a stem, and `۴ ۵ ۶` are the Persian shapes, not the
Arabic-Indic `٤ ٥ ٦` (which stay unsupported). `toPixelText` passes them through.
`pixelDigits(text, locale)` turns Latin digits into Persian ones on `fa` only:

- **Frame strips**: `FrameStrip` reads the locale (`getLocale()`, a root param, so it stays
  static) and numbers boxes `۰۱`, `۰۲`… on fa, `01`, `02`… on en. The number and the Latin path
  are separate `aria-hidden` LTR svgs in the strip's flex row, so in RTL the number sits next to
  the lights at inline-start and every svg reads left to right (`GOOD-IN-TEAM/WORK ۰۳` from the
  left). The digits live in the existing text path: no extra elements.
- **404**: `NotFoundBox` draws `۴۰۴` on fa.

Pass any other locale-aware number through `pixelDigits` before `PixelText`. Paths and window
bars stay Latin data.

## Colour

Yellow `#FFC50D` is the only accent and is **never text, an icon or a thin line on a light
surface**. Text uses the `-ink` tokens. See [design-system.md](design-system.md#contrast-spec-34-measured).
