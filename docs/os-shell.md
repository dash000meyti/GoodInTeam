# Good In OS shell

How the public site and the panel are built as one small "OS": a menu bar, a dotted desktop with
framed boxes (site) or one window (panel), a dock, the pixel brand and the "virtual me" guide.
The spec and its decisions live in [`design/os-redesign.md`](design/os-redesign.md); tokens,
contrast and the component catalog in [design-system.md](design-system.md); the pixel assets and
naming in [brand.md](brand.md). This page is the map you need to change or extend the shell.

## Shells and their Suspense map

Every shell is a static frame (prerendered per locale) with request-time holes. Each hole has a
fallback of the final size, so streaming never shifts the layout (CLS 0 is tested).

### Site (`app/[locale]/(site)/layout.tsx`)

```
skip link → #main
<header class="os-menubar">            SiteMenuBar (server, site-menubar.tsx)
  brand popover · section links · [Suspense: availability, AvailabilitySkeleton]
  · virtual-me extra · Spotlight · language · theme · Control Center · [Suspense: clock, ClockSkeleton]
<div class="os-desktop">                wallpaper + rails, guide containing block (display:flow-root)
  <main id="main">                      the page: FrameSections (each page owns its Suspense holes)
  <footer class="frame-box">            SiteFooter (socials stream in a Suspense hole, h-9 skeleton)
  [Suspense fallback=null: GuideMount]  request-time greeting → GuideLayer + GuideLoader
<nav class="os-dock">                   SiteDock (server) → DockLinks (client, internal Suspense)
Spotlight · SiteControlCenter · Launchpad   native popovers, siblings of the dock
[Suspense: SiteChrome]                  popovers close on navigation, ⌘K, Spotlight filter (one island)
[Suspense: SiteJsonLd]                  Organization / Person / WebSite JSON-LD
```

- Only the `common` and `nav` namespaces ship to the browser (`pickMessages`). The `guide`
  namespace never does: lines are rendered on the server into attributes.
- Public routes load no Radix DropdownMenu, Tooltip or sonner (perf.spec checks every JS
  response of `/` and `/login`). Menus are native popovers.
- `.os-desktop` must never get `transform`, `filter`, `contain`, `will-change` or
  `backdrop-filter`: it is the guide layer's containing block.

### Auth (`app/[locale]/(auth)/layout.tsx`: `/login`, `/setup`)

