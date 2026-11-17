import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { PostCard, TypeBadge } from "@/components/site/cards";
import { Cover } from "@/components/site/cover";
import {
  FrameCell,
  FrameFiller,
  FrameGrid,
  FrameSection,
  type FrameSpan,
} from "@/components/site/frame";
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
import { Chip, EmptyCell, fmtDate, fmtNum, PageHero, teamPath } from "@/components/site/ui";
import { format } from "@/i18n/format-message";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getLocale, getMessages } from "@/i18n/server";
import { blogTypes, isBlogType, postHref, type BlogType } from "@/lib/content";
import { listPublished, listTags } from "@/server/modules/content/queries";

export async function generateMetadata({
  searchParams,
}: PageProps<"/[locale]/blog">): Promise<Metadata> {
  const locale = await getLocale();
  const t = getMessages(locale);
  const q = await searchParams;
  const page = pageParam(q.page);
  const filtered = !!(sp(q.tag) || sp(q.q) || sp(q.type));
  return pageMetadata({
    locale,
    path: page > 1 && !filtered ? `/blog?page=${page}` : "/blog",
    title: page > 1 ? `${t.site.blogTitle} (${fmtNum(page, locale)})` : t.site.blogTitle,
    description: t.site.blogSubtitle,
    noindex: filtered,
  });
}

const PAGE_SIZE = 9;

