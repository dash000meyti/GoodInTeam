import { Suspense } from "react";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { RssIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getPublicProfile } from "@/server/modules/content/queries";
import { SocialLinks } from "./social-links";

async function CurrentYear({ locale }: { locale: Locale }) {
  "use cache";
  cacheLife("days");
  return (
    <>
      {new Intl.DateTimeFormat(locale === "fa" ? "fa-IR-u-ca-persian" : "en-US", {
        year: "numeric",
      }).format(new Date())}
    </>
  );
}

async function FooterSocials() {
  await connection();
  const profile = await getPublicProfile();
  return <SocialLinks socials={profile.socials} email={profile.email} />;
}

export function SiteFooter({ locale, t }: { locale: Locale; t: Messages }) {
  const col = (title: string, links: { href: string; label: string; prefetch?: false }[]) => (
    <div className="space-y-4">
      <p className="text-sm font-bold">{title}</p>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              prefetch={l.prefetch}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-dashed">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pt-16 pb-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="space-y-5">
          <Logo label={t.common.appName} />
          <p className="max-w-xs text-sm leading-7 text-muted-foreground">{t.site.footerAbout}</p>
          <Suspense fallback={<div className="h-9" />}>
            <FooterSocials />
          </Suspense>
        </div>
        {col(t.site.footerExplore, [
          { href: localePath(locale, "/work"), label: t.nav.work },
          { href: localePath(locale, "/services"), label: t.nav.services },
          { href: localePath(locale, "/about"), label: t.nav.about },
          { href: localePath(locale, "/contact"), label: t.nav.contact },
        ])}
        {col(t.site.footerResources, [
          { href: localePath(locale, "/blog"), label: t.nav.blog },
          { href: localePath(locale, "/learn"), label: t.nav.learn },
          { href: localePath(locale, "/feed.xml"), label: t.site.rss, prefetch: false },
          { href: "/llms.txt", label: t.site.llms, prefetch: false },
        ])}
        {col(t.site.footerConnect, [
          { href: localePath(locale, "/login"), label: t.nav.panel },
          { href: "/api/v1/openapi.json", label: t.site.apiDocs, prefetch: false },
          { href: "/sitemap.xml", label: t.site.sitemap, prefetch: false },
        ])}
      </div>
      <div
        aria-hidden
        className="gt-wordmark pointer-events-none mx-auto max-w-7xl px-4 text-center leading-none font-black tracking-tighter select-none sm:px-6"
      >
        {t.common.appName}
      </div>
      <div className="border-t border-dashed">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6">
          <p>
            © <CurrentYear locale={locale} /> {t.common.appName}. {t.site.footerRights}
          </p>
          <p className="sm:ms-auto">{t.site.footerMadeWith}</p>
          <Link
            href={localePath(locale, "/feed.xml")}
            prefetch={false}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <RssIcon className="size-3.5" /> RSS
          </Link>
        </div>
      </div>
    </footer>
  );
}
