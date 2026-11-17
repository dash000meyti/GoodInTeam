import { Suspense } from "react";
import type { Metadata } from "next";
import { WorkCard } from "@/components/site/cards";
import { CtaBand } from "@/components/site/cta-band";
import { FrameCell, FrameFiller, FrameGrid, FrameSection } from "@/components/site/frame";
import { Breadcrumbs, Pagination } from "@/components/site/nav-bits";
import {
  clampSay,
  fillers,
  homeCrumb,
  pageParam,
  plainSpans,
  sp,
  withQuery,
} from "@/components/site/page-utils";
import { pageMetadata } from "@/components/site/seo";
import { CellGridSkeleton, ChipRowSkeleton } from "@/components/site/skeletons";
import { Chip, EmptyCell, fmtNum, PageHero, teamPath } from "@/components/site/ui";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getLocale, getMessages } from "@/i18n/server";
import { listPublished, listWorkFacets } from "@/server/modules/content/queries";

export async function generateMetadata({
  searchParams,
}: PageProps<"/[locale]/work">): Promise<Metadata> {
  const locale = await getLocale();
  const t = getMessages(locale);
  const q = await searchParams;
  const page = pageParam(q.page);
  const filtered = !!(sp(q.stack) || sp(q.year));
  return pageMetadata({
    locale,
    path: page > 1 && !filtered ? `/work?page=${page}` : "/work",
    title: page > 1 ? `${t.site.workPageTitle} (${fmtNum(page, locale)})` : t.site.workPageTitle,
    description: t.site.workPageSubtitle,
  });
}

/** Case studies per page: a multiple of 6, so full pages fill the 2- and 3-column grids. */
const PAGE_SIZE = 12;

/** The grid box body: filter chips row, case-study cells (+ fillers), pagination row. */
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
  const [list, facets] = await Promise.all([
    listPublished({
      locale,
      types: ["work"],
      stack,
      year,
      page: pageParam(q.page),
      pageSize: PAGE_SIZE,
    }),
    listWorkFacets(locale),
  ]);
  const { items } = list;
  const base = localePath(locale, "/work");
  return (
    <>
      <FrameGrid cols={1}>
        <FrameCell className="flex flex-col gap-4 py-5 md:py-5">
          <div className="-mx-1 flex scrollbar-none items-center gap-2 overflow-x-auto px-1 pb-1">
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
        </FrameCell>
      </FrameGrid>
      <FrameGrid cols={3}>
        {items.length ? (
          <>
            {items.map((p, i) => (
              <FrameCell
                key={p.id}
                hover
                spot={{ key: `work-${p.slug}`, say: clampSay(p.excerpt || p.title) }}
              >
                <WorkCard post={p} locale={locale} t={t} priority={i < 3} variant="cell" />
              </FrameCell>
            ))}
            <FrameFiller units={fillers(plainSpans(items.length), 3)} />
          </>
        ) : (
          <EmptyCell icon="work" title={t.site.emptyList} hint={t.site.emptyListHint} />
        )}
      </FrameGrid>
      <Pagination
        page={list.page}
        pages={list.pages}
        hrefFor={(p) => withQuery(base, { stack, year, page: p > 1 ? p : undefined })}
        locale={locale}
        t={t}
      />
    </>
  );
}

export default async function WorkPage({ searchParams }: PageProps<"/[locale]/work">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <>
      <PageHero
        section="WORK"
        icon="work"
        guide={{ key: "work_index", say: t.guide.work_index }}
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
      <FrameSection
        id="cases"
        ariaLabel={t.site.workPageTitle}
        guide={{ key: "work_grid", say: t.guide.work_grid }}
        strip={{ index: 2, path: teamPath("WORK", "CASE-STUDIES") }}
      >
        <Suspense
          fallback={
            <>
              <ChipRowSkeleton rows={[6]} />
              <CellGridSkeleton count={3} />
            </>
          }
        >
          <WorkGrid locale={locale} t={t} searchParams={searchParams} />
        </Suspense>
      </FrameSection>
      <CtaBand locale={locale} t={t} />
    </>
  );
}
