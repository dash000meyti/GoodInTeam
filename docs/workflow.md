# Workflow

## Branches

| Branch                  | Purpose                                                                  | Deploys                        |
| ----------------------- | ------------------------------------------------------------------------ | ------------------------------ |
| `dev`                   | **default working branch** — every change (human or AI agent) lands here | — (CI only)                    |
| `main`                  | production                                                               | **auto-deploys** on every push |
| `feature/*`, `claude/*` | optional short-lived branches, merged into `dev`                         | —                              |

## Daily loop

1. `git switch dev && git pull`
2. Make changes → `pnpm check` (lint + typecheck + tests) → `pnpm build` for bigger changes.
3. Commit with Conventional Commits (`feat(finance): add monthly cashflow chart`).
4. `git push origin dev` → CI runs.

## Releasing ("ببرش روی main")

Only when the owner asks:

```bash
git switch main && git pull
git merge --ff-only dev        # or open a PR dev → main and merge it
git push origin main           # → production deploy
git switch dev
```

If `--ff-only` fails, `main` has commits not in `dev`: merge `main` into `dev` first, re-test,
then release.

## CI

`.github/workflows/ci.yml` runs on pushes/PRs to `dev` and `main`, in two parallel jobs:

- **check**: install → lint → typecheck → unit tests → production build;
- **e2e**: fresh demo DB (`db:reset` + `db:seed`) → production build → `pnpm start` →
  Playwright browser tests (`pnpm test:e2e`); on failure the traces and server log are uploaded.

`release.yml` builds & pushes the Docker image on `main`.

## For AI agents

- Work on `dev` (or a branch off `dev`) — never push directly to `main` unless told.
- Run `pnpm check` before every commit; run `pnpm build` when touching routing/rendering.
- Update docs (`docs/`, `AGENTS.md`) in the same commit as the behavior change.
