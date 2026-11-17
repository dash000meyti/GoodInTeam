import "server-only";
import type { ReactNode } from "react";
import Link from "next/link";
import { ClockIcon, EyeIcon, SparklesIcon } from "lucide-react";
import { format } from "@/i18n/format-message";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import type { Heading } from "@/lib/markdown";
import { cn, initials } from "@/lib/utils";
import type { PostCard as PostCardData } from "@/server/modules/content/queries";
import { TypeBadge } from "./cards";
import { FrameCell, FrameGrid } from "./frame";
import { CopyLink, Toc } from "./islands";
import { absoluteUrl } from "./seo";
import { SocialGlyph, SocialLinks, socialLabels } from "./social-links";
import { fmtDate, fmtNum, HEADING_CLASS } from "./ui";

/** Building blocks shared by blog posts, lessons, case studies and service pages. */

/** A framed initial tile (logo L-frame motif) for people without an avatar. */
export function InitialTile({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center border border-frame-line bg-card font-bold text-foreground shadow-[-3px_-3px_0_0_var(--brand-frame)] rtl:shadow-[3px_-3px_0_0_var(--brand-frame)]",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function ArticleMeta({
  post,
  locale,
  t,
  author,
  showViews = true,
}: {
  post: PostCardData;
  locale: Locale;
  t: Messages;
  author?: string | null;
  showViews?: boolean;
}) {
  const updated =
    post.publishedAt && post.updatedAt.getTime() - post.publishedAt.getTime() > 86_400_000
      ? post.updatedAt
      : null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
      {author && (
        <span className="inline-flex items-center gap-2 font-semibold text-foreground">
          <InitialTile name={author} className="size-7 text-[11px]" />
          {author}
        </span>
      )}
      <span>
        {t.site.publishedOn}{" "}
        <time
          dateTime={post.publishedAt?.toISOString()}
          className="dt-published font-semibold text-foreground/80"
        >
          {fmtDate(post.publishedAt, locale, "long")}
        </time>
      </span>
      {updated && (
        <span>
          {t.site.updatedOn}{" "}
          <time dateTime={updated.toISOString()}>{fmtDate(updated, locale)}</time>
        </span>
      )}
      {post.readingMinutes ? (
        <span className="inline-flex items-center gap-1">
          <ClockIcon className="size-3.5" />
          {format(t.site.minRead, { n: fmtNum(post.readingMinutes, locale) })}
        </span>
      ) : null}
      {showViews && post.views > 0 && (
        <span className="inline-flex items-center gap-1">
          <EyeIcon className="size-3.5" />
          {format(t.site.views, { n: fmtNum(post.views, locale) })}
        </span>
      )}
    </div>
  );
}

/**
 * The header cell of an article's first box (`data-frame-header`, the box is
 * labelled by `titleId`): breadcrumbs, the type badge (or an eyebrow), the
 * `p-name` h1, the meta line, then `children` (tags).
 */
export function ArticleHeader({
  post,
  locale,
  t,
  crumbs,
  author,
  eyebrow,
  titleId = "top-title",
  children,
}: {
  post: PostCardData;
  locale: Locale;
  t: Messages;
  crumbs: ReactNode;
  author?: string | null;
  eyebrow?: ReactNode;
  titleId?: string;
  children?: ReactNode;
}) {
  return (
    <FrameCell header as="header" className="flex flex-col items-start gap-5 lg:min-h-[240px]">
      {crumbs}
      <div className="flex flex-wrap items-center gap-2">
        {eyebrow ?? <TypeBadge type={post.type} t={t} />}
      </div>
      <h1 id={titleId} className={cn("p-name", HEADING_CLASS.article)}>
        {post.title}
      </h1>
      <ArticleMeta post={post} locale={locale} t={t} author={author} />
      {children}
    </FrameCell>
  );
}

/** AEO: the TL;DR answer box, a full-width `tone="card"` row stacked under the header row. */
export function Tldr({ text, label }: { text: string; label: string }) {
  return (
    <FrameGrid cols={1}>
      <FrameCell tone="card">
        <aside aria-label={label} className="max-w-3xl">
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-black tracking-wide text-primary-ink uppercase">
            <SparklesIcon className="size-3.5" /> {label}
          </p>
          <p className="text-[1.0625rem] leading-8 font-medium text-pretty">{text}</p>
        </aside>
      </FrameCell>
    </FrameGrid>
  );
}

/**
 * The body row: a FrameGrid 2-1 of the article cell (`e-content` prose,
 * optional `before` media) and an aside cell whose content is sticky below
 * the chrome (TOC, extra links). Without an aside it is a single cell. The
 * aside cell is hidden below lg unless `asideAlways` (a lesson list).
 * Never wrapped in `.frame-cv` (sticky child).
 */
