# Deployment

## Image & volume

- `Dockerfile` builds a standalone Next.js server (multi-stage, Node 22 slim, non-root, no OS
  packages needed, healthcheck on `/api/health`; compose adds `init: true` for signal handling).
  Verified: build → run with a volume → auto-migrate → owner bootstrap → health → backup.
- **All state lives in `/data`** (mount a volume there):
  - `/data/app.db` (+ `-wal`, `-shm`) — SQLite database
  - `/data/uploads/` — media uploads
  - `/data/backups/` — backups from `scripts/backup.mjs`
- Migrations run automatically on boot (`src/instrumentation.ts`).

## Environment

| Var                                             | Required | Example                 | Notes                                                                                       |
| ----------------------------------------------- | -------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| `APP_SECRET`                                    | ✅       | 32+ random bytes base64 | HMAC for API tokens & share links. **Never change** after go-live (invalidates API tokens). |
| `NEXT_PUBLIC_SITE_URL`                          | ✅       | `https://goodteam.ir`   | canonical URLs, sitemap, OG. Build arg too.                                                 |
| `DATA_DIR`                                      |          | `/data`                 | set by the image                                                                            |
| `APP_TIMEZONE`                                  |          | `Asia/Tehran`           | default for date math (overridable in settings)                                             |
| `TRUST_PROXY`                                   |          | `xff:1`                 | where the client IP comes from: `none` (default), `cloudflare`, `xff:N` — see below         |
| `OWNER_EMAIL` / `OWNER_PASSWORD` / `OWNER_NAME` |          |                         | bootstrap the owner on first boot (else visit `/setup`)                                     |

### Client IP (`TRUST_PROXY`)

The client IP feeds login/contact/signing rate limits, the sessions list, the activity log and
contract signatures. Headers such as `X-Forwarded-For` are set by whoever sends the request, so
the app only trusts the header your own infrastructure controls:

| Value        | Use when                                                                    | IP is read from                                    |
| ------------ | --------------------------------------------------------------------------- | -------------------------------------------------- |
| `none`       | default; clients reach the container directly (no reverse proxy)            | the TCP peer address (client headers are stripped) |
| `xff:N`      | N reverse proxies (Caddy, Traefik, Nginx, a load balancer…) in front        | the N-th `X-Forwarded-For` entry from the right    |
| `cloudflare` | the origin is reachable **only** through Cloudflare (firewall rule, Tunnel) | `CF-Connecting-IP`                                 |

- One reverse proxy in front of the container (the usual Docker setup) → `TRUST_PROXY=xff:1`.
  Make sure it **appends** the peer address — Caddy and Traefik do by default; for Nginx use
  `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`.
- Cloudflare in front of Caddy/Nginx: `cloudflare` (with the origin firewalled to Cloudflare), or
  `xff:2` if Cloudflare → your proxy → app each append.
- With `none` behind a proxy every request appears to come from the proxy's address, so all
  clients share one rate-limit bucket. With a proxy-trusting value but no such proxy, clients can
  forge their IP. An invalid value stops the server at boot.

## Options

### A) Docker Compose on a VPS (simplest)

```bash
git clone … && cd GoodInTeam
cp .env.example .env   # fill APP_SECRET, NEXT_PUBLIC_SITE_URL
docker compose up -d --build
```

Put Caddy/Traefik/Nginx in front for TLS. For Nginx keep `proxy_buffering off;` (streaming).

### B) Coolify / Dokploy / CapRover (auto-deploy on push to `main`)

- Create an app from this GitHub repo, branch **`main`**, build pack **Dockerfile**.
- Add a persistent volume → container path **`/data`**.
- Set env vars above; port 3000; health check `/api/health`.
- Enable "auto deploy on push". That's the `main` = production workflow.

### C) Pre-built image from GHCR

`.github/workflows/release.yml` pushes `ghcr.io/<owner>/<repo>:latest` on every push to `main`.
Point your server/platform at that image and (optionally) set repo variable
`DEPLOY_WEBHOOK_ENABLED=true` + secret `DEPLOY_WEBHOOK_URL` to trigger a redeploy.

## Backups

```bash
# daily at 03:30 on the host
30 3 * * * docker compose -f /srv/goodteam/docker-compose.yml exec -T app node scripts/backup.mjs
```

Copy `/data/backups` off-site (rclone/S3). Optional: Litestream for continuous replication.

## Restore

Stop the app, replace `/data/app.db` with a backup file (remove `-wal`/`-shm`), start the app.
