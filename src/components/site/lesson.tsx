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
import { ArticleBody, ArticleHeader, AuthorShareRow, Tldr } from "./article";
import { Cover } from "./cover";
import { FrameCell, FrameGrid, FrameSection } from "./frame";
import { LiteYouTube, ViewTracker } from "./islands";
import { articleLd, JsonLd, ids } from "./json-ld";
import { Breadcrumbs } from "./nav-bits";
import { homeCrumb } from "./page-utils";
import { absoluteUrl, postAlternates } from "./seo";
import { DecorWindowCell, fmtNum, teamPath } from "./ui";

export interface SeriesInfo {
  slug: string;
  title: string;
  lessons: PostCardData[];
}

/**
 * Ordered lesson list: hairline rows (course landing, inside its Window) or a
 * compact list (the lesson page's sticky aside).
 */
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
    <ol className={cn(compact ? "space-y-0.5" : "divide-y divide-frame-line")}>
      {series.lessons.map((l, i) => {
        const current = l.id === currentId;
        const done = currentIndex >= 0 && i < currentIndex;
        return (
          <li key={l.id}>
            <Link
              href={postHref(locale, l)}
              aria-current={current ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 transition-colors",
                compact
                  ? "rounded-[6px] px-2.5 py-2 text-sm hover:bg-muted"
                  : "px-4 py-4 hover:bg-muted/60 sm:px-5",
                current && compact && "bg-primary/12 font-bold",
              )}
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-[6px] font-bold tabular-nums",
                  compact ? "size-6 text-[11px]" : "size-9 text-sm",
                  current
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-success/15 text-success-ink"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {done ? <CheckIcon className="size-3.5" /> : fmtNum(i + 1, locale)}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block leading-snug",
                    compact ? "truncate" : "font-bold group-hover:text-primary-ink",
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

/** The sticky course navigator beside a lesson. */
function CourseNav({
  series,
  index,
  currentId,
  locale,
  t,
}: {
  series: SeriesInfo;
  index: number;
  currentId: string;
  locale: Locale;
  t: Messages;
}) {
  const s = t.site;
  return (
    <nav aria-label={series.title}>
      <Link
        href={localePath(locale, `/learn/${encodeURIComponent(series.slug)}`)}
        className="mb-2 flex items-center gap-2 px-2.5 text-sm font-extrabold hover:text-primary-ink"
      >
        <LayersIcon className="size-4 shrink-0" />
        <span className="truncate">{series.title}</span>
      </Link>
      <p className="mb-3 px-2.5 text-xs text-muted-foreground">
        {format(s.lessonOf, {
          n: fmtNum(index + 1, locale),
          total: fmtNum(series.lessons.length, locale),
        })}
      </p>
      <div className="mx-2.5 mb-3 h-1.5 overflow-hidden bg-muted">
        <div
          className="h-full bg-primary"
          style={{ width: `${((index + 1) / series.lessons.length) * 100}%` }}
        />
      </div>
      <LessonList series={series} locale={locale} t={t} currentId={currentId} compact />
    </nav>
  );
}

/**
 * A tutorial page — a lesson of a course (/learn/course/x) or a standalone
 * tutorial (/learn/x). Three boxes inside the `h-entry` root (`data-reading`
 * shrinks the dock): header (+ TL;DR row), body (+ sticky course list or
 * TOC), and the end box (previous/next lesson, share, author).
 */
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
  const lessonOf =
    series &&
    format(s.lessonOf, {
      n: fmtNum(index + 1, locale),
      total: fmtNum(series.lessons.length, locale),
    });
  const showCover = !!post.coverUrl && !yt;
  return (
    <article className="h-entry" data-reading="">
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

      <FrameSection
        id="top"
        first
        labelledBy="top-title"
        guide={{ key: "lesson", say: t.guide.lesson }}
        strip={{ index: 1, path: teamPath("LEARN", "LESSON") }}
      >
        <FrameGrid cols="2-1">
          <ArticleHeader
            post={post}
            locale={locale}
            t={t}
            author={author}
            crumbs={<Breadcrumbs items={crumbs} />}
            eyebrow={
              lessonOf ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary-dark dark:text-primary-light">
                  <LayersIcon className="size-3" />
                  {lessonOf}
                </span>
              ) : undefined
            }
          />
          <DecorWindowCell path="LESSON" icon="learn" always={showCover}>
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
        {post.excerpt && <Tldr text={post.excerpt} label={s.tldr} />}
      </FrameSection>

      <FrameSection
        id="lesson-body"
        ariaLabel={post.title}
        guide={{ key: "lesson_body", say: t.guide.lesson_body }}
        strip={{ index: 2, path: teamPath("LEARN", "LESSON", "BODY") }}
      >
        <ArticleBody
          html={rendered.html}
          headings={series ? [] : rendered.headings}
          tocTitle={s.toc}
          asideAlways={!!series}
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
            series ? (
              <CourseNav series={series} index={index} currentId={post.id} locale={locale} t={t} />
            ) : undefined
          }
        />
      </FrameSection>

      <FrameSection
        id="lesson-end"
        ariaLabel={s.share}
        guide={
          series
            ? { key: "lesson_nav", say: t.guide.lesson_nav }
            : { key: "post_share", say: t.guide.post_share }
        }
        strip={{ index: 3, path: teamPath("LEARN", "LESSON", series ? "NEXT" : "SHARE") }}
      >
        {series && (
          <nav aria-label={`${s.lessonPrev} / ${s.lessonNext}`} className="frame-nav">
            <FrameGrid cols={2}>
              {prev ? (
                <FrameCell hover>
                  <Link
                    href={postHref(locale, prev)}
                    rel="prev"
                    className="group flex h-full flex-col gap-1.5 after:absolute after:inset-0"
                  >
                    <span className="text-xs font-bold text-muted-foreground">{s.lessonPrev}</span>
                    <span className="text-lg leading-snug font-bold text-balance group-hover:text-primary-ink">
                      {prev.title}
                    </span>
                  </Link>
                </FrameCell>
              ) : (
                <FrameCell tone="dots" aria-hidden className="hidden md:block" />
              )}
              {next ? (
                <FrameCell tone="ink">
                  <Link
                    href={postHref(locale, next)}
                    rel="next"
                    className="group flex items-center justify-between gap-4 after:absolute after:inset-0"
                  >
                    <span>
                      <span className="block text-xs font-bold text-[#ffdb66]">{s.lessonNext}</span>
                      <span className="mt-1 block text-lg font-extrabold text-balance">
                        {next.title}
                      </span>
                    </span>
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-[#ffc50d] text-[#1c1c1e] transition-transform group-hover:scale-105">
                      <PlayIcon className="size-4 fill-current rtl:rotate-180" />
                    </span>
                  </Link>
                </FrameCell>
              ) : (
                <FrameCell tone="card" className="flex items-center justify-center">
                  <p className="text-center font-bold text-success-ink">{s.courseFinished}</p>
                </FrameCell>
              )}
            </FrameGrid>
          </nav>
        )}
        <AuthorShareRow profile={profile} locale={locale} t={t} url={href} title={post.title} />
      </FrameSection>
    </article>
  );
}
