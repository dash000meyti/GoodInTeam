import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-controls";
import { localePath } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";
import { getLocale, getMessages, pickMessages } from "@/i18n/server";

export default async function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <I18nProvider locale={locale} messages={pickMessages(locale, ["common", "auth"])}>
      <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(480px,560px)]">
        <aside className="relative hidden overflow-hidden bg-muted/60 lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div aria-hidden className="bg-grid mask-radial absolute inset-0" />
          <div
            aria-hidden
            className="absolute -start-24 top-1/3 size-96 rounded-full bg-primary/25 blur-3xl"
          />
          <Link href={localePath(locale, "/")} className="relative">
            <Logo label={t.common.appName} />
          </Link>
          <div className="relative max-w-md space-y-4">
            <h2 className="text-4xl leading-tight font-extrabold">{t.auth.loginTitle}</h2>
            <p className="text-lg text-muted-foreground">{t.auth.loginSubtitle}</p>
          </div>
          <p className="relative text-sm text-muted-foreground">© {t.common.appName}</p>
        </aside>
        <main className="flex flex-col">
          <div className="flex items-center justify-between p-4 sm:p-6">
            <Link
              href={localePath(locale, "/")}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground lg:invisible"
            >
              <Logo label={t.common.appName} />
            </Link>
            <div className="flex items-center gap-1">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-12">
            <div className="w-full max-w-sm">{children}</div>
          </div>
        </main>
      </div>
    </I18nProvider>
  );
}
