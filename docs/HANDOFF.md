# تحویل برای ادامه کار روی سیستم لوکال

> وضعیت در لحظه تحویل (۲۴ مهر ۱۴۰۵). این فایل را اول بخوانید، بعد `AGENTS.md`.

## ۱. راه‌اندازی روی کامپیوتر خودتان

پیش‌نیازها: **Node.js 22+**، **pnpm 10** (با `corepack enable`)، Git. (Docker فقط برای تست ایمیج لازم است.)

```bash
git clone https://github.com/dash000meyti/GoodInTeam.git   # اگر قبلاً کلون کرده‌اید: git fetch --all
cd GoodInTeam
git switch dev                 # شاخه کاری اصلی
corepack enable
pnpm install
cp .env.example .env.local     # APP_SECRET را عوض کنید (برای dev اختیاری است)
pnpm db:reset && pnpm db:seed  # دیتابیس نمونه (data/app.db)
pnpm dev                       # http://localhost:3000
```

ورودهای نمونه (رمز همه: `goodteam-demo-pass`):

| نقش           | ایمیل                    |
| ------------- | ------------------------ |
| مالک          | `owner@goodteam.local`   |
| عضو تیم       | `sara@goodteam.local`    |
| مشتری (پرتال) | `client@acme-academy.ir` |

دستورهای مهم: `pnpm check` (lint + typecheck + test)، `pnpm build`، `pnpm db:generate` (بعد از تغییر schema)، `node scripts/shots.mjs` (اسکرین‌شات خودکار برای QA؛ روی سیستم شما مسیر Chromium را با `CHROMIUM_PATH` بدهید یا `npx playwright install chromium`).

> ویندوز/مک: `better-sqlite3` باینری آماده دارد و کامپایلر لازم نیست.

## ۲. وضعیت شاخه‌ها

| شاخه               | محتوا                                                                                                                                                                         | وضعیت                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `dev`              | پایه + پروژه‌ها/مشتری‌ها + **قراردادها و امضا** + **زمان‌سنجی، کارها، یادآورها، اعلان‌ها، jobها** + **تنظیمات، کاربران، توکن API، بکاپ، صفحه سیستم طراحی** + API/MCP + Docker | ✅ تست‌شده (`pnpm check` و `pnpm build` سبز، ۱۳۶ تست)                                     |
| `wip/finance`      | مالی: حساب‌ها، تراکنش، دسته‌ها، تراز طرف‌حساب، نرخ ارز، فاکتورها، صفحه عمومی فاکتور `/i/[token]`                                                                              | ✅ در `dev` ادغام شد (فیلدهای مشتری در `getInvoice`/`listInvoices` محدود شد)              |
| `wip/calendar`     | تقویم ماه/هفته/روز/لیست شمسی، تعهدات، فید ICS                                                                                                                                 | ✅ در `dev` ادغام شد (سری‌های تکراری در پنل پروژه، `?event=<id>`، یادآور رخدادهای تکراری) |
| `wip/vault-docs`   | گاوصندوق رمز zero-knowledge + مستندات/پایگاه دانش                                                                                                                             | ✅ در `dev` ادغام شد (`<bdi>` برای عنوان‌ها، تست e2e گاوصندوق: `pnpm test:e2e`)           |
| `wip/site-cms-seo` | سایت عمومی (خانه، نمونه‌کار، بلاگ، آموزش، خدمات، تماس)، CMS در پنل، رسانه، سئو (sitemap/robots/RSS/llms.txt/OG/JSON-LD)                                                       | ✅ در `dev` ادغام شد (اعتبارسنجی JSON-LD/sitemap/RSS/llms.txt/OG روی build تولیدی)        |

### ادغام شاخه‌های WIP (یکی‌یکی)

```bash
git switch dev
git merge origin/wip/finance        # بعد: calendar، vault-docs، site-cms-seo
```

تداخل‌های رایج فقط در این فایل‌هاست و حلشان **نگه داشتن هر دو طرف** است:
`src/i18n/messages/index.ts` (ثبت namespaceها)، `src/server/api/registry.ts` (ثبت ابزارها)، `src/server/auth/session.ts` (نسخه `dev` را نگه دارید).
بعد از هر ادغام: `pnpm install && pnpm check && pnpm build` و یک نگاه به صفحات آن ماژول.

## ۳. کارهای یکپارچه‌سازی باقی‌مانده

