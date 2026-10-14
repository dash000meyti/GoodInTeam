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
| `OWNER_EMAIL` / `OWNER_PASSWORD` / `OWNER_NAME` |          |                         | bootstrap the owner on first boot (else visit `/setup`)                                     |

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
