import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpLeftIcon, CheckIcon } from "lucide-react";
import { PixelIcon } from "@/components/brand/pixel-art";
import { PixelLogo } from "@/components/brand/pixel-logo";
import { brandOf, brands } from "@/components/brand/brands";
import { Skeleton } from "@/components/ui/skeleton";
import { CtaBand } from "@/components/site/cta-band";
import { FaqBox, generalFaq } from "@/components/site/faq";
import {
  FrameCell,
  FrameFiller,
  FrameGrid,
  FrameSection,
  framePath,
} from "@/components/site/frame";
import { ids, JsonLd } from "@/components/site/json-ld";
import { Breadcrumbs } from "@/components/site/nav-bits";
import { fillers, homeCrumb, plainSpans } from "@/components/site/page-utils";
import { absoluteUrl, pageMetadata } from "@/components/site/seo";
import { ServiceIcon } from "@/components/site/service-icon";
import { fmtNum, HEADING_CLASS, PageHero, teamPath, TitleRow } from "@/components/site/ui";
import { format } from "@/i18n/format-message";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getLocale, getMessages } from "@/i18n/server";
import { postHref } from "@/lib/content";
import { listServices } from "@/server/modules/content/queries";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getMessages(locale);
  return pageMetadata({
    locale,
    path: "/services",
    title: t.site.servicesPageTitle,
    description: t.site.servicesPageSubtitle,
  });
}

type Brand = (typeof brands)[number];

/** ItemList JSON-LD of every service (unchanged; its own streamed hole). */
async function ServicesLd({ locale }: { locale: Locale }) {
  await connection();
  const items = await listServices(locale);
  return (
    <JsonLd
      data={{
        "@type": "ItemList",
        itemListElement: items.map((svc, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Service",
            name: svc.title,
            description: svc.excerpt ?? undefined,
            url: absoluteUrl(postHref(locale, svc)),
            provider: { "@id": ids.organization() },
            areaServed: locale === "fa" ? "IR" : "Worldwide",
          },
        })),
      }}
    />
  );
}

/**
 * The "ask" cell: a link to /contact naming the brand. A brand without
 * public services gets it as one full row (with `site.brandEmpty`);
 * otherwise it takes the first free track of the last row at lg.
 */
function AskCell({
  brand,
  locale,
  t,
  empty,
}: {
  brand: Brand;
  locale: Locale;
  t: Messages;
  empty?: boolean;
}) {
  const name = t.nav[brand.label];
  return (
    <FrameCell
      span={empty ? "full" : undefined}
      tone="card"
      hover
      className="group flex flex-col justify-center gap-4"
    >
      {empty && <p className="text-muted-foreground">{t.site.brandEmpty}</p>}
      {!empty && <PixelIcon name="contact" cell={3} />}
      <Link
        href={localePath(locale, "/contact")}
        className="inline-flex items-center gap-1.5 font-bold group-hover:text-primary-ink after:absolute after:inset-0"
      >
        {format(t.site.brandAsk, { brand: name })}
        <ArrowUpLeftIcon className="size-4 ltr:rotate-90" aria-hidden />
      </Link>
    </FrameCell>
  );
}

/** The streamed service cells of one brand box (+ the ask cell and fillers). */
async function BrandServices({ brand, locale, t }: { brand: Brand; locale: Locale; t: Messages }) {
  await connection();
  const items = (await listServices(locale)).filter((svc) => brandOf(svc.meta) === brand.id);
  if (!items.length) return <AskCell brand={brand} locale={locale} t={t} empty />;
  // the last lg row has room: offer the ask cell there instead of a filler
  const ask = items.length % 3 !== 0;
  const spans = ["full" as const, ...plainSpans(items.length + (ask ? 1 : 0))];
  return (
    <>
      {items.map((svc, i) => (
        <FrameCell key={svc.id} hover as="article" className="group flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="flex size-11 items-center justify-center rounded-[8px] border border-frame-line bg-card text-foreground shadow-[-3px_-3px_0_0_var(--brand-frame)] rtl:shadow-[3px_-3px_0_0_var(--brand-frame)]">
              <ServiceIcon name={svc.meta.icon} className="size-5" />
            </span>
            <span className="font-mono text-sm font-bold text-muted-foreground tabular-nums">
              {fmtNum(i + 1, locale).padStart(2, locale === "fa" ? "۰" : "0")}
            </span>
          </div>
          <h3 className={HEADING_CLASS.h3}>
            <Link href={postHref(locale, svc)} className="after:absolute after:inset-0">
              {svc.title}
            </Link>
          </h3>
          {svc.excerpt && <p className="leading-7 text-muted-foreground">{svc.excerpt}</p>}
          {svc.highlights.length > 0 && (
            <ul className="grid gap-2">
              {svc.highlights.slice(0, 3).map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm font-semibold">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary-ink" aria-hidden /> {h}
                </li>
              ))}
            </ul>
          )}
          <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-bold">
            {t.site.viewDetails}
            <ArrowUpLeftIcon
              className="size-4 transition-transform group-hover:-translate-y-0.5 ltr:rotate-90"
              aria-hidden
            />
          </span>
        </FrameCell>
      ))}
      {ask && <AskCell brand={brand} locale={locale} t={t} />}
      <FrameFiller units={fillers(spans, 3)} />
    </>
  );
}

