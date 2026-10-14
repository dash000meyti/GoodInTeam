import "server-only";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpLeftIcon, BookOpenIcon, CheckIcon, ClockIcon, PlayIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "@/i18n/format-message";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { postHref } from "@/lib/content";
import { cn } from "@/lib/utils";
import {
  getPublicProfile,
  getSiteStats,
  listPublicClientNames,
  listPublished,
  listSeries,
  listServices,
  listTestimonials,
  getSeriesWithLessons,
} from "@/server/modules/content/queries";
import { PostCard, TestimonialCard, WorkCard } from "../cards";
import { ServiceIcon } from "../service-icon";
import { CardSkeleton } from "../skeletons";
import { ArrowLink, Container, fmtNum, SectionHeading } from "../ui";

// ─── Hero availability badge ───────────────────────────────────────────────

export async function AvailabilityBadge({ t }: { t: Messages }) {
  await connection();
  const profile = await getPublicProfile();
  const on = profile.availableForWork;
  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-background/70 ps-2.5 pe-3.5 text-xs font-bold backdrop-blur">
      <span className={cn("gt-live size-2 rounded-full", on ? "bg-success" : "bg-warning")} />
      {on ? t.site.available : t.site.unavailable}
    </span>
  );
}
export const AvailabilityBadgeSkeleton = () => <Skeleton className="h-8 w-48 rounded-full" />;

// ─── Trust marquee ─────────────────────────────────────────────────────────

