import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CodeXmlIcon, ExternalLinkIcon } from "lucide-react";
import { SetAlternates } from "@/components/site/alternates";
import { TestimonialCard } from "@/components/site/cards";
import { Cover } from "@/components/site/cover";
import { CtaBand } from "@/components/site/cta-band";
import { articleLd, JsonLd } from "@/components/site/json-ld";
import { FrameCell, FrameFiller, FrameGrid, FrameSection } from "@/components/site/frame";
import { Breadcrumbs, PrevNext } from "@/components/site/nav-bits";
import {
  decodeParam,
  fillers,
  homeCrumb,
  notFoundMetadata,
  plainSpans,
} from "@/components/site/page-utils";
import { pageMetadata, postAlternates } from "@/components/site/seo";
import { ArticleSkeleton } from "@/components/site/skeletons";
import { DecorWindowCell, fmtNum, teamPath, TitleCell, TitleRow } from "@/components/site/ui";
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

  const gallery = m.gallery ?? [];
  return (
    <article className="h-entry" data-reading="">
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

      <FrameSection
        id="top"
        first
        labelledBy="top-title"
        guide={{ key: "work_detail", say: t.guide.work_detail }}
        strip={{ index: 1, path: teamPath("WORK", "CASE-STUDY") }}
      >
        <FrameGrid cols="2-1">
          <TitleCell
            as="h1"
            size="article"
            titleId="top-title"
            title={post.title}
            hClassName="p-name"
            className="lg:min-h-[280px]"
            crumbs={
              <Breadcrumbs
                items={[
                  homeCrumb(locale),
                  { name: s.workPageTitle, path: localePath(locale, "/work") },
                  { name: post.title, path: href },
                ]}
              />
            }
            eyebrow={
              facts.length
                ? facts
                    .slice(0, 2)
                    .map((f) => f.v)
                    .join(" · ")
                : undefined
            }
            subtitle={post.excerpt ? <span className="p-summary">{post.excerpt}</span> : undefined}
          />
          <DecorWindowCell path="CASE-STUDY" always>
            <Cover
              src={post.coverUrl}
              alt={post.coverAlt ?? post.title}
              seed={post.slug}
              kind="work"
              priority
              sizes="(min-width: 1024px) 400px, 100vw"
            />
          </DecorWindowCell>
        </FrameGrid>
      </FrameSection>

      <FrameSection
        id="story"
        ariaLabel={post.title}
        guide={{ key: "work_story", say: t.guide.work_story }}
        strip={{ index: 2, path: teamPath("WORK", "CASE-STUDY", "STORY") }}
      >
        <FrameGrid cols="2-1">
          <FrameCell pad="lg" className="min-w-0">
            <div
              className="prose-gt e-content max-w-[70ch]"
              dangerouslySetInnerHTML={{ __html: rendered.html }}
            />
          </FrameCell>
          <FrameCell tone="card" as="aside" className="min-w-0">
            <div className="flex flex-col gap-7 lg:sticky lg:below-chrome">
              {facts.length > 0 && (
                <dl className="grid gap-4">
                  {facts.map((f) => (
                    <div
                      key={f.k}
                      className="min-w-0 border-b border-dashed border-frame-line pb-3"
                    >
                      <dt className="text-xs font-semibold text-muted-foreground">{f.k}</dt>
                      <dd className="mt-1 text-sm font-bold">{f.v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {!!m.stack?.length && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">{s.stack}</p>
                  <ul className="flex flex-wrap gap-1.5" aria-label={s.stack}>
                    {m.stack.map((x) => (
                      <li
                        key={x}
                        dir="ltr"
                        className="rounded-[6px] border border-frame-line bg-background px-2.5 py-1 font-mono text-xs font-medium"
                      >
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!!m.metrics?.length && (
                <section aria-label={s.results}>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">{s.results}</p>
                  <dl className="divide-y divide-frame-line border-y border-frame-line">
                    {m.metrics.map((x) => (
                      <div key={x.label} className="flex items-baseline justify-between gap-4 py-3">
                        <dt className="text-sm text-muted-foreground">{x.label}</dt>
                        <dd className="text-2xl font-black tracking-tight tabular-nums">
                          {x.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
              {(m.liveUrl || m.repoUrl) && (
                <div className="flex flex-wrap gap-2">
                  {m.liveUrl && (
                    <a
                      href={m.liveUrl}
                      target="_blank"
                      rel="noopener"
                      className="u-url inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-bold text-background transition-opacity hover:opacity-90"
                    >
                      {s.liveSite} <ExternalLinkIcon className="size-4" />
                    </a>
                  )}
                  {m.repoUrl && (
                    <a
                      href={m.repoUrl}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-frame-line bg-background px-5 text-sm font-bold hover:border-foreground/40"
                    >
                      <CodeXmlIcon className="size-4" /> {s.sourceCode}
                    </a>
                  )}
                </div>
              )}
            </div>
          </FrameCell>
        </FrameGrid>

        {gallery.length > 0 && (
          <>
            <TitleRow title={s.gallery} titleId="gallery-title" size="h3" />
            <FrameGrid cols={2}>
              {gallery.map((src, i) => (
                <FrameCell key={src + i} pad="none" as="figure">
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {/^\/(media|brand)\//.test(src) ? (
                      <Image
                        src={src}
                        alt={`${post.title} — ${i + 1}`}
                        fill
                        sizes="(min-width: 768px) 600px, 100vw"
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
                  </div>
                </FrameCell>
              ))}
              <FrameFiller units={fillers(plainSpans(gallery.length), 2)} />
            </FrameGrid>
          </>
        )}

        {testimonial && (
          <FrameGrid cols={1}>
            <FrameCell tone="card" pad="lg">
              <TestimonialCard item={testimonial} variant="cell" className="max-w-3xl" />
            </FrameCell>
          </FrameGrid>
        )}

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
      </FrameSection>
    </article>
  );
}

export default async function WorkDetailPage({ params }: PageProps<"/[locale]/work/[slug]">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <>
      <Suspense
        fallback={<ArticleSkeleton guide={{ key: "work_detail", say: t.guide.work_detail }} />}
      >
        {params.then(({ slug }) => (
          <WorkDetail locale={locale} t={t} slug={decodeParam(slug)} />
        ))}
      </Suspense>
      <CtaBand locale={locale} t={t} />
    </>
  );
}
