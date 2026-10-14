# Module: Settings, users & design system

Everything under **Panel → Settings** (`/panel/settings/**`) plus the living style guide at
**Panel → Design system** (`/panel/design-system`).

## Files

```
src/server/modules/users/{schemas,service,actions,tools,errors,localize}.ts   account, password, team
src/server/modules/auth/{sessions,user-agent}.ts (+ actions.ts)               sessions, UA parser
src/server/modules/settings/{schemas,service,activity,data,actions,tools,utils}.ts
src/server/modules/api-tokens/{schemas,service,actions,tools}.ts
src/app/[locale]/panel/settings/
  layout.tsx            PageHeader + role-filtered section nav (SettingsNav)
  loading.tsx           sub-page skeleton (each sub-route re-exports it — see "Rendering")
  page.tsx              My account
  security/page.tsx     Sessions            security/activity/page.tsx   Activity log
  appearance/  api/  profile/  business/  team/  data/
  _components/          client islands (forms, dialogs, nav, tool catalog…)
src/app/api/backup/route.ts                  owner-only DB download
src/app/[locale]/panel/design-system/        catalog (sections in _components/sections/*)
src/components/shared/design-tokens.ts       tokens as data (+ drift test against globals.css)
src/i18n/messages/{fa,en}/{settings,designSystem}.ts
```

## Sections & roles

| Section                 | Route                               | owner | admin | member | client |
| ----------------------- | ----------------------------------- | :---: | :---: | :----: | :----: |
| My account (+ password) | `/panel/settings`                   |   ✓   |   ✓   |   ✓    |   ✓    |
| Sessions & security     | `/panel/settings/security`          |   ✓   |   ✓   |   ✓    |   ✓    |
| Activity log            | `/panel/settings/security/activity` |  all  |  all  |  own   |  own   |
| Appearance              | `/panel/settings/appearance`        |   ✓   |   ✓   |   ✓    |   ✓    |
| API & AI agents         | `/panel/settings/api`               |   ✓   |   ✓   |   ✓    |        |
| Site profile            | `/panel/settings/profile`           |   ✓   |   ✓   |        |        |
| Business                | `/panel/settings/business`          |   ✓   |   ✓   |        |        |
| Team & users            | `/panel/settings/team`              |   ✓   |   ✓   |        |        |
| Data & backup           | `/panel/settings/data`              |   ✓   |       |        |        |
| Design system (catalog) | `/panel/design-system`              |   ✓   |   ✓   |        |        |

The nav (`_components/nav-items.ts`) hides what a role can't open, but **every page and
service enforces its own role** (`panelContext({ roles })`, `assertAdmin`, `isOwner`…).

### My account

`updateAccount` (name, email — unique, lower-cased —, title, avatar URL or `/media/…` path,
preferred locale). Changing the locale redirects to the same page in the new language.
`changePassword` verifies the current password (rate-limited 10 / 15 min), requires
`newPassword === confirmPassword`, min 10 chars, re-hashes with scrypt and — by default —
deletes every other session (the current one is kept via `currentSessionId()`).

### Sessions & activity

- Session rows are identified in the UI by `publicSessionId(id)` (a hash of the DB id — the
  session hash itself never leaves the server). Expired rows are pruned on listing.
- `parseUserAgent()` (`modules/auth/user-agent.ts`, pure + tested) → "Chrome on macOS".
- `getSessionUser()` updates `last_seen_at` at most every 5 minutes.
- Activity log: `listActivity(actor, query)` — everyone gets their own rows; owner/admin can
  filter by actor, entity type, exact action and a day range (app timezone), 25 per page.
  Filters live in the URL (`next/form` GET form) so results are linkable. Human labels come
  from `settings.act_<action with dots → _>` and `settings.type_<entity>`; unknown codes fall
  back to the raw code — **add a key when you log a new action**.

### Team & users

| Operation        | Rules                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------- |
| Invite           | admin/member only; temporary password (16 chars) shown **once**                        |
| Change role      | staff roles only (owner/admin/member); only an owner grants/removes `owner`            |
| Disable / enable | disabling deletes all their sessions; API tokens stop working (auth checks `disabled`) |
| Temp password    | new password shown once; all their sessions end                                        |
| Delete           | FK cascade removes sessions, tokens, time entries, vault, notifications                |

Always: never on yourself (`self_action`), admins can't touch owners (`owner_only`), there is
always ≥ 1 active owner (`last_owner`). Client portal users are listed per client (invite
them from the client page). Project membership is managed on each project page; the team
list links to those projects.

