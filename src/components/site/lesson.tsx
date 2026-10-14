import "server-only";
import Link from "next/link";
import { CheckIcon, ClockIcon, LayersIcon, PlayIcon } from "lucide-react";
import { format } from "@/i18n/format-message";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { postHref, youtubeId } from "@/lib/content";
import { markdownToText } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import {
  getPublicProfile,
  getTranslations,
  renderContent,
  type PostCard as PostCardData,
  type PostDetail,
} from "@/server/modules/content/queries";
import { SetAlternates } from "./alternates";
import { ArticleBody, ArticleHeader, AuthorBox, ShareBar, Tldr } from "./article";
import { LiteYouTube, ViewTracker } from "./islands";
import { articleLd, JsonLd, ids } from "./json-ld";
import { Breadcrumbs, PrevNext } from "./nav-bits";
import { homeCrumb } from "./page-utils";
import { absoluteUrl, postAlternates } from "./seo";
import { Container, fmtNum } from "./ui";

export interface SeriesInfo {
  slug: string;
  title: string;
  lessons: PostCardData[];
}

/** Ordered lesson list (course landing + lesson sidebar). */
export function LessonList({
  series,
  locale,
  t,
  currentId,
  compact,
}: {
  series: SeriesInfo;
  locale: Locale;
  t: Messages;
  currentId?: string;
  compact?: boolean;
}) {
  const currentIndex = series.lessons.findIndex((l) => l.id === currentId);
  return (
    <ol className={cn("space-y-1.5", !compact && "space-y-3")}>
      {series.lessons.map((l, i) => {
        const current = l.id === currentId;
        const done = currentIndex >= 0 && i < currentIndex;
        return (
          <li key={l.id}>
            <Link
              href={postHref(locale, l)}
              aria-current={current ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl transition-colors",
                compact
                  ? "px-2.5 py-2 text-sm hover:bg-muted"
                  : "border border-border bg-card p-4 hover:border-primary/40 sm:p-5",
                current && (compact ? "bg-primary/10 font-bold text-primary" : "border-primary/50"),
              )}
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full font-bold",
                  compact ? "size-6 text-[11px]" : "size-9 text-sm",
                  current
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-success/15 text-success"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {done ? <CheckIcon className="size-3.5" /> : fmtNum(i + 1, locale)}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block leading-snug",
                    compact ? "truncate" : "font-bold group-hover:text-primary",
                  )}
                >
                  {l.title}
                </span>
                {!compact && l.excerpt && (
                  <span className="mt-1 block truncate text-sm text-muted-foreground">
                    {l.excerpt}
                  </span>
                )}
              </span>
              {!compact && l.readingMinutes ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <ClockIcon className="size-3.5" />
                  {format(t.site.minRead, { n: fmtNum(l.readingMinutes, locale) })}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** A tutorial page — standalone (/learn/x) or a lesson of a course (/learn/course/x). */
export async function LessonView({
  post,
  series,
  locale,
  t,
}: {
  post: PostDetail;
  series: SeriesInfo | null;
  locale: Locale;
  t: Messages;
}) {
  const s = t.site;
  const [translations, rendered, profile] = await Promise.all([
    getTranslations(post.translationKey),
    renderContent(post.contentMd),
    getPublicProfile(),
  ]);
  const href = postHref(locale, post);
  const index = series ? series.lessons.findIndex((l) => l.id === post.id) : -1;
  const prev = index > 0 ? series!.lessons[index - 1] : null;
  const next =
    series && index >= 0 && index < series.lessons.length - 1 ? series.lessons[index + 1] : null;
  const author = post.authorName ?? (profile.ownerName[locale] || null);
  const yt = youtubeId(post.videoUrl);
  const crumbs = [
    homeCrumb(locale),
    { name: s.learnTitle, path: localePath(locale, "/learn") },
    ...(series
      ? [
          {
            name: series.title,
            path: localePath(locale, `/learn/${encodeURIComponent(series.slug)}`),
          },
        ]
      : []),
    { name: post.title, path: href },
  ];
  return (
    <>
      <SetAlternates value={postAlternates(translations)} />
      <ViewTracker id={post.id} />
      <JsonLd
        data={articleLd({
          type: "LearningResource",
          url: href,
          title: post.title,
          description: post.excerpt || markdownToText(post.contentMd, 200),
          image: post.coverUrl,
          published: post.publishedAt,
          modified: post.updatedAt,
          locale,
          authorName: author,
          keywords: post.tags,
          extra: {
            learningResourceType: "Tutorial",
            educationalLevel: undefined,
            timeRequired: post.readingMinutes ? `PT${post.readingMinutes}M` : undefined,
            isAccessibleForFree: true,
            position: index >= 0 ? index + 1 : undefined,
            isPartOf: series
              ? {
                  "@type": "Course",
                  "@id": `${absoluteUrl(localePath(locale, `/learn/${encodeURIComponent(series.slug)}`))}#course`,
                  name: series.title,
                  provider: { "@id": ids.organization() },
                }
              : { "@id": ids.website(locale) },
          },
        })}
      />
      <Container className="pt-10 sm:pt-14">
        <div
          className={cn("grid gap-10", series && "lg:grid-cols-[18rem_minmax(0,1fr)] xl:gap-14")}
        >
          {series && (
            <aside className="order-last lg:order-first">
              <div className="rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-24">
                <Link
                  href={localePath(locale, `/learn/${encodeURIComponent(series.slug)}`)}
                  className="mb-3 flex items-center gap-2 px-2.5 text-sm font-extrabold hover:text-primary"
                >
                  <LayersIcon className="size-4 text-primary" />
                  <span className="truncate">{series.title}</span>
                </Link>
                <p className="mb-3 px-2.5 text-xs text-muted-foreground">
                  {format(s.lessonOf, {
                    n: fmtNum(index + 1, locale),
                    total: fmtNum(series.lessons.length, locale),
                  })}
                </p>
                <div className="mx-2.5 mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${((index + 1) / series.lessons.length) * 100}%` }}
                  />
                </div>
                <LessonList series={series} locale={locale} t={t} currentId={post.id} compact />
              </div>
            </aside>
          )}
          <article className="min-w-0">
            <ArticleHeader
              post={post}
              locale={locale}
              t={t}
              author={author}
              crumbs={<Breadcrumbs items={crumbs} />}
              eyebrow={
                series ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary-dark dark:text-primary-light">
                    <LayersIcon className="size-3" />
                    {format(s.lessonOf, {
                      n: fmtNum(index + 1, locale),
                      total: fmtNum(series.lessons.length, locale),
                    })}
                  </span>
                ) : undefined
              }
            />
            {post.excerpt && (
              <div className="mt-8">
                <Tldr text={post.excerpt} label={s.tldr} />
              </div>
            )}
            {yt && (
              <div className="mt-8">
                <LiteYouTube
                  id={yt}
                  title={post.title}
                  poster={post.coverUrl}
                  playLabel={s.playVideo}
                  notice={s.videoNotice}
                />
              </div>
            )}
            <div className="mt-10">
              <ArticleBody
                html={rendered.html}
                headings={series ? [] : rendered.headings}
                tocTitle={s.toc}
              />
            </div>
            {series && (
              <div className="mt-12">
                {next ? (
                  <Link
                    href={postHref(locale, next)}
                    className="group flex items-center justify-between gap-4 rounded-2xl bg-grey-900 p-6 text-white transition-colors hover:bg-grey-800 dark:bg-card dark:ring-1 dark:ring-border"
                  >
                    <span>
                      <span className="block text-xs font-bold text-primary-light">
                        {s.lessonNext}
                      </span>
                      <span className="mt-1 block text-lg font-extrabold">{next.title}</span>
                    </span>
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <PlayIcon className="size-4 fill-current rtl:rotate-180" />
                    </span>
                  </Link>
                ) : (
                  <p className="rounded-2xl border border-success/30 bg-success/5 p-6 text-center font-bold text-success">
                    {s.courseFinished}
                  </p>
                )}
              </div>
            )}
            <div className="mt-10 border-y border-dashed py-6">
              <ShareBar url={href} title={post.title} t={t} />
            </div>
            {series && prev && (
              <div className="mt-10">
                <PrevNext
                  prev={prev && { href: postHref(locale, prev), title: prev.title }}
                  next={null}
                  prevLabel={s.lessonPrev}
                  nextLabel={s.lessonNext}
                />
              </div>
            )}
            <div className="mt-10">
              <AuthorBox profile={profile} locale={locale} t={t} />
            </div>
          </article>
        </div>
      </Container>
    </>
  );
}
