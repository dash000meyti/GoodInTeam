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
    href: "/services#studio",
    icon: "studio",
  },
  {
    id: "code",
    suffix: "CODE",
    label: "brandCode",
    tagline: "brandCodeTagline",
    href: "/services#code",
    icon: "code",
  },
];
```

- **Registry order is the only display order** (team, studio, code) — home brand cells,
  `/services` boxes, the footer brand list. A different order is a change to this array.
- `label` keys live in `nav`, `tagline` keys in `site`. `brandOf(meta)` reads a service's brand
  and falls back to `team`.
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

| Component                           | Grid   | Elements            | Notes                                                             |
| ----------------------------------- | ------ | ------------------- | ----------------------------------------------------------------- |
| `PixelMark`                         | 11×11  | 6                   | menu bar, dock Home tile, favicon                                 |
| `PixelLogo suffix`                  | 34×18  | 7 (6 without paper) | framed GOOD IN / SUFFIX                                           |
| `PixelLogoCycle`                    | 34×18  | 12                  | TEAM → STUDIO → CODE → TEAM **once** in 4.2s (`data-play`)        |
| `PixelLogoSwap`                     | 34×18  | 12                  | all suffixes; consumers swap with `:has()` on `.gi-sfx[data-sfx]` |
| `PixelText text`                    | 7 tall | 2                   | Latin only, aria-hidden, LTR                                      |
| `PixelTextSet items`                | 7 tall | 1 + n               | one svg, one `path[data-path-id]` per item, first shown           |
| `PixelIcon name mirror?`            | 12×12  | ≤3                  | 13 icons; only `arrow` is directional (`mirror`)                  |
| `PixelAvatar pose part`             | 16×16  | ≤5 (head 4)         | static "virtual me"; `part="head"` = 10×10 crop                   |
| `PixelAvatarSprite state`           | 16×16  | 15                  | guide sprite; frames keyed on its own `svg.px-sprite[data-state]` |
| `LogoMark cell` / `Logo label cell` | —      | —                   | compatibility layer over `PixelMark` / `PixelLogo TEAM`           |

### Integer cells only

Size comes **only** from `cell` (`1|2|3|4|6|8|10|12` → the literal class `[--cell:Npx]`) or an
inherited `--cell` (no class is emitted without `cell`; the guide sprite relies on that).
`pixel.css` sizes `.px-art` as `--px-w × --cell` by `--px-h × --cell`. Responsive sizes add a
cell class: `<PixelMark cell={2} className="md:[--cell:3px]" />`. **Never** put
`size-*`/`w-*`/`h-*` on a `LogoMark`/`Logo`/`PixelMark`/`PixelLogo` (utilities beat `.px-art`
and give fractional cells); `git grep -nE "<(LogoMark|Logo|PixelMark|PixelLogo)[^>]*className=\"[^\"]*\b(size|w|h)-"`
must stay empty. Never `%` or `vw` sizing.

### Logo usage map

| Surface                               | Component                          | Cell → px                                       |
| ------------------------------------- | ---------------------------------- | ----------------------------------------------- |
| Menu bar brand                        | `PixelMark`                        | 2 → 22                                          |
| Dock Home / panel Dashboard tile      | `PixelMark`                        | 3 → 33 (2 → 22 in tab-bar mode)                 |
| Favicon `src/app/icon.svg`            | mark paths on paper                | viewBox 0 0 11 11, dark-scheme tones            |
| Hero hub                              | `PixelLogoCycle`                   | 2 (<lg) / 3                                     |
| Brand family big logo                 | `PixelLogo`/`PixelLogoSwap`        | 4 / 6 (md) / 8 (lg)                             |
| Brand cells, /services headers, menus | `PixelLogo`                        | 2 or 3                                          |
| Footer wordmark                       | `PixelLogo TEAM paper={false}`     | 6 / 8 / 12                                      |
| OG images (`og.tsx`)                  | `toPaths()` with literal hex fills | 10 (Satori resolves no CSS variables)           |
| Share pages, invoice, contract        | `LogoMark`                         | 3 (`/i`, `/sign`, contract) · 4 (`/p`, invoice) |

### Fills

- Logo, mark, text and icons use **variable** fills (`TONE_FILLS`): accent
  `var(--px-accent, var(--brand-yellow))`, ink `var(--px-ink, var(--brand-ink))`, soft and frame
  `--brand-soft`/`--brand-frame`; they follow light/dark and a tile can re-tone them (the yellow
  Contact tile sets `--px-accent: #1C1C1E`).
- The avatar uses **literal** `AVATAR_FILLS` in both modes (ink `#6A6A6C`, face `#F3F3F3`, eyes
  `#1C1C1E`, hoodie `#FFC50D`): no tile or dark mode re-tones the person. The hoodie has no ink
  outline, so the avatar never sits directly on a yellow surface (the CTA puts it on a paper tile).
- Print and the contract/invoice paper force the light brand tones (`--brand-paper: #fff`).

### Icons

12×12, art inside the inner 10×10, ≤2 tones (`#` ink, `y` accent), legible at cell 2 (24px) and
1 (12px): `work`, `services`, `blog`, `learn`, `about`, `studio`, `code`, `contact`, `sign-in`,
`more`, `search`, `globe`, `arrow`. They were drawn for the redesign; review them in the catalog
before relying on them. `more` (one accent square of four) is 25% accent, above the ≤20% rule; the
owner approved the set, `more` included, on 2026-11-17.

## Colour

Yellow `#FFC50D` is the only accent and is **never text, an icon or a thin line on a light
surface**. Text uses the `-ink` tokens. See [design-system.md](design-system.md#contrast-spec-34-measured).
