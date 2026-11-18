<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Good In Team — guide for AI agents

Good In Team («گودین تیم») is a **portfolio + publishing website** and a **private work OS** (time
tracking, calendar, tasks, projects, clients, finance, contracts, password vault,
docs) with a **client portal**, in one Next.js app backed by SQLite.

Read this file fully before changing code. Deeper docs live in [`docs/`](docs/README.md).
**Current status, deployment checklist and next steps: [`docs/HANDOFF.md`](docs/HANDOFF.md).**

## Commands

```bash
pnpm dev                 # dev server (http://localhost:3000)
pnpm check               # lint + typecheck + unit tests — run before every commit
pnpm build               # production build (also validates Cache Components rules)
pnpm db:generate         # after editing src/server/db/schema/* → creates a migration in drizzle/
pnpm db:reset && pnpm db:seed   # fresh local DB with demo data (owner@goodteam.local / goodteam-demo-pass)
pnpm test:e2e            # Playwright browser tests (e2e/) against a running server with demo data
                         #   (BASE_URL=…; CI uses `pnpm start`; `@perf` timing checks need PERF=1;
                         #   BROWSERS=all adds firefox, webkit and mobile-safari — run
                         #   `pnpm exec playwright install webkit firefox` once)
node scripts/shots.mjs   # screenshots of pages (fa/en, --dark, --mobile, --full) for visual QA
```

Migrations are applied automatically when the server starts (`src/instrumentation.ts`).

- **Stop a server by its port**, never by process name:
  `lsof -ti tcp:3000 -sTCP:LISTEN | xargs kill`. Keep `-sTCP:LISTEN`: without it `lsof` also
  lists every _client_ connected to that port (browsers, the Claude desktop app…) and kills them.
  `pkill node`/`pkill next` also kills other servers, editors and tools on the machine.
- **Stop `pnpm dev` before `git merge`/`rebase`/`checkout`.** Turbopack's persistent dev cache can
  capture files mid-merge (with conflict markers) and keep failing after they're fixed; if that
  happens, or a dev page keeps reloading itself after a `pnpm build`, `rm -rf .next/dev` and restart.

## Git workflow (important)

- **All work happens on the `dev` branch.** Commit there (small, focused commits, Conventional Commits: `feat(time): …`, `fix(finance): …`, `docs: …`).
- **`main` auto-deploys to production.** Only merge `dev` → `main` when the owner explicitly says so ("ببرش روی main" / "ship it").
- Never force-push `main`. Never commit secrets, `.env*` (except `.env.example`) or `data/`.
- CI (`.github/workflows/ci.yml`) must be green: lint, typecheck, tests, build.

## Stack

Next.js 16.4 (App Router, **Cache Components + Partial Prefetching on**, Turbopack) ·
React 19.3 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui-style components on Radix
(`src/components/ui`) · SQLite via better-sqlite3 + Drizzle ORM · zod 4 · Docker (data in
the `/data` volume) · pnpm.

## Map

```
src/
  app/[locale]/            # root layout per locale (fa = default, RTL; en = LTR)
    (site)/                # public website (menu bar, .os-desktop wallpaper, framed boxes, dock)
    (auth)/login, setup    # sign-in + first-run owner setup
    panel/<module>/        # private panel (owner/admin/member) + client portal (client role)
    p/[token]              # public project status page
  app/api/                 # REST (/api/v1), MCP (/api/mcp), health
  app/styles/              # CSS partials imported by globals.css, ONE OWNER EACH (docs/design-system.md):
                           #   os-shell.css · frame.css · pixel.css (foundation), site-shell.css (site-shell),
                           #   home.css (home), site-pages.css (site-pages), guide.css (assistant),
                           #   panel-shell.css (panel-shell). Tokens stay in globals.css.
  components/ui/           # design-system primitives (shadcn structure) — reuse, don't fork
  components/brand/        # pixel logo/mark/text/icons/avatar, brand registry (docs/brand.md)
  components/shell/        # OS chrome shared by site + panel: MenuBarShell, Dock/DockLinks, Window,
                           #   OsLights, OsClock, frame.tsx (client-safe FrameBox/Grid/Cell, density),
                           #   appearance toggles, guide-events, pure helpers
  components/shared/       # app-wide building blocks (DatePicker, SelectField, Markdown…)
  components/panel/        # panel OS chrome (menu bar, dock, window, Launchpad, Control Center, quiet
                           #   guide; nav-config.ts drives the dock, menus and ⌘K), PageHeader, EmptyState…
  components/site/         # public site components; frame.tsx (FrameSection + re-exports), frame-plan.ts
                           #   (packRows), stats-cells.tsx, cta-band.tsx
  i18n/                    # locales, messages/{fa,en}/<namespace>.ts, server/client helpers
  lib/                     # pure utils: format (dates/numbers), money, tz, markdown, zod-helpers
  server/
    db/schema/*.ts         # Drizzle schema (source of truth for the data model)
    auth/                  # sessions, Actor, roles, password hashing, rate limits
    modules/<module>/      # schemas.ts · service.ts · actions.ts · tools.ts  ← business logic
    api/                   # tool registry (MCP + REST + OpenAPI from one definition)
    action.ts              # defineAction() — validated, authorized server actions
    page-context.ts        # panelContext() — actor, t, fmt, tz, href for panel pages
  proxy.ts                 # locale routing, optimistic auth gate, .md mirrors
docs/                      # architecture, conventions, data model, design system, security…
```

