import { Suspense } from "react";
import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { FrameGrid, FrameHeaderCell, FrameSection, framePath } from "@/components/site/frame";
import { BrandFamily } from "@/components/site/home/brand-family";
import { HomeHero } from "@/components/site/home/hero";
import { HowWeWork } from "@/components/site/home/how-we-work";
import {
  FeaturedWorkCells,
  FeaturedWorkCellsSkeleton,
  LatestCells,
  LatestCellsSkeleton,
  ServicesCells,
  ServicesCellsSkeleton,
  TestimonialCells,
  TestimonialCellsSkeleton,
  TrustBox,
  TrustBoxSkeleton,
} from "@/components/site/home/sections";
import { pageMetadata } from "@/components/site/seo";
import { StatsCells, StatsCellsSkeleton } from "@/components/site/stats-cells";
import { ArrowLink } from "@/components/site/ui";
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

/** Intrinsic heights (px) of the below-the-fold box bodies for `content-visibility` (spec §8). */
const CIS = { work: 900, services: 760, stats: 140, latest: 820, kindWords: 620 } as const;

/**
 * Home (spec §8): ten framed boxes in a fixed order. Their ids and
 * `data-guide` keys are a cross-track contract (§15.1): top, brands, trust,
 * work, services, process, stats, latest, kind-words, contact-cta. Static
 * parts stay in the prerendered shell; every DB part is an async server
 * component behind its own Suspense whose fallback renders the same cells.
 */
export default async function HomePage() {
  const locale = await getLocale();
  const t = getMessages(locale);
  const s = t.site;
  const g = t.guide;
  return (
    <>
      {/* 01 · hero */}
      <HomeHero locale={locale} t={t} />

      {/* 02 · the Good In brand family */}
      <BrandFamily locale={locale} t={t} />

      {/* 03 · trust (the whole box streams; it is null below 2 names) */}
      <Suspense fallback={<TrustBoxSkeleton t={t} />}>
        <TrustBox locale={locale} t={t} />
      </Suspense>

      {/* 04 · featured work */}
      <FrameSection
        id="work"
        labelledBy="work-title"
        guide={{ key: "home_work", say: g.home_work }}
        strip={{
          index: 3,
          path: framePath("good-in-team", "work"),
          action: <ArrowLink href={localePath(locale, "/work")}>{s.viewAllWork}</ArrowLink>,
        }}
        cv={CIS.work}
      >
        <FrameGrid cols={3} reveal>
          <FrameHeaderCell
            span="md2"
            eyebrow={s.workEyebrow}
            title={s.workTitle}
            titleId="work-title"
            subtitle={s.workSubtitle}
          />
          <Suspense fallback={<FeaturedWorkCellsSkeleton />}>
            <FeaturedWorkCells locale={locale} t={t} />
          </Suspense>
        </FrameGrid>
      </FrameSection>

      {/* 05 · services */}
      <FrameSection
        id="services"
        labelledBy="services-title"
        guide={{ key: "home_services", say: g.home_services }}
        strip={{
          index: 4,
          path: framePath("good-in-team", "services"),
          action: <ArrowLink href={localePath(locale, "/services")}>{s.allServices}</ArrowLink>,
        }}
        cv={CIS.services}
      >
        <FrameGrid cols={3} reveal>
          <FrameHeaderCell
            eyebrow={s.servicesEyebrow}
            title={s.servicesTitle}
            titleId="services-title"
            subtitle={s.servicesSubtitle}
          />
          <Suspense fallback={<ServicesCellsSkeleton />}>
            <ServicesCells locale={locale} t={t} />
          </Suspense>
        </FrameGrid>
      </FrameSection>

      {/* 06 · process (zero-JS tabs) */}
      <HowWeWork t={t} locale={locale} />

      {/* 07 · stats (StatsCells renders the FrameGrid 4 itself) */}
      <FrameSection
        id="stats"
        ariaLabel={s.statsEyebrow}
        guide={{ key: "home_stats", say: g.home_stats }}
        cv={CIS.stats}
      >
        <Suspense fallback={<StatsCellsSkeleton />}>
          <StatsCells locale={locale} t={t} />
        </Suspense>
      </FrameSection>

      {/* 08 · latest posts + course */}
      <FrameSection
        id="latest"
        labelledBy="latest-title"
        guide={{ key: "home_latest", say: g.home_latest }}
        strip={{
          index: 6,
          path: framePath("good-in-team", "blog"),
          action: <ArrowLink href={localePath(locale, "/blog")}>{s.readBlog}</ArrowLink>,
        }}
        cv={CIS.latest}
      >
        <FrameGrid cols={3} reveal>
          <FrameHeaderCell
            span="md2"
            eyebrow={s.latestEyebrow}
            title={s.latestTitle}
            titleId="latest-title"
            subtitle={s.latestSubtitle}
          />
          <Suspense fallback={<LatestCellsSkeleton />}>
            <LatestCells locale={locale} t={t} />
          </Suspense>
        </FrameGrid>
      </FrameSection>

      {/* 09 · kind words */}
      <FrameSection
        id="kind-words"
        labelledBy="testimonials-title"
        guide={{ key: "home_testimonials", say: g.home_testimonials }}
        strip={{ index: 7, path: framePath("good-in-team", "kind-words") }}
        cv={CIS.kindWords}
      >
        <FrameGrid cols={3} reveal>
          <FrameHeaderCell
            span="full"
            eyebrow={s.testimonialsEyebrow}
            title={s.testimonialsTitle}
            titleId="testimonials-title"
          />
          <Suspense fallback={<TestimonialCellsSkeleton />}>
            <TestimonialCells locale={locale} />
          </Suspense>
        </FrameGrid>
      </FrameSection>

      {/* 10 · call to action (CtaBand renders its own box, id="contact-cta") */}
      <CtaBand locale={locale} t={t} guide="home_cta" />
    </>
  );
}