/** Same cells while the list streams: three card skeletons. */
function BrandServicesSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }, (_, i) => (
        <FrameCell key={i} className={["", "hidden md:block", "hidden lg:block"][i]}>
          <div className="flex flex-col gap-5">
            <Skeleton className="size-11 rounded-[8px]" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </FrameCell>
      ))}
    </>
  );
}

/**
 * One box per Good In brand, in registry order (`brands` as is, never
 * re-sorted). `id` = brand id: the dock and menus link `/services#studio`,
 * `#code`; the box clears the menu bar through `html { scroll-padding-top }`
 * alone (no scroll-margin, D18).
 */
function BrandBox({
  brand,
  index,
  locale,
  t,
}: {
  brand: Brand;
  index: number;
  locale: Locale;
  t: Messages;
}) {
  const name = t.nav[brand.label];
  const tagline = t.site[brand.tagline];
  return (
    <FrameSection
      id={brand.id}
      labelledBy={`${brand.id}-title`}
      guide={{ key: `services_brand_${brand.id}`, say: t.guide[`services_brand_${brand.id}`] }}
      strip={{ index, path: framePath("GOOD-IN", brand.suffix) }}
    >
      <FrameGrid cols={3}>
        <FrameCell
          span="full"
          header
          spot={{ key: `brand-${brand.id}`, say: tagline }}
          className="flex flex-col gap-5 md:flex-row md:items-center md:gap-8"
        >
          <span dir="ltr" className="shrink-0">
            <PixelLogo suffix={brand.suffix} cell={4} />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <h2 id={`${brand.id}-title`} className={HEADING_CLASS.h2}>
              {name}
            </h2>
            <p className="text-lg leading-[1.6] text-pretty text-muted-foreground [:lang(fa)_&]:leading-[1.9]">
              {tagline}
            </p>
          </div>
        </FrameCell>
        <Suspense fallback={<BrandServicesSkeleton />}>
          <BrandServices brand={brand} locale={locale} t={t} />
        </Suspense>
      </FrameGrid>
    </FrameSection>
  );
}

export default async function ServicesPage() {
  const locale = await getLocale();
  const t = getMessages(locale);
  const s = t.site;
  const steps = [
    { title: s.step1Title, body: s.step1Body },
    { title: s.step2Title, body: s.step2Body },
    { title: s.step3Title, body: s.step3Body },
    { title: s.step4Title, body: s.step4Body },
  ];
  const after = brands.length + 2;
  return (
    <>
      <PageHero
        section="SERVICES"
        icon="services"
        guide={{ key: "services_index", say: t.guide.services_index }}
        crumbs={
          <Breadcrumbs
            items={[
              homeCrumb(locale),
              { name: s.servicesPageTitle, path: localePath(locale, "/services") },
            ]}
          />
        }
        title={s.servicesPageTitle}
        subtitle={s.servicesPageSubtitle}
      />
      <Suspense fallback={null}>
        <ServicesLd locale={locale} />
      </Suspense>

      {brands.map((b, i) => (
        <BrandBox key={b.id} brand={b} index={i + 2} locale={locale} t={t} />
      ))}

      <FrameSection
        id="process"
        labelledBy="process-title"
        guide={{ key: "services_process", say: t.guide.services_process }}
        strip={{ index: after, path: teamPath("PROCESS") }}
      >
        <TitleRow eyebrow={s.processEyebrow} title={s.processStepsTitle} titleId="process-title" />
        <FrameGrid cols={4} as="ol" className="grid-cols-1 md:grid-cols-2">
          {steps.map((st, i) => (
            <FrameCell key={st.title} as="li" tone={i % 2 ? "card" : "default"}>
              <span className="flex size-11 items-center justify-center rounded-[8px] bg-foreground text-lg font-black text-background tabular-nums">
                {fmtNum(i + 1, locale)}
              </span>
              <h3 className="mt-5 text-lg font-extrabold">{st.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{st.body}</p>
            </FrameCell>
          ))}
        </FrameGrid>
      </FrameSection>

      <FaqBox
        items={generalFaq(t)}
        title={s.faqTitle}
        guide={{ key: "services_faq", say: t.guide.services_faq }}
        index={after + 1}
        path={teamPath("FAQ")}
      />
      <CtaBand locale={locale} t={t} />
    </>
  );
}
