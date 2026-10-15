import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { FileDownIcon } from "lucide-react";
import { SetAlternates } from "@/components/site/alternates";
import {
  ArticleBody,
  ArticleHeader,
  AuthorBox,
  ShareBar,
  Syndicated,
  Tldr,
} from "@/components/site/article";
import { PostCard } from "@/components/site/cards";
import { Cover } from "@/components/site/cover";
import { LiteYouTube, ViewTracker } from "@/components/site/islands";
import { articleLd, JsonLd, videoLd, type Thing } from "@/components/site/json-ld";
import { Breadcrumbs, PrevNext } from "@/components/site/nav-bits";
import { decodeParam, homeCrumb, notFoundMetadata, withQuery } from "@/components/site/page-utils";
import { pageMetadata, postAlternates } from "@/components/site/seo";
import { ArticleSkeleton } from "@/components/site/skeletons";
import { Container } from "@/components/site/ui";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getLocale, getMessages } from "@/i18n/server";
import { blogTypes, postHref, postPath, youtubeId } from "@/lib/content";
import { markdownToText } from "@/lib/markdown";
import {
  getAdjacent,
  getPublicProfile,
  getPublishedPost,
  getRelated,
  getSyndicationLinks,
  getTranslations,
  renderContent,
} from "@/server/modules/content/queries";

const TYPES = [...blogTypes];

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const locale = await getLocale();
  await connection();
  const post = await getPublishedPost(locale, TYPES, decodeParam((await params).slug));
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
    tags: post.tags,
    section: getMessages(locale).site[`type_${post.type}`],
    markdownPath: `${postPath(post)}.md`,
  });
}

async function BlogPost({ locale, t, slug }: { locale: Locale; t: Messages; slug: string }) {
  await connection();
  const post = await getPublishedPost(locale, TYPES, slug);
  if (!post) notFound();
  const [translations, rendered, adjacent, related, synd, profile] = await Promise.all([
    getTranslations(post.translationKey),
    renderContent(post.contentMd),
    getAdjacent({
      id: post.id,
      locale,
      types: TYPES,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
    }),
    getRelated({ id: post.id, locale, tags: post.tags }, TYPES, 3),
    getSyndicationLinks(post.id),
    getPublicProfile(),
  ]);
  const s = t.site;
  const href = postHref(locale, post);
  const isNote = post.type === "note";
  const yt = post.type === "vlog" ? youtubeId(post.videoUrl) : null;
  const author = post.authorName ?? (profile.ownerName[locale] || null);
  const description = post.excerpt || markdownToText(post.contentMd, 200);

  const ld: Thing[] = [
    articleLd({
      type: "BlogPosting",
      url: href,
      title: post.title,
      description,
      image: post.coverUrl,
      published: post.publishedAt,
      modified: post.updatedAt,
      locale,
      authorName: author,
      keywords: post.tags,
      wordCount: markdownToText(post.contentMd, 1_000_000).split(/\s+/).length,
    }),
  ];
  if (yt) {
    ld.push(
      videoLd({
        url: href,
        title: post.title,
        description,
        thumbnail: post.coverUrl ?? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
        uploadDate: post.publishedAt,
        embedUrl: `https://www.youtube-nocookie.com/embed/${yt}`,
        contentUrl: post.videoUrl,
      }),
    );
  }

  return (
    <>
      <SetAlternates value={postAlternates(translations)} />
      <ViewTracker id={post.id} />
      <JsonLd data={ld} />
      <article className="h-entry">
        <Container className={isNote ? "max-w-3xl pt-10 sm:pt-14" : "max-w-5xl pt-10 sm:pt-14"}>
          <ArticleHeader
            post={post}
            locale={locale}
            t={t}
            author={author}
            crumbs={
              <Breadcrumbs
                items={[
                  homeCrumb(locale),
                  { name: s.blogTitle, path: localePath(locale, "/blog") },
                  { name: post.title, path: href },
                ]}
              />
            }
          />
          {!!post.tags.length && (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label={s.tags}>
              {post.tags.map((tg) => (
                <li key={tg}>
                  <Link
                    href={withQuery(localePath(locale, "/blog"), { tag: tg })}
                    rel="tag"
                    className="p-category rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    #{tg}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {post.excerpt && !isNote && (
            <div className="mt-8">
              <Tldr text={post.excerpt} label={s.tldr} />
            </div>
          )}
          {!isNote && (
            <div className="mt-8">
              {yt ? (
                <LiteYouTube
                  id={yt}
                  title={post.title}
                  poster={post.coverUrl}
                  playLabel={s.playVideo}
                  notice={s.videoNotice}
                />
              ) : post.coverUrl ? (
                <Cover
                  src={post.coverUrl}
                  alt={post.coverAlt ?? post.title}
                  seed={post.slug}
                  kind={post.type}
                  priority
                  sizes="(min-width: 1024px) 976px, 100vw"
                  className="rounded-3xl ring-1 ring-border"
                />
              ) : null}
            </div>
          )}
          <div
            className={
              isNote ? "mt-8 rounded-3xl border border-dashed bg-muted/30 p-6 sm:p-8" : "mt-10"
            }
          >
            <ArticleBody
              html={rendered.html}
              headings={isNote ? [] : rendered.headings}
              tocTitle={s.toc}
              aside={
                <Link
                  href={`${href}.md`}
                  prefetch={false}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <FileDownIcon className="size-3.5" /> {s.markdownVersion}
                </Link>
              }
            />
          </div>
          <div className="mt-12 flex flex-col gap-4 border-y border-dashed py-6 sm:flex-row sm:items-center sm:justify-between">
            <ShareBar url={href} title={post.title} t={t} />
            <Syndicated links={synd} t={t} />
          </div>
          <div className="mt-10">
            <AuthorBox profile={profile} locale={locale} t={t} />
          </div>
          <div className="mt-10">
            <PrevNext
              prev={
                adjacent.prev && {
                  href: postHref(locale, adjacent.prev),
                  title: adjacent.prev.title,
                }
              }
              next={
                adjacent.next && {
                  href: postHref(locale, adjacent.next),
                  title: adjacent.next.title,
                }
              }
              prevLabel={s.prevPost}
              nextLabel={s.nextPost}
            />
          </div>
          {/* microformats2 for IndieWeb readers */}
          <a href={href} className="u-url hidden" aria-hidden tabIndex={-1}>
            {post.title}
          </a>
        </Container>
      </article>
      {related.length > 0 && (
        <section className="mt-20">
          <Container>
            <h2 className="mb-8 text-2xl font-black tracking-tight sm:text-3xl">
              {s.relatedPosts}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PostCard key={p.id} post={p} locale={locale} t={t} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}

export default async function BlogPostPage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <Suspense fallback={<ArticleSkeleton />}>
      {params.then(({ slug }) => (
        <BlogPost locale={locale} t={t} slug={decodeParam(slug)} />
      ))}
    </Suspense>
  );
}
