import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { EyeIcon, GaugeIcon, GraduationCapIcon, MapPinIcon, ShieldCheckIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SetAlternates } from "@/components/site/alternates";
import { CtaBand, StatsStrip, StatsStripSkeleton } from "@/components/site/home/sections";
import { ids, JsonLd } from "@/components/site/json-ld";
import { Breadcrumbs } from "@/components/site/nav-bits";
import { homeCrumb } from "@/components/site/page-utils";
import { absoluteUrl, pageMetadata, postAlternates } from "@/components/site/seo";
import { SocialLinks } from "@/components/site/social-links";
import { Container, SectionHeading } from "@/components/site/ui";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getLocale, getMessages } from "@/i18n/server";
import { initials } from "@/lib/utils";
import {
  getPublicProfile,
  getPublishedPost,
  getTranslations,
  renderContent,
} from "@/server/modules/content/queries";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getMessages(locale);
  await connection();
  const [page, profile] = await Promise.all([
    getPublishedPost(locale, ["page"], "about"),
    getPublicProfile(),
  ]);
  return pageMetadata({
    locale,
    path: "/about",
    title: page?.seoTitle || page?.title || t.site.aboutTitle,
    description: page?.seoDescription || profile.bio[locale] || t.site.aboutSubtitle,
    type: "profile",
    markdownPath: page ? "/about.md" : null,
  });
}

async function AboutIntro({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const [profile, page] = await Promise.all([
    getPublicProfile(),
    getPublishedPost(locale, ["page"], "about"),
  ]);
  const [rendered, translations] = await Promise.all([
    page ? renderContent(page.contentMd) : null,
    page ? getTranslations(page.translationKey) : [],
  ]);
  const name = profile.ownerName[locale] || profile.ownerName.en;
  const brand = profile.brandName[locale] || t.common.appName;
  return (
    <>
      {translations.length > 0 && <SetAlternates value={postAlternates(translations)} />}
      <JsonLd
        data={{
          "@type": ["AboutPage", "ProfilePage"],
          url: absoluteUrl(localePath(locale, "/about")),
          name: page?.title ?? t.site.aboutTitle,
          inLanguage: locale === "fa" ? "fa-IR" : "en-US",
          mainEntity: { "@id": name ? ids.person() : ids.organization() },
          about: { "@id": ids.organization() },
          dateModified: page?.updatedAt.toISOString(),
        }}
      />
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <div className="space-y-6">
          <h1 className="text-4xl leading-[1.15] font-black tracking-tight text-balance sm:text-6xl">
            {page?.title ?? t.site.aboutTitle}
          </h1>
          {(profile.bio[locale] || page?.excerpt) && (
            <p className="max-w-2xl text-xl leading-9 text-pretty text-muted-foreground">
              {profile.bio[locale] || page?.excerpt}
            </p>
          )}
          {rendered && (
            <div
              className="prose-gt max-w-2xl pt-4"
              dangerouslySetInnerHTML={{ __html: rendered.html }}
            />
          )}
        </div>
        <aside className="lg:pt-4">
          <div className="gt-ring relative overflow-hidden rounded-3xl bg-card p-7 shadow-card lg:sticky lg:top-24">
            <div aria-hidden className="gt-glow -end-16 -top-16 size-48 bg-primary/25" />
            <div className="relative flex items-center gap-4">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatar, any origin
                <img
                  src={profile.avatarUrl}
                  alt={name}
                  className="size-20 rounded-2xl object-cover"
                />
              ) : (
                <span className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-2xl font-black text-white">
                  {initials(name || brand)}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xl font-black">{name || brand}</p>
                {profile.headline[locale] && (
                  <p className="mt-1 text-sm font-semibold text-primary">
                    {profile.headline[locale]}
                  </p>
                )}
              </div>
            </div>
            {profile.location[locale] && (
              <p className="relative mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPinIcon className="size-4" /> {t.site.basedIn} {profile.location[locale]}
              </p>
            )}
            <div className="relative mt-6 border-t border-dashed pt-6">
              <p className="mb-3 text-xs font-bold text-muted-foreground">{t.site.findUs}</p>
              <SocialLinks socials={profile.socials} email={profile.email} />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

export default async function AboutPage() {
  const locale = await getLocale();
  const t = getMessages(locale);
  const s = t.site;
  const values = [
    { icon: EyeIcon, title: s.value1Title, body: s.value1Body },
    { icon: ShieldCheckIcon, title: s.value2Title, body: s.value2Body },
    { icon: GraduationCapIcon, title: s.value3Title, body: s.value3Body },
    { icon: GaugeIcon, title: s.value4Title, body: s.value4Body },
  ];
  return (
    <>
      <section className="relative isolate">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-16 bottom-0 -z-10 overflow-hidden"
        >
          <div aria-hidden className="bg-grid mask-fade-b absolute inset-0 -z-10 opacity-70" />
          <div aria-hidden className="gt-glow start-[20%] -top-40 -z-10 size-96 bg-primary/15" />
        </div>
        <Container className="pt-10 pb-16 sm:pt-14">
          <Breadcrumbs
            className="mb-10"
            items={[homeCrumb(locale), { name: s.aboutTitle, path: localePath(locale, "/about") }]}
          />
          <Suspense
            fallback={
              <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-6">
                  <Skeleton className="h-16 w-2/3" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
                <Skeleton className="h-80 rounded-3xl" />
              </div>
            }
          >
            <AboutIntro locale={locale} t={t} />
          </Suspense>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <SectionHeading title={s.valuesTitle} align="center" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="rounded-3xl border border-border bg-card p-7">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <v.icon className="size-6" />
                </span>
                <h3 className="mt-5 text-lg font-extrabold">{v.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{v.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section aria-label={s.statsEyebrow} className="py-6">
        <Container>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
            <div aria-hidden className="bg-dots absolute inset-0 opacity-60" />
            <div className="relative">
              <Suspense fallback={<StatsStripSkeleton />}>
                <StatsStrip locale={locale} t={t} />
              </Suspense>
            </div>
          </div>
        </Container>
      </section>
      <CtaBand locale={locale} t={t} className="mt-16" />
    </>
  );
}
