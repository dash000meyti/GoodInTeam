import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LessonView } from "@/components/site/lesson";
import { decodeParam, notFoundMetadata } from "@/components/site/page-utils";
import { pageMetadata, postAlternates } from "@/components/site/seo";
import { ArticleSkeleton } from "@/components/site/skeletons";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getLocale, getMessages } from "@/i18n/server";
import { postPath } from "@/lib/content";
import { markdownToText } from "@/lib/markdown";
import {
  getPublishedPost,
  getSeriesWithLessons,
  getTranslations,
} from "@/server/modules/content/queries";

async function resolve(locale: Locale, seriesSlug: string, lessonSlug: string) {
  const course = await getSeriesWithLessons(locale, seriesSlug);
  if (!course) return null;
  const post = await getPublishedPost(locale, ["tutorial"], lessonSlug);
  if (!post || post.seriesId !== course.series.id) return null;
  return { course, post };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/learn/[series]/[lesson]">): Promise<Metadata> {
  const locale = await getLocale();
  await connection();
  const p = await params;
  const r = await resolve(locale, decodeParam(p.series), decodeParam(p.lesson));
  if (!r) return notFoundMetadata(locale);
  const { post, course } = r;
  return pageMetadata({
    locale,
    path: postPath(post),
    title: `${post.seoTitle || post.title} — ${course.series.title}`,
    description: post.seoDescription || post.excerpt || markdownToText(post.contentMd, 160),
    languages: postAlternates(await getTranslations(post.translationKey)),
    type: "article",
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    authors: post.authorName ? [post.authorName] : undefined,
    tags: post.tags,
    section: course.series.title,
    image: post.coverUrl,
    markdownPath: `${postPath(post)}.md`,
  });
}

async function Lesson({
  locale,
  t,
  seriesSlug,
  lessonSlug,
}: {
  locale: Locale;
  t: Messages;
  seriesSlug: string;
  lessonSlug: string;
}) {
  await connection();
  const r = await resolve(locale, seriesSlug, lessonSlug);
  if (!r) notFound();
  return (
    <LessonView
      post={r.post}
      series={{
        slug: r.course.series.slug,
        title: r.course.series.title,
        lessons: r.course.lessons,
      }}
      locale={locale}
      t={t}
    />
  );
}

export default async function LessonPage({
  params,
}: PageProps<"/[locale]/learn/[series]/[lesson]">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <Suspense fallback={<ArticleSkeleton />}>
      {params.then((p) => (
        <Lesson
          locale={locale}
          t={t}
          seriesSlug={decodeParam(p.series)}
          lessonSlug={decodeParam(p.lesson)}
        />
      ))}
    </Suspense>
  );
}
