import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PixelLogo } from "@/components/brand/pixel-logo";
import { brands } from "@/components/brand/brands";
import { BrandServices, BrandServicesSkeleton } from "@/components/site/brand-services";
import { CtaBand } from "@/components/site/cta-band";
import { FaqBox, generalFaq } from "@/components/site/faq";
import { FrameCell, FrameGrid, FrameSection, framePath } from "@/components/site/frame";
import { ids, JsonLd } from "@/components/site/json-ld";
import { Breadcrumbs } from "@/components/site/nav-bits";
import { homeCrumb } from "@/components/site/page-utils";
import { absoluteUrl, pageMetadata } from "@/components/site/seo";
import {
  ArrowLink,
  fmtNum,
  HEADING_CLASS,
  PageHero,
  teamPath,
  TitleRow,
} from "@/components/site/ui";
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
 * One box per Good In brand, in registry order (`brands` as is, never
 * re-sorted). `id` = brand id: anchor targets (`/services#studio`, `#code`,
 * `#team`) that clear the menu bar through `html { scroll-padding-top }`
 * alone (no scroll-margin, D18). The header links to the brand's own page
 * (`brand.href`: /about for the team, /studio and /code for the sub-brands).
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
          <ArrowLink href={localePath(locale, brand.href)} className="shrink-0">
            {format(t.site.brandExplore, { brand: name })}
          </ArrowLink>
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
