import Link from "next/link";
import { cacheLife } from "next/cache";
import { Logo } from "@/components/brand/logo";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";

async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export function SiteFooter({ locale, t }: { locale: Locale; t: Messages }) {
  const col = (title: string, links: { href: string; label: string; external?: boolean }[]) => (
    <div className="space-y-4">
      <p className="text-sm font-bold">{title}</p>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              {...(l.external ? { target: "_blank", rel: "noopener" } : {})}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <footer className="relative mt-24 border-t border-dashed">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo label={t.common.appName} />
          <p className="max-w-xs text-sm leading-7 text-muted-foreground">{t.site.footerAbout}</p>
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
          { href: localePath(locale, "/feed.xml"), label: t.site.rss },
          { href: "/llms.txt", label: t.site.llms },
        ])}
        {col(t.site.footerConnect, [
          { href: localePath(locale, "/login"), label: t.nav.panel },
          { href: "/sitemap.xml", label: t.site.sitemap },
        ])}
      </div>
      <div className="border-t border-dashed">
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
          © <CurrentYear /> {t.common.appName}. {t.site.footerRights}
        </p>
      </div>
    </footer>
  );
}
