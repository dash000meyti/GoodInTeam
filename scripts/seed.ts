/**
 * Demo data for local development, screenshots and agent testing.
 *
 *   pnpm db:reset && pnpm db:seed
 *
 * Refuses to run when projects already exist (pass --force to append anyway).
 * Never run against production data.
 */
import { count, eq as sqlEq } from "drizzle-orm";
import { db } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { sha256 } from "@/server/auth/crypto";
import { readingMinutes } from "@/lib/markdown";
import { newToken } from "@/lib/ids";
import { addDays, startOfDay, zonedParts, zonedTimeToUtc } from "@/lib/tz";

const TZ = process.env.APP_TIMEZONE ?? "Asia/Tehran";
const force = process.argv.includes("--force");

if (!force && (db.select({ n: count() }).from(s.projects).get()?.n ?? 0) > 0) {
  console.log("Database already has data — skipping seed (use --force to append).");
  process.exit(0);
}

// Deterministic pseudo-random generator so screenshots are stable.
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;
const now = Date.now();
const today = startOfDay(now, TZ);
const day = (offset: number, h = 0, m = 0) => {
  const d = addDays(today, offset, TZ);
  const p = zonedParts(d, TZ);
  return zonedTimeToUtc(p.year, p.month, p.day, h, m, TZ);
};

