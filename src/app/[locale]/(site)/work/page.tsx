import { Suspense } from "react";
import type { Metadata } from "next";
import { BriefcaseIcon } from "lucide-react";
import { WorkCard } from "@/components/site/cards";
import { CtaBand } from "@/components/site/home/sections";
import { Breadcrumbs } from "@/components/site/nav-bits";
import { homeCrumb, sp, withQuery } from "@/components/site/page-utils";
import { pageMetadata } from "@/components/site/seo";
import { CardGridSkeleton, ChipsSkeleton } from "@/components/site/skeletons";
import { Chip, Container, fmtNum, PageHero } from "@/components/site/ui";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getLocale, getMessages } from "@/i18n/server";
import { listPublished, listWorkFacets } from "@/server/modules/content/queries";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getMessages(locale);
  return pageMetadata({
    locale,
    path: "/work",
    title: t.site.workPageTitle,
    description: t.site.workPageSubtitle,
  });
}

async function WorkGrid({
  locale,
  t,
  searchParams,
}: {
  locale: Locale;
  t: Messages;
  searchParams: PageProps<"/[locale]/work">["searchParams"];
}) {
  const q = await searchParams;
  const stack = sp(q.stack);
  const yearRaw = Number.parseInt(sp(q.year) ?? "", 10);
  const year = Number.isFinite(yearRaw) ? yearRaw : undefined;
  const [{ items }, facets] = await Promise.all([
    listPublished({ locale, types: ["work"], stack, year, pageSize: 60 }),
    listWorkFacets(locale),
  ]);
  const base = localePath(locale, "/work");
  return (
    <>
      <div className="mb-10 flex flex-col gap-4">
        <div className="-mx-4 flex scrollbar-none items-center gap-2 overflow-x-auto px-4 pb-1">
          <Chip href={withQuery(base, { year })} active={!stack}>
            {t.site.all}
          </Chip>
          {facets.stacks.map((s) => (
            <Chip
              key={s.value}
              href={withQuery(base, { stack: s.value, year })}
              active={stack === s.value}
              count={fmtNum(s.n, locale)}
            >
              <span dir="ltr">{s.value}</span>
            </Chip>
          ))}
        </div>
        {facets.years.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="me-1 text-sm font-semibold text-muted-foreground">
              {t.site.filterYear}
            </span>
            <Chip href={withQuery(base, { stack })} active={!year}>
              {t.site.all}
            </Chip>
            {facets.years.map((y) => (
              <Chip key={y} href={withQuery(base, { stack, year: y })} active={year === y}>
                {fmtNum(y, locale).replace(/[٬,]/g, "")}
              </Chip>
            ))}
          </div>
        )}
      </div>
      {items.length ? (
        <div className="grid gap-8 md:grid-cols-2">
          {items.map((p, i) => (
            <WorkCard
              key={p.id}
              post={p}
              locale={locale}
              t={t}
              priority={i < 2}
              size={i === 0 && items.length % 2 === 1 ? "lg" : "md"}
              className={i === 0 && items.length % 2 === 1 ? "md:col-span-2" : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-20 text-center">
          <BriefcaseIcon className="size-10 text-muted-foreground/60" />
          <p className="text-lg font-bold">{t.site.emptyList}</p>
          <p className="text-sm text-muted-foreground">{t.site.emptyListHint}</p>
        </div>
      )}
    </>
  );
}

export default async function WorkPage({ searchParams }: PageProps<"/[locale]/work">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <>
      <PageHero
        crumbs={
          <Breadcrumbs
            items={[
              homeCrumb(locale),
              { name: t.site.workPageTitle, path: localePath(locale, "/work") },
            ]}
          />
        }
        title={t.site.workPageTitle}
        subtitle={t.site.workPageSubtitle}
      />
      <Container className="pb-10">
        <Suspense
          fallback={
            <>
              <div className="mb-10">
                <ChipsSkeleton count={6} />
              </div>
              <CardGridSkeleton count={4} className="md:grid-cols-2 lg:grid-cols-2" />
            </>
          }
        >
          <WorkGrid locale={locale} t={t} searchParams={searchParams} />
        </Suspense>
      </Container>
      <CtaBand locale={locale} t={t} />
    </>
  );
}