1. **تب‌های صفحه جزئیات پروژه** (`src/app/[locale]/panel/projects/[id]/page.tsx`): این کامپوننت‌ها آماده‌اند و باید به‌صورت تب اضافه شوند (همه `({ projectId, ctx, clientView })` می‌گیرند و اگر کاربر دسترسی نداشته باشد `null` برمی‌گردانند):
   - `panel/time/_components/project-time-panel.tsx` → `ProjectTimePanel` ✅ در dev
   - `panel/tasks/_components/project-tasks-panel.tsx` → `ProjectTasksPanel` ✅ در dev
   - `panel/contracts/_components/project-contracts-panel.tsx` → `ProjectContractsPanel` ✅ در dev
   - `panel/finance/_components/project-finance-panel.tsx` → `ProjectFinancePanel` ✅ در dev
   - `panel/calendar/_components/project-events-panel.tsx` → `ProjectEventsPanel` ✅ در dev
   - `panel/docs/_components/project-docs-panel.tsx` → `ProjectDocsPanel` ✅ در dev
2. ✅ **Job فاکتورهای سررسیدگذشته**: `invoice-overdue` (هر ساعت) در `src/server/jobs/index.ts` ثبت شد.
3. **هر پوشه صفحه پنل یک `loading.tsx`** داشته باشد (`export { default } from "../loading";`) — اعتبارسنجی instant navigation در Next 16.4.
4. **AGENTS.md** را با این قوانین به‌روز کنید: loading.tsx برای هر صفحه پنل؛ خطاهای دامنه با کلید + `localized()` در actionها؛ به‌روزرسانی مثال‌ها در `/panel/design-system`؛ کشتن پروسه‌ها فقط با پورت.
5. وضعیت‌های `docs/roadmap.md` را به‌روز کنید.

## ۴. یافته‌های بازبینی کد پایه (اولویت‌بندی‌شده)

بازبینی خودکار چندبعدی روی کد پایه انجام شد. موارد ✅ قبلاً رفع شده‌اند؛ بقیه را به همین ترتیب رفع کنید.

**بالا (امنیت/درستی)**

- [ ] `src/lib/markdown.ts`: لینک‌ها/تصاویر Markdown اسکیم را چک نمی‌کنند → XSS با `javascript:`. فقط `http(s):`, `mailto:`, مسیر نسبی و `#` مجاز باشد.
- [ ] `src/server/modules/projects/schemas.ts` و `clients/schemas.ts`: در zod 4، `partial()` پیش‌فرض‌ها را هنوز اعمال می‌کند → به‌روزرسانی جزئی (مثلاً کلیک روی وضعیت مایلستون یا `projects_update` از MCP) فیلدهایی مثل `visibleToClient`، `status`، `currency`، `kind` را به پیش‌فرض برمی‌گرداند. برای update شِمای جدا بدون `.default()` بسازید.
- [ ] لیست پروژه‌ها در پرتال مشتری ساعت و پیشرفت را حتی وقتی `shareTime`/`shareProgress` خاموش است نشان می‌دهد (`listProjects` + `panel/projects/page.tsx`).
- [x] ✅ crash صفحه پروژه به‌خاطر import `kindLabels` از فایل `"use client"`.

**متوسط**

- [ ] داشبورد اعضا (member) همه پروژه‌ها/کارها/رویدادها را می‌بیند → با `projectAccessWhere` محدود شود (`dashboard/service.ts`).
- [ ] `getProject`/`listProjects` برای member فیلدهای مدیریتی (بودجه، نرخ، shareToken) برمی‌گردانند.
- [ ] Open redirect در `safeNext` با کاراکتر tab (`/\t/evil.com`) → با `new URL()` اعتبارسنجی و کاراکترهای کنترلی رد شوند؛ `next` حداکثر ۲۰۰۰ کاراکتر.
- [ ] محدودیت ورود per-email قبل از چک رمز شمرده می‌شود → امکان قفل کردن مالک؛ فقط تلاش‌های ناموفق را بشمارید و کلید را (email, ip) کنید؛ موفقیت bucket را پاک کند.
- [ ] `src/server/auth/request.ts`: IP از هدرهای قابل جعل (`cf-connecting-ip`, `x-forwarded-for` چپ‌ترین) خوانده می‌شود → تنظیم `TRUST_PROXY` (none/cloudflare/xff:N).
- [ ] `zOptNumber` ارقام فارسی و جداکننده هزارگان را قبول نمی‌کند و ورودی‌هایی مثل `0x10` را می‌پذیرد → از `parseMoneyInput`/`toLatinDigits` استفاده شود.
- [ ] تاریخ/بودجه/نرخ پروژه بعد از تنظیم قابل پاک کردن نیستند (`dayToDate`/`toRow`).
- [ ] کد ارز بدون اعتبارسنجی → `z.enum(currencyCodes)`؛ `isCurrency` از `Object.hasOwn` استفاده کند.
- [ ] کارها/پروژه‌هایی که امروز سررسید دارند از ساعت ۰۰:۰۰ همان روز «عقب‌افتاده» نمایش داده می‌شوند.
- [ ] «رویدادهای پیش رو» در داشبورد رویدادهای تکراری را نادیده می‌گیرد.
- [ ] RRULE: `UNTIL` تاریخ‌دار باید پایان همان روز در منطقه زمانی اپ باشد؛ `WKST` نادیده گرفته می‌شود؛ dtstart با ثانیه غیرصفر.
- [ ] کامپوننت‌های کلاینت enumها را از فایل‌های schema دریزل import می‌کنند → ~۵۰۰KB اضافه در باندل پنل؛ enumها را به یک ماژول ثابت جدا (`src/server/db/enums.ts` بدون drizzle) منتقل کنید.
- [ ] `useActionForm` با `action={form.submit}`: React 19 بعد از خطای اعتبارسنجی فرم را ریست می‌کند و مقادیر تایپ‌شده پاک می‌شوند → `onSubmit` + `preventDefault` یا نگه داشتن مقادیر.
- [ ] برچسب‌های فرم به کنترل‌ها وصل نیستند (`Field` بدون `htmlFor`/`id`)؛ دکمه حذف مایلستون بدون تأیید و نامرئی تا hover.
- [ ] locale ناشناخته (مثلاً `/de/...`) سایت فارسی با ۲۰۰ برمی‌گرداند؛ matcher پروکسی چند مسیر را رد می‌کند.

