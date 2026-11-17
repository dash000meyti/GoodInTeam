import "server-only";
import type { ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRightIcon, BookOpenIcon, CheckIcon, ClockIcon, PlayIcon } from "lucide-react";
import { brandById, brandOf } from "@/components/brand/brands";
import { PixelIcon } from "@/components/brand/pixel-art";
import { DockTile } from "@/components/shell/dock";
import { Window } from "@/components/shell/window";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "@/i18n/format-message";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { postHref } from "@/lib/content";
import {
  type PostCard as PostCardData,
  getPublicProfile,
  getSeriesWithLessons,
  listPublicClientNames,
  listPublished,
  listSeries,
  listServices,
  listTestimonials,
} from "@/server/modules/content/queries";
import { PostCard, TestimonialCard, WorkCard } from "../cards";
import {
  FrameCell,
  FrameEyebrow,
  FrameFiller,
  FrameGrid,
  FrameSection,
  type FrameSpan,
} from "../frame";
import { packRows } from "../frame-plan";
import { ServiceIcon } from "../service-icon";
import { fmtNum } from "../ui";

/**
 * The streamed parts of the home page (spec §8). Every async component calls
 * `await connection()` first and reads the cached `queries.ts` functions; its
 * skeleton renders the SAME cells with the same spans (Suspense adds no DOM),
 * so nothing shifts when it streams in. Missing items become `tone="dots"`
 * slot cells in place; trailing `FrameFiller`s come from `packRows`.
 */

type Spans = (FrameSpan | undefined)[];

/** Guide spot lines are the visible excerpt (or title), clamped to 140 chars (§10.3). */
function say(text: string | null | undefined, fallback: string) {
  const s = (text || fallback).replace(/\s+/g, " ").trim();
  return s.length > 140 ? `${s.slice(0, 139).trimEnd()}…` : s;
}

/** Trailing fillers for the cells actually rendered in a `FrameGrid cols={3}`. */
function Fill({ spans }: { spans: Spans }) {
  return (
    <FrameFiller
      units={{ md: packRows(spans, 3, "md").trailing, lg: packRows(spans, 3, "lg").trailing }}
    />
  );
}

/** A missing fixed-slot item: dots, decorative, only where the grid has 2+ tracks. */
function SlotCell({ span }: { span?: FrameSpan }) {
  return <FrameCell span={span} tone="dots" aria-hidden className="hidden md:block" />;
}

// ─── 01 · hero availability (FrameEyebrow) ───────────────────────────────────

export async function AvailabilityEyebrow({ t }: { t: Messages }) {
  await connection();
  const profile = await getPublicProfile();
  const on = profile.availableForWork;
  return (
    <FrameEyebrow className={on ? "home-avail-on" : "home-avail-off"}>
      {on ? t.site.available : t.site.unavailable}
    </FrameEyebrow>
  );
}
export const AvailabilityEyebrowSkeleton = () => (
  <Skeleton className="h-[26px] w-48 rounded-none" />
);

// ─── 03 · trust marquee (the whole box streams; null below 2 names) ──────────

/** Intrinsic height of the trust body for `content-visibility`. */
const TRUST_CIS = 112;

