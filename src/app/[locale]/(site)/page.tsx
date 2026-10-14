import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpLeftIcon, CheckIcon } from "lucide-react";
import { HeroDiagram } from "@/components/site/home/hero-diagram";
import { HowWeWork } from "@/components/site/home/how-we-work";
import {
  AvailabilityBadge,
  AvailabilityBadgeSkeleton,
  CtaBand,
  FeaturedWork,
  FeaturedWorkSkeleton,
  LatestPosts,
  LatestPostsSkeleton,
  ServicesBento,
  ServicesBentoSkeleton,
  StatsStrip,
  StatsStripSkeleton,
  Testimonials,
  TestimonialsSkeleton,
  TrustMarquee,
  TrustMarqueeSkeleton,
} from "@/components/site/home/sections";
import { pageMetadata } from "@/components/site/seo";
import { ArrowLink, Container, SectionHeading } from "@/components/site/ui";
import { localePath } from "@/i18n/config";
import { getLocale, getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getMessages(locale);
  return pageMetadata({
    locale,
    path: "/",
    title: t.site.metaTitle,
    description: t.site.metaDescription,
    absoluteTitle: true,
  });
}

function HeroTitle({ title, accent }: { title: string; accent: string }) {
  const i = title.indexOf(accent);
  if (i < 0) return <>{title}</>;
  return (
    <>
      {title.slice(0, i)}
      <span className="gt-accent">{accent}</span>
      {title.slice(i + accent.length)}
    </>
  );
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = getMessages(locale);
  const s = t.site;
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative isolate -mt-16 overflow-hidden pt-16">
        <div aria-hidden className="bg-grid mask-radial absolute inset-0 -z-10 opacity-80" />
        <div
          aria-hidden
          className="gt-glow start-[10%] -top-48 -z-10 h-[28rem] w-[28rem] bg-primary/20"
        />
        <div aria-hidden className="gt-glow end-[5%] top-24 -z-10 h-80 w-80 bg-violet/15" />
        <Container className="grid items-center gap-12 pt-10 pb-16 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-8 lg:pt-20 lg:pb-24">
          <div className="gt-rise flex flex-col items-start gap-7">
            <Suspense fallback={<AvailabilityBadgeSkeleton />}>
              <AvailabilityBadge t={t} />
            </Suspense>
            <h1 className="text-[2.6rem] leading-[1.12] font-black tracking-tight text-balance sm:text-6xl lg:text-[4.1rem]">
              <HeroTitle title={s.heroTitle} accent={s.heroTitleAccent} />
            </h1>
            <p className="max-w-xl text-lg leading-8 text-pretty text-muted-foreground">
              {s.heroSubtitle}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={localePath(locale, "/contact")}
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-[15px] font-bold text-primary-foreground shadow-primary transition-colors hover:bg-primary-dark"
              >
                {s.heroPrimaryCta}
                <ArrowUpLeftIcon className="size-4 transition-transform group-hover:-translate-y-0.5 ltr:rotate-90" />
              </Link>
              <Link
                href={localePath(locale, "/work")}
                className="inline-flex h-12 items-center rounded-full border border-border bg-background/60 px-7 text-[15px] font-bold backdrop-blur transition-colors hover:border-foreground/30"
              >
                {s.heroSecondaryCta}
              </Link>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {[s.heroProof1, s.heroProof2, s.heroProof3].map((p) => (
                <li key={p} className="inline-flex items-center gap-1.5">
                  <CheckIcon className="size-4 text-primary" /> {p}
                </li>
              ))}
            </ul>
          </div>
          <HeroDiagram t={t} locale={locale} />
        </Container>
      </section>

      {/* ── Trust ── */}
      <Suspense fallback={<TrustMarqueeSkeleton />}>
        <TrustMarquee locale={locale} t={t} />
      </Suspense>

      {/* ── Featured work ── */}
      <section className="py-20 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow={s.workEyebrow}
            title={s.workTitle}
            subtitle={s.workSubtitle}
            action={<ArrowLink href={localePath(locale, "/work")}>{s.viewAllWork}</ArrowLink>}
          />
          <Suspense fallback={<FeaturedWorkSkeleton />}>
            <FeaturedWork locale={locale} t={t} />
          </Suspense>
        </Container>
      </section>

      {/* ── Services ── */}
      <section className="relative py-20 sm:py-28">
        <div
          aria-hidden
          className="mask-fade-y absolute inset-x-0 top-0 -z-10 h-full bg-muted/40"
        />
        <Container>
          <SectionHeading
            eyebrow={s.servicesEyebrow}
            title={s.servicesTitle}
            subtitle={s.servicesSubtitle}
            action={<ArrowLink href={localePath(locale, "/services")}>{s.allServices}</ArrowLink>}
          />
          <Suspense fallback={<ServicesBentoSkeleton />}>
            <ServicesBento locale={locale} t={t} />
          </Suspense>
        </Container>
      </section>

      {/* ── How we work (transparency) ── */}
      <section className="py-20 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow={s.processEyebrow}
            title={s.processTitle}
            subtitle={s.processSubtitle}
            align="center"
          />
          <HowWeWork t={t} locale={locale} />
        </Container>
      </section>

      {/* ── Stats ── */}
      <section aria-label={s.statsEyebrow}>
        <Container>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
            <div aria-hidden className="bg-dots absolute inset-0 opacity-60" />
            <div className="relative">
              <Suspense fallback={<StatsStripSkeleton />}>
                <StatsStrip locale={locale} t={t} />
              </Suspense>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Latest ── */}
      <section className="py-20 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow={s.latestEyebrow}
            title={s.latestTitle}
            subtitle={s.latestSubtitle}
            action={<ArrowLink href={localePath(locale, "/blog")}>{s.readBlog}</ArrowLink>}
          />
          <Suspense fallback={<LatestPostsSkeleton />}>
            <LatestPosts locale={locale} t={t} />
          </Suspense>
        </Container>
      </section>

      {/* ── Testimonials ── */}
      <Suspense fallback={<TestimonialsSkeleton t={t} />}>
        <Testimonials locale={locale} t={t} />
      </Suspense>

      <CtaBand locale={locale} t={t} />
    </>
  );
}
