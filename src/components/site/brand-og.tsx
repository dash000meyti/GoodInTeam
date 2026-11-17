import "server-only";
import { brandById, type SubBrandId } from "@/components/brand/brands";
import { isLocale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { ogDomain, renderOgImage } from "./og";

/**
 * Social card of a brand landing page (`/studio`, `/code`): the default card
 * with the brand's own pixel logo (GOOD IN / STUDIO…), its name and tagline,
 * and the family as the footer. Static: no DB, prerendered per locale.
 */
export function brandOgImage(id: SubBrandId, rawLocale: string) {
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = messages[locale];
  const brand = brandById(id);
  return renderOgImage({
    locale,
    title: t.site[brand.tagline],
    eyebrow: t.site.brandsEyebrow,
    brand: t.nav[brand.label],
    footer: [t.nav.brandTeam, t.nav.brandStudio, t.nav.brandCode],
    domain: ogDomain(),
    logoSuffix: brand.suffix,
  });
}

/** `alt` of the brand card (a static export of the route file). */
export function brandOgAlt(id: SubBrandId) {
  const brand = brandById(id);
  return `${messages.fa.nav[brand.label]} — ${messages.fa.site[brand.tagline]}`;
}
