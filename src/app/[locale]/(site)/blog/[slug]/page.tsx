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
  AuthorShareRow,
  Syndicated,
  Tldr,
} from "@/components/site/article";
import { PostCard } from "@/components/site/cards";
import { Cover } from "@/components/site/cover";
import { FrameCell, FrameFiller, FrameGrid, FrameSection } from "@/components/site/frame";
import { LiteYouTube, ViewTracker } from "@/components/site/islands";
import { articleLd, JsonLd, videoLd, type Thing } from "@/components/site/json-ld";
import { Breadcrumbs, PrevNext } from "@/components/site/nav-bits";
import {
  clampSay,
  decodeParam,
  fillers,
  homeCrumb,
  notFoundMetadata,
  plainSpans,
  withQuery,
} from "@/components/site/page-utils";
import { pageMetadata, postAlternates } from "@/components/site/seo";
import { ArticleSkeleton } from "@/components/site/skeletons";
import { DecorWindowCell, teamPath, TitleRow } from "@/components/site/ui";
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

  const showCover = !!post.coverUrl && !yt && !isNote;
  return (
    <>
      <SetAlternates value={postAlternates(translations)} />
      <ViewTracker id={post.id} />
      <JsonLd data={ld} />
      <article className="h-entry" data-reading="">
        <FrameSection
          id="top"
          first
          labelledBy="top-title"
          guide={{ key: "post_detail", say: t.guide.post_detail }}
          strip={{ index: 1, path: teamPath("BLOG", "POST") }}
        >
          <FrameGrid cols="2-1">
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
            >
              {!!post.tags.length && (
                <ul className="flex flex-wrap gap-2" aria-label={s.tags}>
                  {post.tags.map((tg) => (
                    <li key={tg}>
                      <Link
                        href={withQuery(localePath(locale, "/blog"), { tag: tg })}
                        rel="tag"
                        className="p-category rounded-[6px] bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                      >
                        #{tg}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </ArticleHeader>
            <DecorWindowCell path="POST" icon="blog" always={showCover}>
              {showCover ? (
                <Cover
                  src={post.coverUrl}
                  alt={post.coverAlt ?? post.title}
                  seed={post.slug}
                  kind={post.type}
                  priority
                  sizes="(min-width: 1024px) 400px, 100vw"
                />
              ) : undefined}
            </DecorWindowCell>
          </FrameGrid>
          {post.excerpt && !isNote && <Tldr text={post.excerpt} label={s.tldr} />}
        </FrameSection>

        <FrameSection
          id="post-body"
          ariaLabel={post.title}
          guide={{ key: "post_body", say: t.guide.post_body }}
          strip={{ index: 2, path: teamPath("BLOG", "POST", "BODY") }}
        >
          <ArticleBody
            html={rendered.html}
            headings={isNote ? [] : rendered.headings}
            tocTitle={s.toc}
            before={
              yt ? (
                <LiteYouTube
                  id={yt}
                  title={post.title}
                  poster={post.coverUrl}
                  playLabel={s.playVideo}
                  notice={s.videoNotice}
                />
              ) : undefined
            }
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
        </FrameSection>

        <FrameSection
          id="post-end"
          ariaLabel={s.share}
          guide={{ key: "post_share", say: t.guide.post_share }}
          strip={{ index: 3, path: teamPath("BLOG", "POST", "SHARE") }}
        >
          <AuthorShareRow
            profile={profile}
            locale={locale}
            t={t}
            url={href}
            title={post.title}
            syndication={<Syndicated links={synd} t={t} />}
          />
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
          {related.length > 0 && (
            <>
              <TitleRow title={s.relatedPosts} titleId="related-title" size="h3" />
              <FrameGrid cols={3}>
                {related.map((p) => (
                  <FrameCell
                    key={p.id}
                    hover
                    spot={{ key: `post-${p.slug}`, say: clampSay(p.excerpt || p.title) }}
                  >
                    <PostCard post={p} locale={locale} t={t} variant="cell" />
                  </FrameCell>
                ))}
                <FrameFiller units={fillers(plainSpans(related.length), 3)} />
              </FrameGrid>
            </>
          )}
        </FrameSection>
        {/* microformats2 for IndieWeb readers */}
        <a href={href} className="u-url hidden" aria-hidden tabIndex={-1}>
          {post.title}
        </a>
      </article>
    </>
  );
}

export default async function BlogPostPage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <Suspense
      fallback={<ArticleSkeleton guide={{ key: "post_detail", say: t.guide.post_detail }} />}
    >
      {params.then(({ slug }) => (
        <BlogPost locale={locale} t={t} slug={decodeParam(slug)} />
      ))}
    </Suspense>
  );
}