function TrustFrame({ t, children }: { t: Messages; children: ReactNode }) {
  return (
    <FrameSection
      id="trust"
      labelledBy="trust-title"
      guide={{ key: "home_trust", say: t.guide.home_trust }}
      cv={TRUST_CIS}
    >
      <FrameGrid cols={1} reveal>
        <FrameCell className="home-trust grid items-center gap-4 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] md:gap-8">
          <p id="trust-title" className="text-sm leading-6 font-semibold text-muted-foreground">
            {t.site.trustedBy}
          </p>
          {children}
        </FrameCell>
      </FrameGrid>
    </FrameSection>
  );
}
export async function TrustBox({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const names = await listPublicClientNames(locale);
  if (names.length < 2) return null;
  // The track repeats the names to fill its width; only the first occurrence of
  // each name is announced (and, under reduced motion, shown).
  const row = [...names, ...names, ...names].slice(0, Math.max(8, names.length));
  const track = [...row, ...row];
  return (
    <TrustFrame t={t}>
      {/* focusable so keyboard users can pause it too (:focus-within, home.css) */}
      <div
        role="marquee"
        aria-labelledby="trust-title"
        tabIndex={0}
        className="gt-marquee-wrap overflow-hidden outline-none"
        dir="ltr"
      >
        <ul className="gt-marquee flex items-center gap-[var(--marquee-gap)]">
          {track.map((n, i) => (
            <li
              key={i}
              aria-hidden={i >= names.length || undefined}
              dir="auto"
              className="text-xl font-bold whitespace-nowrap text-muted-foreground sm:text-2xl [:lang(en)_&]:tracking-tight"
            >
              {/* no display utility on the <li>: home.css hides the repeats under reduced motion */}
              <span className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 bg-primary shadow-[0_0_0_1px_var(--brand-ink)]"
                />
                {n}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </TrustFrame>
  );
}
export const TrustBoxSkeleton = ({ t }: { t: Messages }) => (
  <TrustFrame t={t}>
    <Skeleton className="h-10 w-full rounded-none" />
  </TrustFrame>
);

// ─── 04 · featured work: [md2 header], work 1 (span 2), works 2–3, view all ──

/** The lead case study sits beside its cover from md up (the cell lays out the card). */
const LEAD =
  "md:[&>*]:grid md:[&>*]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:[&>*]:items-start md:[&>*]:gap-8";

const workSay = (p: { excerpt: string | null; title: string }) => say(p.excerpt, p.title);

export async function FeaturedWorkCells({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const { items } = await listPublished({ locale, types: ["work"], pageSize: 12 });
  const [first, ...rest] = [...items]
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 3);
  const spans: Spans = ["md2", 2, ...rest.map(() => undefined), undefined];
  return (
    <>
      {first ? (
        <FrameCell
          span={2}
          hover
          spot={{ key: `work-${first.slug}`, say: workSay(first) }}
          className={LEAD}
        >
          <WorkCard post={first} locale={locale} t={t} size="lg" variant="cell" />
        </FrameCell>
      ) : (
        <SlotCell span={2} />
      )}
      {rest.map((p) => (
        <FrameCell key={p.id} hover spot={{ key: `work-${p.slug}`, say: workSay(p) }}>
          <WorkCard post={p} locale={locale} t={t} variant="cell" />
        </FrameCell>
      ))}
      <FrameCell
        hover
        className="flex min-h-[160px] flex-col justify-between gap-6 md:min-h-[240px] md:gap-8"
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-muted-foreground">{t.site.viewAllWork}</p>
          <p className="text-2xl leading-snug font-extrabold [:lang(en)_&]:tracking-tight">
            <Link href={localePath(locale, "/work")} className="after:absolute after:inset-0">
              {t.site.viewAllCell}
            </Link>
          </p>
        </div>
        <PixelIcon name="arrow" mirror cell={4} className="self-end" />
      </FrameCell>
      <Fill spans={spans} />
    </>
  );
}

/**
 * Mirrors a `variant="cell"` card line by line (cover 16/10, then the same
 * text rows at their line heights): a work card (meta, title, two excerpt
 * lines, stack chips) or a post card (type badge, title, excerpt, meta).
 */
function CardCellSkeleton({ kind, lead }: { kind: "work" | "post"; lead?: boolean }) {
  return (
    <div className="flex h-full flex-col gap-4">
      <Skeleton className="aspect-[16/10] w-full rounded-[8px]" />
      <div className="flex flex-col gap-3">
        <Skeleton className={kind === "work" ? "h-4 w-28" : "h-[22px] w-16 rounded-full"} />
        <Skeleton className={lead ? "h-8 w-3/4" : "h-7 w-4/5"} />
        <div className="flex h-14 flex-col justify-around">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
        <Skeleton className={kind === "work" ? "mt-2 h-5 w-40" : "mt-1 h-4 w-32"} />
      </div>
    </div>
  );
}

/** Same cells as three works: lead (span 2), two works, the view-all cell. */
export function FeaturedWorkCellsSkeleton() {
  return (
    <>
      <FrameCell span={2} className={LEAD}>
        <CardCellSkeleton kind="work" lead />
      </FrameCell>
      <FrameCell>
        <CardCellSkeleton kind="work" />
      </FrameCell>
      <FrameCell>
        <CardCellSkeleton kind="work" />
      </FrameCell>
      <FrameCell className="flex min-h-[160px] flex-col justify-between gap-6 md:min-h-[240px] md:gap-8">
        <Skeleton className="h-16 w-40" />
        <Skeleton className="size-12 self-end" />
      </FrameCell>
      <Fill spans={["md2", 2, undefined, undefined, undefined]} />
    </>
  );
}

// ─── 05 · services: [header], up to 5 services, fillers complete to 6 ────────

const SERVICE_CELL = "flex flex-col gap-5 md:min-h-[340px]";

export async function ServicesCells({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const items = (await listServices(locale)).slice(0, 5);
  const spans: Spans = [undefined, ...items.map(() => undefined)];
  return (
    <>
      {items.map((svc) => {
        const brand = brandById(brandOf(svc.meta));
        return (
          <FrameCell
            key={svc.id}
            hover
            spot={{ key: `service-${svc.slug}`, say: say(svc.excerpt, svc.title) }}
            className={SERVICE_CELL}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="block size-11 shrink-0">
                <DockTile variant="brand">
                  <ServiceIcon name={svc.meta.icon} className="size-5 text-foreground" />
                </DockTile>
              </span>
              <span className="inline-flex h-6 items-center gap-1.5 border border-frame-line bg-background px-2 text-xs font-semibold">
                <PixelIcon name={brand.icon} cell={1} />
                {t.nav[brand.label]}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-xl leading-snug font-extrabold text-balance">
                <Link href={postHref(locale, svc)} className="after:absolute after:inset-0">
                  {svc.title}
                </Link>
              </h3>
              {svc.excerpt && (
                <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">
                  {svc.excerpt}
                </p>
              )}
            </div>
            {svc.highlights.length > 0 && (
              <ul
                aria-label={t.site.whatYouGet}
                className="mt-auto flex flex-col gap-2 border-t border-dashed border-frame-line pt-4"
              >
                {svc.highlights.slice(0, 3).map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm font-semibold">
                    <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary-ink" />
                    <span className="line-clamp-1">{h}</span>
                  </li>
                ))}
              </ul>
            )}
          </FrameCell>
        );
      })}
      <Fill spans={spans} />
    </>
  );
}

/** Five service cells (the usual count) — fillers complete the six-cell grid. */
export function ServicesCellsSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <FrameCell key={i} className={SERVICE_CELL}>
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="size-11 rounded-none" />
            <Skeleton className="h-6 w-24 rounded-none" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </FrameCell>
      ))}
      <Fill spans={[undefined, ...Array.from({ length: 5 }, () => undefined)]} />
    </>
  );
}

