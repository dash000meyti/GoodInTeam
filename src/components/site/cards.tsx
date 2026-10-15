import "server-only";
import Link from "next/link";
import {
  BookOpenIcon,
  ClockIcon,
  LayersIcon,
  NotebookPenIcon,
  PlayIcon,
  QuoteIcon,
  StarIcon,
} from "lucide-react";
import { format } from "@/i18n/format-message";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { postHref } from "@/lib/content";
import { markdownToText } from "@/lib/markdown";
import { cn, initials } from "@/lib/utils";
import type {
  PostCard as PostCardData,
  SeriesCard as SeriesCardData,
} from "@/server/modules/content/queries";
import { Cover } from "./cover";
import { fmtDate, fmtNum } from "./ui";

const typeIcon = { vlog: PlayIcon, note: NotebookPenIcon, tutorial: BookOpenIcon } as const;

export function TypeBadge({
  type,
  t,
  className,
}: {
  type: PostCardData["type"];
  t: Messages;
  className?: string;
}) {
  const Icon = typeIcon[type as keyof typeof typeIcon];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary-dark dark:text-primary-light",
        className,
      )}
    >
      {Icon && <Icon className="size-3" />}
      {t.site[`type_${type}`]}
    </span>
  );
}

function MetaLine({ post, locale, t }: { post: PostCardData; locale: Locale; t: Messages }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <time dateTime={post.publishedAt?.toISOString()}>{fmtDate(post.publishedAt, locale)}</time>
      {post.readingMinutes ? (
        <span className="inline-flex items-center gap-1">
          <ClockIcon className="size-3" />
          {format(t.site.minRead, { n: fmtNum(post.readingMinutes, locale) })}
        </span>
      ) : null}
    </div>
  );
}