## Golden rules

1. **Business logic lives in `src/server/modules/<module>/service.ts`.** Services take an
   `Actor` as first argument and enforce authorization (`assertAdmin`, `projectAccessWhere`…).
   Server actions (`actions.ts`), REST and MCP tools (`tools.ts`) are thin adapters over services.
2. **Validate every input with zod** (`schemas.ts`). Reuse `src/lib/zod-helpers.ts` so the same
   schema accepts FormData strings and JSON.
3. **Cache Components rules** (see `docs/architecture.md#rendering`):
   - better-sqlite3 is synchronous → Next treats queries as build-time data. **Never query the DB
     in a component that isn't behind a request-time API** (`cookies()`, `await connection()`,
     `params` of a non-prerendered route). Panel pages call `panelContext()` first (reads the
     session); public pages call `await connection()` inside a `<Suspense>` boundary.
   - Reading `cookies()/headers()/searchParams/usePathname()/useSearchParams()` must happen inside
     `<Suspense>` (or the route's `loading.tsx`).
   - Don't call `Date.now()`/`new Date()` during render of static parts; use `ctx.now` from
     `panelContext()` or a `'use cache'` function.
   - After a mutation in a server action call `refresh()` (panel data) or `updateTag(tag)` (cached
     public content). Route handlers use `revalidateTag(tag, "max")`.
   - **Every panel route folder has a `loading.tsx`** (`<PageSkeleton />` or a layout-matching
     skeleton). Next 16.4 validates instant navigations; a missing boundary blocks the route.
4. **i18n:** never hard-code UI strings. Add keys to `src/i18n/messages/fa/<ns>.ts` (source of
   truth) **and** `en/<ns>.ts`, register new namespaces in `messages/index.ts`. Server:
   `getT()`/`panelContext().t`; client: `useT()`.
   **Business-rule errors** carry a stable key: throw the module's error class (e.g.
   `FinanceError("invoiceNotPayable", "amount")`, English text for API/MCP callers) and let the
   module's server actions re-localize it via a `localized(() => svc.x(...))` wrapper
   (`finance/errors.ts`, `users/localize.ts`). Never build user-facing error text in a service.
5. **RTL first:** use logical utilities only — `ms-/me-/ps-/pe-/start-/end-/text-start/border-s`.
   Never `ml-/mr-/pl-/pr-/left-/right-` for layout. Directional icons get `rtl:rotate-180`.
6. **Dates:** store UTC instants (`timestamp_ms`). Render with `formatDate(…, ctx.fmt)` (Jalali
   for `fa`). Day boundaries via `src/lib/tz.ts` with the app timezone. Date inputs use
   `<DatePicker>` which emits Gregorian `YYYY-MM-DD`; convert with `fromDateInput(v, time, tz)`.
7. **Money:** integer minor units + currency code (`amountMinor`, `currency`). Use
   `formatMoney`, `toMinor`, `parseMoneyInput` from `src/lib/money.ts`. Never floats in the DB.
8. **Security:** every service checks the actor; clients only see what `projects.share*` flags
   allow. Vault secrets are encrypted in the browser — the server must never receive plaintext.
   Log important mutations with `logActivity()`.
