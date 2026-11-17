# Architecture

## Stack

| Layer      | Choice                                                                                 | Why                                                                             |
| ---------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Framework  | Next.js 16.4 App Router, **Cache Components** + **Partial Prefetching**                | PPR static shells + streaming → fast public pages and instant panel navigations |
| UI         | React 19.3, Tailwind v4, Radix primitives in shadcn/ui structure (`src/components/ui`) | Accessible, themeable, RTL-aware, owned source                                  |
| Data       | SQLite (better-sqlite3, WAL) + Drizzle ORM                                             | Zero-ops, microsecond reads, one file in a Docker volume                        |
| Validation | zod 4 (shared by actions, REST, MCP)                                                   | One schema → many surfaces                                                      |
| i18n       | Own typed dictionaries (`src/i18n`), `[locale]` root segment                           | Type-safe, zero runtime cost, fa (RTL) default                                  |
| Runtime    | Node 22, Docker (`output: "standalone"`), data in `/data`                              | Self-hosted, portable                                                           |

## Request flow

```
Browser ──► src/proxy.ts ──► app/[locale]/… (RSC) ──► server/modules/*/service.ts ──► SQLite
              │  • fa unprefixed → rewrite /fa/…
              │  • /panel without cookie → /login
              │  • *.md → /api/md (markdown mirrors)
AI agent ──► /api/mcp (JSON-RPC) ─┐
Script   ──► /api/v1/tools/<name> ┴► server/api/registry.ts ──► same services
```

## Rendering & data <a id="rendering"></a>

Cache Components is ON. That changes the rules compared to classic Next.js:

