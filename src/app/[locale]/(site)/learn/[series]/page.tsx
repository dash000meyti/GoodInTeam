import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BarChart3Icon, BookOpenIcon, ClockIcon, PlayIcon } from "lucide-react";
import { JsonLd, ids } from "@/components/site/json-ld";
import { LessonList, LessonView } from "@/components/site/lesson";
import { Breadcrumbs } from "@/components/site/nav-bits";
import { decodeParam, homeCrumb, notFoundMetadata } from "@/components/site/page-utils";
import { absoluteUrl, pageMetadata, postAlternates } from "@/components/site/seo";
import { ArticleSkeleton } from "@/components/site/skeletons";
import { Container, fmtNum } from "@/components/site/ui";
import { format } from "@/i18n/format-message";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getLocale, getMessages } from "@/i18n/server";
import { postHref, postPath } from "@/lib/content";
import { markdownToText } from "@/lib/markdown";
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

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/learn/[series]">): Promise<Metadata> {
  const locale = await getLocale();
  await connection();
  const slug = decodeParam((await params).series);
  const r = await resolve(locale, slug);
  if (!r) return notFoundMetadata(locale);
  if (r.kind === "course") {
    return pageMetadata({
      locale,
      path: `/learn/${encodeURIComponent(r.course.series.slug)}`,
      title: r.course.series.title,
      description: r.course.series.description,
      languages: {
        [locale]: localePath(locale, `/learn/${encodeURIComponent(r.course.series.slug)}`),
      },
      image: r.course.series.coverUrl,
    });
  }
  const post = r.post;
  return pageMetadata({
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
      <section className="relative isolate">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-16 bottom-0 -z-10 overflow-hidden"
        >
          <div aria-hidden className="bg-grid mask-fade-b absolute inset-0 -z-10 opacity-70" />
          <div aria-hidden className="gt-glow end-[10%] -top-32 -z-10 size-96 bg-primary/20" />
        </div>
        <Container className="pt-10 pb-12 sm:pt-14">
          <Breadcrumbs
            items={[
              homeCrumb(locale),
              { name: s.learnTitle, path: localePath(locale, "/learn") },
              { name: series.title, path: href },
            ]}
          />
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary-dark dark:text-primary-light">
                <BookOpenIcon className="size-3.5" /> {s.courseEyebrow}
              </span>
              <h1 className="text-4xl leading-[1.15] font-black tracking-tight text-balance sm:text-5xl">
                {series.title}
              </h1>
              {series.description && (
                <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                  {series.description}
                </p>
              )}
              {first && (
                <Link
                  href={postHref(locale, first)}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-[15px] font-bold text-primary-foreground shadow-primary transition-colors hover:bg-primary-dark"
                >
                  <PlayIcon className="size-4 fill-current rtl:rotate-180" /> {s.startCourse}
                </Link>
              )}
            </div>
            <dl
              className={`grid gap-3 rounded-3xl border border-border bg-card p-3 shadow-card ${series.level ? "grid-cols-3" : "grid-cols-2"}`}
            >
              {[
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
              ].map((f) => (
                <div
                  key={f.k}
                  className="flex flex-col-reverse items-center gap-1 rounded-2xl bg-muted/50 px-3 py-5 text-center"
                >
                  <dt className="text-xs text-muted-foreground">{f.k}</dt>
                  <dd className="flex items-center gap-1.5 text-base font-extrabold">
                    <f.icon className="size-4 text-primary" /> {f.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>
      <Container className="max-w-4xl">
        <h2 className="mb-6 text-2xl font-black tracking-tight">{s.courseContents}</h2>
        <LessonList
          series={{ slug: series.slug, title: series.title, lessons }}
          locale={locale}
          t={t}
        />
      </Container>
    </>
  );
}

export default async function LearnSlugPage({ params }: PageProps<"/[locale]/learn/[series]">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <Suspense fallback={<ArticleSkeleton />}>
      {params.then(({ series }) => (
        <SeriesOrTutorial locale={locale} t={t} slug={decodeParam(series)} />
      ))}
    </Suspense>
  );
}
