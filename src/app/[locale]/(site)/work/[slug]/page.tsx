import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CodeXmlIcon, ExternalLinkIcon } from "lucide-react";
import { SetAlternates } from "@/components/site/alternates";
import { TestimonialCard } from "@/components/site/cards";
import { Cover } from "@/components/site/cover";
import { CtaBand } from "@/components/site/home/sections";
import { articleLd, JsonLd } from "@/components/site/json-ld";
import { Breadcrumbs, PrevNext } from "@/components/site/nav-bits";
import { decodeParam, homeCrumb, notFoundMetadata } from "@/components/site/page-utils";
import { pageMetadata, postAlternates } from "@/components/site/seo";
import { ArticleSkeleton } from "@/components/site/skeletons";
import { Container, fmtNum } from "@/components/site/ui";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getLocale, getMessages } from "@/i18n/server";
import { postHref, postPath } from "@/lib/content";
import { markdownToText } from "@/lib/markdown";
import {
  getAdjacent,
  getPublishedPost,
  getTestimonialForProject,
  getTranslations,
  renderContent,
} from "@/server/modules/content/queries";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/work/[slug]">): Promise<Metadata> {
  const locale = await getLocale();
  await connection();
  const slug = decodeParam((await params).slug);
  const post = await getPublishedPost(locale, ["work"], slug);
  if (!post) return notFoundMetadata(locale);
  const translations = await getTranslations(post.translationKey);
  return pageMetadata({
    locale,
    path: postPath(post),
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || markdownToText(post.contentMd, 160),
    languages: postAlternates(translations),
    type: "article",
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    authors: post.authorName ? [post.authorName] : undefined,
    tags: post.meta.stack,
    section: getMessages(locale).site.workPageTitle,
    markdownPath: `${postPath(post)}.md`,
  });
}

const year = (y: number, locale: Locale) => fmtNum(y, locale).replace(/[٬,]/g, "");

