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
  `deployment.md`. The address is read only from a request the proxy vouched for (see
  [The proxy](#the-proxy)).
- Post-login redirects (`?next=`) go through `safeNext` (`server/auth/safe-next.ts`): ≤ 2000
  chars, no control characters or backslashes, and the value must resolve to the same origin
  with a single leading `/` — anything else falls back to the panel.
- First run: `/setup` creates the owner and is disabled once an owner exists
  (or bootstrap via `OWNER_EMAIL`/`OWNER_PASSWORD` env). The owner check and the insert run in
  one IMMEDIATE transaction (`createFirstOwner`), so concurrent submissions can't create two owners.
- `src/proxy.ts` does only an _optimistic_ redirect for `/panel`; **real authorization happens
  in services** (`Actor` + role/ownership checks). Never rely on hiding UI.

## The proxy

`src/proxy.ts` is the edge of the app. The rules below are pinned by `src/proxy.test.ts` and
checked against a running server by `e2e/security.spec.ts`.

- **It runs on every path.** The matcher leaves out only plain requests for what Next.js serves
  by itself (`/_next/static/…`, `/_next/image`); a request under those prefixes that names a
  server action (a `Next-Action` header, a posted form) goes through the proxy as well, because
  the app router handles it. Files under `/media/…`, `/brand/…`, `/fonts/…` and the root metadata
  files (`/robots.txt`, `/sitemap.xml`, `/llms.txt`, …) are passed through **inside** `proxy()`,
  after the header cleanup, and accept only `GET`/`HEAD`. Do not add a path to the matcher's
  exclusions: a path that skips the proxy reaches `[locale]` with its first segment as the
  "locale" and with whatever headers the client sent.
- **It vets the forwarding headers** on every path (`sanitizeForwardingHeaders`), so server code
  never sees an address header the proxy did not decide to keep.
- **It vouches for the request.** The proxy drops any incoming `x-gt-edge` and sets
  `x-gt-edge = HMAC-SHA256(APP_SECRET, "edge")` (`server/auth/edge.ts`). It does not vouch for the
  file prefixes or for `/_next/…`. `requestMeta()` (the client IP for rate limits and audit
  logs), `defineAction()` and `definePublicAction()` refuse a request without the voucher, and
  actions also require the locale the proxy routed the request to (`x-gt-locale`, which only the
  proxy sets), so an action runs only on a real page. The API's per-IP failure limit gives a
  request without the voucher no address of its own. The header never leaves the server.
- **Unknown locales are not pages.** The root layout answers a raw `[locale]` value that is not
  a locale with `notFound()` (`getLocale()`'s `"fa"` fallback is for typing only): `/brand/login`,
  `/api/login` or `/_next/panel` are 404, not a copy of the site. Unknown prefixes such as
  `/de/…` are rewritten under `/fa` and end in the catch-all 404.
- **Cache references are refused as actions.** Next.js gives every `'use cache'` function a
  server reference id, like a server action, and its action dispatcher would run either. The
  proxy answers a POST that names a cached function (in the `Next-Action` header or in the
  fields of a form posted without JavaScript) the way Next.js answers an unknown action. The id
  format is Next's own; `server/auth/server-reference.test.ts` compares our reading of it with
  Next's parser, and the e2e spec compares it with the built manifest (every cached function is
  refused, no real action is). See [Cached functions](#cached-functions).
- **Secrets never stay in a URL.** A `GET` whose query string carries `password`,
  `vault-master`, `currentPassword`, `newPassword` or `confirmPassword` (a form submitted before
  its script loaded) is answered with a 303 to the same URL without those fields, before the
  sign-in gate could copy them into `?next=`. Nothing logs the value.
- **A path that cannot be decoded is a 400** (`%ZZ`, a broken UTF-8 sequence), not a server
  error.

Unit tests call route handlers and actions without the proxy. The check is never switched off
for them: a test that needs a vouched request builds its headers with `vouchedHeaders()` from
`server/auth/edge-testing.ts` (the one documented test helper).

## Request size and work per request

- **Server actions share one body limit: 2 MB** (`serverActions.bodySizeLimit` in
  `next.config.ts` = `ACTION_BODY_LIMIT_BYTES` in `src/lib/limits.ts`). Every action is a public
  POST endpoint, so the limit is what the largest ordinary save needs (a 500,000-character page,
  a 400,000-character post, a vault item of 700,000 characters of ciphertext), not what an upload
  needs. `src/lib/limits.test.ts` and the e2e spec save each of them at its maximum.
- **No server action takes a file.** Uploads go to `POST /api/media`
  (`src/app/api/media/route.ts`): session cookie, owner/admin, same-origin (`Origin` must name
  this host), one file per request, the body read as a stream and refused past 20 MB, the type
  taken from the file's magic bytes. Larger client-side payloads are split: a vault backup is
  restored in batches, a CSV import is limited to 1,000,000 characters and checked in the browser
  first.
- **Callers without a session share a budget**: 300 server-action calls per minute per client IP
  across all actions (`enterAction()` in `server/action.ts`), on top of the tighter limits of
  sign-in, the contact form and signing.
- **Highlighting is bounded** (`src/lib/markdown.ts`): a code block over 20,000 characters, a
  line over 2,000, or anything past 50,000 characters of code per document is rendered as plain
  text in the same box. Rendering the largest document takes a fraction of a second.

## Cached functions

A `'use cache'` function is a **public endpoint**, whatever calls it in our code:

- it validates its arguments first, inside the function (enums for locale and type, row ids by
  shape, search text ≤ 200 characters, limits ≤ 100; `content/query-args.ts`), and throws on
  anything else before doing any work, so junk is neither computed nor cached;
- it returns public data only, and decides what is public itself (`visible(now)`), never from an
  argument;
- it never takes free-form content. The body of a post is rendered by
  `renderPost(postId, version)`, which loads the visible post inside; the catalog's code
  snippets use a plain in-process map instead of the cache.

Functions fed from the URL (search text, tag, slug, page) have a plain wrapper that answers
impossible values itself (an empty list, "not found"), so an odd URL is never an error.

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
  `next.config.ts`. Server Actions are CSRF-protected by Next (Origin check); the upload route
  checks `Origin` itself.
- Markdown: raw HTML is escaped (docs, contracts, project updates, previews). **Published
  content keeps a safe subset of HTML and nothing else; there is no raw-HTML mode.** Posts are
  served on the same origin as the panel, and an admin or a write-scoped API token can publish,
  so `renderMarkdown(md, { allowHtml: true })` passes its whole output through an allow-list
  (`src/lib/html-sanitize.ts`, the pinned `sanitize-html` library, server only):
  - kept: text and layout elements, lists, tables, `details`/`summary`, `figure`, `img`,
    `picture`, `video`, `audio` (http(s) or site-relative sources), links (http, https, mailto,
    tel, relative; `target="_blank"` always gets `rel="noopener noreferrer"`), heading ids, the
    classes and inline colours the highlighter writes on `pre`/`code`/`span`, task-list
    checkboxes, and `iframe` only for `https://www.youtube-nocookie.com/embed/…` (with the
    site's own feature list);
  - removed: `script`, `style`, forms and buttons, `object`/`embed`, SVG/MathML, event-handler
    attributes, `style` anywhere else, author classes and ids, `data-*`, `javascript:`/`data:`
    and other schemes.

  The feed carries the same HTML. The Markdown mirrors (`*.md`, `llms.txt`, `llms-full.txt`)
  publish the Markdown source with its raw HTML reduced to the same subset
  (`sanitizeMarkdownHtml`): outside code, every `<` is the start of an allow-listed tag with
  cleaned attributes, part of a Markdown autolink or link target, or the inert `&lt;`.

- Uploads: stored outside the web root (`/data/uploads`), served through a route with
  content-type allow-list and `nosniff`.
- Form fields become an object without a prototype (`formDataToObject`), so a field named
  `__proto__` is an ordinary key the schema drops.
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
