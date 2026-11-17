import { Suspense } from "react";
import { connection } from "next/server";
import { AlternatesProvider } from "@/components/site/alternates";
import { GuideMount } from "@/components/site/guide/guide-mount";
import { JsonLd, organizationLd, personLd, websiteLd, type Thing } from "@/components/site/json-ld";
import { Launchpad } from "@/components/site/launchpad";
import { SiteChrome } from "@/components/site/site-chrome";
import { SiteControlCenter } from "@/components/site/site-control-center";
import { SiteDock } from "@/components/site/site-dock";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteMenuBar } from "@/components/site/site-header";
import { Spotlight } from "@/components/site/spotlight";
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
 * The public OS shell (spec §7.1). Menu bar, desktop, footer, dock and the
 * native popovers are static (prerendered per locale); the availability and
 * clock holes, the socials and the JSON-LD stream in behind <Suspense>.
 * `.os-desktop` is the wallpaper and the guide's containing layer: never put
 * transform, filter, contain, will-change or backdrop-filter on it (§6.2).
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
        <SiteMenuBar locale={locale} t={t} />
        <div className="os-desktop">
          <main id="main" className="overflow-x-clip">
            {children}
          </main>
          <SiteFooter locale={locale} t={t} />
          <Suspense fallback={null}>
            <GuideMount locale={locale} />
          </Suspense>
        </div>
        <SiteDock locale={locale} t={t} />
        <Spotlight locale={locale} t={t} />
        <SiteControlCenter locale={locale} t={t} />
        <Launchpad locale={locale} t={t} />
        <Suspense fallback={null}>
          <SiteChrome />
        </Suspense>
        <Suspense fallback={null}>
          <SiteJsonLd locale={locale} />
        </Suspense>
      </AlternatesProvider>
    </I18nProvider>
  );
}
