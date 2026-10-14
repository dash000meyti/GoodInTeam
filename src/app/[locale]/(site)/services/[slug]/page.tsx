import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowUpLeftIcon, CheckIcon } from "lucide-react";
import { SetAlternates } from "@/components/site/alternates";
import { Faq, generalFaq } from "@/components/site/faq";
import { ids, JsonLd } from "@/components/site/json-ld";
import { Breadcrumbs } from "@/components/site/nav-bits";
import { decodeParam, homeCrumb, notFoundMetadata, withQuery } from "@/components/site/page-utils";
import { absoluteUrl, pageMetadata, postAlternates } from "@/components/site/seo";
import { ServiceIcon } from "@/components/site/service-icon";
import { ArticleSkeleton } from "@/components/site/skeletons";
import { Container } from "@/components/site/ui";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getLocale, getMessages } from "@/i18n/server";
import { postHref, postPath } from "@/lib/content";
import { markdownToText } from "@/lib/markdown";
import {
  getPublishedPost,
  getTranslations,
  listServices,
  renderContent,
} from "@/server/modules/content/queries";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/services/[slug]">): Promise<Metadata> {
  const locale = await getLocale();
  await connection();
  const post = await getPublishedPost(locale, ["service"], decodeParam((await params).slug));
  if (!post) return notFoundMetadata(locale);
  return pageMetadata({
    locale,
    path: postPath(post),
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || markdownToText(post.contentMd, 160),
    languages: postAlternates(await getTranslations(post.translationKey)),
    image: post.coverUrl,
    markdownPath: `${postPath(post)}.md`,
  });
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
      <section className="relative -mt-16 overflow-hidden pt-16">
        <div aria-hidden className="bg-grid mask-fade-b absolute inset-0 -z-10 opacity-70" />
        <div aria-hidden className="gt-glow end-[15%] -top-40 -z-10 size-96 bg-primary/20" />
        <Container className="pt-10 pb-14 sm:pt-14">
          <Breadcrumbs
            items={[
              homeCrumb(locale),
              { name: s.servicesPageTitle, path: localePath(locale, "/services") },
              { name: post.title, path: href },
            ]}
          />
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center">
            <div className="space-y-6">
              <span className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-primary">
                <ServiceIcon name={post.meta.icon} className="size-8" />
              </span>
              <h1 className="text-4xl leading-[1.15] font-black tracking-tight text-balance sm:text-5xl">
                {post.title}
              </h1>
              {post.excerpt && (
                <p className="max-w-2xl text-lg leading-8 text-muted-foreground">{post.excerpt}</p>
              )}
              <Link
                href={withQuery(localePath(locale, "/contact"), { service: post.slug })}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-[15px] font-bold text-primary-foreground shadow-primary transition-colors hover:bg-primary-dark"
              >
                {s.ctaButton} <ArrowUpLeftIcon className="size-4 ltr:rotate-90" />
              </Link>
            </div>
            {!!own?.highlights.length && (
              <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
                <p className="mb-4 text-sm font-black">{s.whatYouGet}</p>
                <ul className="space-y-3">
                  {own.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-3 text-sm font-semibold">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <CheckIcon className="size-3.5" />
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Container>
      </section>
      <Container className="max-w-3xl">
        <div className="prose-gt" dangerouslySetInnerHTML={{ __html: rendered.html }} />
      </Container>
      <Container className="mt-16 max-w-4xl">
        <Faq items={faq} title={s.faqTitle} />
      </Container>
      {others.length > 0 && (
        <Container className="mt-20">
          <h2 className="mb-6 text-2xl font-black tracking-tight">{s.otherServices}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((o) => (
              <Link
                key={o.id}
                href={postHref(locale, o)}
                className="gt-lift flex items-center gap-4 rounded-2xl border border-border bg-card p-5"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <ServiceIcon name={o.meta.icon} className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-extrabold">{o.title}</span>
                  {o.excerpt && (
                    <span className="block truncate text-sm text-muted-foreground">
                      {o.excerpt}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </Container>
      )}
    </>
  );
}

export default async function ServicePage({ params }: PageProps<"/[locale]/services/[slug]">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <Suspense fallback={<ArticleSkeleton />}>
      {params.then(({ slug }) => (
        <ServiceDetail locale={locale} t={t} slug={decodeParam(slug)} />
      ))}
    </Suspense>
  );
}
