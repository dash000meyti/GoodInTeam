import "server-only";
import Link from "next/link";
import { connection } from "next/server";
import { OsClock } from "@/components/shell/os-clock";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { getPublicProfile, getPublicTimezone } from "@/server/modules/content/queries";

/**
 * The two streamed holes of the site menu bar (spec §7.2 items 3 and 9).
 * They are not adjacent in the DOM, so each has its own <Suspense>; both read
 * cached functions after `connection()`, so the second costs nothing. Each
 * fallback has the final box, so streaming never shifts the bar.
 */

/** Label slot that stacks BOTH labels in one grid cell: always as wide as the longer one. */
function AvailabilityLabels({ t, on }: { t: Messages; on: boolean | null }) {
  return (
    <span className="os-mb-avail-label sr-only xl:not-sr-only">
      <span aria-hidden={on !== true} data-on={on === true ? "" : undefined}>
        {t.site.availableShort}
      </span>
      <span aria-hidden={on !== false} data-on={on === false ? "" : undefined}>
        {t.site.unavailableShort}
      </span>
    </span>
  );
}

/** Item 3 (lg+): a square status dot plus the label (visible at xl), linking to /contact. */
export async function MenuBarAvailability({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const on = (await getPublicProfile()).availableForWork;
  return (
    <Link
      href={localePath(locale, "/contact")}
      className="os-mb-item os-mb-avail hidden lg:inline-flex"
    >
      <span className={cn("os-mb-dot", on ? "bg-success" : "bg-warning")} aria-hidden />
      <AvailabilityLabels t={t} on={on} />
    </Link>
  );
}

/** Same box as MenuBarAvailability: a muted dot and the stacked (hidden) labels. */
export function AvailabilitySkeleton({ t }: { t: Messages }) {
  return (
    <span className="os-mb-item os-mb-avail hidden lg:inline-flex" aria-hidden>
      <span className="os-mb-dot bg-muted-foreground/40" />
      <AvailabilityLabels t={t} on={null} />
    </span>
  );
}

/** Item 9 (lg+): studio time; `.os-clock` and ClockSkeleton share one fixed width. */
export async function MenuBarClock({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const tz = await getPublicTimezone();
  return <OsClock locale={locale} tz={tz} label={t.common.studioTime} />;
}