async function WorkDetail({ locale, t, slug }: { locale: Locale; t: Messages; slug: string }) {
  await connection();
  const post = await getPublishedPost(locale, ["work"], slug);
  if (!post) notFound();
  const [translations, rendered, adjacent, testimonial] = await Promise.all([
    getTranslations(post.translationKey),
    renderContent(post.contentMd),
    getAdjacent({
      id: post.id,
      locale,
      types: ["work"],
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
    }),
    getTestimonialForProject(post.projectId, locale),
  ]);
  const s = t.site;
  const m = post.meta;
  const href = postHref(locale, post);
  const facts = [
    m.client && { k: s.client, v: m.client },
    m.year && { k: s.year, v: year(m.year, locale) },
    m.role && { k: s.role, v: m.role },
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <article>
      <SetAlternates value={postAlternates(translations)} />
      <JsonLd
        data={articleLd({
          type: "CreativeWork",
          url: href,
          title: post.title,
          description: post.excerpt,
          image: post.coverUrl,
          published: post.publishedAt,
          modified: post.updatedAt,
          locale,
          authorName: post.authorName,
          keywords: m.stack,
          extra: {
            genre: "Case study",
            dateCreated: m.year ? String(m.year) : undefined,
            sourceOrganization: m.client ? { "@type": "Organization", name: m.client } : undefined,
            url: m.liveUrl ?? undefined,
          },
        })}
      />
      {/* Hero */}
      <header className="relative -mt-16 overflow-hidden pt-16">
        <div aria-hidden className="bg-grid mask-fade-b absolute inset-0 -z-10 opacity-70" />
        <Container className="pt-10 sm:pt-14">
          <Breadcrumbs
            items={[
              homeCrumb(locale),
              { name: s.workPageTitle, path: localePath(locale, "/work") },
              { name: post.title, path: href },
            ]}
          />
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end">
            <div className="space-y-5">
              <h1 className="text-4xl leading-[1.15] font-black tracking-tight text-balance sm:text-5xl lg:text-6xl">
                {post.title}
              </h1>
              {post.excerpt && (
                <p className="max-w-2xl text-lg leading-8 text-pretty text-muted-foreground">
                  {post.excerpt}
                </p>
              )}
            </div>
            <div className="space-y-5 lg:pb-2">
              {facts.length > 0 && (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  {facts.map((f) => (
                    <div key={f.k} className="min-w-0">
                      <dt className="text-xs font-semibold text-muted-foreground">{f.k}</dt>
                      <dd className="mt-1 text-sm font-bold">{f.v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {!!m.stack?.length && (
                <ul className="flex flex-wrap gap-1.5" aria-label={s.stack}>
                  {m.stack.map((x) => (
                    <li
                      key={x}
                      dir="ltr"
                      className="rounded-lg border bg-background px-2.5 py-1 font-mono text-xs font-medium"
                    >
                      {x}
                    </li>
                  ))}
                </ul>
              )}
              {(m.liveUrl || m.repoUrl) && (
                <div className="flex flex-wrap gap-2">
                  {m.liveUrl && (
                    <a
                      href={m.liveUrl}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-grey-800 px-5 text-sm font-bold text-white transition-colors hover:bg-grey-700 dark:bg-white dark:text-grey-800"
                    >
                      {s.liveSite} <ExternalLinkIcon className="size-4" />
                    </a>
                  )}
                  {m.repoUrl && (
                    <a
                      href={m.repoUrl}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-bold hover:border-foreground/30"
                    >
                      <CodeXmlIcon className="size-4" /> {s.sourceCode}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </Container>
      </header>

      <Container className="mt-10 sm:mt-14">
        <Cover
          src={post.coverUrl}
          alt={post.coverAlt ?? post.title}
          seed={post.slug}
          kind="work"
          priority
          sizes="(min-width: 1280px) 1232px, 100vw"
          aspect="aspect-[16/10] sm:aspect-[16/8]"
          className="rounded-3xl shadow-card ring-1 ring-border"
        />
      </Container>

      {!!m.metrics?.length && (
        <Container className="mt-8">
          <section aria-label={s.results}>
            <dl
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 14rem), 1fr))` }}
            >
              {m.metrics.map((x) => (
                <div
                  key={x.label}
                  className="flex flex-col-reverse gap-1 rounded-2xl bg-primary/[0.06] p-6 ring-1 ring-primary/15"
                >
                  <dt className="text-sm font-semibold text-muted-foreground">{x.label}</dt>
                  <dd className="text-4xl font-black tracking-tight text-primary">{x.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </Container>
      )}

      <Container className="mt-14">
        <div className="mx-auto max-w-3xl">
          <div className="prose-gt" dangerouslySetInnerHTML={{ __html: rendered.html }} />
        </div>
      </Container>

      {!!m.gallery?.length && (
        <Container className="mt-16">
          <h2 className="mb-6 text-2xl font-black tracking-tight">{s.gallery}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {m.gallery.map((src, i) => (
              <figure
                key={src + i}
                className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted ring-1 ring-border"
              >
                {/^\/(media|brand)\//.test(src) ? (
                  <Image
                    src={src}
                    alt={`${post.title} — ${i + 1}`}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- external gallery image
                  <img
                    src={src}
                    alt={`${post.title} — ${i + 1}`}
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover"
                  />
                )}
              </figure>
            ))}
          </div>
        </Container>
      )}

      {testimonial && (
        <Container className="mt-16">
          <div className="mx-auto max-w-3xl">
            <TestimonialCard
              item={testimonial}
              className="gt-ring bg-gradient-to-br from-primary/[0.06] to-transparent"
            />
          </div>
        </Container>
      )}

      <Container className="mt-16">
        <div className="mx-auto max-w-3xl">
          <PrevNext
            prev={
              adjacent.prev && { href: postHref(locale, adjacent.prev), title: adjacent.prev.title }
            }
            next={
              adjacent.next && { href: postHref(locale, adjacent.next), title: adjacent.next.title }
            }
            prevLabel={s.prevCase}
            nextLabel={s.nextCase}
          />
        </div>
      </Container>
    </article>
  );
}

export default async function WorkDetailPage({ params }: PageProps<"/[locale]/work/[slug]">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <>
      <Suspense fallback={<ArticleSkeleton />}>
        {params.then(({ slug }) => (
          <WorkDetail locale={locale} t={t} slug={decodeParam(slug)} />
        ))}
      </Suspense>
      <CtaBand locale={locale} t={t} className="mt-10" />
    </>
  );
}
