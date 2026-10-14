import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { I18nProvider } from "@/i18n/client";
import { getLocale, getMessages, pickMessages } from "@/i18n/server";

/** Public website chrome. Fully static: rendered at build time per locale. */
export default async function SiteLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <I18nProvider locale={locale} messages={pickMessages(locale, ["common", "nav", "site"])}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2"
      >
        {t.common.skipToContent}
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter locale={locale} t={t} />
    </I18nProvider>
  );
}
