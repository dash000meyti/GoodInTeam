import "server-only";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { format } from "@/i18n/format-message";
import { getT } from "@/i18n/server";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { FrameCell, FrameGrid } from "./frame";
import { breadcrumbLd, JsonLd } from "./json-ld";
import { fmtNum } from "./ui";

/** Visible breadcrumb trail + BreadcrumbList JSON-LD. Paths are locale-prefixed already. */
export async function Breadcrumbs({
  items,
  className,
}: {
  items: { name: string; path: string }[];
  className?: string;
}) {
  const t = await getT();
  return (
    <>
      <nav
        aria-label={t.common.breadcrumb}
        className={cn("max-w-full text-sm text-muted-foreground", className)}
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((it, i) => (
            <li key={it.path} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <ChevronLeftIcon className="size-3.5 shrink-0 opacity-50 ltr:rotate-180" />}
              {i < items.length - 1 ? (
                <Link href={it.path} className="truncate transition-colors hover:text-foreground">
                  {it.name}
                </Link>
              ) : (
                <span aria-current="page" className="truncate text-foreground/80">
                  {it.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbLd(items)} />
    </>
  );
}

const btn =
  "inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-frame-line bg-background px-3.5 text-sm font-semibold transition-colors hover:border-foreground/40";

/**
 * Older / newer pagination with "page n of m", as a full-width FrameGrid 1
 * row (stacked under a grid, §6.2). Renders nothing for a single page.
 */
export function Pagination({
  page,
  pages,
  hrefFor,
  locale,
  t,
}: {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
  locale: Locale;
  t: Messages;
}) {
  if (pages <= 1) return null;
  return (
    <FrameGrid cols={1}>
      <FrameCell pad="none">
        <nav
          className="flex items-center justify-between gap-4 px-4 py-3 md:px-6"
          aria-label={t.common.pagination}
        >
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} rel="prev" className={btn}>
              <ChevronRightIcon className="size-4 ltr:rotate-180" />
              {t.site.newer}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground tabular-nums">
            {format(t.site.pageOf, { n: fmtNum(page, locale), total: fmtNum(pages, locale) })}
          </span>
          {page < pages ? (
            <Link href={hrefFor(page + 1)} rel="next" className={btn}>
              {t.site.older}
              <ChevronLeftIcon className="size-4 ltr:rotate-180" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </FrameCell>
    </FrameGrid>
  );
}

/**
 * Previous / next item navigation at the end of detail pages: a FrameGrid 2
 * row of two link cells. A missing side becomes a `tone="dots"` slot cell
 * (hidden below md), so the row never has a hole.
 */
export function PrevNext({
  prev,
  next,
  prevLabel,
  nextLabel,
}: {
  prev?: { href: string; title: string } | null;
  next?: { href: string; title: string } | null;
  prevLabel: string;
  nextLabel: string;
}) {
  if (!prev && !next) return null;
  const link = "group flex h-full flex-col gap-1.5 after:absolute after:inset-0";
  const label = "inline-flex items-center gap-1 text-xs font-bold text-muted-foreground";
  const title = "text-lg leading-snug font-bold text-balance group-hover:text-primary-ink";
  return (
    <nav aria-label={`${prevLabel} / ${nextLabel}`} className="frame-nav">
      <FrameGrid cols={2}>
        {prev ? (
          <FrameCell hover>
            <Link href={prev.href} className={link} rel="prev">
              <span className={label}>
                <ChevronRightIcon className="size-3.5 ltr:rotate-180" /> {prevLabel}
              </span>
              <span className={title}>{prev.title}</span>
            </Link>
          </FrameCell>
        ) : (
          <FrameCell tone="dots" aria-hidden className="hidden md:block" />
        )}
        {next ? (
          <FrameCell hover>
            <Link href={next.href} className={cn(link, "md:items-end md:text-end")} rel="next">
              <span className={label}>
                {nextLabel} <ChevronLeftIcon className="size-3.5 ltr:rotate-180" />
              </span>
              <span className={title}>{next.title}</span>
            </Link>
          </FrameCell>
        ) : (
          <FrameCell tone="dots" aria-hidden className="hidden md:block" />
        )}
      </FrameGrid>
    </nav>
  );
}
