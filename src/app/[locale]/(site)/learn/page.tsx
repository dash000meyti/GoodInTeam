import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { GraduationCapIcon } from "lucide-react";
import { PostCard, SeriesCard } from "@/components/site/cards";
import { JsonLd } from "@/components/site/json-ld";
import { Breadcrumbs } from "@/components/site/nav-bits";
import { homeCrumb } from "@/components/site/page-utils";
import { absoluteUrl, pageMetadata } from "@/components/site/seo";
import { CardGridSkeleton } from "@/components/site/skeletons";
import { Container, PageHero } from "@/components/site/ui";
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

async function LearnContent({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const [courses, { items: tutorials }] = await Promise.all([
    listSeries(locale),
    listPublished({ locale, types: ["tutorial"], standalone: true, pageSize: 24 }),
  ]);
  const visibleCourses = courses.filter((c) => c.lessons > 0);
  if (!visibleCourses.length && !tutorials.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-20 text-center">
        <GraduationCapIcon className="size-10 text-muted-foreground/60" />
        <p className="text-lg font-bold">{t.site.noCourses}</p>
        <p className="text-sm text-muted-foreground">{t.site.emptyListHint}</p>
      </div>
    );
  }
  return (
    <div className="space-y-16">
      {visibleCourses.length > 0 && (
        <section>
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
          <h2 className="mb-6 text-2xl font-black tracking-tight">{t.site.courses}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCourses.map((c) => (
              <SeriesCard key={c.id} s={c} locale={locale} t={t} />
            ))}
          </div>
        </section>
      )}
      {tutorials.length > 0 && (
        <section>
          <h2 className="mb-6 text-2xl font-black tracking-tight">{t.site.standaloneTutorials}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tutorials.map((p) => (
              <PostCard key={p.id} post={p} locale={locale} t={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default async function LearnPage() {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <>
      <PageHero
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
      <Container>
        <Suspense fallback={<CardGridSkeleton count={3} />}>
          <LearnContent locale={locale} t={t} />
        </Suspense>
      </Container>
    </>
  );
}
