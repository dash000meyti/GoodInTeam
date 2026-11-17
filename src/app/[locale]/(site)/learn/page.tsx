import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PostCard, SeriesCard } from "@/components/site/cards";
import { FrameCell, FrameFiller, FrameGrid, FrameSection } from "@/components/site/frame";
import { JsonLd } from "@/components/site/json-ld";
import { Breadcrumbs } from "@/components/site/nav-bits";
import { clampSay, fillers, homeCrumb, plainSpans } from "@/components/site/page-utils";
import { absoluteUrl, pageMetadata } from "@/components/site/seo";
import { CellGridSkeleton } from "@/components/site/skeletons";
import { EmptyCell, PageHero, teamPath, TitleRow } from "@/components/site/ui";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getLocale, getMessages } from "@/i18n/server";
import { listPublished, listSeries } from "@/server/modules/content/queries";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getMessages(locale);
  return pageMetadata({
    locale,
    path: "/learn",
    title: t.site.learnTitle,
    description: t.site.learnSubtitle,
  });
}

/** Courses (series cards, each a guide spot) then standalone tutorials, as stacked rows. */
async function LearnContent({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const [courses, { items: tutorials }] = await Promise.all([
    listSeries(locale),
    listPublished({ locale, types: ["tutorial"], standalone: true, pageSize: 24 }),
  ]);
  const visibleCourses = courses.filter((c) => c.lessons > 0);
  if (!visibleCourses.length && !tutorials.length) {
    return (
      <FrameGrid cols={1}>
        <EmptyCell icon="learn" title={t.site.noCourses} hint={t.site.emptyListHint} />
      </FrameGrid>
    );
  }
  return (
    <>
      {visibleCourses.length > 0 && (
        <>
          <JsonLd
            data={{
              "@type": "ItemList",
              itemListElement: visibleCourses.map((c, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: absoluteUrl(localePath(locale, `/learn/${encodeURIComponent(c.slug)}`)),
              })),
            }}
          />
          <TitleRow title={t.site.courses} titleId="courses-title" size="h3" />
          <FrameGrid cols={3}>
            {visibleCourses.map((c) => (
              <FrameCell
                key={c.id}
                hover
                spot={{ key: `series-${c.slug}`, say: clampSay(c.description || c.title) }}
              >
                <SeriesCard s={c} locale={locale} t={t} variant="cell" />
              </FrameCell>
            ))}
            <FrameFiller units={fillers(plainSpans(visibleCourses.length), 3)} />
          </FrameGrid>
        </>
      )}
      {tutorials.length > 0 && (
        <>
          <TitleRow title={t.site.standaloneTutorials} titleId="tutorials-title" size="h3" />
          <FrameGrid cols={3}>
            {tutorials.map((p) => (
              <FrameCell key={p.id} hover>
                <PostCard post={p} locale={locale} t={t} variant="cell" />
              </FrameCell>
            ))}
            <FrameFiller units={fillers(plainSpans(tutorials.length), 3)} />
          </FrameGrid>
        </>
      )}
    </>
  );
}

export default async function LearnPage() {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <>
      <PageHero
        section="LEARN"
        icon="learn"
        guide={{ key: "learn_index", say: t.guide.learn_index }}
        crumbs={
          <Breadcrumbs
            items={[
              homeCrumb(locale),
              { name: t.site.learnTitle, path: localePath(locale, "/learn") },
            ]}
          />
        }
        title={t.site.learnTitle}
        subtitle={t.site.learnSubtitle}
      />
      <FrameSection
        id="courses"
        ariaLabel={t.site.courses}
        guide={{ key: "learn_grid", say: t.guide.learn_grid }}
        strip={{ index: 2, path: teamPath("LEARN", "COURSES") }}
      >
        <Suspense fallback={<CellGridSkeleton count={3} cover={false} />}>
          <LearnContent locale={locale} t={t} />
        </Suspense>
      </FrameSection>
    </>
  );
}
