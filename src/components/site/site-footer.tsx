import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { RssIcon } from "lucide-react";
import { brands } from "@/components/brand/brands";
import { PixelLogo } from "@/components/brand/pixel-logo";
import { isLocale, localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getMessages } from "@/i18n/server";
import { getPublicProfile } from "@/server/modules/content/queries";
import { FrameCell, FrameGrid, FrameSection } from "./frame";
import { SocialLinks } from "./social-links";

async function CurrentYear({ locale }: { locale: Locale }) {
  "use cache";
  // A cached function is a public endpoint: check the argument before any work.
  if (!isLocale(locale)) throw new Error("Invalid locale");
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

interface FooterLink {
  href: string;
  label: string;
  prefetch?: false;
}

function LinkList({ links }: { links: FooterLink[] }) {
  return (
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
  );
}

function Column({
  title,
  links,
  children,
}: {
  title: string;
  links: FooterLink[];
  children?: ReactNode;
}) {
  return (
    <FrameCell className="space-y-4">
      <p className="text-sm font-bold">{title}</p>
      <LinkList links={links} />
      {children}
    </FrameCell>
  );
}

/**
 * The site footer: ONE framed box (spec §7.5), rendered as
 * `<footer class="frame-box" data-guide="footer">` (the contentinfo landmark,
 * never a `<section>`, so `main section.frame-box` counts only page boxes).
 * Rows are stacked FrameGrids: four link cells, the giant pixel wordmark on
 * dots (aria-hidden art, scroll-driven entry), then the bottom bar, padded by
 * `--dock-space` so the dock never covers it. The guide line is read on the
 * server; the `guide` namespace never ships.
 */
export function SiteFooter({ locale, t }: { locale: Locale; t: Messages }) {
  const href = (p: string) => localePath(locale, p);
  const guide = getMessages(locale).guide;
  return (
    <FrameSection
      as="footer"
      id="site-footer"
      guide={{ key: "footer", say: guide.footer }}
      strip={false}
    >
      <FrameGrid cols={4}>
        <FrameCell className="space-y-5">
          <PixelLogo suffix="TEAM" cell={3} title={t.common.appName} />
          <p className="max-w-xs text-sm leading-7 text-muted-foreground">{t.site.footerAbout}</p>
          <Suspense fallback={<div className="h-9" />}>
            <FooterSocials />
          </Suspense>
        </FrameCell>
        <Column
          title={t.site.footerExplore}
          links={[
            { href: href("/work"), label: t.nav.work },
            { href: href("/services"), label: t.nav.services },
            { href: href("/about"), label: t.nav.about },
            { href: href("/contact"), label: t.nav.contact },
          ]}
        />
        <Column
          title={t.site.footerResources}
          links={[
            { href: href("/blog"), label: t.nav.blog },
            { href: href("/learn"), label: t.nav.learn },
            { href: href("/feed.xml"), label: t.site.rss, prefetch: false },
            { href: "/llms.txt", label: t.site.llms, prefetch: false },
          ]}
        />
        <Column
          title={t.site.footerConnect}
          links={[
            { href: href("/login"), label: t.nav.panel, prefetch: false },
            { href: "/api/v1/openapi.json", label: t.site.apiDocs, prefetch: false },
            { href: "/sitemap.xml", label: t.site.sitemap, prefetch: false },
          ]}
        >
          <div className="space-y-3 pt-2">
            <p className="text-sm font-bold">{t.nav.brands}</p>
            {/* Registry order (team, studio, code), never re-sorted (spec §2). */}
            <LinkList links={brands.map((b) => ({ href: href(b.href), label: t.nav[b.label] }))} />
          </div>
        </Column>
      </FrameGrid>
      <FrameGrid cols={1}>
        <FrameCell span="full" tone="dots" pad="lg" aria-hidden className="site-wordmark-cell">
          <div className="site-wordmark">
            <PixelLogo
              suffix="TEAM"
              paper={false}
              cell={6}
              className="md:[--cell:8px] lg:[--cell:12px]"
            />
          </div>
        </FrameCell>
      </FrameGrid>
      <FrameGrid cols={1}>
        <FrameCell className="site-footer-bar">
          <p>
            © <CurrentYear locale={locale} /> {t.common.appName}. {t.site.footerRights}
          </p>
          <p className="sm:ms-auto">{t.site.footerMadeWith}</p>
          <Link
            href={href("/feed.xml")}
            prefetch={false}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <RssIcon aria-hidden className="size-3.5" /> RSS
          </Link>
        </FrameCell>
      </FrameGrid>
    </FrameSection>
  );
}
