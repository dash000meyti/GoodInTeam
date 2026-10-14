import "server-only";
import { localeMeta, localePath } from "@/i18n/config";
import { getLocale, getMessages } from "@/i18n/server";
import type { UserRole } from "@/server/db/schema";
import type { FormatOptions } from "@/lib/format";
import { requireActor } from "./auth/session";
import { appTimezone } from "./modules/settings/service";

/**
 * Everything a panel page usually needs, in one call:
 *
 *   const { actor, t, fmt, href, tz, now } = await panelContext({ roles: ["owner", "admin"] });
 *
 * Reads the session (request-time) → call it inside the page component
 * (pages render within panel/loading.tsx's Suspense boundary).
 */
export async function panelContext(opts: { roles?: UserRole[] } = {}) {
  const locale = await getLocale();
  const actor = await requireActor({ roles: opts.roles, locale });
  const tz = appTimezone();
  const fmt: FormatOptions = { locale, timeZone: tz, calendar: localeMeta[locale].calendar };
  return {
    actor,
    locale,
    tz,
    fmt,
    t: getMessages(locale),
    now: Date.now(),
    href: (path: string) => localePath(locale, path),
  };
}

export type PanelContext = Awaited<ReturnType<typeof panelContext>>;