async function main() {
  // ─── Users ────────────────────────────────────────────────────────────────
  const ownerEmail = process.env.OWNER_EMAIL ?? "owner@goodteam.local";
  const ownerPassword = process.env.OWNER_PASSWORD ?? "goodteam-demo-pass";
  const existingOwner = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.role, "owner"),
  });
  const owner =
    existingOwner ??
    db
      .insert(s.users)
      .values({
        email: ownerEmail,
        name: process.env.OWNER_NAME ?? "مهدی رضایی",
        role: "owner",
        passwordHash: await hashPassword(ownerPassword),
        title: "بنیان‌گذار و توسعه‌دهنده ارشد",
      })
      .returning()
      .get();
  const member = db
    .insert(s.users)
    .values({
      email: "sara@goodteam.local",
      name: "سارا محمدی",
      role: "member",
      title: "طراح محصول",
      passwordHash: await hashPassword("goodteam-demo-pass"),
    })
    .returning()
    .get();

  // ─── Settings ─────────────────────────────────────────────────────────────
  db.insert(s.settings)
    .values([
      {
        key: "profile",
        value: {
          brandName: { fa: "گود تیم", en: "Good Team" },
          ownerName: { fa: owner.name, en: "Mahdi Rezaei" },
          headline: {
            fa: "طراحی و توسعه محصولات دیجیتال",
            en: "Designing & building digital products",
          },
          bio: {
            fa: "ما یک استودیوی کوچک طراحی و توسعه محصول هستیم. وب‌اپلیکیشن، اپ موبایل، اتوماسیون و عامل‌های هوش مصنوعی می‌سازیم و تجربه‌هایمان را با شما به اشتراک می‌گذاریم.",
            en: "We are a small product design & engineering studio. We build web apps, mobile apps, automations and AI agents — and share what we learn along the way.",
          },
          avatarUrl: "",
          email: "hello@goodteam.local",
          phone: "",
          location: { fa: "تهران، ایران", en: "Tehran, Iran" },
          socials: {
            x: "https://x.com/",
            linkedin: "https://linkedin.com/",
            github: "https://github.com/",
            telegram: "https://t.me/",
            instagram: "",
            youtube: "",
          },
          availableForWork: true,
        },
      },
      {
        key: "business",
        value: {
          baseCurrency: "IRT",
          timezone: TZ,
          invoicePrefix: "GT-",
          defaultTaxBps: 1000,
          defaultHourlyRateMinor: 450_000,
          paymentInstructions: {
            fa: "واریز به شماره کارت ۶۱۰۴-۳۳۷۷-****-**** به نام گود تیم",
            en: "Bank transfer — details on request.",
          },
        },
      },
    ])
    .onConflictDoNothing()
    .run();

  // ─── Clients ──────────────────────────────────────────────────────────────
  const [acme, narenj, clinic, perse] = db
    .insert(s.clients)
    .values([
      {
        name: "آکادمی آکمه",
        kind: "company",
        email: "pm@acme-academy.ir",
        phone: "021-88000000",
        website: "https://acme-academy.ir",
        color: "#078DEE",
        defaultCurrency: "IRT",
        notes: "مدیر پروژه: آقای کریمی. جلسات هفتگی شنبه‌ها ساعت ۱۰.",
      },
      {
        name: "تیم فروشگاه نارنج",
        kind: "team",
        email: "team@narenj.shop",
        color: "#FDA92D",
        defaultCurrency: "IRT",
      },
      {
        name: "Rivera Clinic",
        kind: "company",
        email: "sam@riveraclinic.com",
        website: "https://riveraclinic.com",
        color: "#7635DC",
        defaultCurrency: "USD",
      },
      {
        name: "استودیو پرسه",
        kind: "team",
        email: "hi@perse.studio",
        color: "#22C55E",
        defaultCurrency: "IRT",
      },
    ])
    .returning()
    .all() as [s.Client, s.Client, s.Client, s.Client];

  db.insert(s.users)
    .values({
      email: "client@acme-academy.ir",
      name: "علی کریمی",
      role: "client",
      clientId: acme.id,
      passwordHash: await hashPassword("goodteam-demo-pass"),
    })
    .run();

  // ─── Projects ─────────────────────────────────────────────────────────────
  const [pLms, pShop, pClinic, pSite, pBot] = db
    .insert(s.projects)
    .values([
      {
        name: "پلتفرم آموزش آنلاین آکمه",
        slug: "acme-lms",
        clientId: acme.id,
        status: "active",
        color: "#078DEE",
        description:
          "طراحی و توسعه پلتفرم آموزش آنلاین با **پخش ویدیو**، آزمون آنلاین، پرداخت و پنل مدرس.\n\n- Next.js + PostgreSQL\n- پخش HLS\n- درگاه پرداخت",
        startDate: day(-60),
        dueDate: day(24),
        billingType: "hourly",
        currency: "IRT",
        hourlyRateMinor: 450_000,
        budgetMinor: 180_000_000,
        estimateHours: 400,
        progressMode: "milestones",
        websiteUrl: "https://acme-academy.ir",
        repoUrl: "https://github.com/goodteam/acme-lms",
        portalEnabled: true,
        shareProgress: true,
        shareTime: true,
        shareTasks: true,
        shareFinance: true,
        shareDocs: true,
        shareToken: newToken(18),
      },
      {
        name: "اپلیکیشن فروشگاه نارنج",
        slug: "narenj-app",
        clientId: narenj.id,
        status: "active",
        color: "#FDA92D",
        description:
          "اپلیکیشن موبایل فروشگاه آنلاین با React Native، سبد خرید، پیگیری سفارش و باشگاه مشتریان.",
        startDate: day(-30),
        dueDate: day(45),
        billingType: "fixed",
        currency: "IRT",
        budgetMinor: 320_000_000,
        estimateHours: 520,
        progressMode: "milestones",
        portalEnabled: true,
        shareProgress: true,
      },
      {
        name: "Clinic booking & analytics",
        slug: "rivera-clinic",
        clientId: clinic.id,
        status: "planning",
        color: "#7635DC",
        description:
          "Online booking, patient reminders and an analytics dashboard for a dental clinic.",
        startDate: day(5),
        dueDate: day(80),
        billingType: "hourly",
        currency: "USD",
        hourlyRateMinor: 4_500,
        budgetMinor: 1_200_000,
        estimateHours: 260,
        progressMode: "tasks",
      },
      {
        name: "وب‌سایت و پنل Good Team",
        slug: "good-team-site",
        status: "active",
        color: "#00A76F",
        description: "همین سایت! نمونه‌کارها، بلاگ، آموزش و پنل مدیریت زمان، مالی و قراردادها.",
        billingType: "internal",
        currency: "IRT",
        progressMode: "manual",
        progress: 35,
      },
      {
        name: "ربات تلگرام رزرو پرسه",
        slug: "perse-bot",
        clientId: perse.id,
        status: "completed",
        color: "#22C55E",
        description: "ربات رزرو نوبت و پرداخت برای استودیو عکاسی.",
        startDate: day(-120),
        dueDate: day(-70),
        billingType: "fixed",
        currency: "IRT",
        budgetMinor: 45_000_000,
        progressMode: "manual",
        progress: 100,
      },
    ])
    .returning()
    .all() as [s.Project, s.Project, s.Project, s.Project, s.Project];

  db.insert(s.projectMembers)
    .values([
      { projectId: pLms.id, userId: member.id },
      { projectId: pShop.id, userId: member.id },
    ])
    .run();

  db.insert(s.milestones)
    .values([
      {
        projectId: pLms.id,
        title: "کشف نیازمندی‌ها و طراحی UX",
        status: "done",
        weight: 2,
        dueDate: day(-45),
        completedAt: day(-46),
        sort: 1,
      },
      {
        projectId: pLms.id,
        title: "طراحی رابط کاربری و سیستم طراحی",
        status: "done",
        weight: 2,
        dueDate: day(-28),
        completedAt: day(-27),
        sort: 2,
      },
      {
        projectId: pLms.id,
        title: "پخش ویدیو و پنل مدرس",
        status: "in_progress",
        weight: 3,
        dueDate: day(3),
        sort: 3,
      },
      {
        projectId: pLms.id,
        title: "آزمون آنلاین و پرداخت",
        status: "planned",
        weight: 2,
        dueDate: day(16),
        sort: 4,
      },
      {
        projectId: pLms.id,
        title: "تست، استقرار و آموزش تیم",
        status: "planned",
        weight: 1,
        dueDate: day(24),
        sort: 5,
      },
      {
        projectId: pShop.id,
        title: "طراحی تجربه کاربری",
        status: "done",
        weight: 2,
        dueDate: day(-12),
        completedAt: day(-12),
        sort: 1,
      },
      {
        projectId: pShop.id,
        title: "سبد خرید و پرداخت",
        status: "in_progress",
        weight: 3,
        dueDate: day(14),
        sort: 2,
      },
      {
        projectId: pShop.id,
        title: "باشگاه مشتریان و اعلان‌ها",
        status: "planned",
        weight: 2,
        dueDate: day(32),
        sort: 3,
      },
      {
        projectId: pShop.id,
        title: "انتشار در استورها",
        status: "planned",
        weight: 1,
        dueDate: day(45),
        sort: 4,
      },
    ])
    .run();
  // progress from milestones (done = full weight, in_progress = half)
  db.update(s.projects).set({ progress: 56 }).where(sqlEq(s.projects.id, pLms.id)).run();
  db.update(s.projects).set({ progress: 44 }).where(sqlEq(s.projects.id, pShop.id)).run();

  db.insert(s.projectUpdates)
    .values([
      {
        projectId: pLms.id,
        kind: "release",
        title: "نسخه آزمایشی پنل مدرس منتشر شد",
        bodyMd:
          "پنل مدرس روی سرور تست در دسترس است:\n\n- آپلود ویدیو با نوار پیشرفت\n- مدیریت فصل‌ها و جلسات\n- پیش‌نمایش دوره\n\nلطفاً بازخوردها را تا پنجشنبه ارسال کنید.",
        createdBy: owner.id,
        createdAt: day(-2, 18),
      },
      {
        projectId: pLms.id,
        kind: "update",
        title: "گزارش هفتگی — هفته ۸",
        bodyMd:
          "این هفته روی **پخش HLS** و کیفیت تطبیقی کار کردیم. سرعت شروع پخش ۴۰٪ بهتر شده است.",
        createdBy: owner.id,
        createdAt: day(-7, 17),
      },
      {
        projectId: pLms.id,
        kind: "request",
        title: "نیاز به دسترسی درگاه پرداخت",
        bodyMd: "برای تست پرداخت، مرچنت‌کد محیط تست درگاه را لازم داریم.",
        createdBy: owner.id,
        createdAt: day(-9, 11),
      },
      {
        projectId: pShop.id,
        kind: "update",
        title: "طراحی صفحات سبد خرید تأیید شد",
        createdBy: member.id,
        createdAt: day(-3, 15),
      },
    ])
    .run();

  // ─── Tasks ────────────────────────────────────────────────────────────────
  const taskRows: (typeof s.tasks.$inferInsert)[] = [
    {
      title: "پیاده‌سازی پخش HLS با کیفیت تطبیقی",
      projectId: pLms.id,
      status: "in_progress",
      priority: 3,
      dueAt: day(1),
      estimateMinutes: 480,
      visibleToClient: true,
    },
    {
      title: "صفحه آپلود ویدیو و نوار پیشرفت",
      projectId: pLms.id,
      status: "done",
      priority: 2,
      completedAt: day(-2),
      visibleToClient: true,
    },
    {
      title: "ارسال گزارش هفتگی به آکمه",
      projectId: pLms.id,
      status: "todo",
      priority: 2,
      dueAt: day(0),
      recurrence: "FREQ=WEEKLY;BYDAY=WE",
    },
    {
      title: "طراحی آزمون چندگزینه‌ای",
      projectId: pLms.id,
      status: "todo",
      priority: 1,
      dueAt: day(6),
      visibleToClient: true,
    },
    {
      title: "اتصال درگاه پرداخت (محیط تست)",
      projectId: pLms.id,
      status: "waiting",
      priority: 3,
      dueAt: day(4),
      notes: "منتظر مرچنت‌کد از مشتری",
    },
    {
      title: "سبد خرید آفلاین (ذخیره محلی)",
      projectId: pShop.id,
      status: "in_progress",
      priority: 2,
      dueAt: day(3),
    },
    {
      title: "پیاده‌سازی کد تخفیف",
      projectId: pShop.id,
      status: "todo",
      priority: 1,
      dueAt: day(9),
    },
    {
      title: "رفع باگ نمایش قیمت در iOS",
      projectId: pShop.id,
      status: "todo",
      priority: 4,
      dueAt: day(-1),
    },
    {
      title: "Kickoff call agenda",
      projectId: pClinic.id,
      status: "todo",
      priority: 2,
      dueAt: day(2),
    },
    {
      title: "Draft data model for appointments",
      projectId: pClinic.id,
      status: "inbox",
      priority: 1,
    },
    {
      title: "نوشتن مقاله درباره SQLite در تولید",
      projectId: pSite.id,
      status: "todo",
      priority: 1,
      dueAt: day(5),
    },
    {
      title: "ضبط ویدیوی آموزش Next.js — قسمت ۴",
      projectId: pSite.id,
      status: "someday",
      priority: 0,
    },
    { title: "تمدید دامنه و SSL", status: "todo", priority: 3, dueAt: day(2), remindAt: day(1, 9) },
    {
      title: "پرداخت قبض اینترنت",
      status: "todo",
      priority: 2,
      dueAt: day(0),
      remindAt: day(0, 10),
    },
    { title: "خرید هارد اکسترنال برای بکاپ", status: "inbox", priority: 0 },
    {
      title: "بررسی پیشنهاد همکاری استودیو پرسه",
      status: "done",
      priority: 1,
      completedAt: day(-4),
    },
  ];
  const tasks = db
    .insert(s.tasks)
    .values(taskRows.map((t, i) => ({ ...t, sort: i, createdBy: owner.id })))
    .returning()
    .all();

  // ─── Time entries (last 3 weeks, Sat–Wed working days) ────────────────────
  const workProjects = [pLms, pLms, pShop, pShop, pSite, pClinic];
  const descriptions: Record<string, string[]> = {
    [pLms.id]: ["پخش ویدیو HLS", "پنل مدرس", "جلسه با تیم آکمه", "رفع باگ آپلود", "کدنویسی آزمون"],
    [pShop.id]: ["سبد خرید", "طراحی UI صفحه محصول", "API سفارش‌ها", "تست روی iOS"],
    [pSite.id]: ["سیستم طراحی سایت", "نوشتن مقاله", "پنل زمان‌سنجی"],
    [pClinic.id]: ["Discovery call", "Data model draft"],
  };
  const entries: (typeof s.timeEntries.$inferInsert)[] = [];
  for (let d = -21; d <= 0; d++) {
    const wd = zonedParts(day(d), TZ).weekday; // 0 = Sunday … 5 = Friday
    if (wd === 4 || wd === 5) continue; // Thu/Fri off
    let cursor = 9 * 60 + Math.floor(rand() * 40);
    const blocks = 2 + Math.floor(rand() * 3);
    for (let b = 0; b < blocks; b++) {
      const proj = pick(workProjects);
      const len = 45 + Math.floor(rand() * 150);
      const start = day(d, Math.floor(cursor / 60), cursor % 60);
      const end = new Date(start.getTime() + len * 60_000);
      if (d === 0 && end.getTime() > now) break;
      entries.push({
        userId: owner.id,
        projectId: proj.id,
        description: pick(descriptions[proj.id]!),
        startedAt: start,
        endedAt: end,
        billable: proj.id !== pSite.id,
        hourlyRateMinor: proj.hourlyRateMinor,
        currency: proj.currency,
        source: "timer",
      });
      cursor += len + 10 + Math.floor(rand() * 40);
    }
  }
  // Member's time
  for (let d = -10; d <= -1; d++) {
    const start = day(d, 10, 0);
    entries.push({
      userId: member.id,
      projectId: pShop.id,
      description: "طراحی UI",
      startedAt: start,
      endedAt: new Date(start.getTime() + 3 * 3_600_000),
      billable: true,
      source: "timer",
    });
  }
  // One running timer (shows the live widget) + a second parallel one.
  entries.push({
    userId: owner.id,
    projectId: pLms.id,
    taskId: tasks[0]!.id,
    description: "پخش HLS با کیفیت تطبیقی",
    startedAt: new Date(now - 47 * 60_000),
    billable: true,
    hourlyRateMinor: pLms.hourlyRateMinor,
    currency: "IRT",
    source: "timer",
  });
  entries.push({
    userId: owner.id,
    projectId: pShop.id,
    description: "انتظار برای بیلد iOS",
    startedAt: new Date(now - 12 * 60_000),
    billable: true,
    currency: "IRT",
    source: "timer",
  });
  db.insert(s.timeEntries).values(entries).run();

  // ─── Calendar ─────────────────────────────────────────────────────────────
  db.insert(s.events)
    .values([
      {
        title: "جلسه هفتگی با آکمه",
        kind: "meeting",
        startAt: day(3, 10),
        endAt: day(3, 11),
        projectId: pLms.id,
        clientId: acme.id,
        meetingUrl: "https://meet.google.com/abc-defg-hij",
        recurrence: "FREQ=WEEKLY;BYDAY=SA",
        color: "#078DEE",
        visibleToClient: true,
        createdBy: owner.id,
      },
      {
        title: "تحویل نسخه آزمایشی پنل مدرس",
        kind: "commitment",
        startAt: day(2, 17),
        allDay: false,
        projectId: pLms.id,
        clientId: acme.id,
        promisedAt: day(-6, 11),
        status: "confirmed",
        color: "#FF5630",
        description: "در جلسه هفته قبل قول دادم تا پنجشنبه نسخه تست آماده باشد.",
        createdBy: owner.id,
      },
      {
        title: "ارسال طرح‌های صفحه پرداخت به نارنج",
        kind: "commitment",
        startAt: day(1, 0),
        allDay: true,
        projectId: pShop.id,
        clientId: narenj.id,
        promisedAt: day(-3, 16),
        createdBy: owner.id,
      },
      {
        title: "Kickoff — Rivera Clinic",
        kind: "meeting",
        startAt: day(5, 18, 30),
        endAt: day(5, 19, 30),
        projectId: pClinic.id,
        clientId: clinic.id,
        meetingUrl: "https://zoom.us/j/123456789",
        color: "#7635DC",
        createdBy: owner.id,
      },
      {
        title: "مهلت انتشار اپ نارنج",
        kind: "deadline",
        startAt: day(45),
        allDay: true,
        projectId: pShop.id,
        color: "#FDA92D",
        createdBy: owner.id,
      },
      {
        title: "تمرکز عمیق: پخش ویدیو",
        kind: "focus",
        startAt: day(0, 14),
        endAt: day(0, 17),
        projectId: pLms.id,
        color: "#00A76F",
        createdBy: owner.id,
      },
      {
        title: "تمرکز عمیق: سبد خرید",
        kind: "focus",
        startAt: day(1, 9),
        endAt: day(1, 12),
        projectId: pShop.id,
        color: "#00A76F",
        createdBy: owner.id,
      },
      {
        title: "دندانپزشکی",
        kind: "personal",
        startAt: day(4, 16),
        endAt: day(4, 17),
        createdBy: owner.id,
      },
      {
        title: "پرداخت مالیات فصلی",
        kind: "reminder",
        startAt: day(12, 9),
        allDay: true,
        remindMinutesBefore: 1440,
        createdBy: owner.id,
      },
      {
        title: "تحویل نهایی ربات پرسه",
        kind: "commitment",
        startAt: day(-70, 12),
        projectId: pBot.id,
        clientId: perse.id,
        promisedAt: day(-100),
        status: "done",
        createdBy: owner.id,
      },
    ])
    .run();

  // ─── Finance ──────────────────────────────────────────────────────────────
  const [bank, usdt, wise, cash] = db
    .insert(s.accounts)
    .values([
      {
        name: "بانک ملت",
        kind: "bank",
        currency: "IRT",
        openingBalanceMinor: 85_000_000,
        color: "#FF5630",
        sort: 1,
      },
      {
        name: "کیف پول تتر",
        kind: "crypto",
        currency: "USDT",
        openingBalanceMinor: 120_000,
        color: "#22C55E",
        sort: 2,
      },
      {
        name: "Wise (USD)",
        kind: "bank",
        currency: "USD",
        openingBalanceMinor: 95_000,
        color: "#00B8D9",
        sort: 3,
      },
      {
        name: "صندوق نقدی",
        kind: "cash",
        currency: "IRT",
        openingBalanceMinor: 4_000_000,
        color: "#FFAB00",
        sort: 4,
      },
    ])
    .returning()
    .all() as [s.Account, s.Account, s.Account, s.Account];

  const cats = db
    .insert(s.categories)
    .values([
      { name: "درآمد پروژه", kind: "income", color: "#22C55E" },
      { name: "مشاوره", kind: "income", color: "#00B8D9" },
      { name: "آموزش و دوره", kind: "income", color: "#8E33FF" },
      { name: "سرور و هاست", kind: "expense", color: "#FF5630" },
      { name: "نرم‌افزار و اشتراک", kind: "expense", color: "#FFAB00" },
      { name: "حقوق و دستمزد", kind: "expense", color: "#7635DC" },
      { name: "دفتر و اجاره", kind: "expense", color: "#637381" },
      { name: "مالیات و عوارض", kind: "expense", color: "#B71D18" },
    ])
    .returning()
    .all();
  const cat = (name: string) => cats.find((c) => c.name === name)!.id;

  const tx: (typeof s.transactions.$inferInsert)[] = [];
  for (let m = 0; m < 3; m++) {
    const base = -m * 30;
    tx.push(
      {
        kind: "income",
        accountId: bank.id,
        amountMinor: 54_000_000 + m * 3_500_000,
        currency: "IRT",
        occurredAt: day(base - 3, 12),
        categoryId: cat("درآمد پروژه"),
        projectId: pLms.id,
        clientId: acme.id,
        description: "پرداخت مرحله‌ای پروژه آموزش آنلاین",
      },
      {
        kind: "income",
        accountId: bank.id,
        amountMinor: 80_000_000,
        currency: "IRT",
        occurredAt: day(base - 12, 15),
        categoryId: cat("درآمد پروژه"),
        projectId: pShop.id,
        clientId: narenj.id,
        description: "پیش‌پرداخت اپلیکیشن نارنج",
      },
      {
        kind: "income",
        accountId: usdt.id,
        amountMinor: 45_000,
        currency: "USDT",
        occurredAt: day(base - 8, 10),
        categoryId: cat("مشاوره"),
        description: "مشاوره معماری — مشتری خارجی",
      },
      {
        kind: "expense",
        accountId: bank.id,
        amountMinor: 2_900_000,
        currency: "IRT",
        occurredAt: day(base - 1, 9),
        categoryId: cat("سرور و هاست"),
        projectId: pSite.id,
        description: "سرور مجازی و بکاپ",
      },
      {
        kind: "expense",
        accountId: wise.id,
        amountMinor: 4_000,
        currency: "USD",
        occurredAt: day(base - 5, 9),
        categoryId: cat("نرم‌افزار و اشتراک"),
        description: "اشتراک Figma و GitHub",
      },
      {
        kind: "expense",
        accountId: bank.id,
        amountMinor: 35_000_000,
        currency: "IRT",
        occurredAt: day(base - 2, 11),
        categoryId: cat("حقوق و دستمزد"),
        description: "حقوق طراح محصول",
      },
      {
        kind: "expense",
        accountId: cash.id,
        amountMinor: 1_200_000,
        currency: "IRT",
        occurredAt: day(base - 15, 13),
        categoryId: cat("دفتر و اجاره"),
        description: "قهوه و ملزومات دفتر",
      },
    );
  }
  tx.push({
    kind: "transfer",
    accountId: usdt.id,
    transferAccountId: bank.id,
    amountMinor: 20_000,
    transferAmountMinor: 18_400_000,
    currency: "USDT",
    occurredAt: day(-6, 14),
    description: "تبدیل تتر به ریال",
  });
  db.insert(s.transactions)
    .values(tx.map((t) => ({ ...t, createdBy: owner.id })))
    .run();

  const inv1 = db
    .insert(s.invoices)
    .values({
      number: "GT-1405-001",
      clientId: acme.id,
      projectId: pLms.id,
      status: "paid",
      issueDate: day(-33),
      dueDate: day(-19),
      currency: "IRT",
      subtotalMinor: 54_000_000,
      taxBps: 1000,
      totalMinor: 59_400_000,
      paidMinor: 59_400_000,
      paidAt: day(-31),
      shareToken: newToken(18),
      createdBy: owner.id,
    })
    .returning()
    .get();
  const inv2 = db
    .insert(s.invoices)
    .values({
      number: "GT-1405-002",
      clientId: acme.id,
      projectId: pLms.id,
      status: "sent",
      issueDate: day(-4),
      dueDate: day(10),
      currency: "IRT",
      subtotalMinor: 63_000_000,
      taxBps: 1000,
      totalMinor: 69_300_000,
      paidMinor: 0,
      sentAt: day(-4),
      shareToken: newToken(18),
      notes: "بابت ۱۴۰ ساعت توسعه در ماه جاری.",
      createdBy: owner.id,
    })
    .returning()
    .get();
  const inv3 = db
    .insert(s.invoices)
    .values({
      number: "GT-1405-003",
      clientId: clinic.id,
      projectId: pClinic.id,
      status: "draft",
      issueDate: day(0),
      dueDate: day(14),
      currency: "USD",
      subtotalMinor: 180_000,
      totalMinor: 180_000,
      createdBy: owner.id,
    })
    .returning()
    .get();
  db.insert(s.invoiceItems)
    .values([
      {
        invoiceId: inv1.id,
        description: "توسعه پلتفرم — ۱۲۰ ساعت",
        quantity: 120,
        unitPriceMinor: 450_000,
        amountMinor: 54_000_000,
        sort: 1,
      },
      {
        invoiceId: inv2.id,
        description: "توسعه پخش ویدیو و پنل مدرس — ۱۴۰ ساعت",
        quantity: 140,
        unitPriceMinor: 450_000,
        amountMinor: 63_000_000,
        sort: 1,
      },
      {
        invoiceId: inv3.id,
        description: "Discovery & technical design (fixed)",
        quantity: 1,
        unitPriceMinor: 180_000,
        amountMinor: 180_000,
        sort: 1,
      },
    ])
    .run();

  // ─── Contracts ────────────────────────────────────────────────────────────
  const contractBody = `# قرارداد طراحی و توسعه پلتفرم آموزش آنلاین

**طرف اول:** گود تیم
**طرف دوم:** آکادمی آکمه

## ۱. موضوع قرارداد
طراحی و توسعه پلتفرم آموزش آنلاین شامل پخش ویدیو، آزمون آنلاین، پرداخت و پنل مدرس.

## ۲. مدت قرارداد
از تاریخ امضا به مدت ۹۰ روز کاری.

## ۳. مبلغ و نحوه پرداخت
- نرخ ساعتی: ۴۵۰٬۰۰۰ تومان
- سقف بودجه: ۱۸۰٬۰۰۰٬۰۰۰ تومان
- صورتحساب ماهانه بر اساس ساعات ثبت‌شده در پرتال مشتری

## ۴. تعهدات طرفین
1. طرف اول گزارش پیشرفت هفتگی را در پرتال مشتری منتشر می‌کند.
2. طرف دوم بازخوردها را حداکثر ظرف ۳ روز کاری ارسال می‌کند.

## ۵. مالکیت فکری
پس از تسویه کامل، مالکیت کد و طرح‌ها به طرف دوم منتقل می‌شود.
`;
  const signed = db
    .insert(s.contracts)
    .values({
      title: "قرارداد توسعه پلتفرم آموزش آنلاین",
      kind: "contract",
      clientId: acme.id,
      projectId: pLms.id,
      bodyMd: contractBody,
      status: "signed",
      shareToken: newToken(24),
      contentHash: sha256(contractBody),
      signerName: "علی کریمی",
      signerEmail: "client@acme-academy.ir",
      sentAt: day(-62),
      firstViewedAt: day(-62),
      signedAt: day(-61),
      createdBy: owner.id,
    })
    .returning()
    .get();
  db.insert(s.contractSignatures)
    .values({
      contractId: signed.id,
      role: "client",
      name: "علی کریمی",
      email: "client@acme-academy.ir",
      typedName: "علی کریمی",
      contentHash: sha256(contractBody),
      version: 1,
      ip: "5.120.0.10",
      userAgent: "Mozilla/5.0",
      signedAt: day(-61, 13),
    })
    .run();
  db.insert(s.contractEvents)
    .values([
      { contractId: signed.id, type: "created", at: day(-63) },
      { contractId: signed.id, type: "sent", at: day(-62, 10) },
      { contractId: signed.id, type: "viewed", ip: "5.120.0.10", at: day(-62, 12) },
      { contractId: signed.id, type: "signed", ip: "5.120.0.10", at: day(-61, 13) },
    ])
    .run();
  const proposalBody = `# پیشنهاد همکاری — اپلیکیشن فروشگاه نارنج\n\n## دامنه کار\n- طراحی تجربه کاربری و رابط کاربری\n- توسعه اپ iOS و Android با React Native\n- پنل مدیریت سفارش‌ها\n\n## زمان‌بندی\n۴۵ روز کاری در ۴ فاز.\n\n## هزینه\nمبلغ ثابت ۳۲۰٬۰۰۰٬۰۰۰ تومان در ۳ قسط.`;
  const sent = db
    .insert(s.contracts)
    .values({
      title: "پیشنهاد و قرارداد اپ نارنج",
      kind: "proposal",
      clientId: narenj.id,
      projectId: pShop.id,
      bodyMd: proposalBody,
      status: "viewed",
      shareToken: newToken(24),
      contentHash: sha256(proposalBody),
      sentAt: day(-2),
      firstViewedAt: day(-1),
      createdBy: owner.id,
    })
    .returning()
    .get();
  db.insert(s.contractEvents)
    .values([
      { contractId: sent.id, type: "created", at: day(-3) },
      { contractId: sent.id, type: "sent", at: day(-2, 9) },
      { contractId: sent.id, type: "viewed", ip: "2.180.0.4", at: day(-1, 20) },
    ])
    .run();
  db.insert(s.contracts)
    .values({
      title: "Change request: patient reminders via SMS",
      kind: "change_request",
      clientId: clinic.id,
      projectId: pClinic.id,
      bodyMd:
        "## Change request\n\nAdd SMS reminders 24h before each appointment.\n\n**Estimate:** 18 hours.",
      status: "draft",
      requireSignature: false,
      createdBy: owner.id,
    })
    .run();

  // ─── Docs ─────────────────────────────────────────────────────────────────
  const guide = db
    .insert(s.docs)
    .values({
      title: "راهنمای تیم",
      icon: "📘",
      contentMd: "# راهنمای تیم\n\nهمه چیزهایی که برای کار با ما لازم است.",
      visibility: "team",
      sort: 1,
      createdBy: owner.id,
    })
    .returning()
    .get();
  db.insert(s.docs)
    .values([
      {
        parentId: guide.id,
        title: "چک‌لیست تحویل پروژه",
        icon: "✅",
        contentMd:
          "## قبل از تحویل\n\n- [ ] تست روی موبایل و دسکتاپ\n- [ ] بررسی Lighthouse بالای ۹۵\n- [ ] بکاپ دیتابیس\n- [ ] مستندات استقرار\n- [ ] آموزش به تیم مشتری",
        visibility: "team",
        sort: 1,
        createdBy: owner.id,
      },
      {
        parentId: guide.id,
        title: "روند Git: شاخه dev و main",
        icon: "🌿",
        contentMd:
          "همه تغییرات روی شاخه `dev` انجام و commit می‌شوند. هر وقت تأیید شد، `dev` در `main` ادغام می‌شود و `main` به‌صورت خودکار مستقر می‌شود.",
        visibility: "team",
        sort: 2,
        createdBy: owner.id,
      },
      {
        title: "مستندات فنی پلتفرم آکمه",
        icon: "🎓",
        projectId: pLms.id,
        clientId: acme.id,
        visibility: "client",
        contentMd:
          "# معماری پلتفرم\n\n```\nNext.js ──► API ──► PostgreSQL\n   │\n   └──► HLS (CDN)\n```\n\n## دسترسی‌ها\nحساب‌های مدیریتی در گاوصندوق رمزها نگهداری می‌شوند.",
        sort: 2,
        createdBy: owner.id,
      },
    ])
    .run();

  // ─── Public content ───────────────────────────────────────────────────────
  type PostIn = typeof s.posts.$inferInsert;
  const post = (p: PostIn): PostIn => ({
    status: "published",
    authorId: owner.id,
    readingMinutes: readingMinutes(p.contentMd ?? ""),
    ...p,
  });
  const series = db
    .insert(s.series)
    .values({
      locale: "fa",
      slug: "nextjs-zero-to-deploy",
      title: "Next.js از صفر تا استقرار",
      description:
        "یک دوره عملی برای ساخت و استقرار یک اپلیکیشن واقعی با Next.js، SQLite و Docker.",
      level: "beginner",
      status: "published",
      sort: 1,
    })
    .returning()
    .get();

  db.insert(s.posts)
    .values([
      // Services
      post({
        type: "service",
        locale: "fa",
        translationKey: "svc-web",
        slug: "web-development",
        title: "طراحی و توسعه وب‌اپلیکیشن",
        excerpt: "از وب‌سایت شرکتی تا SaaS پیچیده؛ سریع، امن و بهینه برای سئو.",
        contentMd:
          "وب‌اپلیکیشن‌هایی می‌سازیم که سریع بارگذاری می‌شوند، در گوگل دیده می‌شوند و نگهداری‌شان ساده است.\n\n- Next.js و React\n- طراحی سیستم و UI\n- سئو، AEO و GEO\n- استقرار و پایش",
        publishedAt: day(-200),
        sort: 1,
        meta: { icon: "globe" },
      }),
      post({
        type: "service",
        locale: "fa",
        translationKey: "svc-mobile",
        slug: "mobile-apps",
        title: "اپلیکیشن موبایل",
        excerpt: "اپ iOS و Android با یک کدبیس و تجربه کاربری بومی.",
        contentMd:
          "با React Native و Expo اپلیکیشن‌هایی می‌سازیم که روی هر دو پلتفرم روان اجرا می‌شوند.",
        publishedAt: day(-200),
        sort: 2,
        meta: { icon: "smartphone" },
      }),
      post({
        type: "service",
        locale: "fa",
        translationKey: "svc-ai",
        slug: "ai-agents-automation",
        title: "اتوماسیون و عامل‌های هوش مصنوعی",
        excerpt: "کارهای تکراری را به عامل‌های هوشمند بسپارید.",
        contentMd:
          "از ربات‌های پشتیبانی تا عامل‌هایی که با سیستم‌های داخلی شما کار می‌کنند (MCP، API و ابزارها).",
        publishedAt: day(-200),
        sort: 3,
        meta: { icon: "bot" },
      }),
      post({
        type: "service",
        locale: "fa",
        translationKey: "svc-consult",
        slug: "technical-consulting",
        title: "مشاوره فنی و معماری",
        excerpt: "انتخاب درست تکنولوژی، معماری مقیاس‌پذیر و بازبینی کد.",
        contentMd: "قبل از نوشتن اولین خط کد، مسیر درست را با هم طراحی می‌کنیم.",
        publishedAt: day(-200),
        sort: 4,
        meta: { icon: "compass" },
      }),
      post({
        type: "service",
        locale: "en",
        translationKey: "svc-web",
        slug: "web-development",
        title: "Web application development",
        excerpt: "From company sites to complex SaaS — fast, secure and SEO-ready.",
        contentMd:
          "We build web apps that load fast, rank well and are easy to maintain.\n\n- Next.js & React\n- Design systems & UI\n- SEO, AEO & GEO\n- Deployment & monitoring",
        publishedAt: day(-200),
        sort: 1,
        meta: { icon: "globe" },
      }),
      post({
        type: "service",
        locale: "en",
        translationKey: "svc-mobile",
        slug: "mobile-apps",
        title: "Mobile apps",
        excerpt: "iOS & Android from one codebase with a native feel.",
        contentMd: "React Native and Expo apps that run smoothly on both platforms.",
        publishedAt: day(-200),
        sort: 2,
        meta: { icon: "smartphone" },
      }),
      post({
        type: "service",
        locale: "en",
        translationKey: "svc-ai",
        slug: "ai-agents-automation",
        title: "Automation & AI agents",
        excerpt: "Hand repetitive work to intelligent agents.",
        contentMd:
          "From support bots to agents that operate your internal systems (MCP, APIs and tools).",
        publishedAt: day(-200),
        sort: 3,
        meta: { icon: "bot" },
      }),
      post({
        type: "service",
        locale: "en",
        translationKey: "svc-consult",
        slug: "technical-consulting",
        title: "Technical & architecture consulting",
        excerpt: "The right stack, a scalable architecture and code reviews.",
        contentMd: "Before the first line of code, we design the right path together.",
        publishedAt: day(-200),
        sort: 4,
        meta: { icon: "compass" },
      }),

      // Portfolio (work)
      post({
        type: "work",
        locale: "fa",
        translationKey: "work-acme",
        slug: "acme-learning-platform",
        title: "پلتفرم آموزش آنلاین آکمه",
        excerpt: "پخش ویدیوی تطبیقی برای ۲۰ هزار دانشجو، با آزمون آنلاین و پرداخت یکپارچه.",
        projectId: pLms.id,
        featured: true,
        coverUrl: "/brand/work-acme.svg",
        publishedAt: day(-20),
        contentMd:
          "## چالش\nآکمه یک پلتفرم قدیمی داشت که در ساعات اوج کند می‌شد و تجربه پخش ویدیو ضعیف بود.\n\n## راهکار\n- بازطراحی کامل تجربه یادگیری\n- پخش HLS با کیفیت تطبیقی روی CDN\n- آزمون آنلاین با تصحیح خودکار\n\n## نتیجه\nزمان شروع پخش **۴۰٪ کمتر** و نرخ تکمیل دوره‌ها **۲۵٪ بیشتر** شد.",
        meta: {
          client: "آکادمی آکمه",
          year: 2026,
          role: "طراحی محصول، توسعه فول‌استک",
          stack: ["Next.js", "PostgreSQL", "HLS", "Docker"],
          liveUrl: "https://acme-academy.ir",
          metrics: [
            { label: "کاهش زمان شروع پخش", value: "۴۰٪" },
            { label: "دانشجوی فعال", value: "۲۰K+" },
            { label: "امتیاز Lighthouse", value: "۹۸" },
          ],
        },
      }),
      post({
        type: "work",
        locale: "fa",
        translationKey: "work-narenj",
        slug: "narenj-commerce-app",
        title: "اپلیکیشن فروشگاه نارنج",
        excerpt: "اپ خرید موبایل با سبد آفلاین، پیگیری سفارش و باشگاه مشتریان.",
        projectId: pShop.id,
        featured: true,
        coverUrl: "/brand/work-narenj.svg",
        publishedAt: day(-10),
        contentMd:
          "## خلاصه\nیک اپلیکیشن فروشگاهی سریع با تجربه پرداخت یک‌مرحله‌ای.\n\n## ویژگی‌ها\n- سبد خرید آفلاین\n- اعلان‌های شخصی‌سازی‌شده\n- باشگاه مشتریان",
        meta: {
          client: "تیم فروشگاه نارنج",
          year: 2026,
          role: "طراحی UX، توسعه موبایل",
          stack: ["React Native", "Expo", "Node.js"],
          metrics: [{ label: "زمان پرداخت", value: "۲۰ ثانیه" }],
        },
      }),
      post({
        type: "work",
        locale: "fa",
        translationKey: "work-perse",
        slug: "perse-booking-bot",
        title: "ربات تلگرام رزرو پرسه",
        excerpt: "رزرو نوبت و پرداخت مستقیم در تلگرام برای یک استودیوی عکاسی.",
        projectId: pBot.id,
        coverUrl: "/brand/work-perse.svg",
        publishedAt: day(-65),
        contentMd: "## نتیجه\n۷۰٪ رزروها بدون دخالت انسان انجام می‌شود.",
        meta: {
          client: "استودیو پرسه",
          year: 2025,
          role: "توسعه بک‌اند و ربات",
          stack: ["Telegram Bot API", "SQLite", "Bun"],
          metrics: [{ label: "رزرو خودکار", value: "۷۰٪" }],
        },
      }),
      post({
        type: "work",
        locale: "en",
        translationKey: "work-acme",
        slug: "acme-learning-platform",
        title: "Acme online learning platform",
        excerpt: "Adaptive video streaming for 20k students, with online exams and payments.",
        projectId: pLms.id,
        featured: true,
        coverUrl: "/brand/work-acme.svg",
        publishedAt: day(-20),
        contentMd:
          "## Challenge\nAcme's legacy platform slowed down at peak hours and video playback was poor.\n\n## Solution\n- Full learning-experience redesign\n- HLS adaptive streaming on a CDN\n- Auto-graded online exams\n\n## Outcome\n**40% faster** time-to-first-frame and **25% higher** course completion.",
        meta: {
          client: "Acme Academy",
          year: 2026,
          role: "Product design, full-stack engineering",
          stack: ["Next.js", "PostgreSQL", "HLS", "Docker"],
          liveUrl: "https://acme-academy.ir",
          metrics: [
            { label: "Faster playback start", value: "40%" },
            { label: "Active students", value: "20K+" },
            { label: "Lighthouse score", value: "98" },
          ],
        },
      }),
      post({
        type: "work",
        locale: "en",
        translationKey: "work-narenj",
        slug: "narenj-commerce-app",
        title: "Narenj commerce app",
        excerpt: "A mobile shopping app with an offline cart, order tracking and loyalty club.",
        projectId: pShop.id,
        featured: true,
        coverUrl: "/brand/work-narenj.svg",
        publishedAt: day(-10),
        contentMd: "## Summary\nA fast commerce app with one-step checkout.",
        meta: {
          client: "Narenj Shop",
          year: 2026,
          role: "UX design, mobile engineering",
          stack: ["React Native", "Expo", "Node.js"],
          metrics: [{ label: "Checkout time", value: "20s" }],
        },
      }),

      // Blog
      post({
        type: "article",
        locale: "fa",
        translationKey: "sqlite",
        slug: "sqlite-is-enough",
        title: "چرا SQLite برای اکثر محصولات کافی است",
        excerpt: "یک فایل، صفر تنظیمات، سرعت عالی. کی SQLite انتخاب درستی است و کی نیست؟",
        tags: ["SQLite", "معماری", "دیتابیس"],
        featured: true,
        publishedAt: day(-6),
        contentMd:
          '## خلاصه\nبرای بیشتر محصولاتی که روی یک سرور اجرا می‌شوند، **SQLite** سریع‌ترین و ساده‌ترین انتخاب است.\n\n## چرا؟\n- خواندن‌ها در حد میکروثانیه\n- بدون سرور جدا و بدون تنظیمات\n- بکاپ با یک دستور\n\n```ts\nconst db = new Database("app.db");\ndb.pragma("journal_mode = WAL");\n```\n\n## چه زمانی نه؟\nوقتی چند سرور همزمان باید روی یک دیتابیس بنویسند.\n\n## جمع‌بندی\nبا WAL و بکاپ منظم، SQLite برای محصولات کوچک تا متوسط عالی است.',
      }),
      post({
        type: "article",
        locale: "fa",
        translationKey: "parallel-timers",
        slug: "parallel-time-tracking",
        title: "طراحی سیستم زمان‌سنجی موازی",
        excerpt: "چطور زمان کار روی چند پروژه همزمان را دقیق ثبت کنیم؟",
        tags: ["محصول", "زمان‌سنجی"],
        publishedAt: day(-14),
        contentMd:
          "## مسئله\nگاهی همزمان روی دو پروژه کار می‌کنیم: یکی در حال بیلد است و دیگری در حال کدنویسی.\n\n## مدل داده\nهر ورودی زمان با `endedAt = null` یعنی تایمر در حال اجرا. چند تایمر می‌توانند همزمان اجرا شوند.",
      }),
      post({
        type: "article",
        locale: "fa",
        translationKey: "ai-agents",
        slug: "working-with-ai-agents",
        title: "چطور با عامل‌های هوش مصنوعی پروژه را جلو ببریم",
        excerpt: "مستندات خوب، API تمیز و MCP: سه چیزی که عامل‌ها را مفید می‌کند.",
        tags: ["هوش مصنوعی", "MCP"],
        publishedAt: day(-25),
        contentMd:
          "## سه اصل\n1. مستندات قابل‌فهم برای ماشین (AGENTS.md)\n2. API با توکن و دسترسی محدود\n3. یک سرور MCP برای ابزارها",
      }),
      post({
        type: "article",
        locale: "en",
        translationKey: "sqlite",
        slug: "sqlite-is-enough",
        title: "Why SQLite is enough for most products",
        excerpt:
          "One file, zero config, great speed. When SQLite is the right call — and when it isn't.",
        tags: ["SQLite", "Architecture"],
        featured: true,
        publishedAt: day(-6),
        contentMd:
          '## TL;DR\nFor most products running on a single server, **SQLite** is the fastest and simplest choice.\n\n## Why?\n- Microsecond reads\n- No separate server, no config\n- One-command backups\n\n```ts\nconst db = new Database("app.db");\ndb.pragma("journal_mode = WAL");\n```\n\n## When not?\nWhen many servers must write to the same database concurrently.',
      }),

      // Vlog + notes
      post({
        type: "vlog",
        locale: "fa",
        translationKey: "vlog-1",
        slug: "studio-week-vlog",
        title: "ولاگ: یک هفته در استودیو",
        excerpt: "پشت صحنه ساخت پلتفرم آموزش آکمه.",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        publishedAt: day(-3),
        contentMd:
          "در این ویدیو روند یک هفته کاری را از جلسه با مشتری تا انتشار نسخه آزمایشی نشان می‌دهیم.",
      }),
      post({
        type: "note",
        locale: "fa",
        slug: "note-lighthouse-98",
        title: "Lighthouse ۹۸ 🎉",
        contentMd:
          "امتیاز Lighthouse پلتفرم آکمه به ۹۸ رسید. راز اصلی: تصاویر AVIF، فونت‌های self-hosted و PPR.",
        publishedAt: day(-1),
      }),
      post({
        type: "note",
        locale: "en",
        slug: "note-mcp",
        title: "MCP all the things",
        contentMd: "Our panel now speaks MCP — Claude can start timers and add tasks for us.",
        publishedAt: day(-2),
      }),

      // Tutorials (series)
      post({
        type: "tutorial",
        locale: "fa",
        slug: "nextjs-01-setup",
        title: "قسمت ۱: راه‌اندازی پروژه Next.js",
        excerpt: "نصب، ساختار پوشه‌ها و اولین صفحه.",
        seriesId: series.id,
        seriesOrder: 1,
        publishedAt: day(-40),
        contentMd:
          "## نصب\n\n```bash\npnpm create next-app@latest my-app\n```\n\n## ساختار پوشه‌ها\nپوشه `app` قلب مسیریابی است.",
      }),
      post({
        type: "tutorial",
        locale: "fa",
        slug: "nextjs-02-data",
        title: "قسمت ۲: داده با SQLite و Drizzle",
        excerpt: "اتصال به دیتابیس و اولین کوئری.",
        seriesId: series.id,
        seriesOrder: 2,
        publishedAt: day(-33),
        contentMd:
          '## Drizzle ORM\n\n```ts\nexport const posts = sqliteTable("posts", { id: text("id").primaryKey() });\n```',
      }),
      post({
        type: "tutorial",
        locale: "fa",
        slug: "nextjs-03-docker",
        title: "قسمت ۳: استقرار با Docker",
        excerpt: "ساخت ایمیج، Volume برای داده و استقرار خودکار.",
        seriesId: series.id,
        seriesOrder: 3,
        publishedAt: day(-26),
        contentMd:
          "## Volume\nداده‌ها در یک Volume داکر نگهداری می‌شوند تا با هر استقرار از بین نروند.",
      }),

      // Pages
      post({
        type: "page",
        locale: "fa",
        translationKey: "about",
        slug: "about",
        title: "درباره ما",
        excerpt: "داستان گود تیم",
        publishedAt: day(-300),
        contentMd:
          "## سلام 👋\nما گود تیم هستیم؛ استودیویی کوچک که محصولات دیجیتال می‌سازد.\n\n## ارزش‌های ما\n- **شفافیت:** مشتری‌ها پیشرفت کار را لحظه‌به‌لحظه می‌بینند.\n- **کیفیت:** کد تمیز، تست و مستندات.\n- **یادگیری:** هرچه یاد می‌گیریم را می‌نویسیم و آموزش می‌دهیم.",
      }),
      post({
        type: "page",
        locale: "en",
        translationKey: "about",
        slug: "about",
        title: "About us",
        excerpt: "The Good Team story",
        publishedAt: day(-300),
        contentMd:
          "## Hi 👋\nWe are Good Team, a small studio building digital products.\n\n## What we value\n- **Transparency:** clients see progress in real time.\n- **Quality:** clean code, tests and docs.\n- **Learning:** we write and teach what we learn.",
      }),
    ])
    .run();

  db.insert(s.testimonials)
    .values([
      {
        locale: "fa",
        author: "علی کریمی",
        role: "مدیر محصول",
        company: "آکادمی آکمه",
        quote:
          "برای اولین بار دقیقاً می‌دانستیم پروژه کجاست. پرتال مشتری و گزارش‌های هفتگی همه چیز را شفاف کرد.",
        rating: 5,
        sort: 1,
        clientId: acme.id,
      },
      {
        locale: "fa",
        author: "نگار احمدی",
        role: "بنیان‌گذار",
        company: "فروشگاه نارنج",
        quote: "کیفیت طراحی و سرعت تحویل فوق‌العاده بود. اپ ما از روز اول بدون مشکل اجرا شد.",
        rating: 5,
        sort: 2,
        clientId: narenj.id,
      },
      {
        locale: "en",
        author: "Dr. Sam Rivera",
        role: "Owner",
        company: "Rivera Clinic",
        quote: "Clear communication, solid engineering and a process we could actually follow.",
        rating: 5,
        sort: 1,
        clientId: clinic.id,
      },
    ])
    .run();

  db.insert(s.leads)
    .values([
      {
        name: "رضا توکلی",
        email: "reza@example.com",
        company: "استارتاپ سفرینو",
        service: "web-development",
        budget: "۱۰۰ تا ۳۰۰ میلیون تومان",
        message:
          "سلام، برای سایت رزرو تور به یک تیم حرفه‌ای نیاز داریم. امکان جلسه هفته آینده هست؟",
        locale: "fa",
        source: "contact-form",
        createdAt: day(-1, 21),
      },
      {
        name: "Emma Clarke",
        email: "emma@example.org",
        service: "ai-agents-automation",
        budget: "$5k–$15k",
        message: "We want an AI agent that triages our support inbox. Can we talk?",
        locale: "en",
        source: "contact-form",
        createdAt: day(-3, 9),
      },
    ])
    .run();

  console.log("✓ demo data seeded");
  if (!existingOwner) console.log(`  owner:  ${ownerEmail} / ${ownerPassword}`);
  console.log("  member: sara@goodteam.local / goodteam-demo-pass");
  console.log("  client: client@acme-academy.ir / goodteam-demo-pass");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
