import { Suspense } from "react";
import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowUpLeftIcon, CheckIcon } from "lucide-react";
import { PixelIcon } from "@/components/brand/pixel-art";
import { PixelLogo } from "@/components/brand/pixel-logo";
import { brandById, brandOf } from "@/components/brand/brands";
import { SetAlternates } from "@/components/site/alternates";
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
import {
  decodeParam,
  fillers,
  homeCrumb,
  notFoundMetadata,
  plainSpans,
  withQuery,
} from "@/components/site/page-utils";
import { absoluteUrl, pageMetadata, postAlternates, withDefaultImage } from "@/components/site/seo";
import { ServiceIcon } from "@/components/site/service-icon";
import { ArticleSkeleton } from "@/components/site/skeletons";
import { pillClass, TitleCell, TitleRow } from "@/components/site/ui";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getLocale, getMessages } from "@/i18n/server";
import { postHref, postPath } from "@/lib/content";
import { markdownToText } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import {
  getPublishedPost,
  getTranslations,
  listServices,
  renderContent,
} from "@/server/modules/content/queries";

export async function generateMetadata(
  { params }: PageProps<"/[locale]/services/[slug]">,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const locale = await getLocale();
  await connection();
  const post = await getPublishedPost(locale, ["service"], decodeParam((await params).slug));
  if (!post) return notFoundMetadata(locale);
  const meta = pageMetadata({
    locale,
    path: postPath(post),
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || markdownToText(post.contentMd, 160),
    languages: postAlternates(await getTranslations(post.translationKey)),
    image: post.coverUrl,
    markdownPath: `${postPath(post)}.md`,
  });
  return withDefaultImage(meta, parent);
}

type FaqItem = { q: string; a: string };