A login-screen menu bar (`MenuBarShell`: mark, plain `<a hrefLang>` language links, theme; the
page's only blurred surface), the wallpaper and one centred `Window` per page whose path matches
the route (`LOGIN` / `SETUP`). No dock, no Radix.

### Panel (`app/[locale]/panel/layout.tsx`)

```
InlineScript shellInitScript            gt-shell cookie → html[data-dock-size|data-dock-autohide|data-window-wide] before paint
<div class="panel-shell">
  skip link
  PanelMenuBar                          Radix Menubar (ui/menubar.tsx) in a MenuBarShell
    [Suspense null: SessionMenus]       role menus from nav-config
    [Suspense StatusSkeleton: SessionStatus]   running timers, notifications
    [Suspense AvatarSkeleton: SessionAvatar]
    [Suspense ClockSkeleton: SessionClock]
  <div class="os-window">
    [Suspense WindowTitleFallback: WindowTitleBar]   lights + module path
    <main id="main" class="os-window-body">   pages render inside panel/loading.tsx's boundary
  [Suspense null: SessionDock]          PanelDock (client): role dock + Me tile + View site
```

Pages call `panelContext()` first (it reads the session). Every panel route folder keeps its
`loading.tsx` (Next 16.4 validates instant navigations). With Cache Components, a soft
navigation keeps the previous route mounted but hidden (React Activity): DOM queries in tests and
scripts must count visible elements only (e.g. a second hidden `header.os-menubar` exists after
navigating from the site to `/login`).

## CSS

All new CSS lives in owned partials under `src/app/styles/`, imported by `globals.css` after
`tw-animate-css`. Class rules sit in `@layer components`; `html` variables in `@layer base`;
`@keyframes`/`@property` at top level; never `:root {`/`.dark {` in a partial.

| Partial           | Owner       | Holds                                                                                           |
| ----------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `os-shell.css`    | foundation  | shell variables, offset utilities, menu bar, menus, dock + tab bar, lights, window, clock, boot |
| `frame.css`       | foundation  | `.os-desktop`, frame boxes, grids, cells, strips, eyebrow, reveals, `.frame-cv`                 |
| `pixel.css`       | foundation  | `.px-art` sizing, `.px-set`, sprite frames, logo cycle and swap                                 |
| `site-shell.css`  | site-shell  | site menu bar, popovers (Spotlight, Control Center, Launchpad), site dock, footer, auth         |
| `home.css`        | home        | home sections (hero, brands, marquee, process windows)                                          |
| `site-pages.css`  | site-pages  | the other public pages                                                                          |
| `guide.css`       | assistant   | the pixel guide (sprite, bubble, selection, trail)                                              |
| `panel-shell.css` | panel-shell | panel menu bar, window, dock, catalog demos                                                     |

The legacy `.prose-gt` and `/* site */` rules in `globals.css` are wrapped in
`@layer components` and frozen: utilities on the same element now win, and partial rules that
override a legacy `.gt-*` rule need one more class of specificity. Dead legacy rules were deleted
in the final QA pass (glow blobs, the old wordmark and mobile menu, `.glass`).

### Variable contract and utilities (`os-shell.css`)

| Variable                                                          | Meaning                                                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `--menubar-h`                                                     | 32px on desktop with a fine pointer, 44px otherwise                                        |
| `--chrome-top`                                                    | where content starts under the chrome (registered `<length>`, reads back as px)            |
| `--dock-space`                                                    | room the dock (or tab bar) takes at the bottom, safe area included (registered `<length>`) |
| `--dock-pref`                                                     | the dock tile size (panel: `html[data-dock-size]` 40/48/56; site: 48)                      |
| `--frame-max`, `--gutter`, `--section-gap`, `--cell-pad`, `--dir` | frame column, gutters, padding, ±1 for RTL maths                                           |

Read `--chrome-top`/`--dock-space` from JS only through `shell/chrome-vars.ts` (`parseFloat` of
the computed value). Offsets use the utilities **`below-chrome`** (sticky asides),
**`top-chrome`** (sticky bars), **`above-dock`** (bottom bars), **`pb-dock`**, **`max-h-chrome`**
— never a hard-coded `top-*`/`bottom-*` for the chrome.

**The single scroll-offset rule:** fragment and focus scrolling clear the chrome only through
`html { scroll-padding-top: calc(var(--chrome-top) + 16px); scroll-padding-bottom: … }`.
Elements never add their own chrome-sized `scroll-margin`.

**Blur:** exactly two surfaces blur, the menu bar and the dock (≥768px, ≤20px; the tab bar and
`prefers-reduced-transparency` are solid). The auth pages blur only their menu bar. The dialog
scrim and chart tooltip are the only transient exceptions (perf.spec counts elements and
`::before`).

## Menus

- **Site:** the disclosure pattern on native popovers (`popover` + `popovertarget`): honest
  semantics, Esc and light dismiss for free, no JS until a row needs it. Popovers close on
  navigation. The trigger shows its open background with `:has(+ :popover-open)`; Control
  Center, Spotlight and Launchpad are sibling popovers of the dock. Rows use `.os-menu-item`
  (yellow fill + ink text, inset `--primary-dark` ring on focus; destructive rows use the
  destructive fill). Guide rows ("What's this part?", "Tour") close their popover first, then
  `dispatchGuide()`.
- **Panel:** a full ARIA menubar (Radix Menubar, `ui/menubar.tsx`): one roving tab stop, arrows,
  Enter, Esc. Menus come from `nav-config.ts` groups for the role; the Brand menu is role-neutral
  and starts with "Desktop". ⌘K/Ctrl+K opens the command palette on any keyboard layout
  (`isCommandPaletteShortcut`).

## Dock

`Dock` (server-safe frame: `<nav class="os-dock"><ul class="os-dock-list">`) takes
`tabbar="md"` (site: tab bar below 768px) or `"lg"` (panel: below 1024px) and `magnify` (CSS-only
magnification for fine pointers, off for touch and reduced motion). Entries are `DockEntry`s:

```ts
{ kind: "link", key, href, section?, exact?, label, icon, variant?, show?, prefetch?, srExtra?, attrs? }
{ kind: "sep", key, show? }
{ kind: "slot", key, node, show? }       // server node in an <li>: More button, the panel Me tile
```

- `label` is the visible label and the accessible name (no `aria-label`). `srExtra` appends
  visually hidden text (", 2 timers running").
- `section` + `exact` drive `aria-current` (via `isActivePath`) and the square active dot; an
  entry without `section` is never active (brand tiles).
- `show: "desktop" | "mobile"` limits an entry to one mode; the tab bar shows 5 slots.
- `DockLinks({ entries, running })` renders the links (client, internal Suspense); keys in
  `running` get `data-running` (the dot). Each internal link bounces while it loads
  (`useLinkStatus`).
- Variants: `paper` (default), `brand` (L-frame tile), `accent` (yellow tile, ink icon — kept in
  tab-bar mode), `mark`.

**Add a site dock app:** add an entry in `components/site/site-dock.tsx` (and its label to the
`nav` namespace, fa + en); pick `show` so the tab bar keeps Home, Work, Services, Contact, More.
**Add a panel dock app:** add the item to `nav-config.ts` (roles!) and, for the tab bar, to the
role's pins; owner 16 / member 9 / client 5 apps are asserted by panel-shell.spec.

## Frame system (public pages)

`FrameSection` (square `.frame-box` on the 1200px column, logo L-frame at inline-start, ringed
markers) → stacked `FrameGrid`s → `FrameCell`s. Details and spans: [design-system.md → Frame](design-system.md#frame-public-site-srccomponentssiteframetsx).

**Add a section to a page:**

1. `<FrameSection id labelledBy guide={{ key, say: t.guide.<key> }} strip={{ index }}>` — every
   box carries a guide key (fa + en line in `i18n/messages/*/guide.ts`, added to the coverage
   list in `guide-copy.test.ts`).
2. A header row: `FrameHeaderCell` (or `TitleCell` / `FrameCell header`), which marks
   `data-frame-header` and holds the box's `h2` (`id` = `labelledBy`).
3. Body grids with `cols`/`span`; prove the layout hole-free with `packRows(spans, cols, bp)`
   (`holes === 0` at md and lg, in `frame-plan.test.ts` / `page-frame-plan.test.ts`) and complete
   the last row with `FrameFiller`.
4. Streamed data: a `<Suspense>` whose fallback has the same grid and sizes; below-the-fold
   bodies may use `cv={px}` (content-visibility) — never around sticky children.
5. A page's first box takes `first`: its first row ends at inline-end in a `[data-decor]` cell
   ≥312×200px (the guide's first-box bubble lands there; site-pages.spec checks it).

## Pixel brand

`components/brand`: `PixelLogo`/`PixelMark`/`PixelText`/`PixelIcon`/`PixelAvatar` render inline
SVG with one `<path>` per tone; sizes come only from `cell` (integer px per cell) — never
`size-*`/`w-*`/`h-*`. The brand registry (`brands.ts`: team, studio, code) maps services to
brands. The 13 pixel icons and the avatar parts are unit-tested. See [brand.md](brand.md).

## The guide ("virtual me")

**Files:** `components/site/guide/` — `guide-mount.tsx` (server, request-time greeting),
`guide-layer.tsx` (the DOM: `#gt-guide`, sprite button, bubble, selection, live region),
`guide-loader.tsx` (≤0.8KB client island), `guide-engine.ts` (vanilla TS, lazy, sentinel
`gt-guide-engine@1`), `geometry.ts` (pure placement maths, unit-tested).

**Loading.** The loader imports the engine after `load` + idle (or the first pointer/key), never
when muted (`gt-guide=off`), under Save-Data, when printing, or under `navigator.webdriver`
without `gt-guide-test=1`. "What's this part?" and "Tour" (menu-bar extra at lg+, Control Center
and Launchpad at every size) always work: while muted they start the engine in **explicit mode**
(it speaks only when asked, then hides again).

**Authoring.**

- Section narration: `FrameSection guide={{ key, say }}` or `{...guideAttrs(key, say)}` →
  `data-guide` + `data-guide-say`. Special parts: `FrameCell spot` or `spotAttrs(key, say)` →
  `data-guide-spot` (hover/focus, ≤140 chars).
- **The paraphrase rule:** a line paraphrases copy visible in that section — no new facts, no
  hidden text, no sr-only narration. Lines live in the server-only `guide` namespace (fa is the
  source of truth, en mirrors it; the voice is the owner's first person).
- Panel tips: `guide.panel_<navKey>` per module (team voice); clients read
  `panel_client<Module>` on projects, invoices and contracts (`tipKeyFor` in `panel-guide.tsx`).

**Placement (desktop, ≥1024px with a fine pointer).** One IntersectionObserver with an
activation band (−35% / −50%) and a 600ms dwell; each section speaks once per session
(`gt-guide-seen`). The sprite perches on the box's **roof** (the section gap at inline-end); when
the roof is under the menu bar it clings to the **rail** at `chromeTop + 24` inside the cell
padding (outside the border beside a `data-pad=none` cell, or not at all). Bubbles try candidate
**A** (above the roof, extending toward inline-start), then **B** (inside a `[data-decor]` cell,
never over a `[data-frame-header]` cell), then **C** (pinned under the menu bar; explicit only).
Automatic bubbles use A, except the page's first box, which may use a clear B at `scrollY = 0`.

**Compact mode (<1024px or a coarse pointer, D21).** The sprite stays pinned above the dock at
2px cells, hops and shows a "!" badge on a new section, and opens a bubble only on tap — plus a
one-time greeting (`greetingCompact`). The phase-2 alternative is a one-line peek chip.

**Add a guide line:** add the key to `guide.ts` (fa, then en), pass it as `guide`/`spot`, add the
key to the coverage list in `guide-copy.test.ts`, and check it in the browser
(`dispatchGuide("explain")` or the menu row).

## Storage keys, cookies and events

| Where          | Key                                                                                                                 | Meaning                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| localStorage   | `gt-guide`                                                                                                          | `"off"` mutes automatic narration                           |
| localStorage   | `gt-guide-tips`                                                                                                     | `"off"` stops the panel's automatic module tips             |
| localStorage   | `gt-guide-test`                                                                                                     | `"1"` lets the guide auto-speak under webdriver (e2e only)  |
| localStorage   | `gt-guide-mod:<navKey>`                                                                                             | the panel module tip has peeked once                        |
| localStorage   | `gt-motion`                                                                                                         | `"reduce"`: the site's Reduce motion switch                 |
| localStorage   | `gt-preset`                                                                                                         | colour preset (applied before paint)                        |
| sessionStorage | `gt-guide-seen`, `gt-guide-greeted`, `gt-guide-idle`                                                                | lines spoken, greeting and idle line played                 |
| sessionStorage | `gt-boot`                                                                                                           | the boot animation ran (with `html[data-booted]`)           |
| cookie         | `gt-shell`                                                                                                          | `dock.magnify.autohide.wide`, e.g. `48.1.0.0` (panel prefs) |
| cookie         | `gt-sidebar-collapsed`                                                                                              | legacy; expired on first panel load                         |
| event          | `gt:guide` (`{ type: explain\|tour\|show\|hide }`)                                                                  | ask the guide to act (`dispatchGuide`)                      |
| event          | `gt:guide-pref`                                                                                                     | the mute preference changed                                 |
| attribute      | `html[data-motion=reduce]`, `html[data-booted]`, `html[data-dock-size]`, `#gt-guide[data-engine]`, `[data-compact]` | see spec §15.1                                              |

## Performance budget (spec §12) — measured

Production build (`pnpm build && pnpm start`), seed data, Chromium. Transfer sizes are gzip on
the wire; "baseline" is the last commit before the redesign (`b418745`), built and measured the
same way. LCP/CLS: 390×844, cold cache, 4× CPU throttle, 150ms RTT / 1.6 Mbps (best of two runs).

| Route                    | First-load JS (baseline → now) | Lazy JS after load | CSS, every route | LCP baseline → now (element) | CLS now    |
| ------------------------ | ------------------------------ | ------------------ | ---------------- | ---------------------------- | ---------- |
| `/`                      | 206.9 → 169.5 KB               | 9.4 KB (guide)     | 29.1 → 40.0 KB   | 1.04 → 1.20 s (hero `<h1>`)  | 0          |
| `/en`                    | 206.9 → 169.5 KB               | 9.4 KB             | 29.1 → 40.0 KB   | 1.00 → 1.20 s (hero `<h1>`)  | 0          |
| `/blog/sqlite-is-enough` | 208.8 → 171.5 KB               | 15.6 KB            | 29.1 → 40.0 KB   | 0.93 → 1.10 s (TL;DR text)   | 0          |
| `/services`              | 206.9 → 163.3 KB               | 15.6 KB            | 29.1 → 40.0 KB   | 1.14 s (hero subtitle)       | 0          |
| `/login`                 | 200.9 → 165.9 KB               | 19.4 KB            | 29.1 → 40.0 KB   | 0.90 s                       | 0          |
| `/panel` (owner)         | 245.7 → 263.9 KB               | —                  | 29.1 → 40.0 KB   | 0.63 → 0.58 s                | 0.0036 → 0 |

| Budget                                           | Target                                           | Measured                                                                                                                                                               |
| ------------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LCP (hero h1, throttled)                         | ≤1.8 s                                           | `/` 1.22 s, `/en` 1.20 s, the element is the hero `<h1>` (perf.spec `@perf`, cold cache)                                                                               |
| CLS                                              | 0 target, ≤0.01 hard                             | 0.0000 on `/` and `/en` (perf.spec, blocking)                                                                                                                          |
| Site first-load JS                               | net ≤ 0 vs baseline                              | −37 KB gz on `/` (Radix menus, tooltips and the old header gone)                                                                                                       |
| Guide                                            | loader ≤0.8 KB, engine ≤6 KB gz, lazy            | engine chunk 5.7 KB gz (14.4 KB raw), requested ~0.1 s after `load`; never when muted (perf.spec)                                                                      |
| Panel chrome JS                                  | ≤ +10 KB gz vs sidebar/header                    | +18 KB gz on `/panel` (Radix Menubar, dock, Launchpad, Control Center) — owner decision                                                                                |
| CSS added (7 partials, minified)                 | ≤6 KB gz / ≤22 KB raw                            | 9.2 KB gz / 45.8 KB (os-shell 3.5, guide 2.6, site-shell 2.3, frame 1.5, home 0.9, pixel 0.8, site-pages 0.2 KB gz); shipped bundle 27.5 → 38.7 KB gz — owner decision |
| DOM on `/`                                       | ≤1,800                                           | 1,619 (perf.spec)                                                                                                                                                      |
| Pixel-art elements on `/`                        | ≤260 (site-shell ≤125, assistant ≤20, home ≤115) | 248: home 113, site-shell 120, assistant 15                                                                                                                            |
| Blur                                             | 2 surfaces with a dock, 1 on auth                | exactly `.os-menubar` + `.os-dock-list::before` on `/` (perf.spec)                                                                                                     |
| Radix menus / tooltips / sonner on public routes | none                                             | none on `/` or `/login` (perf.spec)                                                                                                                                    |

Under this heavy throttle the site's LCP is ~0.16 s later than before the redesign (the
render-blocking CSS grew by 11 KB gz and the DOM by ~600 nodes), still well inside the 1.8 s
budget, and the LCP element is now the hero `<h1>` itself (before: the header wordmark).

Run the checks: `BASE_URL=… pnpm exec playwright test e2e/perf.spec.ts` (blocking part) and
`PERF=1 … --grep @perf` (LCP). `node scripts/shots.mjs` reports console errors and responses ≥400.
