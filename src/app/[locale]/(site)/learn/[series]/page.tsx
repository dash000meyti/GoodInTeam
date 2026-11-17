import { Suspense } from "react";
import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BarChart3Icon, BookOpenIcon, ClockIcon, PlayIcon } from "lucide-react";
import { Window } from "@/components/shell/window";
import { Cover } from "@/components/site/cover";
import { FrameCell, FrameGrid, FrameSection } from "@/components/site/frame";
import { JsonLd, ids } from "@/components/site/json-ld";
import { LessonList, LessonView } from "@/components/site/lesson";
import { Breadcrumbs } from "@/components/site/nav-bits";
import { decodeParam, homeCrumb, notFoundMetadata } from "@/components/site/page-utils";
import { absoluteUrl, pageMetadata, postAlternates, withDefaultImage } from "@/components/site/seo";
import { ArticleSkeleton } from "@/components/site/skeletons";
import { fmtNum, PageHero, pillClass, teamPath, TitleRow } from "@/components/site/ui";
import { format } from "@/i18n/format-message";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getLocale, getMessages } from "@/i18n/server";
import { postHref, postPath } from "@/lib/content";
import { markdownToText } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import {
  getPublishedPost,
  getSeriesWithLessons,
  getTranslations,
} from "@/server/modules/content/queries";

/**
 * /learn/<slug> is either a course landing page (series) or a standalone
 * tutorial (a tutorial post without a series). Courses win on slug clashes.
 */
async function resolve(locale: Locale, slug: string) {
  const course = await getSeriesWithLessons(locale, slug);
  if (course) return { kind: "course" as const, course };
  const post = await getPublishedPost(locale, ["tutorial"], slug);
  if (post && !post.seriesId) return { kind: "tutorial" as const, post };
  return null;
}

export async function generateMetadata(
  { params }: PageProps<"/[locale]/learn/[series]">,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const locale = await getLocale();
  await connection();
  const slug = decodeParam((await params).series);
  const r = await resolve(locale, slug);
  if (!r) return notFoundMetadata(locale);
  if (r.kind === "course") {
    const meta = pageMetadata({
      locale,
      path: `/learn/${encodeURIComponent(r.course.series.slug)}`,
      title: r.course.series.title,
      description: r.course.series.description,
      languages: {
        [locale]: localePath(locale, `/learn/${encodeURIComponent(r.course.series.slug)}`),
      },
      image: r.course.series.coverUrl,
    });
    return withDefaultImage(meta, parent);
  }
  const post = r.post;
  const meta = pageMetadata({
    locale,
    path: postPath(post),
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || markdownToText(post.contentMd, 160),
    languages: postAlternates(await getTranslations(post.translationKey)),
    type: "article",
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    authors: post.authorName ? [post.authorName] : undefined,
    tags: post.tags,
    image: post.coverUrl,
    markdownPath: `${postPath(post)}.md`,
  });
  return withDefaultImage(meta, parent);
}

async function SeriesOrTutorial({
  locale,
  t,
  slug,
}: {
  locale: Locale;
  t: Messages;
  slug: string;
}) {
  await connection();
  const r = await resolve(locale, slug);
  if (!r) notFound();
  if (r.kind === "tutorial")
    return <LessonView post={r.post} series={null} locale={locale} t={t} />;

  const { series, lessons, minutes } = r.course;
  const s = t.site;
  const href = localePath(locale, `/learn/${encodeURIComponent(series.slug)}`);
  const first = lessons[0];
  const facts = [
    {
      icon: BookOpenIcon,
      k: s.courseContents,
      v: format(s.lessonsCount, { n: fmtNum(lessons.length, locale) }),
    },
    {
      icon: ClockIcon,
      k: s.totalTime,
      v: format(s.minutesTotal, { n: fmtNum(minutes, locale) }),
    },
    ...(series.level
      ? [{ icon: BarChart3Icon, k: s.courseLevel, v: s[`level_${series.level}`] }]
      : []),
  ];
  return (
    <>
      <JsonLd
        data={{
          "@type": "Course",
          "@id": `${absoluteUrl(href)}#course`,
          name: series.title,
          description: series.description || series.title,
          url: absoluteUrl(href),
          inLanguage: locale === "fa" ? "fa-IR" : "en-US",
          provider: { "@id": ids.organization() },
          educationalLevel: series.level ?? undefined,
          isAccessibleForFree: true,
          timeRequired: minutes ? `PT${minutes}M` : undefined,
          offers: { "@type": "Offer", price: 0, priceCurrency: "USD", category: "Free" },
          hasCourseInstance: {
            "@type": "CourseInstance",
            courseMode: "Online",
            courseWorkload: minutes ? `PT${minutes}M` : undefined,
          },
          hasPart: lessons.map((l) => ({
            "@type": "LearningResource",
            name: l.title,
            url: absoluteUrl(postHref(locale, l)),
          })),
        }}
      />
      <PageHero
        section="COURSE"
        icon="learn"
        guide={{ key: "course", say: t.guide.course }}
        crumbs={
          <Breadcrumbs
            items={[
              homeCrumb(locale),
              { name: s.learnTitle, path: localePath(locale, "/learn") },
              { name: series.title, path: href },
            ]}
          />
        }
        eyebrow={s.courseEyebrow}
        title={series.title}
        subtitle={series.description}
        windowBody={
          series.coverUrl ? (
            <Cover
              src={series.coverUrl}
              alt={series.title}
              seed={series.slug}
              kind="tutorial"
              priority
              sizes="(min-width: 1024px) 400px, 100vw"
            />
          ) : undefined
        }
      >
        <dl className="flex flex-wrap gap-x-8 gap-y-3 pt-1">
          {facts.map((f) => (
            <div key={f.k} className="flex flex-col-reverse gap-0.5">
              <dt className="text-xs text-muted-foreground">{f.k}</dt>
              <dd className="flex items-center gap-1.5 text-base font-extrabold">
                <f.icon className="size-4 text-muted-foreground" aria-hidden /> {f.v}
              </dd>
            </div>
          ))}
        </dl>
        {first && (
          <Link href={postHref(locale, first)} className={cn(pillClass.primary, "h-12 px-7")}>
            <PlayIcon className="size-4 fill-current rtl:rotate-180" aria-hidden /> {s.startCourse}
          </Link>
        )}
      </PageHero>

      <FrameSection
        id="lessons"
        labelledBy="lessons-title"
        guide={{ key: "course_lessons", say: t.guide.course_lessons }}
        strip={{ index: 2, path: teamPath("LEARN", "COURSE", "LESSONS") }}
      >
        <TitleRow title={s.courseContents} titleId="lessons-title" size="h3" />
        <FrameGrid cols={1}>
          <FrameCell tone="dots" className="py-10 md:py-14">
            <Window path="COURSE/LESSONS" className="mx-auto max-w-3xl">
              <LessonList
                series={{ slug: series.slug, title: series.title, lessons }}
                locale={locale}
                t={t}
              />
            </Window>
          </FrameCell>
        </FrameGrid>
      </FrameSection>
    </>
  );
}

export default async function LearnSlugPage({ params }: PageProps<"/[locale]/learn/[series]">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <Suspense fallback={<ArticleSkeleton guide={{ key: "course", say: t.guide.course }} />}>
      {params.then(({ series }) => (
        <SeriesOrTutorial locale={locale} t={t} slug={decodeParam(series)} />
      ))}
    </Suspense>
  );
}
