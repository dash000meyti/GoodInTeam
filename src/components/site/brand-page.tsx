import "server-only";
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpLeftIcon } from "lucide-react";
import { PixelLogo } from "@/components/brand/pixel-logo";
import { brandById, brandIntro, brandOf, brands, type SubBrandId } from "@/components/brand/brands";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "@/i18n/format-message";
import { localePath, type Locale } from "@/i18n/config";
import { messages, type Messages } from "@/i18n/messages";
import { getLocale, getMessages } from "@/i18n/server";
import { postHref } from "@/lib/content";
import { listServices } from "@/server/modules/content/queries";
import { familySpans } from "./brand-plan";
import { BrandServices, BrandServicesSkeleton } from "./brand-services";
import { CtaBand } from "./cta-band";
import { FrameCell, FrameFiller, FrameGrid, FrameSection, framePath } from "./frame";
import { JsonLd, subBrandLd } from "./json-ld";
import { Breadcrumbs } from "./nav-bits";
import { fillers, homeCrumb } from "./page-utils";
import { pageMetadata } from "./seo";
import { ArrowLink, pillClass, TitleCell, TitleRow } from "./ui";

/**
 * The landing page of a Good In sub-brand (`/studio`, `/code`; spec §18).
 * One shared component; each route folder is a thin wrapper with its own
 * `loading.tsx` (BrandPageSkeleton) and `opengraph-image.tsx` (brand-og.tsx).
 *
 * Boxes (each with a guide line, §9):
 * 01 hero (`first`): FrameGrid 2-1 of the h1 cell (breadcrumbs, name, tagline,
 *    intro, CTAs) and the `tone="dots"` decor end cell with the brand's
 *    PixelLogo (the guide's first-box bubble lands there at ≥1024px);
 * 02 the brand's services, streamed (`brandOf(meta)`), shared with /services;
 * 03 the Good In family: cross-links to the other brands (team → home);
 * then CtaBand. No work box: case studies carry no brand (no `meta.brand`,
 * tag or service relation), so there is no honest way to filter them.
 */

/** Where a family cell links: the master brand is the home page, a sub-brand its own page. */
const familyHref = (b: (typeof brands)[number]) => ("master" in b ? "/" : b.href);

export async function brandPageMetadata(id: SubBrandId): Promise<Metadata> {
  const locale = await getLocale();
  const t = getMessages(locale);
  const brand = brandById(id);
  return pageMetadata({
    locale,
    path: brand.href,
    title: `${t.nav[brand.label]} — ${t.site[brand.tagline]}`,
    description: t.site[brandIntro[id]],
    markdownPath: `${brand.href}.md`,
  });
}

/** Organization (parentOrganization → the team) + its services, in its own streamed hole. */
async function BrandLd({ id, locale, t }: { id: SubBrandId; locale: Locale; t: Messages }) {
  await connection();
  const brand = brandById(id);
  const name = t.nav[brand.label];
  const items = (await listServices(locale)).filter((svc) => brandOf(svc.meta) === id);
  return (
    <JsonLd
      data={subBrandLd({
        path: brand.href,
        locale,
        name,
        alternateName: [messages.en.nav[brand.label], messages.fa.nav[brand.label]],
        slogan: t.site[brand.tagline],
        description: t.site[brandIntro[id]],
        catalogName: format(t.site.brandServicesTitle, { brand: name }),
        services: items.map((svc) => ({
          name: svc.title,
          url: postHref(locale, svc),
          description: svc.excerpt,
        })),
      })}
    />
  );
}

/** The decor end cell of the hero: the brand's pixel logo on dots (aria-hidden; the h1 names it). */
function LogoCell({ suffix }: { suffix: string }) {
  return (
    <FrameCell
      tone="dots"
      className="flex min-h-[176px] items-center justify-center lg:min-h-[200px]"
    >
      <span dir="ltr" className="flex">
        <PixelLogo suffix={suffix} cell={4} className="md:[--cell:6px] xl:[--cell:8px]" />
      </span>
    </FrameCell>
  );
}

const HERO_ROW = "lg:min-h-[280px]";

