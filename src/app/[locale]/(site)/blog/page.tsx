import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewspaperIcon, SearchIcon } from "lucide-react";
import { PostCard, TypeBadge } from "@/components/site/cards";
import { Cover } from "@/components/site/cover";
import { Breadcrumbs, Pagination } from "@/components/site/nav-bits";
import { homeCrumb, pageParam, sp, withQuery } from "@/components/site/page-utils";
import { pageMetadata } from "@/components/site/seo";
import { CardGridSkeleton, ChipsSkeleton } from "@/components/site/skeletons";
import { Chip, Container, fmtDate, fmtNum, PageHero } from "@/components/site/ui";
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

  return (
    <>
      <div className="mb-10 space-y-4">
        <div className="-mx-4 flex scrollbar-none items-center gap-2 overflow-x-auto px-4 pb-1">
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
            <span className="me-1 text-sm font-semibold text-muted-foreground">{t.site.tags}:</span>
            {tags.slice(0, 14).map((tg) => (
              <Link
                key={tg.tag}
                href={withQuery(base, { type, tag: tag === tg.tag ? undefined : tg.tag })}
                scroll={false}
                className={
                  tag === tg.tag
                    ? "rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground"
                    : "rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
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
      </div>

      {hero && (
        <article className="gt-lift group relative mb-10 grid overflow-hidden rounded-3xl bg-card shadow-card md:grid-cols-2 dark:border dark:border-border">
          <Cover
            src={hero.coverUrl}
            alt={hero.coverAlt ?? hero.title}
            seed={hero.slug}
            kind={hero.type}
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="md:aspect-auto md:h-full"
            imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="flex flex-col justify-center gap-4 p-7 sm:p-10">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-warning/16 px-2.5 py-0.5 text-xs font-bold text-[#b76e00] dark:text-warning">
                {t.site.featured}
              </span>
              <TypeBadge type={hero.type} t={t} />
            </div>
            <h2 className="text-2xl leading-snug font-black tracking-tight text-balance sm:text-3xl">
              <Link href={postHref(locale, hero)} className="after:absolute after:inset-0">
                {hero.title}
              </Link>
            </h2>
            {hero.excerpt && <p className="leading-8 text-muted-foreground">{hero.excerpt}</p>}
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
      )}

      {items.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => (
            <PostCard
              key={p.id}
              post={p}
              locale={locale}
              t={t}
              priority={!hero && i < 3}
              headingLevel="h2"
            />
          ))}
        </div>
      ) : (
        !hero && (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-20 text-center">
            <NewspaperIcon className="size-10 text-muted-foreground/60" />
            <p className="text-lg font-bold">{t.site.emptyList}</p>
            <p className="text-sm text-muted-foreground">{t.site.emptyListHint}</p>
            {(type || tag || search) && (
              <Link href={base} className="mt-2 text-sm font-bold text-primary hover:underline">
                {t.site.clearFilters}
              </Link>
            )}
          </div>
        )
      )}
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

export default async function BlogPage({ searchParams }: PageProps<"/[locale]/blog">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <>
      <PageHero
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
      >
        <form
          action={localePath(locale, "/blog")}
          method="get"
          role="search"
          className="relative max-w-md"
        >
          <SearchIcon className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            aria-label={t.site.searchPlaceholder}
            placeholder={t.site.searchPlaceholder}
            className="h-12 w-full rounded-full border border-input bg-background/80 ps-11 pe-4 text-[15px] shadow-card backdrop-blur outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
          />
        </form>
      </PageHero>
      <Container>
        <Suspense
          fallback={
            <>
              <div className="mb-10 space-y-4">
                <ChipsSkeleton count={4} />
                <ChipsSkeleton count={8} />
              </div>
              <CardGridSkeleton count={6} />
            </>
          }
        >
          <BlogList locale={locale} t={t} searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}
