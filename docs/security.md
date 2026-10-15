# Security model

## Authentication

- Passwords: **scrypt** (N=2^15, r=8, p=1, 64-byte key, per-user salt), constant-time compare,
  dummy hash on unknown emails (no user enumeration by timing).
- Sessions: 256-bit random token in `gt_session` (httpOnly, SameSite=Lax; Secure in production
  when `NEXT_PUBLIC_SITE_URL` is https — one helper, `server/auth/cookie.ts`, is used both at
  sign-in and by the proxy's sliding refresh); only `sha256(token)` is stored. 30-day sliding
  expiry. Logout deletes the row.
- Login throttling (`server/modules/auth/login-throttle.ts`): only **failed** attempts count —
  8 per 15 min per (email, IP) pair and 20 per 15 min per IP across all emails. A successful
  sign-in clears its (email, IP) bucket. Failures from one IP never lock the account out for
  other IPs. Each attempt reserves its slot before the password check, so parallel bursts can't
  exceed the limit.
- API (`server/api/auth.ts`): the bearer token is verified first, then limited to 600/min **per
  token id** (unverified token text never creates a bucket). Failed authentications are counted
  per client IP (30/min → 429); a valid token is never blocked by other clients' failures.
- Other rate limits: contact form, contract view/sign (in-memory, single node; keys are
  namespaced and each namespace is capped so key floods can't exhaust memory).
- Client IP (rate limits, sessions, audit log, signatures) comes from `TRUST_PROXY`
  (`server/auth/client-ip.ts`): `none` (default) uses the socket address and strips
  client-supplied `X-Forwarded-For`/`X-Real-IP`/`CF-Connecting-IP` in the proxy; `cloudflare`
  trusts `CF-Connecting-IP`; `xff:N` takes the N-th `X-Forwarded-For` entry from the right. See
  `deployment.md`.
- Post-login redirects (`?next=`) go through `safeNext` (`server/auth/safe-next.ts`): ≤ 2000
  chars, no control characters or backslashes, and the value must resolve to the same origin
  with a single leading `/` — anything else falls back to the panel.
- First run: `/setup` creates the owner and is disabled once an owner exists
  (or bootstrap via `OWNER_EMAIL`/`OWNER_PASSWORD` env). The owner check and the insert run in
  one IMMEDIATE transaction (`createFirstOwner`), so concurrent submissions can't create two owners.
- `src/proxy.ts` does only an _optimistic_ redirect for `/panel`; **real authorization happens
  in services** (`Actor` + role/ownership checks). Never rely on hiding UI.
- The proxy runs on every path except `/_next/…`, `/media/…`, `public/` asset folders and the
  exact root metadata files (`src/proxy.test.ts` pins the matcher). Paths that skipped it used to
  reach `[locale]` with a bogus "locale" (`/apical` rendered the home page with 200); now unknown
  prefixes such as `/de/…` are rewritten under `/fa` and end in the catch-all 404.

## Authorization

| Role   | Access                                                                                                                                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| owner  | everything                                                                                                                                                                                                  |
| admin  | everything except owner-only settings                                                                                                                                                                       |
| member | assigned projects (`project_members`), own time, tasks, calendar, docs (team), own vault                                                                                                                    |
| client | portal only: projects of their `client_id` with `portal_enabled`, and only the parts enabled by `share_progress / share_time / share_tasks / share_finance / share_docs`; items flagged `visible_to_client` |

Helpers: `projectAccessWhere(actor)` (SQL filter), `assertProjectRead`, `assertAdmin`,
`assertStaff`, `assertWrite` (API token scope).

## API tokens (REST + MCP)

- Format `gt_<43 chars>`; shown **once**; DB stores `HMAC-SHA256(APP_SECRET, token)` so a DB
  leak alone can't be used. Scopes: `read`, `write`, `admin`. Optional expiry; revocable.
- Every API/MCP call is logged in `activity_log` (`actor_type = api`).

## Password vault (zero-knowledge)

- In the **browser** (Web Crypto): master password → PBKDF2-SHA256 (600k iterations, 16-byte
  salt) → KEK (AES-GCM 256). A random 256-bit **vault key** is generated and stored on the
  server only wrapped by the KEK (`vault_keys.wrapped_key`, `wrap_iv`).
- Each item's JSON payload is encrypted with the vault key (AES-GCM, random 96-bit IV) →
  `vault_items.ciphertext`, `iv`. Titles are encrypted too.
- A one-time **recovery key** (shown once) wraps the same vault key as a backup.
- The server never sees the master password, the vault key or plaintext. Losing both the master
  password and the recovery key = data is unrecoverable (by design).
- The unlocked key lives only in memory; auto-locks after inactivity.

## Contracts & signatures

- Shared via an unguessable token link (`/sign/<token>`, 192-bit).
- The signed text is pinned: `content_hash = sha256(body_md)` + `version` recorded with each
  signature (name, typed name, drawn signature PNG, IP, user agent, timestamp).
- Editing a sent contract bumps the version and invalidates pending signatures.
- `contract_events` is an append-only audit trail (sent, viewed, signed, declined…).

## Web hardening

- Security headers (HSTS, nosniff, Referrer-Policy, X-Frame-Options, Permissions-Policy) in
  `next.config.ts`. Server Actions are CSRF-protected by Next (Origin check).
- Markdown: raw HTML is escaped unless content is owner-authored public content.
- Uploads: stored outside the web root (`/data/uploads`), served through a route with
  content-type allow-list and `nosniff`.
- Secrets only via env (`APP_SECRET`), never committed. `.env*` is git-ignored. The
  configuration is validated at boot (`assertValidEnv()` in `src/server/bootstrap.ts`, run from
  `src/instrumentation.ts`): in production a missing/placeholder `APP_SECRET` (or an invalid
  `TRUST_PROXY` anywhere) stops the server with a clear message instead of failing on the first
  request that needs it.
- `/api/health` only reports `{ ok, db }`; database errors are logged server-side, never
  returned.

## Backups

`node scripts/backup.mjs` (in the container) writes consistent online SQLite backups to
`/data/backups` (keeps 14). Schedule it with cron on the host; copy off-site. See
`deployment.md`.