export function ArticleBody({
  html,
  headings,
  tocTitle,
  aside,
  before,
  after,
  asideAlways,
}: {
  html: string;
  headings: Heading[];
  tocTitle: string;
  aside?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
  asideAlways?: boolean;
}) {
  const toc = headings.filter((h) => h.depth === 2 || h.depth === 3);
  const hasAside = toc.length >= 2 || !!aside;
  return (
    <FrameGrid cols={hasAside ? "2-1" : 1}>
      <FrameCell pad="lg" className="min-w-0">
        {before && <div className="mb-8">{before}</div>}
        <div
          className="prose-gt e-content max-w-[70ch]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {after}
      </FrameCell>
      {hasAside && (
        <FrameCell className={cn(!asideAlways && "hidden lg:block")}>
          <div className="space-y-8 lg:sticky lg:below-chrome" data-sticky-aside="">
            {toc.length >= 2 && (
              <Toc
                headings={toc.map((h) => ({ id: h.id, text: h.text, depth: h.depth }))}
                title={tocTitle}
              />
            )}
            {aside}
          </div>
        </FrameCell>
      )}
    </FrameGrid>
  );
}

/** Share links (no third-party scripts) + copy button. */
export function ShareBar({ url, title, t }: { url: string; title: string; t: Messages }) {
  const abs = absoluteUrl(url);
  const e = encodeURIComponent;
  const links = [
    { n: "x", href: `https://x.com/intent/post?text=${e(title)}&url=${e(abs)}` },
    { n: "linkedin", href: `https://www.linkedin.com/sharing/share-offsite/?url=${e(abs)}` },
    { n: "telegram", href: `https://t.me/share/url?url=${e(abs)}&text=${e(title)}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="me-1 text-sm font-bold">{t.site.share}</span>
      {links.map((l) => (
        <a
          key={l.n}
          href={l.href}
          target="_blank"
          rel="noopener nofollow"
          aria-label={`${t.site.share}: ${socialLabels[l.n]}`}
          className="inline-flex size-9 items-center justify-center rounded-[6px] border border-frame-line bg-background text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          <SocialGlyph network={l.n} />
        </a>
      ))}
      <CopyLink url={abs} label={t.site.copyLink} doneLabel={t.site.linkCopied} />
    </div>
  );
}

/** POSSE: copies of this post on other networks (IndieWeb rel=syndication). */
export function Syndicated({
  links,
  t,
}: {
  links: { network: string; url: string }[];
  t: Messages;
}) {
  if (!links.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-semibold text-muted-foreground">{t.site.alsoOn}</span>
      {links.map((l) => (
        <a
          key={l.network + l.url}
          href={l.url}
          rel="syndication noopener"
          target="_blank"
          className="u-syndication inline-flex items-center gap-1.5 rounded-[6px] bg-muted px-3 py-1 font-semibold transition-colors hover:text-primary-ink"
        >
          <SocialGlyph network={l.network} className="size-3.5" />
          {socialLabels[l.network] ?? l.network}
        </a>
      ))}
    </div>
  );
}

type AuthorProfile = Parameters<typeof AuthorBox>[0]["profile"];

/**
 * The end-box row of a post or lesson: a FrameGrid 2-1 of the author cell and
 * the share cell (share + syndication links), or the share cell alone when
 * the site has no owner name.
 */
export function AuthorShareRow({
  profile,
  locale,
  t,
  url,
  title,
  syndication,
}: {
  profile: AuthorProfile;
  locale: Locale;
  t: Messages;
  url: string;
  title: string;
  syndication?: ReactNode;
}) {
  const hasAuthor = !!(profile.ownerName[locale] || profile.ownerName.en);
  return (
    <FrameGrid cols={hasAuthor ? "2-1" : 1}>
      {hasAuthor && (
        <FrameCell>
          <AuthorBox profile={profile} locale={locale} t={t} />
        </FrameCell>
      )}
      <FrameCell tone="card" className="flex flex-col justify-center gap-5">
        <ShareBar url={url} title={title} t={t} />
        {syndication}
      </FrameCell>
    </FrameGrid>
  );
}

/** The author card: the content of a frame cell (no border or surface of its own). */
export function AuthorBox({
  profile,
  locale,
  t,
}: {
  profile: {
    ownerName: { fa: string; en: string };
    headline: { fa: string; en: string };
    bio: { fa: string; en: string };
    avatarUrl: string;
    socials: Record<string, string>;
  };
  locale: Locale;
  t: Messages;
}) {
  const name = profile.ownerName[locale] || profile.ownerName.en;
  if (!name) return null;
  return (
    <div className="p-author h-card flex flex-col gap-5 sm:flex-row sm:items-start">
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- small avatar, any origin
        <img
          src={profile.avatarUrl}
          alt={name}
          className="u-photo size-16 shrink-0 rounded-[10px] object-cover"
          loading="lazy"
        />
      ) : (
        <InitialTile name={name} className="size-16 text-xl" />
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs font-bold text-muted-foreground">{t.site.writtenBy}</p>
        <p className="text-lg font-extrabold">
          <Link
            href={localePath(locale, "/about")}
            rel="author"
            className="p-name u-url hover:text-primary-ink"
          >
            {name}
          </Link>
        </p>
        {profile.headline[locale] && (
          <p className="text-sm font-semibold text-muted-foreground">{profile.headline[locale]}</p>
        )}
        {profile.bio[locale] && (
          <p className="text-sm leading-7 text-muted-foreground">{profile.bio[locale]}</p>
        )}
        <SocialLinks socials={profile.socials} className="pt-2" />
      </div>
    </div>
  );
}