export async function BrandPage({ id }: { id: SubBrandId }) {
  const locale = await getLocale();
  const t = getMessages(locale);
  const s = t.site;
  const brand = brandById(id);
  const name = t.nav[brand.label];
  const others = brands.filter((b) => b.id !== id);
  return (
    <>
      <FrameSection
        id="top"
        first
        labelledBy="top-title"
        guide={{ key: `brand_${id}`, say: t.guide[`brand_${id}`] }}
        strip={{ index: 1, path: framePath("GOOD-IN", brand.suffix) }}
      >
        <FrameGrid cols="2-1">
          <TitleCell
            as="h1"
            titleId="top-title"
            className={HERO_ROW}
            crumbs={
              <Breadcrumbs
                items={[homeCrumb(locale), { name, path: localePath(locale, brand.href) }]}
              />
            }
            title={name}
            subtitle={s[brand.tagline]}
          >
            <p className="max-w-2xl leading-8 text-pretty">{s[brandIntro[id]]}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href={localePath(locale, "/contact")} className={pillClass.primary}>
                {s.heroPrimaryCta}
                <ArrowUpLeftIcon className="size-4 ltr:rotate-90" aria-hidden />
              </Link>
              <a href="#services" className={pillClass.outline}>
                {s.ctaSecondary}
              </a>
            </div>
          </TitleCell>
          <LogoCell suffix={brand.suffix} />
        </FrameGrid>
      </FrameSection>
      <Suspense fallback={null}>
        <BrandLd id={id} locale={locale} t={t} />
      </Suspense>

      <FrameSection
        id="services"
        labelledBy="services-title"
        guide={{ key: `brand_services_${id}`, say: t.guide[`brand_services_${id}`] }}
        strip={{ index: 2, path: framePath("GOOD-IN", brand.suffix, "SERVICES") }}
      >
        <TitleRow
          title={format(s.brandServicesTitle, { brand: name })}
          titleId="services-title"
          subtitle={s.brandServicesSubtitle}
        >
          <ArrowLink href={localePath(locale, "/services")}>{s.allServices}</ArrowLink>
        </TitleRow>
        <FrameGrid cols={3}>
          <Suspense fallback={<BrandServicesSkeleton />}>
            <BrandServices brand={brand} locale={locale} t={t} />
          </Suspense>
        </FrameGrid>
      </FrameSection>

      <FrameSection
        id="family"
        labelledBy="family-title"
        guide={{ key: "brand_family", say: t.guide.brand_family }}
        strip={{ index: 3, path: framePath("GOOD-IN", "FAMILY") }}
      >
        <FrameGrid cols={3}>
          <TitleCell
            span="md2"
            eyebrow={s.brandsEyebrow}
            title={s.brandsTitle}
            titleId="family-title"
            subtitle={s.brandsSubtitle}
            className="justify-center"
          />
          {others.map((b) => {
            const other = t.nav[b.label];
            return (
              <FrameCell
                key={b.id}
                hover
                spot={{ key: `brand-${b.id}`, say: s[b.tagline] }}
                data-brand={b.id}
                className="flex flex-col items-start gap-4"
              >
                <span dir="ltr" className="flex">
                  <PixelLogo suffix={b.suffix} cell={3} />
                </span>
                <h3 className="mt-2 text-xl leading-snug font-extrabold">{other}</h3>
                <p className="text-sm leading-6 text-muted-foreground [:lang(fa)_&]:leading-7">
                  {s[b.tagline]}
                </p>
                <ArrowLink
                  href={localePath(locale, familyHref(b))}
                  className="mt-auto pt-2 after:absolute after:inset-0"
                >
                  {format(s.brandExplore, { brand: other })}
                </ArrowLink>
              </FrameCell>
            );
          })}
          <FrameFiller units={fillers(familySpans(others.length), 3)} />
        </FrameGrid>
      </FrameSection>
      <CtaBand locale={locale} t={t} />
    </>
  );
}

/**
 * `loading.tsx` of a brand route: the same boxes and cells (the hero row
 * with the real logo, the services title row and three skeleton cells), so
 * nothing jumps when the page lands. No text, no locale.
 */
export function BrandPageSkeleton({ suffix }: { suffix: string }) {
  return (
    <>
      <FrameSection first strip={{ index: 1, path: framePath("GOOD-IN", suffix) }}>
        <FrameGrid cols="2-1">
          <FrameCell header className={`flex flex-col gap-5 ${HERO_ROW}`}>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-11 w-36 rounded-full" />
              <Skeleton className="h-11 w-36 rounded-full" />
            </div>
          </FrameCell>
          <LogoCell suffix={suffix} />
        </FrameGrid>
      </FrameSection>
      <FrameSection strip={{ index: 2, path: framePath("GOOD-IN", suffix, "SERVICES") }}>
        <FrameGrid cols={1}>
          <FrameCell header className="flex flex-col gap-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-5 w-2/3" />
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={3}>
          <BrandServicesSkeleton />
        </FrameGrid>
      </FrameSection>
    </>
  );
}