export async function TrustMarquee({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const names = await listPublicClientNames(locale);
  if (names.length < 2) return <div className="h-px" />;
  const row = [...names, ...names, ...names].slice(0, Math.max(8, names.length));
  return (
    <section aria-label={t.site.trustedBy} className="border-y border-dashed py-8">
      <Container>
        <p className="mb-6 text-center text-sm font-semibold text-muted-foreground">
          {t.site.trustedBy}
        </p>
      </Container>
      <div className="gt-marquee-wrap mask-fade-x overflow-hidden" dir="ltr">
        <ul className="gt-marquee flex w-max gap-[var(--marquee-gap)]">
          {[...row, ...row].map((n, i) => (
            <li
              key={i}
              aria-hidden={i >= row.length || undefined}
              dir="auto"
              className="flex items-center gap-3 text-xl font-black tracking-tight whitespace-nowrap text-muted-foreground/70 sm:text-2xl"
            >
              <span className="size-2 rotate-45 rounded-[2px] bg-primary/50" />
              {n}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
export const TrustMarqueeSkeleton = () => <div className="h-[121px] border-y border-dashed" />;

// ─── Featured work bento ───────────────────────────────────────────────────

export async function FeaturedWork({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const { items } = await listPublished({ locale, types: ["work"], pageSize: 12 });
  const sorted = [...items].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 3);
  if (!sorted.length) return null;
  const [first, ...rest] = sorted;
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <WorkCard
        post={first!}
        locale={locale}
        t={t}
        size="lg"
        className="lg:col-span-7 lg:row-span-2"
      />
      {rest.map((p) => (
        <WorkCard key={p.id} post={p} locale={locale} t={t} className="lg:col-span-5" />
      ))}
    </div>
  );
}
export const FeaturedWorkSkeleton = () => (
  <div className="grid gap-6 lg:grid-cols-12">
    <CardSkeleton className="rounded-3xl lg:col-span-7 lg:row-span-2" />
    <CardSkeleton className="rounded-3xl lg:col-span-5" />
    <CardSkeleton className="rounded-3xl lg:col-span-5" />
  </div>
);

// ─── Services bento ────────────────────────────────────────────────────────

const bentoSpans = ["md:col-span-4", "md:col-span-2", "md:col-span-2", "md:col-span-4"];

export async function ServicesBento({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const items = await listServices(locale);
  if (!items.length) return null;
  return (
    <div className="grid gap-5 md:grid-cols-6">
      {items.slice(0, 6).map((svc, i) => {
        const big = bentoSpans[i % 4] === "md:col-span-4";
        return (
          <article
            key={svc.id}
            className={cn(
              "gt-lift group relative flex min-h-64 flex-col overflow-hidden rounded-3xl bg-card p-7 shadow-card dark:border dark:border-border",
              bentoSpans[i % 4],
            )}
          >
            {big && (
              <>
                <div
                  aria-hidden
                  className="bg-dots mask-radial absolute -end-10 -top-10 size-80 opacity-80"
                />
                <div aria-hidden className="gt-glow -end-24 -top-24 size-64 bg-primary/15" />
                {svc.highlights.length > 0 && (
                  <ul
                    aria-label={t.site.whatYouGet}
                    className="relative order-last mt-6 flex flex-wrap gap-2 md:absolute md:end-8 md:top-20 md:mt-0 md:w-60 md:flex-col md:items-end"
                  >
                    {svc.highlights.slice(0, 4).map((h, j) => (
                      <li
                        key={h}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/85 px-3 py-1.5 text-xs font-bold shadow-card backdrop-blur"
                        style={{ marginInlineEnd: j % 2 ? 20 : 0 }}
                      >
                        <CheckIcon className="size-3.5 text-primary" />
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            <span className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
              <ServiceIcon name={svc.meta.icon} className="size-7" />
            </span>
            <h3 className="relative mt-auto pt-10 text-xl font-extrabold tracking-tight text-balance sm:text-2xl">
              <Link href={postHref(locale, svc)} className="after:absolute after:inset-0">
                {svc.title}
              </Link>
            </h3>
            {svc.excerpt && (
              <p className="relative mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                {svc.excerpt}
              </p>
            )}
            <span className="absolute end-6 top-7 flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-all group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
              <ArrowUpLeftIcon className="size-4 ltr:rotate-90" />
            </span>
          </article>
        );
      })}
    </div>
  );
}
export const ServicesBentoSkeleton = () => (
  <div className="grid gap-5 md:grid-cols-6">
    {bentoSpans.map((s, i) => (
      <Skeleton key={i} className={cn("h-64 rounded-3xl", s)} />
    ))}
  </div>
);

// ─── Stats strip ───────────────────────────────────────────────────────────

export async function StatsStrip({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const s = await getSiteStats();
  const items = [
    { v: s.projectsDelivered, label: t.site.statProjects },
    { v: s.hoursTracked, label: t.site.statHours },
    { v: s.clients, label: t.site.statClients },
    { v: s.postsPublished, label: t.site.statPosts },
  ];
  return (
    <dl className="grid grid-cols-2 lg:grid-cols-4">
      {items.map((it, i) => (
        <div
          key={it.label}
          className={cn(
            "flex flex-col-reverse gap-2 px-6 py-8 text-center",
            i % 2 === 1 && "border-s border-dashed",
            i >= 2 && "border-t border-dashed lg:border-t-0",
            i === 2 && "lg:border-s",
          )}
        >
          <dt className="text-sm font-semibold text-muted-foreground">{it.label}</dt>
          <dd className="text-4xl font-black tracking-tight tabular-nums sm:text-5xl">
            {fmtNum(it.v, locale)}
            <span className="text-primary">+</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
export const StatsStripSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 4 }, (_, i) => (
      <div key={i} className="flex flex-col items-center gap-3 px-6 py-8">
        <Skeleton className="h-12 w-24" />
        <Skeleton className="h-4 w-28" />
      </div>
    ))}
  </div>
);

// ─── Latest posts + course card ────────────────────────────────────────────

export async function LatestPosts({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const [{ items }, series] = await Promise.all([
    listPublished({ locale, types: ["article", "vlog", "tutorial"], pageSize: 3 }),
    listSeries(locale),
  ]);
  const course = series.find((s) => s.lessons > 0);
  const lessons = course ? ((await getSeriesWithLessons(locale, course.slug))?.lessons ?? []) : [];
  const posts = items.slice(0, course ? 2 : 3);
  if (!posts.length && !course) return null;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} locale={locale} t={t} />
      ))}
      {course && (
        <article className="relative flex flex-col overflow-hidden rounded-3xl bg-grey-900 p-7 text-white shadow-card dark:border dark:border-border dark:bg-card">
          <div aria-hidden className="bg-grid mask-fade-b absolute inset-0 opacity-30" />
          <div aria-hidden className="gt-glow -end-16 -top-16 size-64 bg-primary/40" />
          <span className="relative inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-primary-light">
            <BookOpenIcon className="size-3.5" />
            {t.site.courseEyebrow}
          </span>
          <h3 className="relative mt-5 text-2xl leading-snug font-black tracking-tight text-balance">
            {course.title}
          </h3>
          {course.description && (
            <p className="relative mt-2 line-clamp-2 text-sm leading-7 text-grey-400">
              {course.description}
            </p>
          )}
          <ol className="relative mt-5 space-y-2">
            {lessons.slice(0, 4).map((l, i) => (
              <li
                key={l.id}
                className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-sm"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary-light">
                  {fmtNum(i + 1, locale)}
                </span>
                <span className="truncate">{l.title}</span>
              </li>
            ))}
          </ol>
          <div className="relative mt-auto flex items-center justify-between gap-3 pt-6">
            <span className="inline-flex items-center gap-1.5 text-xs text-grey-400">
              <ClockIcon className="size-3.5" />
              {format(t.site.minutesTotal, { n: fmtNum(course.minutes, locale) })} ·{" "}
              {format(t.site.lessonsCount, { n: fmtNum(course.lessons, locale) })}
            </span>
            <Link
              href={localePath(locale, `/learn/${encodeURIComponent(course.slug)}`)}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-dark"
            >
              <PlayIcon className="size-3.5 fill-current rtl:rotate-180" />
              {t.site.courseCta}
            </Link>
          </div>
        </article>
      )}
    </div>
  );
}
export const LatestPostsSkeleton = () => (
  <div className="grid gap-6 lg:grid-cols-3">
    <CardSkeleton />
    <CardSkeleton />
    <Skeleton className="min-h-96 rounded-3xl" />
  </div>
);

// ─── Testimonials ──────────────────────────────────────────────────────────

export async function Testimonials({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const items = await listTestimonials(locale, 6);
  if (!items.length) return null;
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow={t.site.testimonialsEyebrow}
          title={t.site.testimonialsTitle}
          align="center"
        />
        <div className="columns-1 gap-6 md:columns-2 lg:columns-3 [&>*]:mb-6 [&>*]:break-inside-avoid">
          {items.map((it) => (
            <TestimonialCard key={it.id} item={it} />
          ))}
        </div>
      </Container>
    </section>
  );
}

export const TestimonialsSkeleton = ({ t }: { t: Messages }) => (
  <section className="py-20 sm:py-28">
    <Container>
      <SectionHeading
        eyebrow={t.site.testimonialsEyebrow}
        title={t.site.testimonialsTitle}
        align="center"
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-72 rounded-3xl" />
        ))}
      </div>
    </Container>
  </section>
);

// ─── CTA band ──────────────────────────────────────────────────────────────

export function CtaBand({
  locale,
  t,
  className,
}: {
  locale: Locale;
  t: Messages;
  className?: string;
}) {
  return (
    <section className={cn("py-10", className)}>
      <Container>
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-grey-900 px-6 py-16 text-center text-white sm:px-16 sm:py-20 dark:border dark:border-border dark:bg-card">
          <div aria-hidden className="bg-grid mask-radial absolute inset-0 -z-10 opacity-40" />
          <div
            aria-hidden
            className="gt-glow start-1/2 -bottom-32 -z-10 h-72 w-[40rem] -translate-x-1/2 bg-primary/50 rtl:translate-x-1/2"
          />
          <div aria-hidden className="gt-glow -end-20 -top-24 -z-10 size-72 bg-violet/30" />
          <h2 className="mx-auto max-w-2xl text-3xl leading-tight font-black tracking-tight text-balance sm:text-5xl">
            {t.site.ctaTitle}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-grey-400 sm:text-lg">
            {t.site.ctaSubtitle}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={localePath(locale, "/contact")}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-[15px] font-bold text-primary-foreground shadow-primary transition-colors hover:bg-primary-dark"
            >
              {t.site.ctaButton}
              <ArrowUpLeftIcon className="size-4 ltr:rotate-90" />
            </Link>
            <Link
              href={localePath(locale, "/services")}
              className="inline-flex h-12 items-center rounded-full border border-white/20 px-7 text-[15px] font-bold text-white transition-colors hover:bg-white/10"
            >
              {t.site.ctaSecondary}
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-grey-400">
            {[t.site.heroProof1, t.site.heroProof2, t.site.heroProof3].map((p) => (
              <li key={p} className="inline-flex items-center gap-1.5">
                <CheckIcon className="size-4 text-primary-light" /> {p}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

export { ArrowLink };