**پایین**

- [ ] race در `/setup` (دو درخواست همزمان → دو owner): در تراکنش چک و درج شود.
- [ ] منبع Secure کوکی session در proxy و session.ts یکسان شود.
- [ ] `APP_SECRET` در production هنگام بوت چک شود (نه اولین استفاده)؛ `/api/health` متن خطای DB را لو ندهد.
- [ ] MCP: خطای داخلی احراز هویت را ۴۰۱ برنگرداند؛ ابزار ناشناخته → خطای JSON-RPC `-32602`؛ نسخه `2025-03-26` را از لیست حذف کنید (batch لازم دارد)؛ REST: JSON خراب → ۴۰۰.
- [ ] rate limiter API با متن توکن احرازنشده کلید می‌خورد → اول توکن را verify کنید.
- [ ] دسترس‌پذیری: نام‌های دسترسی DatePicker، دکمه جستجوی هدر در موبایل، رشته‌های انگلیسی ثابت در dialog/sheet («Close»)، ارقام لاتین در DatePicker فارسی، کنتراست عنوان گروه‌های سایدبار، فلش `→` در RTL صفحه ورود.
- [ ] ⌘K با کیبورد فارسی کار نمی‌کند (`e.code === "KeyK"`)؛ فلش وضعیت سایدبار جمع‌شده هنگام لود.
- [ ] تب‌های صفحه پروژه در موبایل overflow دارند؛ لیست به‌روزرسانی‌ها `<ol>` بدون `<li>`.
- [x] ✅ پیشرفت (progress bar) در RTL از سمت اشتباه پر می‌شد.
- [x] ✅ رنگ‌های chart-3/4 کنتراست کم داشتند.

## ۵. ادامه با Claude Code روی سیستم خودتان

در ریشه پروژه `claude` را اجرا کنید؛ `CLAUDE.md` → `AGENTS.md` به‌صورت خودکار خوانده می‌شود. پیشنهاد ترتیب پرامپت‌ها:

1. «`docs/HANDOFF.md` را بخوان. شاخه `origin/wip/finance` را در `dev` ادغام کن، کار نیمه‌تمامش را تمام کن، `pnpm check` و `pnpm build` را سبز کن و کامیت کن.» — همین را برای `wip/calendar`، `wip/vault-docs`، `wip/site-cms-seo` تکرار کنید.
2. «بخش ۳ HANDOFF (یکپارچه‌سازی) را انجام بده: تب‌های صفحه پروژه، job فاکتورها، loading.tsxها، AGENTS.md.»
3. «یافته‌های بالا و متوسط بخش ۴ را یکی‌یکی رفع کن، برای هرکدام تست بنویس.»
4. «با `scripts/shots.mjs` از همه صفحات پنل و سایت (fa/en، روشن/تیره، موبایل) اسکرین‌شات بگیر و مشکلات ظاهری را رفع کن.»
5. وقتی همه‌چیز آماده بود: «`dev` را روی `main` ببر» (استقرار خودکار).

### اتصال Claude به پنل (MCP)

بعد از اجرای سایت: پنل → تنظیمات → API و عامل‌های هوش مصنوعی → ساخت توکن، سپس:

```bash
claude mcp add --transport http good-team http://localhost:3000/api/mcp \
  --header "Authorization: Bearer gt_..."
```