async function BlogList({
  locale,
  t,
  searchParams,
}: {
  locale: Locale;
  t: Messages;
  searchParams: PageProps<"/[locale]/blog">["searchParams"];
}) {
  const q = await searchParams;
  const typeParam = sp(q.type);
  const type = typeParam && isBlogType(typeParam) ? typeParam : undefined;
  const tag = sp(q.tag) || undefined;
  const search = sp(q.q)?.trim().slice(0, 100) || undefined;
  const page = pageParam(q.page);
  const types: BlogType[] = type ? [type] : [...blogTypes];
  const showFeatured = page === 1 && !type && !tag && !search;

  const [list, tags, featured] = await Promise.all([
    listPublished({ locale, types, tag, q: search, page, pageSize: PAGE_SIZE }),
    listTags(locale, [...blogTypes]),
    showFeatured
      ? listPublished({ locale, types: ["article", "vlog"], featured: true, pageSize: 1 })
      : null,
  ]);
  const hero = featured?.items[0];
  const items = hero ? list.items.filter((p) => p.id !== hero.id) : list.items;
  const base = localePath(locale, "/blog");
  const typeLabel = (k: BlogType) =>
    ({ article: t.site.type_article, vlog: t.site.type_vlog, note: t.site.type_note })[k];

  const spans: (FrameSpan | undefined)[] = [
    ...(hero ? [2 as const] : []),
    ...plainSpans(items.length),
  ];
  return (
    <>
      <FrameGrid cols={1}>
        <FrameCell className="flex flex-col gap-4 py-5 md:py-5">
          <div className="-mx-1 flex scrollbar-none items-center gap-2 overflow-x-auto px-1 pb-1">
            <Chip href={withQuery(base, { tag, q: search })} active={!type}>
              {t.site.all}
            </Chip>
            {blogTypes.map((k) => (
              <Chip key={k} href={withQuery(base, { type: k, tag, q: search })} active={type === k}>
                {typeLabel(k)}
              </Chip>
            ))}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="me-1 text-sm font-semibold text-muted-foreground">
                {t.site.tags}:
              </span>
              {tags.slice(0, 14).map((tg) => (
                <Link
                  key={tg.tag}
                  href={withQuery(base, { type, tag: tag === tg.tag ? undefined : tg.tag })}
                  scroll={false}
                  aria-current={tag === tg.tag ? "true" : undefined}
                  className={
                    tag === tg.tag
                      ? "rounded-[6px] bg-primary px-2 py-1 text-xs font-bold text-primary-foreground"
                      : "rounded-[6px] bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  }
                >
                  #{tg.tag}
                </Link>
              ))}
            </div>
          )}
          {search && (
            <p className="text-sm text-muted-foreground">
              {format(t.site.searchResults, { q: search })} — {fmtNum(list.total, locale)}
            </p>
          )}
        </FrameCell>
      </FrameGrid>

      <FrameGrid cols={3}>
        {hero && (
          <FrameCell
            span={2}
            hover
            pad="none"
            spot={{ key: `post-${hero.slug}`, say: clampSay(hero.excerpt || hero.title) }}
          >
            <article className="group relative grid h-full md:grid-cols-2">
              <Cover
                src={hero.coverUrl}
                alt={hero.coverAlt ?? hero.title}
                seed={hero.slug}
                kind={hero.type}
                priority
                sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
                className="md:aspect-auto md:h-full"
                imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="flex flex-col justify-center gap-4 p-[var(--cell-pad)]">
                <div className="flex items-center gap-2">
                  <span className="frame-eyebrow">{t.site.featured}</span>
                  <TypeBadge type={hero.type} t={t} />
                </div>
                <h2 className="text-2xl leading-snug font-extrabold tracking-tight text-balance md:text-[28px]">
                  <Link href={postHref(locale, hero)} className="after:absolute after:inset-0">
                    {hero.title}
                  </Link>
                </h2>
                {hero.excerpt && (
                  <p className="line-clamp-4 leading-8 text-muted-foreground">{hero.excerpt}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  <time dateTime={hero.publishedAt?.toISOString()}>
                    {fmtDate(hero.publishedAt, locale)}
                  </time>
                  {hero.readingMinutes
                    ? ` · ${format(t.site.minRead, { n: fmtNum(hero.readingMinutes, locale) })}`
                    : ""}
                </p>
              </div>
            </article>
          </FrameCell>
        )}
        {items.map((p, i) => (
          <FrameCell
            key={p.id}
            hover
            spot={{ key: `post-${p.slug}`, say: clampSay(p.excerpt || p.title) }}
          >
            <PostCard
              post={p}
              locale={locale}
              t={t}
              priority={!hero && i < 3}
              headingLevel="h2"
              variant="cell"
            />
          </FrameCell>
        ))}
        {!hero && !items.length ? (
          <EmptyCell
            icon="blog"
            title={t.site.emptyList}
            hint={t.site.emptyListHint}
            action={
              (type || tag || search) && (
                <Link
                  href={base}
                  className="mt-2 text-sm font-bold text-primary-ink hover:underline"
                >
                  {t.site.clearFilters}
                </Link>
              )
            }
          />
        ) : (
          <FrameFiller units={fillers(spans, 3)} />
        )}
      </FrameGrid>
      <Pagination
        page={list.page}
        pages={list.pages}
        hrefFor={(p) => withQuery(base, { type, tag, q: search, page: p > 1 ? p : undefined })}
        locale={locale}
        t={t}
      />
    </>
  );
}

function SearchForm({ locale, t }: { locale: Locale; t: Messages }) {
  return (
    <form action={localePath(locale, "/blog")} method="get" role="search" className="relative">
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        name="q"
        enterKeyHint="search"
        aria-label={t.site.searchPlaceholder}
        placeholder={t.site.searchPlaceholder}
        className="h-7 w-40 rounded-[6px] border border-frame-line bg-card ps-8 pe-2 text-[13px] outline-none placeholder:text-muted-foreground/80 focus-visible:border-primary-ink focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
      />
    </form>
  );
}

export default async function BlogPage({ searchParams }: PageProps<"/[locale]/blog">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <>
      <PageHero
        section="BLOG"
        icon="blog"
        guide={{ key: "blog_index", say: t.guide.blog_index }}
        crumbs={
          <Breadcrumbs
            items={[
              homeCrumb(locale),
              { name: t.site.blogTitle, path: localePath(locale, "/blog") },
            ]}
          />
        }
        title={t.site.blogTitle}
        subtitle={t.site.blogSubtitle}
        stripAction={<SearchForm locale={locale} t={t} />}
      />
      <FrameSection
        id="posts"
        ariaLabel={t.site.blogTitle}
        guide={{ key: "blog_grid", say: t.guide.blog_grid }}
        strip={{ index: 2, path: teamPath("BLOG", "POSTS") }}
      >
        <Suspense
          fallback={
            <>
              <ChipRowSkeleton rows={[4, 8]} />
              <CellGridSkeleton count={6} />
            </>
          }
        >
          <BlogList locale={locale} t={t} searchParams={searchParams} />
        </Suspense>
      </FrameSection>
    </>
  );
}
