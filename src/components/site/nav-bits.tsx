import "server-only";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { format } from "@/i18n/format-message";
import { getT } from "@/i18n/server";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/utils";
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
        className={cn("text-sm text-muted-foreground", className)}
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

/** Older / newer pagination with "page n of m". `hrefFor(page)` builds the URL. */
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
  const btn =
    "inline-flex h-10 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:border-foreground/30";
  return (
    <nav className="mt-14 flex items-center justify-between gap-4" aria-label={t.common.pagination}>
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={btn}>
          <ChevronRightIcon className="size-4 ltr:rotate-180" />
          {t.site.newer}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted-foreground">
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
  );
}

/** Previous / next item navigation at the end of detail pages. */
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
  const card =
    "group flex flex-col gap-1.5 rounded-2xl border border-border p-5 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]";
  return (
    <nav className="grid gap-4 sm:grid-cols-2" aria-label={`${prevLabel} / ${nextLabel}`}>
      {prev ? (
        <Link href={prev.href} className={card} rel="prev">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
            <ChevronRightIcon className="size-3.5 ltr:rotate-180" /> {prevLabel}
          </span>
          <span className="font-bold text-balance group-hover:text-primary">{prev.title}</span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      {next ? (
        <Link href={next.href} className={cn(card, "sm:items-end sm:text-end")} rel="next">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
            {nextLabel} <ChevronLeftIcon className="size-3.5 ltr:rotate-180" />
          </span>
          <span className="font-bold text-balance group-hover:text-primary">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}