// ─── 08 · latest: [md2 header] + 2 post slots, then the course or post 3 + read-the-blog ──

const COURSE_CELL = "min-h-[320px]";

function PostCell({ post, locale, t }: { post: PostCardData; locale: Locale; t: Messages }) {
  return (
    <FrameCell hover spot={{ key: `post-${post.slug}`, say: say(post.excerpt, post.title) }}>
      <PostCard post={post} locale={locale} t={t} variant="cell" />
    </FrameCell>
  );
}

export async function LatestCells({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const [{ items }, series] = await Promise.all([
    listPublished({ locale, types: ["article", "vlog", "tutorial"], pageSize: 3 }),
    listSeries(locale),
  ]);
  const course = series.find((s) => s.lessons > 0);
  const lessons = course ? ((await getSeriesWithLessons(locale, course.slug))?.lessons ?? []) : [];
  const posts = items.slice(0, course ? 2 : 3);
  const slot = (i: number) =>
    posts[i] ? (
      <PostCell key={posts[i].id} post={posts[i]} locale={locale} t={t} />
    ) : (
      <SlotCell key={`slot-${i}`} />
    );
  const s = t.site;
  return (
    <>
      {slot(0)}
      {slot(1)}
      {course ? (
        <FrameCell
          span={3}
          tone="ink"
          spot={{ key: `course-${course.slug}`, say: say(course.description, course.title) }}
          className={COURSE_CELL}
        >
          <Window path="COURSE.APP" tone="ink" className="h-full">
            <div className="grid gap-8 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
              <div className="flex flex-col items-start gap-4">
                <span className="inline-flex h-[26px] items-center gap-1.5 border border-dashed border-[#ffc50d]/60 bg-[#ffc50d]/12 px-2.5 text-xs font-semibold text-[#ffdb66]">
                  <BookOpenIcon aria-hidden className="size-3.5" />
                  {s.courseEyebrow}
                </span>
                <h3 className="text-2xl leading-snug font-extrabold text-balance">
                  {course.title}
                </h3>
                {course.description && (
                  <p className="line-clamp-2 text-sm leading-7 text-[#b3b5b9]">
                    {course.description}
                  </p>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-2">
                  <Link
                    href={localePath(locale, `/learn/${encodeURIComponent(course.slug)}`)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#ffc50d] px-5 text-sm font-bold text-[#1c1c1e] transition-colors hover:bg-[#ffdb66] focus-visible:ring-2 focus-visible:ring-[#ffdb66] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c1c1e] focus-visible:outline-none"
                  >
                    <PlayIcon aria-hidden className="size-3.5 fill-current rtl:rotate-180" />
                    {s.courseCta}
                  </Link>
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#b3b5b9]">
                    <ClockIcon aria-hidden className="size-3.5" />
                    {format(s.minutesTotal, { n: fmtNum(course.minutes, locale) })} ·{" "}
                    {format(s.lessonsCount, { n: fmtNum(course.lessons, locale) })}
                  </span>
                </div>
              </div>
              <ol className="grid content-start gap-2 sm:grid-cols-2">
                {lessons.slice(0, 6).map((l, i) => (
                  <li key={l.id}>
                    <Link
                      href={postHref(locale, l)}
                      className="flex items-center gap-3 border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm transition-colors hover:border-[#ffc50d]/50 hover:bg-white/[0.08]"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center bg-[#ffc50d] text-xs font-bold text-[#1c1c1e] tabular-nums">
                        {fmtNum(i + 1, locale)}
                      </span>
                      <span className="truncate">{l.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </Window>
        </FrameCell>
      ) : (
        <>
          {slot(2)}
          <ReadBlogCell locale={locale} t={t} />
        </>
      )}
    </>
  );
}

function ReadBlogCell({ locale, t }: { locale: Locale; t: Messages }) {
  return (
    <FrameCell
      span="lg2"
      hover
      className="flex min-h-[160px] flex-col justify-between gap-6 md:min-h-[240px] md:gap-8"
    >
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-muted-foreground">{t.site.latestEyebrow}</p>
        <p className="text-2xl leading-snug font-extrabold [:lang(en)_&]:tracking-tight">
          <Link href={localePath(locale, "/blog")} className="after:absolute after:inset-0">
            {t.site.readBlog}
          </Link>
        </p>
      </div>
      <ArrowRightIcon aria-hidden strokeWidth={2.5} className="size-10 self-end rtl:rotate-180" />
    </FrameCell>
  );
}

/** Two post cells, then row 2 as the course cell (span 3, same height). */
export function LatestCellsSkeleton() {
  return (
    <>
      <FrameCell>
        <CardCellSkeleton kind="post" />
      </FrameCell>
      <FrameCell>
        <CardCellSkeleton kind="post" />
      </FrameCell>
      <FrameCell span={3} tone="ink" className={COURSE_CELL}>
        {/* the COURSE.APP window's height (one title line, two description lines,
            three lessons): stacked below sm, lessons in two columns from sm, side by side at lg */}
        <Skeleton className="h-[432px] rounded-[10px] bg-white/[0.06] sm:h-[392px] lg:h-[294px]" />
      </FrameCell>
    </>
  );
}

// ─── 09 · kind words: [full header] + up to 6 testimonials ───────────────────

export async function TestimonialCells({ locale }: { locale: Locale }) {
  await connection();
  const items = await listTestimonials(locale, 6);
  const spans: Spans = ["full", ...items.map(() => undefined)];
  return (
    <>
      {items.map((it) => (
        <FrameCell key={it.id}>
          <TestimonialCard item={it} variant="cell" />
        </FrameCell>
      ))}
      <Fill spans={spans} />
    </>
  );
}

export function TestimonialCellsSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }, (_, i) => (
        <FrameCell key={i}>
          <div className="flex h-full min-h-[238px] flex-col gap-5">
            <Skeleton className="size-8" />
            <Skeleton className="h-4 w-24" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="mt-auto flex items-center gap-3 border-t border-dashed border-frame-line pt-5">
              <Skeleton className="size-11 rounded-none" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </FrameCell>
      ))}
      <Fill spans={["full", undefined, undefined, undefined]} />
    </>
  );
}
