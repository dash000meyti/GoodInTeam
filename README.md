<div align="center">

# Good Team · گود تیم

**نمونه‌کار، بلاگ و آموزش + سیستم‌عامل کاری خصوصی + پرتال مشتری — در یک اپلیکیشن.**

Portfolio, publishing & learning site · private work OS · client portal — one Next.js app on SQLite.

</div>

## ✨ What's inside / چه چیزهایی دارد

|     | Feature                                                                                                                                                                     | قابلیت                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 🌐  | Public site: portfolio, blog, vlog, tutorials (courses), services, contact — bilingual (fa/en), SEO + AEO + GEO ready (JSON-LD, sitemap, RSS, `llms.txt`, Markdown mirrors) | سایت عمومی دوزبانه با سئو کامل و آماده برای موتورهای هوش مصنوعی |
| ⏱️  | Time tracking with **parallel timers**, timesheets, reports                                                                                                                 | زمان‌سنجی با چند تایمر همزمان                                   |
| 📅  | Calendar (Jalali + Gregorian): meetings, **commitments** (what you promised to whom, and when), deadlines, ICS feed                                                         | تقویم شمسی/میلادی، تعهدات و جلسات                               |
| ✅  | Tasks, reminders, inbox / today / upcoming / someday                                                                                                                        | کارها و یادآورها                                                |
| 📁  | Projects with milestones, progress, budgets, status feed                                                                                                                    | پروژه‌ها، مایلستون‌ها و پیشرفت                                  |
| 👥  | Clients & teams + **client portal** with per-project visibility switches                                                                                                    | مشتری‌ها و پرتال مشتری با سطح دسترسی                            |
| 💰  | Finance: accounts, multi-currency transactions, invoices, ledgers per client/project                                                                                        | مالی چندارزی، فاکتور و تراز طرف‌حساب‌ها                         |
| ✍️  | Contracts & approvals with e-signature + audit trail                                                                                                                        | قرارداد و تأییدیه با امضای الکترونیک                            |
| 🔐  | Zero-knowledge password vault (encrypted in your browser)                                                                                                                   | گاوصندوق رمزها با رمزنگاری سمت مرورگر                           |
| 📚  | Docs / knowledge base, shareable with clients                                                                                                                               | مستندات و پایگاه دانش                                           |
| 🤖  | **MCP server + REST API** for AI agents (Claude, etc.)                                                                                                                      | سرور MCP و API برای عامل‌های هوش مصنوعی                         |

## 🚀 Quick start

```bash
pnpm install
cp .env.example .env.local        # set APP_SECRET
pnpm db:seed                      # optional demo data
pnpm dev                          # http://localhost:3000  → /setup to create the owner
```

Production (Docker, data in the `goodteam-data` volume):

```bash
cp .env.example .env              # set APP_SECRET, NEXT_PUBLIC_SITE_URL
docker compose up -d --build
```

## 🧭 Docs

- [`docs/HANDOFF.md`](docs/HANDOFF.md) — **current status, open branches and next steps (read first)**

- [`AGENTS.md`](AGENTS.md) — rules & map for AI coding agents (start here)
- [`docs/`](docs/README.md) — architecture, conventions, data model, design system, security, API/MCP, deployment, roadmap

## 🌿 Workflow

Work on **`dev`** → CI → merge to **`main`** when ready → auto-deploy. See [`docs/workflow.md`](docs/workflow.md).