1. **Everything is prerendered into a static shell unless it touches request data.**
   `cookies()`, `headers()`, `searchParams`, `connection()`, un-prerendered `params`,
   `usePathname()`/`useSearchParams()` (client) are request data and must sit **inside
   `<Suspense>`** (or a segment's `loading.tsx`).
2. **better-sqlite3 is synchronous, so Next considers queries "predictable".** A query in a
   component with no request data before it would run **at build time** and be baked into
   HTML — and at build time there is no `/data` volume. Therefore:
   - **Panel pages** start with `await panelContext()` (reads the session cookie) — every query
     after that is request-time. Pages render inside `panel/loading.tsx`'s Suspense boundary.
   - **Public pages** that read content do `await connection()` in a component wrapped in
     `<Suspense>`, then call `'use cache'` data functions tagged with `cacheTag("content")`
     (see `src/server/modules/content`). The shell (header, footer, skeleton) is static; content
     streams in the same HTTP response, and repeated requests hit the in-memory cache.
   - **Route handlers** (`GET`) follow the same model — call `await connection()` first if
     they read the DB or the request.
3. **Invalidation:** server actions call `refresh()` for panel data (always fresh per request)
   and `updateTag("content")` after editing public content. Route handlers (REST/MCP) use
   `revalidateTag("content", "max")`.
4. **Time:** `Date.now()` during render is "current time" and is only allowed after request
   data. Use `ctx.now` from `panelContext()`; in static parts use a `'use cache'` helper.

`pnpm build` validates these rules — a build error mentioning "blocking prerender" or
"uncached data" means a rule above was broken.

### The shells and the guide

The site, auth and panel layouts are OS shells (menu bar, desktop, dock; [os-shell.md](os-shell.md)
has the full Suspense map). They follow the same model:

- **The chrome is static.** Menu bar, desktop, footer, dock and the native popovers prerender
  per locale. Anything request-bound gets its own `<Suspense>` hole whose fallback has the final
  size (studio clock, availability, socials, JSON-LD; in the panel the role menus, status,
  avatar, clock, window title and the role dock), so streaming causes no layout shift.
- **Public routes ship no Radix menus, tooltips or toasts.** Menus are native popovers; the
  panel's Radix Menubar and `InteractiveProviders` (tooltips, toasts) mount only under `/panel`
  (and the signing page).
- **Preferences apply before paint** with inline scripts, never effects: the colour preset
  (`gt-preset`), the boot flag (`gt-boot` → `html[data-booted]`), Reduce motion
  (`gt-motion` → `html[data-motion]`), the theme (next-themes; its script runs only from the
  server HTML) and the panel's `gt-shell` cookie (dock size, auto-hide, wide window).
- **The guide adds nothing to first load.** `GuideMount` (request-time, inside `.os-desktop`)
  renders the layer and formats the greeting on the server; narration lives in `data-guide-say`
  attributes the pages render; the vanilla engine is imported after `load` + idle and makes no
  network request.
- **Soft navigations keep the previous route mounted but hidden** (React Activity under Cache
  Components). Code and tests that query the DOM must ignore hidden subtrees (the guide engine
  does; e2e/perf checks count visible elements).

## Layers

### `src/server/db`

- `schema/*.ts` — tables grouped by domain, `relations.ts`, `types.ts` (row types).
- `client.ts` — lazy singleton connection, WAL pragmas, runs migrations from `drizzle/` on
  first connect. Import `db` (a lazy proxy) — opening happens on first query.

### `src/server/auth`

- **Session**: random 256-bit token in the `gt_session` httpOnly cookie; DB stores
  `sha256(token)`. 30-day sliding expiry. `getSessionUser()` is `React.cache`d per request.
- **Actor**: `{ via: "session" | "api" | "system", user, scopes }` — the first argument of every
  service function.
- **Roles**: `owner` (you), `admin`, `member` (team), `client` (portal). Helpers: `isAdmin`,
  `isStaff`, `assertAdmin`, `assertStaff`, `assertWrite`.

### `src/server/modules/<module>`

| File         | Purpose                                                                |
| ------------ | ---------------------------------------------------------------------- |
| `schemas.ts` | zod inputs (accept FormData strings and JSON via `lib/zod-helpers`)    |
| `service.ts` | business logic + authorization; pure functions of `(actor, input)`     |
| `actions.ts` | `"use server"`; `defineAction({ input, roles }, handler)`; `refresh()` |
| `tools.ts`   | `defineTool(...)` → MCP + REST + OpenAPI                               |

`defineAction` (in `src/server/action.ts`) authenticates, checks roles and write scope,
validates with zod (errors localized fa/en), and returns `ActionResult<T>`:
`{ ok: true, data } | { ok: false, error: { code, message, fieldErrors? } }`.

### Panel pages

```tsx
export default async function Page() {
  const { actor, t, fmt, href, now, locale, tz } = await panelContext({
    roles: ["owner", "admin"],
  });
  const rows = await listThings(actor);
  return (
    <>
      <PageHeader title={t.things.title} /> …
    </>
  );
}
```

Client islands go in `_components/` next to the page and call actions through
`useActionForm(action)` / `useAction()` (toasts + field errors).

### i18n

- URL: `fa` unprefixed (`/blog`), others prefixed (`/en/blog`). `src/proxy.ts` rewrites.
- Root layout `app/[locale]/layout.tsx` sets `<html lang dir>`; `next/root-params` gives
  `locale()` anywhere on the server (`getLocale()`).
- Messages: `src/i18n/messages/{fa,en}/<namespace>.ts`. `fa` is the key source of truth; `en`
  is type-checked against it. Client components receive messages via `I18nProvider`
  (public site ships only `common`, `nav`, `site` to keep payloads small).
- Dates: Intl with `-u-ca-persian` → Jalali calendar + Persian digits for `fa`.

### Background work

`src/instrumentation.ts` runs at server boot (migrations, owner bootstrap). Periodic jobs
(reminders, recurring tasks, overdue invoices) run in-process via `src/server/jobs` (single
node). Move to a queue if you ever scale horizontally.

## Single-node by design

SQLite + in-process cache + in-memory rate limiter assume **one container**. That's plenty for
this product. Scaling path: Litestream (replication/backup) → LiteFS or Postgres (Drizzle makes
the switch mechanical).
