import { connection } from "next/server";
import type { Locale } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import { getMessages } from "@/i18n/server";
import { getPublicProfile } from "@/server/modules/content/queries";
import { GuideLayer } from "./guide-layer";

/**
 * The pixel guide, "virtual me" (spec §10.2–10.4). Rendered by the site
 * layout inside `.os-desktop`, after the footer, as
 * `<Suspense fallback={null}><GuideMount locale={locale} /></Suspense>`.
 *
 * Request-time (the owner's name comes from the cached profile): formats the
 * desktop greeting and the compact one (compact mode opens no automatic
 * bubbles, so its greeting says to tap the sprite when its "!" shows) and
 * passes them, with the bubble labels, to the client loader. Renders nothing
 * but a hide rule for the entry points when the owner turned the guide off. The `guide`
 * namespace never ships to the browser; section lines live in the pages'
 * `data-guide-say` attributes.
 */
export async function GuideMount({ locale }: { locale: Locale }) {
  await connection();
  const profile = await getPublicProfile();
  // Owner switched the guide off (Settings → Site profile): no layer, and the
  // menu bar / Control Center / Launchpad entry points (`data-guide-entry`) hide.
  if (!profile.siteGuide) return <style>{"[data-guide-entry]{display:none!important}"}</style>;
  const t = getMessages(locale);
  const g = t.guide;
  const owner = profile.ownerName[locale]?.trim();
  const greeting = {
    full: owner ? format(g.greeting, { owner }) : g.greetingNoName,
    compact: owner ? format(g.greetingCompact, { owner }) : g.greetingCompactNoName,
  };
  return (
    <GuideLayer
      greeting={greeting}
      labels={{
        name: g.name,
        hide: g.hide,
        next: g.next,
        endTour: g.endTour,
        tourDone: g.tourDone,
        idle: g.idle,
        close: t.common.close,
      }}
    />
  );
}