/** Article / vlog / tutorial card with cover. */
export function PostCard({
  post,
  locale,
  t,
  priority,
  className,
  headingLevel: H = "h3",
}: {
  post: PostCardData;
  locale: Locale;
  t: Messages;
  priority?: boolean;
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  if (post.type === "note")
    return <NoteCard post={post} locale={locale} t={t} className={className} />;
  const href = postHref(locale, post);
  return (
    <article
      className={cn(
        "gt-lift group relative flex flex-col overflow-hidden rounded-2xl bg-card shadow-card dark:border dark:border-border",
        className,
      )}
    >
      <Cover
        src={post.coverUrl}
        alt={post.coverAlt ?? post.title}
        seed={post.slug}
        kind={post.type}
        priority={priority}
        sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
        imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
      />
      {post.type === "vlog" && (
        <span className="absolute start-3 top-3 inline-flex size-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur">
          <PlayIcon className="size-4 fill-current" />
        </span>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <TypeBadge type={post.type} t={t} />
          {post.seriesTitle && (
            <span className="truncate text-xs text-muted-foreground">{post.seriesTitle}</span>
          )}
        </div>
        <H className="text-lg leading-snug font-extrabold tracking-tight text-balance">
          <Link href={href} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </H>
        {post.excerpt && (
          <p className="line-clamp-2 text-sm leading-7 text-muted-foreground">{post.excerpt}</p>
        )}
        <div className="mt-auto pt-1">
          <MetaLine post={post} locale={locale} t={t} />
        </div>
      </div>
    </article>
  );
}

/** Short note (micro-post): quote-like card, no cover. */
export function NoteCard({
  post,
  locale,
  t,
  className,
}: {
  post: PostCardData;
  locale: Locale;
  t: Messages;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "gt-lift group relative flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-muted/40 p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <TypeBadge type="note" t={t} />
        <time className="text-xs text-muted-foreground" dateTime={post.publishedAt?.toISOString()}>
          {fmtDate(post.publishedAt, locale)}
        </time>
      </div>
      <h3 className="text-base leading-snug font-extrabold">
        <Link href={postHref(locale, post)} className="after:absolute after:inset-0">
          {post.title}
        </Link>
      </h3>
      {post.excerpt && (
        <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">{post.excerpt}</p>
      )}
    </article>
  );
}

/** Portfolio card: cover, client/year, first metric, stack chips. */
export function WorkCard({
  post,
  locale,
  t,
  priority,
  size = "md",
  className,
}: {
  post: PostCardData;
  locale: Locale;
  t: Messages;
  priority?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const metric = post.meta.metrics?.[0];
  return (
    <article
      className={cn(
        "gt-lift group relative flex flex-col overflow-hidden rounded-3xl bg-card shadow-card dark:border dark:border-border",
        className,
      )}
    >
      <div className={cn("relative", size === "lg" && "flex flex-col lg:flex-1")}>
        <Cover
          src={post.coverUrl}
          alt={post.coverAlt ?? post.title}
          seed={post.slug}
          kind="work"
          priority={priority}
          className={size === "lg" ? "lg:min-h-80 lg:flex-1" : undefined}
          aspect={size === "lg" ? "aspect-[16/10] lg:aspect-auto" : "aspect-[16/10]"}
          sizes={
            size === "lg"
              ? "(min-width: 1024px) 720px, 100vw"
              : "(min-width: 1024px) 480px, (min-width: 640px) 50vw, 100vw"
          }
          imgClassName="transition-transform duration-700 group-hover:scale-[1.04]"
        />
        {metric && (
          <div className="absolute end-4 bottom-4 rounded-2xl bg-background/85 px-4 py-2.5 shadow-dropdown backdrop-blur-md">
            <p className="text-xl leading-none font-black tracking-tight text-primary">
              {metric.value}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{metric.label}</p>
          </div>
        )}
      </div>
      <div className={cn("flex flex-col gap-3 p-6", size !== "lg" && "flex-1")}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
          {post.meta.client && <span>{post.meta.client}</span>}
          {post.meta.client && post.meta.year && (
            <span className="size-1 rounded-full bg-grey-500" />
          )}
          {post.meta.year && <span>{fmtNum(post.meta.year, locale).replace(/٬|,/g, "")}</span>}
        </div>
        <h3
          className={cn(
            "leading-snug font-extrabold tracking-tight text-balance",
            size === "lg" ? "text-2xl" : "text-xl",
          )}
        >
          <Link href={postHref(locale, post)} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && (
          <p className="line-clamp-2 text-sm leading-7 text-muted-foreground">{post.excerpt}</p>
        )}
        {!!post.meta.stack?.length && (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-2" aria-label={t.site.stack}>
            {post.meta.stack.slice(0, 5).map((s) => (
              <li
                key={s}
                dir="ltr"
                className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground"
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

/** Course (series) card. */
export function SeriesCard({
  s,
  locale,
  t,
  className,
}: {
  s: SeriesCardData;
  locale: Locale;
  t: Messages;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "gt-lift gt-ring group relative flex flex-col overflow-hidden rounded-3xl bg-card p-6 shadow-card",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <LayersIcon className="size-5" />
        </span>
        {s.level && (
          <span className="rounded-full border px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
            {t.site[`level_${s.level}`]}
          </span>
        )}
      </div>
      <h3 className="mt-5 text-xl leading-snug font-extrabold tracking-tight text-balance">
        <Link
          href={localePath(locale, `/learn/${encodeURIComponent(s.slug)}`)}
          className="after:absolute after:inset-0"
        >
          {s.title}
        </Link>
      </h3>
      {s.description && (
        <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted-foreground">{s.description}</p>
      )}
      <div className="mt-auto flex items-center gap-4 pt-5 text-xs font-semibold text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <BookOpenIcon className="size-3.5" />
          {format(t.site.lessonsCount, { n: fmtNum(s.lessons, locale) })}
        </span>
        <span className="inline-flex items-center gap-1">
          <ClockIcon className="size-3.5" />
          {format(t.site.minutesTotal, { n: fmtNum(s.minutes, locale) })}
        </span>
      </div>
    </article>
  );
}

/** Client quote card. */
export function TestimonialCard({
  item,
  className,
}: {
  item: {
    author: string;
    role: string | null;
    company: string | null;
    quote: string;
    rating: number | null;
    avatarUrl: string | null;
    locale?: string;
  };
  className?: string;
}) {
  return (
    <figure
      lang={item.locale}
      dir={item.locale === "en" ? "ltr" : item.locale === "fa" ? "rtl" : undefined}
      className={cn(
        "relative flex h-full flex-col gap-5 rounded-3xl bg-card p-7 shadow-card dark:border dark:border-border",
        className,
      )}
    >
      <QuoteIcon className="size-8 text-primary/30" aria-hidden />
      {item.rating ? (
        <div className="flex gap-0.5" aria-label={`${item.rating}/5`}>
          {Array.from({ length: 5 }, (_, i) => (
            <StarIcon
              key={i}
              className={cn(
                "size-4",
                i < item.rating! ? "fill-warning text-warning" : "text-grey-400",
              )}
              aria-hidden
            />
          ))}
        </div>
      ) : null}
      <blockquote className="text-[15px] leading-8 text-pretty text-foreground/90">
        {markdownToText(item.quote, 600)}
      </blockquote>
      <figcaption className="mt-auto flex items-center gap-3 border-t border-dashed pt-5">
        {item.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- tiny avatar, any origin
          <img
            src={item.avatarUrl}
            alt=""
            className="size-11 rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-sm font-bold text-white">
            {initials(item.author)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{item.author}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[item.role, item.company].filter(Boolean).join(" · ")}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}
