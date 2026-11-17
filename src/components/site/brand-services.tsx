import "server-only";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpLeftIcon, CheckIcon } from "lucide-react";
import { PixelIcon } from "@/components/brand/pixel-art";
import { brandOf, type brands } from "@/components/brand/brands";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "@/i18n/format-message";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { postHref } from "@/lib/content";
import { listServices } from "@/server/modules/content/queries";
import { serviceCellsPlan } from "./brand-plan";
import { FrameCell, FrameFiller } from "./frame";
import { fillers } from "./page-utils";
import { ServiceIcon } from "./service-icon";
import { fmtNum, HEADING_CLASS } from "./ui";

/**
 * The service cells of one Good In brand, shared by the `/services` brand
 * boxes and the brand landing pages (`/studio`, `/code`). They render inside
 * the caller's `FrameGrid cols={3}` and stream (`await connection()`), so the
 * caller wraps them in <Suspense fallback={<BrandServicesSkeleton />}>.
 */

type Brand = (typeof brands)[number];

/**
 * The "ask" cell: a link to /contact naming the brand. A brand without
 * public services gets it as one full row (the empty state, with
 * `site.brandEmpty`); otherwise it takes the first free track of the last
 * row at lg.
 */
function AskCell({
  brand,
  locale,
  t,
  empty,
}: {
  brand: Brand;
  locale: Locale;
  t: Messages;
  empty?: boolean;
}) {
  const name = t.nav[brand.label];
  return (
    <FrameCell
      span={empty ? "full" : undefined}
      tone="card"
      hover
      className="group flex flex-col justify-center gap-4"
    >
      {empty && <p className="text-muted-foreground">{t.site.brandEmpty}</p>}
      {!empty && <PixelIcon name="contact" cell={3} />}
      <Link
        href={localePath(locale, "/contact")}
        className="inline-flex items-center gap-1.5 font-bold group-hover:text-primary-ink after:absolute after:inset-0"
      >
        {format(t.site.brandAsk, { brand: name })}
        <ArrowUpLeftIcon className="size-4 ltr:rotate-90" aria-hidden />
      </Link>
    </FrameCell>
  );
}

/** The streamed service cells of one brand (+ the ask cell and fillers; `serviceCellsPlan`). */
export async function BrandServices({
  brand,
  locale,
  t,
}: {
  brand: Brand;
  locale: Locale;
  t: Messages;
}) {
  await connection();
  const items = (await listServices(locale)).filter((svc) => brandOf(svc.meta) === brand.id);
  if (!items.length) return <AskCell brand={brand} locale={locale} t={t} empty />;
  const plan = serviceCellsPlan(items.length);
  return (
    <>
      {items.map((svc, i) => (
        <FrameCell key={svc.id} hover as="article" className="group flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="flex size-11 items-center justify-center rounded-[8px] border border-frame-line bg-card text-foreground shadow-[-3px_-3px_0_0_var(--brand-frame)] rtl:shadow-[3px_-3px_0_0_var(--brand-frame)]">
              <ServiceIcon name={svc.meta.icon} className="size-5" />
            </span>
            <span className="font-mono text-sm font-bold text-muted-foreground tabular-nums">
              {fmtNum(i + 1, locale).padStart(2, locale === "fa" ? "۰" : "0")}
            </span>
          </div>
          <h3 className={HEADING_CLASS.h3}>
            <Link href={postHref(locale, svc)} className="after:absolute after:inset-0">
              {svc.title}
            </Link>
          </h3>
          {svc.excerpt && <p className="leading-7 text-muted-foreground">{svc.excerpt}</p>}
          {svc.highlights.length > 0 && (
            <ul className="grid gap-2">
              {svc.highlights.slice(0, 3).map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm font-semibold">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary-ink" aria-hidden /> {h}
                </li>
              ))}
            </ul>
          )}
          <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-bold">
            {t.site.viewDetails}
            <ArrowUpLeftIcon
              className="size-4 transition-transform group-hover:-translate-y-0.5 ltr:rotate-90"
              aria-hidden
            />
          </span>
        </FrameCell>
      ))}
      {plan.ask && <AskCell brand={brand} locale={locale} t={t} />}
      <FrameFiller units={fillers(plan.spans, 3)} />
    </>
  );
}

/** Same cells while the list streams: three card skeletons (1 cell, 2 at md, 3 at lg). */
export function BrandServicesSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }, (_, i) => (
        <FrameCell key={i} className={["", "hidden md:block", "hidden lg:block"][i]}>
          <div className="flex flex-col gap-5">
            <Skeleton className="size-11 rounded-[8px]" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </FrameCell>
      ))}
    </>
  );
}