9. **UI:** compose from `components/ui` + `components/shared` + `components/panel`. **Site and
   panel speak one frame language** (docs/design-system.md "Frame"): framed boxes → stacked
   `FrameGrid`s → `FrameCell`s; square boxes with one `--frame-line` hairline and a marker on
   every corner, cells share hairlines, no soft shadows or rounded cards; only `Window`s, the
   panel window and overlays (dialogs, menus, popovers, toasts) are rounded; a `tone="dots"`
   cell never holds text; every grid layout is proven hole-free with `packRows` and completed
   with `FrameFiller`. The site uses `FrameSection` (`components/site/frame.tsx`). **The panel
   uses the same primitives at panel density** (`FrameBox density="compact"` from
   `components/shell/frame.tsx`: 16/20px cells, 32px strip, no outer margin, `gap-6`/`gap-8`
   between boxes): `Card` is such a box, `PageHeader` is the page's first box (strip with the
   route path, decor cell), several stats are one `StatGrid`/`StatRow` of `StatCard` cells
   (never a gap grid of cards). Every list needs an `EmptyState`; every page a `PageHeader`. When you add or change a
   component in `components/ui` / `components/shared`, update its example in the living catalog
   `/panel/design-system` (`panel/design-system/_components/sections/*`).
10. **OS shell rules** (Good In OS; how it works: `docs/os-shell.md`, spec: `docs/design/os-redesign.md`):
    - **Offsets** use the shell utilities `below-chrome` (sticky asides), `top-chrome` (sticky
      bars), `above-dock`, `pb-dock`, `max-h-chrome` — never hard-coded `top-*`/`bottom-*` for
      the chrome. JS reads `--chrome-top`/`--dock-space` (registered px) via
      `shell/chrome-vars.ts`. Fragment offsets come only from `html { scroll-padding }`.
    - **Contrast**: yellow is a fill, never text/icon/thin line on a light surface. Text uses
      the `-ink` tokens (`text-primary-ink`, `text-success-ink`, `text-info-ink`,
      `text-warning-ink`); the ESLint guard fails on `text-primary|success|info|warning`
      outside `dark:`. Never `eslint-disable` it.
    - **No blur** outside the menu bar and the dock (`backdrop-blur`/`glass` are banned
      elsewhere; use 95% opaque surfaces). No endless main-thread animation.
    - **Logos**: `LogoMark` (the mark is the character's icon)/`Logo`/`PixelLogo` are sized only by `cell` (integer
      px per cell) — never `size-*`/`w-*`/`h-*` on them.
    - **Guide narration**: every public box gets `guide={{ key, say }}` (FrameSection) or
      `{...guideAttrs(key, say)}`; special parts `spot` / `spotAttrs`. Lines live in the
      server-only `guide` i18n namespace and must **paraphrase copy visible in that section**
      (no new facts, no hidden text). Never ship the `guide` namespace to the site client.
    - **New CSS** goes in your track's partial under `src/app/styles/` (`@layer components`,
      never `:root {`/`.dark {`); the legacy site block in `globals.css` is frozen.
11. **Keep docs in sync:** when you add a module/feature, update `docs/modules/<module>.md` and
    the relevant section of `docs/`. Expose new capabilities as tools in `tools.ts`.

## Adding a panel module (checklist)

1. Schema exists? (`src/server/db/schema/*`). If you change it: `pnpm db:generate`, commit the SQL.
2. `src/server/modules/<m>/schemas.ts` → zod inputs.
3. `service.ts` → functions `(actor, input)`; authorization inside.
4. `actions.ts` → `"use server"` + `defineAction({ input, roles }, handler)` + `refresh()`.
5. `tools.ts` → `defineTool(...)` per capability; register in `src/server/api/registry.ts`.
6. i18n namespace `src/i18n/messages/{fa,en}/<m>.ts` + register in `messages/index.ts`.
7. Pages in `src/app/[locale]/panel/<m>/` (server components; client islands in `_components/`).
8. Nav entry in `src/components/panel/nav-config.ts` (roles!) with a lucide `icon` and a `pixel`
   dock icon drawn into `panelIcons` (`components/brand/pixel-icons.ts`, docs/brand.md#icons).
9. `loading.tsx` in every route folder of the module.
10. A project-scoped panel (`_components/project-<m>-panel.tsx`, `({ projectId, ctx, clientView })`,
    returns `null` without access) and a tab on `panel/projects/[id]/page.tsx` if the module has
    per-project data; gate client visibility with a `projects.share*` flag.
11. Unit tests for pure logic (`*.test.ts` next to the file); a Playwright test in `e2e/` for
    flows only a browser can prove. `pnpm check`, `pnpm build`.
12. Docs: `docs/modules/<m>.md`.
