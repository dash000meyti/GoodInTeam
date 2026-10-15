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
import { CopyLink, Toc } from "./islands";
import { absoluteUrl } from "./seo";
import { SocialGlyph, SocialLinks, socialLabels } from "./social-links";
import { fmtDate, fmtNum } from "./ui";

/** Building blocks shared by blog posts, lessons and service pages. */

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
          <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-[11px] font-bold text-white">
            {initials(author)}
          </span>
          {author}
        </span>
      )}
      <span>
        {t.site.publishedOn}{" "}
        <time
          dateTime={post.publishedAt?.toISOString()}
          className="font-semibold text-foreground/80"
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

export function ArticleHeader({
  post,
  locale,
  t,
  crumbs,
  author,
  eyebrow,
}: {
  post: PostCardData;
  locale: Locale;
  t: Messages;
  crumbs: ReactNode;
  author?: string | null;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="space-y-6">
      {crumbs}
      <div className="flex flex-wrap items-center gap-2">
        {eyebrow ?? <TypeBadge type={post.type} t={t} />}
      </div>
      <h1 className="p-name text-3xl leading-[1.25] font-black tracking-tight text-balance sm:text-5xl sm:leading-[1.2]">
        {post.title}
      </h1>
      <ArticleMeta post={post} locale={locale} t={t} author={author} />
    </header>
  );
}

/** AEO: the TL;DR answer box at the top of every article. */
export function Tldr({ text, label }: { text: string; label: string }) {
  return (
    <aside
      aria-label={label}
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.05] p-5 sm:p-6"
    >
      <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-black tracking-wide text-primary uppercase">
        <SparklesIcon className="size-3.5" /> {label}
      </p>
      <p className="text-[1.0625rem] leading-8 font-medium text-pretty">{text}</p>
    </aside>
  );
}

/** Body with an optional sticky table of contents (desktop). */
export function ArticleBody({
  html,
  headings,
  tocTitle,
  aside,
}: {
  html: string;
  headings: Heading[];
  tocTitle: string;
  aside?: ReactNode;
}) {
  const toc = headings.filter((h) => h.depth === 2 || h.depth === 3);
  const hasAside = toc.length >= 2 || !!aside;
  return (
    <div className={cn("grid gap-10", hasAside && "lg:grid-cols-[minmax(0,1fr)_15rem] xl:gap-16")}>
      <div className="prose-gt e-content min-w-0" dangerouslySetInnerHTML={{ __html: html }} />
      {hasAside && (
        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-8">
            {toc.length >= 2 && (
              <Toc
                headings={toc.map((h) => ({ id: h.id, text: h.text, depth: h.depth }))}
                title={tocTitle}
              />
            )}
            {aside}
          </div>
        </div>
      )}
    </div>
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
          className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
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
          className="u-syndication inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-semibold transition-colors hover:text-primary"
        >
          <SocialGlyph network={l.network} className="size-3.5" />
          {socialLabels[l.network] ?? l.network}
        </a>
      ))}
    </div>
  );
}

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
    <section
      aria-label={t.site.aboutAuthor}
      className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 sm:flex-row sm:items-start sm:p-8"
    >
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- small avatar, any origin
        <img
          src={profile.avatarUrl}
          alt={name}
          className="size-16 shrink-0 rounded-2xl object-cover"
          loading="lazy"
        />
      ) : (
        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-xl font-black text-white">
          {initials(name)}
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs font-bold text-muted-foreground">{t.site.writtenBy}</p>
        <p className="text-lg font-extrabold">
          <Link href={localePath(locale, "/about")} rel="author" className="hover:text-primary">
            {name}
          </Link>
        </p>
        {profile.headline[locale] && (
          <p className="text-sm font-semibold text-primary">{profile.headline[locale]}</p>
        )}
        {profile.bio[locale] && (
          <p className="text-sm leading-7 text-muted-foreground">{profile.bio[locale]}</p>
        )}
        <SocialLinks socials={profile.socials} className="pt-2" />
      </div>
    </section>
  );
}
