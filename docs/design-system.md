# Design system

**Structure** follows [shadcn/ui](https://ui.shadcn.com) (owned component source in
`src/components/ui`, semantic CSS variables, `cva` variants, `data-slot` attributes).
**Look** follows [Minimals](https://minimals.cc): soft grey neutrals, green primary, alpha
("soft") surfaces, rounded 16px cards with diffuse shadows, Public Sans + Vazirmatn.
**Expressiveness** for the public site borrows from Cloudflare's product pages (grids, glow,
animated diagrams) and **feature presentation** from korsi.ai (bento grids, tabbed showcases).

A live catalog is at **Panel → Design system** (`/panel/design-system`).

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
| `Input`, `Textarea`, `Label`, `Field`                                                                           | `Field` = label + control + hint/error                                                                                                                                                |
| `Select`, `Checkbox`, `RadioGroup`, `Switch`, `ToggleGroup`                                                     | Radix, RTL-aware                                                                                                                                                                      |
| `Dialog`, `Sheet` (`side="start                                                                                 | end                                                                                                                                                                                   | top | bottom"`), `AlertDialog`, `Popover`, `Tooltip`, `DropdownMenu`, `Command` | overlays |
| `Tabs`, `Accordion`, `Collapsible`, `Table`, `Progress`, `Skeleton`, `ScrollArea`, `Avatar`, `Kbd`, `Separator` |                                                                                                                                                                                       |

| Shared (`components/shared`)                                          |                                                                 |
| --------------------------------------------------------------------- | --------------------------------------------------------------- |
| `DatePicker`                                                          | Jalali (fa) / Gregorian (en), emits `YYYY-MM-DD`, form-friendly |
| `SelectField`                                                         | Select + hidden input + optional "none"                         |
| `SwitchInput`                                                         | Switch that submits `"true"/"false"`                            |
| `ConfirmDialog`, `CopyButton`, `ColorDot`, `LiveDuration`, `Markdown` |                                                                 |
| `useActionForm`, `useAction`                                          | server-action wiring with toasts + field errors                 |
| `ThemeToggle`, `AppearanceMenu`, `LocaleSwitcher`                     |                                                                 |

| Panel (`components/panel`) |                                                                     |
| -------------------------- | ------------------------------------------------------------------- |
| `PageHeader`               | title, breadcrumbs, description, actions — every page               |
| `EmptyState`               | every empty list                                                    |
| `StatCard`                 | KPI tiles (`tone`: primary/info/warning/violet/destructive/success) |
| `nav-config.ts`            | sidebar + ⌘K palette source of truth (with role filters)            |

## RTL rules

- Use logical utilities only: `ms-* me-* ps-* pe-* start-* end-* text-start text-end border-s border-e rounded-s rounded-e`.
- Directional icons (chevrons, arrows) get `rtl:rotate-180` (or swap by `dir`).
- Numbers, emails, URLs, code: wrap with `dir="ltr"`.
- Radix components read direction from `DirectionProvider` (set in the root layout).

## Patterns

- **Panel page**: `PageHeader` → KPI row (`StatCard` grid) → content `Card`s → `EmptyState` when empty.
- **Create/edit**: `Dialog` with a form (≤ 12 fields) or a dedicated page for long editors.
- **Destructive**: always `ConfirmDialog`.
- **Status**: `Badge` soft variants; colors consistent per status across modules.
- **Motion**: CSS transitions/keyframes only on the public site (`animate-float`, `animate-marquee`,
  `animate-dash`); respect `prefers-reduced-motion` (handled globally).
