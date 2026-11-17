import Link from "next/link";
import { PixelMark } from "@/components/brand/pixel-logo";
import { ThemeToggle } from "@/components/shell/appearance";
import { MB_ICON_CLASS, MB_ITEM_CLASS, MenuBarShell } from "@/components/shell/menubar-shell";
import { AuthLanguageLinks } from "@/components/site/auth-language-links";
import { LOCALE_GLYPH } from "@/components/site/site-menubar";
import { localePath } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";
import { getLocale, getMessages, pickMessages } from "@/i18n/server";
import { cn } from "@/lib/utils";

/**
 * Sign-in and first-run setup (spec §7.6): a public route (no Radix menus,
 * tooltips or toasts). The desktop wallpaper, a minimal login-screen menu bar
 * (the page's only blurred surface: mark, language links, theme) and no dock.
 * Each page centres its own `Window`, so the window path matches the route.
 */
export default async function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <I18nProvider locale={locale} messages={pickMessages(locale, ["common", "auth"])}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2"
      >
        {t.common.skipToContent}
      </a>
      <MenuBarShell
        label={t.common.menuBar}
        start={
          <Link
            href={localePath(locale, "/")}
            aria-label={t.common.appName}
            className={MB_ITEM_CLASS}
          >
            <PixelMark cell={2} />
          </Link>
        }
        end={
          <>
            <AuthLanguageLinks current={locale} glyphs={LOCALE_GLYPH} />
            <ThemeToggle className={cn(MB_ICON_CLASS, "size-9 rounded-md md:size-7")} />
          </>
        }
      />
      <div className="os-desktop auth-desktop">
        <main id="main" className="auth-main">
          {children}
        </main>
      </div>
    </I18nProvider>
  );
}
