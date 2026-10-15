# Design system

**Structure** follows [shadcn/ui](https://ui.shadcn.com) (owned component source in
`src/components/ui`, semantic CSS variables, `cva` variants, `data-slot` attributes).
**Look** follows [Minimals](https://minimals.cc): soft grey neutrals, green primary, alpha
("soft") surfaces, rounded 16px cards with diffuse shadows, Public Sans + Vazirmatn.
**Expressiveness** for the public site borrows from Cloudflare's product pages (grids, glow,
animated diagrams) and **feature presentation** from korsi.ai (bento grids, tabbed showcases).

A live catalog is at **Panel → Design system** (`/panel/design-system`, owner/admin): every
token and component with a live preview and a copyable usage snippet. Its sections live in
`src/app/[locale]/panel/design-system/_components/sections/*` — **when you add or change a
shared component, add or update its example there** (see [modules/settings.md](modules/settings.md#design-system-catalog)).

## Tokens (`src/app/globals.css`)

| Token                                                               | Light                   | Dark                  | Use                              |
| ------------------------------------------------------------------- | ----------------------- | --------------------- | -------------------------------- |
| `--background`                                                      | `#FFFFFF`               | `#141A21`             | page                             |
| `--card`                                                            | `#FFFFFF`               | `#1C252E`             | cards, popovers                  |
| `--foreground`                                                      | `#1C252E`               | `#FFFFFF`             | text                             |
| `--muted` / `-foreground`                                           | `#F4F6F8` / `#637381`   | `#28323D` / `#919EAB` | subtle surfaces / secondary text |
| `--primary` (+ `-lighter/-light/-dark/-darker`)                     | preset                  | preset                | brand                            |
| `--success` `--warning` `--info` `--destructive` `--violet`         | Minimals palette        |                       | status                           |
| `--border`                                                          | `rgb(145 158 171 / .2)` | `/ .16`               | dashed dividers, borders         |
| `grey-50 … grey-900`                                                | Minimals greys          |                       | neutrals                         |
| `shadow-card`, `shadow-dropdown`, `shadow-dialog`, `shadow-primary` |                         |                       | elevation                        |

**Color presets** (`<html data-preset="…">`, chosen in the appearance menu, persisted in
`localStorage`): `green` (default `#00A76F`), `cyan`, `purple`, `blue`, `orange`, `red`.
Applied before first paint by an inline script (no flash).

**Dark mode**: `.dark` class via `next-themes` (`system` default).

## Typography

- `fa`: Vazirmatn (Persian glyphs) → Public Sans (Latin glyphs). `en`: Public Sans.
- Code: JetBrains Mono. All self-hosted via `next/font/local` (no network at build).
- Headings `font-extrabold`/`font-black`, tight tracking. Body 15–17px, line-height ~1.8 for fa.
- Long-form content: `.prose-gt` class (headings with anchors, Shiki code blocks light/dark).

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

| Shared (`components/shared`)                                          |                                                                                                                                                                           |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DatePicker`                                                          | Jalali (fa, Persian digits) / Gregorian (en), emits `YYYY-MM-DD`, form-friendly; named month/day buttons; wires to its `Field`                                            |
| `SelectField`                                                         | Select + hidden input + optional "none"                                                                                                                                   |
| `SwitchInput`                                                         | Switch that submits `"true"/"false"`                                                                                                                                      |
| `ConfirmDialog`, `CopyButton`, `ColorDot`, `LiveDuration`, `Markdown` |                                                                                                                                                                           |
| `MarkdownEditor`                                                      | textarea + server-rendered preview (Shiki), form-friendly                                                                                                                 |
| `useActionForm`, `useAction`                                          | server-action wiring with toasts + field errors; `<form onSubmit={form.submit}>` (keeps input on validation errors)                                                       |
| `ThemeToggle`, `AppearanceMenu`, `usePreset`, `LocaleSwitcher`        | `usePreset()` stays in sync across components                                                                                                                             |
| `design-tokens.ts`                                                    | tokens as data: `presetScales`, `presetStyle(p)`, `surfaceTokens`, `statusTokens`, `chartTokens`, `greyScale` — verified against `globals.css` by `design-tokens.test.ts` |

| Panel (`components/panel`) |                                                                     |
| -------------------------- | ------------------------------------------------------------------- |
| `PageHeader`               | title, breadcrumbs, description, actions — every page               |
| `EmptyState`               | every empty list                                                    |
| `StatCard`                 | KPI tiles (`tone`: primary/info/warning/violet/destructive/success) |
| `nav-config.ts`            | sidebar + ⌘K palette source of truth (with role filters)            |
| `panel-prefs.ts`           | ⌘K matcher (layout-independent) + collapsed-sidebar cookie helpers  |

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
- **Small muted text** (sidebar group titles, captions) uses full `text-muted-foreground`
  (4.9:1 light / 6.4:1 dark); `/80` and lighter fail WCAG AA.
- **Keyboard shortcuts** match layout-independently (`isCommandPaletteShortcut`: Latin `e.key`,
  else `e.code`) so ⌘K works on a Persian keyboard.
- **Client-only preferences** that change layout (collapsed sidebar) live in a cookie read on the
  server inside `<Suspense>`, plus an `InlineScript` before paint — never `localStorage` + effect.

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
- **Motion**: CSS transitions/keyframes only on the public site (`animate-float`, `animate-marquee`,
  `animate-dash`); respect `prefers-reduced-motion` (handled globally).

## Charts

- Use `ChartContainer` + Recharts; colors come from config keys (`var(--color-<key>)`) mapped
  to `--chart-1…5` **in fixed order** (chart-1 follows the primary preset).
- One series → no legend (the title names it); ≥ 2 series → always a legend; donuts get a
  value legend beside them (identity is never color-only). Tooltips on every chart.
- Marks: bars `radius={[4, 4, 0, 0]}`, lines `strokeWidth={2}`, 2px `var(--card)` stroke between
  pie slices. One y-axis — never dual-axis. In RTL, `reversed` the X axis and put the Y axis on
  the right.
- Palette check (dataviz validator): CVD separation passes in light and dark; `--chart-3`
  (#00b8d9) and `--chart-4` (#ffab00) are below 3:1 contrast on white, so charts that use them
  must show values as visible labels/legend or offer a table. Prefer chart-1/chart-2 for
  two-series charts.

## Settings UI patterns

- Settings pages: `SettingsHeader` + `SettingsCard` (icon-led card) from
  `panel/settings/_components/section.tsx`; long forms end with a sticky `SaveBar`.
- Bilingual settings use `BilingualField` (fa/en side by side on md+, a fa/en switch on phones,
  error dot on the tab that has an error).
- One-time secrets (API tokens, temporary passwords) are shown once in a dialog with a copy
  button and a clear warning; never store or re-display them.
