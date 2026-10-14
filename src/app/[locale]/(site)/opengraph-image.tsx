import { isLocale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { ogContentType, ogDomain, ogSize, renderOgImage } from "@/components/site/og";

/** Default social card for every public page without its own image (static, prerendered). */
export const alt = messages.fa.site.metaTitle;
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "fa";
  const t = messages[locale];
  return renderOgImage({
    locale,
    title: t.site.heroTitle,
    eyebrow: t.site.heroEyebrow,
    brand: t.common.appName,
    footer: [t.nav.work, t.nav.services, t.nav.blog, t.nav.learn],
    domain: ogDomain(),
  });
}