async function ServiceDetail({ locale, t, slug }: { locale: Locale; t: Messages; slug: string }) {
  await connection();
  const post = await getPublishedPost(locale, ["service"], slug);
  if (!post) notFound();
  const [translations, rendered, all] = await Promise.all([
    getTranslations(post.translationKey),
    renderContent(post.contentMd),
    listServices(locale),
  ]);
  const s = t.site;
  const href = postHref(locale, post);
  const own = all.find((x) => x.id === post.id);
  const others = all.filter((x) => x.id !== post.id);
  const brand = brandById(brandOf(post.meta));
  const faq = (
    Array.isArray(post.meta.faq) && post.meta.faq.length ? post.meta.faq : generalFaq(t)
  ) as FaqItem[];

  return (
    <>
      <SetAlternates value={postAlternates(translations)} />
      <JsonLd
        data={{
          "@type": "Service",
          "@id": `${absoluteUrl(href)}#service`,
          name: post.title,
          serviceType: post.title,
          description: post.excerpt || markdownToText(post.contentMd, 300),
          url: absoluteUrl(href),
          provider: { "@id": ids.organization() },
          areaServed: locale === "fa" ? "IR" : "Worldwide",
          availableLanguage: ["fa", "en"],
          offers: {
            "@type": "Offer",
            url: absoluteUrl(withQuery(localePath(locale, "/contact"), { service: post.slug })),
            availability: "https://schema.org/InStock",
          },
        }}
      />
      <FrameSection
        id="top"
        first
        labelledBy="top-title"
        guide={{ key: "service_detail", say: t.guide.service_detail }}
        strip={{ index: 1, path: framePath("GOOD-IN", brand.suffix, "SERVICE") }}
      >
        <FrameGrid cols="2-1">
          <TitleCell
            as="h1"
            size="article"
            titleId="top-title"
            className="lg:min-h-[260px]"
            crumbs={
              <Breadcrumbs
                items={[
                  homeCrumb(locale),
                  { name: s.servicesPageTitle, path: localePath(locale, "/services") },
                  { name: post.title, path: href },
                ]}
              />
            }
            eyebrow={
              <Link
                href={localePath(locale, "master" in brand ? `/services#${brand.id}` : brand.href)}
                className="inline-flex items-center gap-2"
              >
                <PixelIcon name={brand.icon} cell={1} />
                {t.nav[brand.label]}
              </Link>
            }
            title={
              <span className="inline-flex items-center gap-4">
                <span className="hidden size-12 shrink-0 items-center justify-center rounded-[10px] border border-frame-line bg-card shadow-[-3px_-3px_0_0_var(--brand-frame)] sm:flex rtl:shadow-[3px_-3px_0_0_var(--brand-frame)]">
                  <ServiceIcon name={post.meta.icon} className="size-6" />
                </span>
                <span>{post.title}</span>
              </span>
            }
            subtitle={post.excerpt}
          />
          <FrameCell
            tone="dots"
            aria-hidden
            className="hidden items-center justify-center lg:flex lg:min-h-[200px]"
          >
            <span dir="ltr">
              <PixelLogo suffix={brand.suffix} cell={4} />
            </span>
          </FrameCell>
        </FrameGrid>
      </FrameSection>

      <FrameSection
        id="details"
        ariaLabel={post.title}
        guide={{ key: "service_body", say: t.guide.service_body }}
        strip={{ index: 2, path: framePath("GOOD-IN", brand.suffix, "SERVICE", "DETAILS") }}
      >
        <FrameGrid cols="2-1">
          <FrameCell pad="lg" className="min-w-0">
            <div
              className="prose-gt max-w-[70ch]"
              dangerouslySetInnerHTML={{ __html: rendered.html }}
            />
          </FrameCell>
          <FrameCell tone="card" as="aside">
            <div className="flex flex-col gap-6 lg:sticky lg:below-chrome">
              {!!own?.highlights.length && (
                <div>
                  <p className="mb-4 text-sm font-black">{s.whatYouGet}</p>
                  <ul className="space-y-3">
                    {own.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-3 text-sm font-semibold">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-primary text-primary-foreground">
                          <CheckIcon className="size-3.5" aria-hidden />
                        </span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Link
                href={withQuery(localePath(locale, "/contact"), { service: post.slug })}
                className={cn(pillClass.primary, "h-12 justify-center")}
              >
                {s.ctaButton} <ArrowUpLeftIcon className="size-4 ltr:rotate-90" aria-hidden />
              </Link>
            </div>
          </FrameCell>
        </FrameGrid>
        {others.length > 0 && (
          <>
            <TitleRow title={s.otherServices} titleId="others-title" size="h3" />
            <FrameGrid cols={3}>
              {others.map((o) => (
                <FrameCell key={o.id} hover className="group">
                  <Link
                    href={postHref(locale, o)}
                    className="flex items-center gap-4 after:absolute after:inset-0"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-[8px] border border-frame-line bg-card">
                      <ServiceIcon name={o.meta.icon} className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-extrabold group-hover:text-primary-ink">
                        {o.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.nav[brandById(brandOf(o.meta)).label]}
                      </span>
                    </span>
                  </Link>
                </FrameCell>
              ))}
              <FrameFiller units={fillers(plainSpans(others.length), 3)} />
            </FrameGrid>
          </>
        )}
      </FrameSection>

      <FaqBox
        items={faq}
        title={s.faqTitle}
        guide={{ key: "service_faq", say: t.guide.service_faq }}
        index={3}
        path={framePath("GOOD-IN", brand.suffix, "SERVICE", "FAQ")}
      />
    </>
  );
}

export default async function ServicePage({ params }: PageProps<"/[locale]/services/[slug]">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <Suspense
      fallback={<ArticleSkeleton guide={{ key: "service_detail", say: t.guide.service_detail }} />}
    >
      {params.then(({ slug }) => (
        <ServiceDetail locale={locale} t={t} slug={decodeParam(slug)} />
      ))}
    </Suspense>
  );
}
