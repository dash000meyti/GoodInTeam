import "server-only";
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { PixelAvatar, PixelIcon, PixelText } from "@/components/brand/pixel-art";
import type { PixelIconName } from "@/components/brand/pixel-icons";
import { Window } from "@/components/shell/window";
import { localeMeta, localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { env } from "@/lib/env";
import { formatDate, formatNumber, type FormatOptions } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  FrameCell,
  FrameEyebrow,
  FrameGrid,
  FrameSection,
  framePath,
  HEADING_CLASS as FRAME_HEADING_CLASS,
  type FrameSpan,
  type FrameTone,
  type GuideLine,
} from "./frame";

/** Public site building blocks (server components). */

export const siteFmt = (locale: Locale): FormatOptions => ({
  locale,
  timeZone: env.timezone,
  calendar: localeMeta[locale].calendar,
});

const longFmt = new Map<Locale, Intl.DateTimeFormat>();
/** "medium" → ۱۶ مهر ۱۴۰۵ (short month) · "long" → ۱۶ مهر ۱۴۰۵ (full month, no weekday). */
export function fmtDate(
  d: Date | null | undefined,
  locale: Locale,
  style: "medium" | "long" = "medium",
) {
  if (style === "medium" || !d) return formatDate(d, siteFmt(locale), "medium");
  let f = longFmt.get(locale);
  if (!f) {
    const o = siteFmt(locale);
    f = new Intl.DateTimeFormat(`${localeMeta[locale].intl}-u-ca-${o.calendar}`, {
      timeZone: o.timeZone,
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    longFmt.set(locale, f);
  }
  return f.format(d);
}

export const fmtNum = (n: number, locale: Locale) => formatNumber(n, locale);

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6", className)}>{children}</div>;
}

/** Dashed accent chip (renders foundation's FrameEyebrow; no blur). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <FrameEyebrow className={className}>{children}</FrameEyebrow>;
}

/** Legacy section heading (home imports it until its rewrite). */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  align = "start",
  as: Tag = "h2",
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  align?: "start" | "center";
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-10 flex flex-col gap-5 sm:mb-12",
        align === "center"
          ? "items-center text-center"
          : "md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className={cn("max-w-2xl space-y-4", align === "center" && "mx-auto")}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Tag
          className={cn(
            "font-black tracking-tight text-balance",
            Tag === "h1"
              ? "text-4xl leading-[1.15] sm:text-5xl"
              : "text-3xl leading-tight sm:text-4xl",
          )}
        >
          {title}
        </Tag>
        {subtitle && (
          <p className="text-base leading-8 text-pretty text-muted-foreground sm:text-lg">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** "View all →" style link with a direction-aware chevron. */
export function ArrowLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-1 text-sm font-bold text-foreground transition-colors hover:text-primary-ink",
        className,
      )}
    >
      {children}
      <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5 ltr:rotate-180 ltr:group-hover:translate-x-0.5" />
    </Link>
  );
}

/**
 * Heading scale of the frame system (spec §3.5): foundation's
 * `FrameHeaderCell` scale, plus a smaller `article` h1 for long titles and h3.
 */
export const HEADING_CLASS = {
  ...FRAME_HEADING_CLASS,
  article:
    "text-[32px] leading-[1.12] font-bold text-balance md:text-[44px] md:leading-[1.08] [:lang(en)_&]:tracking-[-0.03em] [:lang(fa)_&]:text-[28px] [:lang(fa)_&]:leading-[1.45] [:lang(fa)_&]:font-extrabold md:[:lang(fa)_&]:text-[38px] md:[:lang(fa)_&]:leading-[1.4]",
  h3: "text-xl leading-[1.3] font-bold text-balance [:lang(fa)_&]:leading-[1.6]",
} as const;

const LEAD =
  "max-w-2xl text-lg leading-[1.6] text-pretty text-muted-foreground [:lang(fa)_&]:leading-[1.9]";