**Error localization:** services throw `KeyedError` (`users/errors.ts`) with an English
message (what REST/MCP clients see). Server actions wrap service calls in `localized()`, which
turns the key into `settings.error_<key>` in the user's language (as a field error when the
error belongs to a field).

### Site profile & business

Stored in the `settings` table (`profile`, `business`; zod schemas with defaults in
`settings/service.ts`). Forms use flat dotted field names (`brandName.fa`) so each input gets
its own error; `unflatten()` maps them back. Social links accept full URLs, bare domains or
`@handles` (`socialUrl()`). Business: `defaultTaxBps` is edited as a percent,
`defaultHourlyRateMinor` in major units of the base currency; changing the currency does not
convert stored amounts. Saving calls `updateTag("content")` (public pages read the profile).

### API & AI agents

- Token list (own tokens only — hashes never leave the server), create dialog (name, access
  `read` / `read+write`, expiry 7/30/90/365 days or never). The raw token is shown **once**
  with ready-to-paste snippets:
  - `claude mcp add --transport http good-team <siteUrl>/api/mcp --header "Authorization: Bearer <token>"`
  - `curl -s -X POST <siteUrl>/api/v1/tools/whoami -H "Authorization: Bearer <token>" …`
- Tool catalog: `toolsFor(actor)` from the registry (name, title, scope, destructive) with
  search — exactly what the token will see over MCP/REST.

### Appearance

Theme mode (next-themes), color preset (`usePreset()` from `shared/theme-controls` — synced
across components via a MutationObserver on `<html data-preset>`) and sidebar mode
(`usePanelUI()`), all stored per browser. Previews re-skin themselves with
`presetStyle(preset)` from `shared/design-tokens`.

### Data & backup (owner)

- Stats: DB/WAL size, row counts per main table, media folder size, server backups in
  `/data/backups`, SQLite version/journal mode.
- **Download backup**: `GET /api/backup` (session cookie, owner only, `await connection()`).
  Uses better-sqlite3 `backup()` (consistent online snapshot) into
  `DATA_DIR/backups/.download-<id>.db`, opens it, unlinks it (POSIX) and streams it as
  `goodteam-backup-YYYY-MM-DD.db`; logs `backup.download`. Media files are not included.
- **Restore**: stop the app → put the file at `/data/app.db` and delete `app.db-wal` /
  `app.db-shm` → start (migrations run on boot). See [deployment.md](../deployment.md).

## Tools (MCP / REST)

| Tool                       | Scope | Roles       | Notes                                                      |
| -------------------------- | ----- | ----------- | ---------------------------------------------------------- |
| `settings_get`             | read  | owner/admin | profile + business (with percent / major-unit helpers)     |
| `settings_update_profile`  | write | owner/admin | partial; bilingual `{ fa?, en? }`; handles → links         |
| `settings_update_business` | write | owner/admin | partial; `defaultTaxPercent`, `defaultHourlyRate` (major)  |
| `users_list`               | read  | owner/admin | no hashes; role filter                                     |
| `api_tokens_list`          | read  | staff       | caller's own tokens; never secrets                         |
| `activity_list`            | read  | everyone    | own rows; owner/admin may filter by actor/type/action/days |

Destructive user operations (invite, role, disable, reset, delete) and token creation are
deliberately **UI-only**.

## Rendering notes

Panel pages read the session first (`panelContext()` → `connection()`). With Cache Components'
instant-navigation validation, **every page segment needs a Suspense boundary inside its own
folder** — otherwise dev logs "uncached data … outside of `<Suspense>`". Each settings
sub-route therefore has a one-line `loading.tsx` re-exporting `settings/loading.tsx`.

## Design system catalog

`/panel/design-system` documents tokens (preset scales, surfaces light/dark, status, greys,
charts, elevation), typography, buttons, badges, cards/StatCard/EmptyState/PageHeader, form
controls (incl. Jalali + Gregorian DatePicker side by side), overlays, navigation, data
display, charts, markdown and toasts. Every example is an `<Example code="…">` with a
Shiki-highlighted, copyable snippet (`'use cache'`d). Sections live in
`_components/sections/*` (server) with interactive demos in `_components/demos.tsx`; the
recharts demos are lazy-loaded (`charts-lazy.tsx`). **When you add or change a shared
component, add/update its example here and in [design-system.md](../design-system.md).**
