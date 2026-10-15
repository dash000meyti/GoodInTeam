import { Suspense } from "react";
import { connection } from "next/server";
import { AlternatesProvider } from "@/components/site/alternates";
import { JsonLd, organizationLd, personLd, websiteLd, type Thing } from "@/components/site/json-ld";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { getLocale, getMessages, pickMessages } from "@/i18n/server";
import { getPublicProfile } from "@/server/modules/content/queries";

/** Organization + Person + WebSite JSON-LD (profile settings → request time). */
async function SiteJsonLd({ locale }: { locale: Locale }) {
  await connection();
  const profile = await getPublicProfile();
  const graph = [
    organizationLd(profile, locale),
    personLd(profile, locale),
    websiteLd(profile, locale),
  ].filter(Boolean) as Thing[];
  return <JsonLd data={graph} />;
}

/**
 * Public website chrome. Header, footer and page shells are static
 * (prerendered per locale); DB-backed parts stream in behind <Suspense>.
 */
export default async function SiteLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <I18nProvider locale={locale} messages={pickMessages(locale, ["common", "nav"])}>
      <AlternatesProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2"
        >
          {t.common.skipToContent}
        </a>
        <SiteHeader locale={locale} t={t} />
        <main id="main" className="min-h-[60dvh]">
          {children}
        </main>
        <SiteFooter locale={locale} t={t} />
        <Suspense fallback={null}>
          <SiteJsonLd locale={locale} />
        </Suspense>
      </AlternatesProvider>
    </I18nProvider>
  );
}
