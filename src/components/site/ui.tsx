import "server-only";
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { localeMeta, type Locale } from "@/i18n/config";
import { env } from "@/lib/env";
import { formatDate, formatNumber, type FormatOptions } from "@/lib/format";
import { cn } from "@/lib/utils";

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

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-bold text-muted-foreground backdrop-blur",
        className,
      )}
    >
      <span className="gt-dot" aria-hidden />
      {children}
    </span>
  );
}

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
        "group inline-flex items-center gap-1 text-sm font-bold text-foreground transition-colors hover:text-primary",
        className,
      )}
    >
      {children}
      <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5 ltr:rotate-180 ltr:group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Page hero used by section index pages (work, blog, learn, services…). */
export function PageHero({
  crumbs,
  eyebrow,
  title,
  subtitle,
  children,
  className,
}: {
  crumbs?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative -mt-16 overflow-hidden pt-16", className)}>
      <div aria-hidden className="bg-grid mask-fade-b absolute inset-0 -z-10 opacity-70" />
      <div
        aria-hidden
        className="gt-glow start-1/2 -top-40 -z-10 h-80 w-[36rem] -translate-x-1/2 bg-primary/15 rtl:translate-x-1/2"
      />
      <Container className="pt-14 pb-10 sm:pt-20 sm:pb-14">
        {crumbs && <div className="mb-8">{crumbs}</div>}
        <div className="max-w-3xl space-y-5">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1 className="text-4xl leading-[1.15] font-black tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {subtitle && (
            <p className="max-w-2xl text-lg leading-8 text-pretty text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {children && <div className="mt-8">{children}</div>}
      </Container>
    </section>
  );
}

/** Pill-shaped filter chip link. */
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
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors",
        active
          ? "border-transparent bg-grey-800 text-white dark:bg-white dark:text-grey-800"
          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
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