/**
 * A box's header cell (always `data-frame-header`): breadcrumbs, eyebrow,
 * the h1/h2 (`titleId` labels the box), subtitle, then `children` (facets,
 * a count line, buttons). `spot` makes it a guide "special part".
 */
export function TitleCell({
  as: H = "h2",
  size,
  title,
  titleId,
  crumbs,
  eyebrow,
  subtitle,
  span,
  tone,
  spot,
  hClassName,
  className,
  children,
}: {
  as?: "h1" | "h2";
  /** Heading scale; defaults to the tag (`article` = smaller h1 for long titles). */
  size?: keyof typeof HEADING_CLASS;
  title: ReactNode;
  titleId: string;
  crumbs?: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  span?: FrameSpan;
  tone?: FrameTone;
  spot?: GuideLine;
  hClassName?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <FrameCell
      header
      span={span}
      tone={tone}
      spot={spot}
      className={cn("flex flex-col items-start gap-4", className)}
    >
      {crumbs}
      {eyebrow && <FrameEyebrow>{eyebrow}</FrameEyebrow>}
      <H id={titleId} className={cn(HEADING_CLASS[size ?? H], hClassName)}>
        {title}
      </H>
      {subtitle && <p className={LEAD}>{subtitle}</p>}
      {children}
    </FrameCell>
  );
}

/** A plain full-width header row (FrameGrid 1) holding a TitleCell. */
export function TitleRow(props: Parameters<typeof TitleCell>[0]) {
  return (
    <FrameGrid cols={1}>
      <TitleCell {...props} />
    </FrameGrid>
  );
}

/**
 * The decorative end cell of a first box (spec §9 first-box rule): a
 * `tone="dots"` cell (so `data-decor`), hidden below lg unless `always`,
 * ≥200px tall at lg, holding an opaque Window. The guide's first-box line
 * lands here (candidate B), so it never holds text.
 */
export function DecorWindowCell({
  path,
  icon,
  always,
  className,
  bodyClassName,
  children,
}: {
  path: string;
  icon?: PixelIconName;
  always?: boolean;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
}) {
  return (
    <FrameCell
      tone="dots"
      aria-hidden={children ? undefined : true}
      className={cn(
        "flex flex-col justify-center lg:min-h-[200px]",
        !always && "hidden lg:flex",
        className,
      )}
    >
      <Window path={path} className={cn("w-full", !children && "lg:flex-1")}>
        {children ?? (
          <div
            className={cn(
              "grid h-full min-h-[136px] place-items-center bg-[radial-gradient(var(--dots)_1px,transparent_1.5px)] [background-size:12px_12px] p-6",
              bodyClassName,
            )}
          >
            {icon && <PixelIcon name={icon} cell={6} />}
          </div>
        )}
      </Window>
    </FrameCell>
  );
}

/**
 * Page hero of the section index pages (spec §9): the page's first box
 * (`FrameSection first`, id `top`), strip `GOOD-IN-TEAM/<SECTION>`, one
 * `FrameGrid 2-1` of the h1 header cell (breadcrumbs, title, subtitle, then
 * the facets/count line as children) and the decor end cell with the
 * `<SECTION>.APP` window (the section's pixel icon, or `windowBody`).
 */
export function PageHero({
  section,
  icon,
  guide,
  crumbs,
  eyebrow,
  title,
  subtitle,
  stripAction,
  windowBody,
  children,
}: {
  section: string;
  icon: PixelIconName;
  guide: GuideLine;
  crumbs?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Inline-end of the strip (the /blog search form). */
  stripAction?: ReactNode;
  /** Replaces the icon inside the decor window (a series cover). */
  windowBody?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <FrameSection
      id="top"
      first
      labelledBy="top-title"
      guide={guide}
      strip={{ index: 1, path: framePath("GOOD-IN-TEAM", section), action: stripAction }}
    >
      <FrameGrid cols="2-1">
        <TitleCell
          as="h1"
          titleId="top-title"
          crumbs={crumbs}
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          className="lg:min-h-[200px]"
        >
          {children}
        </TitleCell>
        <DecorWindowCell path={`${section}.APP`} icon={icon}>
          {windowBody}
        </DecorWindowCell>
      </FrameGrid>
    </FrameSection>
  );
}

