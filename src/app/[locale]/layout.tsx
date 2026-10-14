import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { InlineScript } from "@/components/shared/inline-script";
import { Providers } from "@/components/shared/providers";
import { presetInitScript } from "@/components/shared/theme";
import { isLocale, localeMeta, localePath, locales } from "@/i18n/config";
import { getLocale, getMessages } from "@/i18n/server";
import { fontVariables } from "../fonts";
import "../globals.css";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getMessages(locale);
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t.site.metaTitle, template: `%s | ${t.common.appName}` },
    description: t.site.metaDescription,
    applicationName: t.common.appName,
    alternates: {
      canonical: localePath(locale, "/"),
      languages: Object.fromEntries(locales.map((l) => [l, localePath(l, "/")])),
      types: { "application/rss+xml": localePath(locale, "/feed.xml") },
    },
    openGraph: {
      type: "website",
      siteName: t.common.appName,
      locale: localeMeta[locale].ogLocale,
      alternateLocale: locales.filter((l) => l !== locale).map((l) => localeMeta[l].ogLocale),
    },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141a21" },
  ],
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await getLocale();
  if (!isLocale(locale)) notFound();
  const { dir } = localeMeta[locale];
  return (
    <html lang={locale} dir={dir} className={fontVariables} suppressHydrationWarning>
      <head>
        <InlineScript html={presetInitScript} />
      </head>
      <body className="min-h-dvh">
        <Providers dir={dir}>{children}</Providers>
      </body>
    </html>
  );
}