/** A strip path for a page box: `framePath("GOOD-IN-TEAM", …)`. */
export const teamPath = (...segments: string[]) => framePath("GOOD-IN-TEAM", ...segments);

/** Square-cornered filter chip link (frame look). */
export function Chip({
  href,
  active,
  children,
  count,
}: {
  href: string;
  active?: boolean;
  children: ReactNode;
  count?: ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-[6px] border px-3 text-sm font-semibold whitespace-nowrap transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-frame-line bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
      )}
    >
      {children}
      {count != null && (
        <span className={cn("text-xs tabular-nums", active ? "opacity-70" : "opacity-60")}>
          {count}
        </span>
      )}
    </Link>
  );
}

/** A full-row empty state (never on dots): pixel icon, title, hint, optional action. */
export function EmptyCell({
  icon,
  title,
  hint,
  action,
  span = "full",
}: {
  icon: PixelIconName;
  title: string;
  hint?: string;
  action?: ReactNode;
  span?: FrameSpan;
}) {
  return (
    <FrameCell span={span} pad="lg" className="flex flex-col items-center gap-3 text-center">
      <PixelIcon name={icon} cell={4} />
      <p className="text-lg font-bold">{title}</p>
      {hint && <p className="max-w-md text-sm text-muted-foreground">{hint}</p>}
      {action}
    </FrameCell>
  );
}

const PILL =
  "inline-flex h-11 items-center gap-2 rounded-full px-6 text-[15px] font-bold transition-colors";
/** Primary (yellow, ink text) and outline pills. */
export const pillClass = {
  primary: `${PILL} bg-primary text-primary-foreground hover:bg-primary-hover`,
  outline: `${PILL} border border-frame-line bg-card hover:border-foreground/40`,
} as const;

/**
 * The 404 "alert" box (spec §9): a `FrameSection first` with a FrameGrid 2-1
 * of the text cell (h1, body, Home/Contact pills, a few useful links) and a
 * `tone="dots"` art cell (pixel 404 + the blinking avatar). Below lg they stack.
 */
export function NotFoundBox({ locale, t }: { locale: Locale; t: Messages }) {
  const links = [
    { href: "/work", label: t.nav.work },
    { href: "/services", label: t.nav.services },
    { href: "/blog", label: t.nav.blog },
    { href: "/learn", label: t.nav.learn },
  ];
  return (
    <FrameSection
      id="top"
      first
      labelledBy="top-title"
      guide={{ key: "not_found", say: t.guide.not_found }}
      strip={{ index: 404, path: teamPath("NOT-FOUND") }}
    >
      <FrameGrid cols="2-1">
        <TitleCell
          as="h1"
          titleId="top-title"
          eyebrow={t.site.notFoundEyebrow}
          title={t.common.notFoundTitle}
          subtitle={t.common.notFoundBody}
          className="justify-center lg:min-h-[320px]"
        >
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={localePath(locale, "/")} className={pillClass.primary}>
              {t.common.goHome}
            </Link>
            <Link href={localePath(locale, "/contact")} className={pillClass.outline}>
              {t.nav.contact}
            </Link>
          </div>
          <nav aria-label={t.site.notFoundSuggestions} className="pt-4 text-sm">
            <p className="mb-2 font-semibold text-muted-foreground">{t.site.notFoundSuggestions}</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {links.map((l) => (
                <li key={l.href}>
                  <ArrowLink href={localePath(locale, l.href)}>{l.label}</ArrowLink>
                </li>
              ))}
            </ul>
          </nav>
        </TitleCell>
        <FrameCell
          tone="dots"
          aria-hidden
          className="flex min-h-[240px] flex-col items-center justify-center gap-6"
        >
          <PixelText text="404" cell={8} />
          <PixelAvatar pose="blink" cell={8} />
        </FrameCell>
      </FrameGrid>
    </FrameSection>
  );
}
