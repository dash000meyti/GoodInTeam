import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { EyeIcon, GaugeIcon, GraduationCapIcon, MapPinIcon, ShieldCheckIcon } from "lucide-react";
import { PixelAvatar } from "@/components/brand/pixel-art";
import { Window } from "@/components/shell/window";
import { Skeleton } from "@/components/ui/skeleton";
import { SetAlternates } from "@/components/site/alternates";
import { CtaBand } from "@/components/site/cta-band";
import { FrameCell, FrameGrid, FrameSection } from "@/components/site/frame";
import { StatsCells, StatsCellsSkeleton } from "@/components/site/stats-cells";
import { ids, JsonLd } from "@/components/site/json-ld";
import { Breadcrumbs } from "@/components/site/nav-bits";
import { homeCrumb } from "@/components/site/page-utils";
import { absoluteUrl, pageMetadata, postAlternates } from "@/components/site/seo";
import { SocialLinks } from "@/components/site/social-links";
import { HEADING_CLASS, teamPath, TitleRow } from "@/components/site/ui";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getLocale, getMessages } from "@/i18n/server";
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

/** The intro grid: rows `auto` (the portrait window) then `1fr` (the sticky profile card). */
const INTRO_GRID = "lg:grid-rows-[auto_minmax(0,1fr)]";

/**
 * The intro box body (spec §9 first-box rule): a FrameGrid 2-1 whose text
 * cell (h1, bio, page body; `header`) spans two rows at inline-start; at
 * inline-end the ABOUT.APP window with only the portrait (a decor cell), and
 * below it the profile card, sticky below the chrome.
 */
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
  const s = t.site;
  return (
    <>
      {translations.length > 0 && <SetAlternates value={postAlternates(translations)} />}
      <JsonLd
        data={{
          "@type": ["AboutPage", "ProfilePage"],
          url: absoluteUrl(localePath(locale, "/about")),
          name: page?.title ?? s.aboutTitle,
          inLanguage: locale === "fa" ? "fa-IR" : "en-US",
          mainEntity: { "@id": name ? ids.person() : ids.organization() },
          about: { "@id": ids.organization() },
          dateModified: page?.updatedAt.toISOString(),
        }}
      />
      <FrameGrid cols="2-1" className={INTRO_GRID}>
        <FrameCell header span="row2" pad="lg" className="flex flex-col items-start gap-6">
          <Breadcrumbs
            items={[homeCrumb(locale), { name: s.aboutTitle, path: localePath(locale, "/about") }]}
          />
          <h1 id="top-title" className={HEADING_CLASS.h1}>
            {page?.title ?? s.aboutTitle}
          </h1>
          {(profile.bio[locale] || page?.excerpt) && (
            <p className="max-w-2xl text-xl leading-[1.6] text-pretty text-muted-foreground [:lang(fa)_&]:leading-[1.9]">
              {profile.bio[locale] || page?.excerpt}
            </p>
          )}
          {rendered && (
            <div
              className="prose-gt max-w-[70ch] pt-2"
              dangerouslySetInnerHTML={{ __html: rendered.html }}
            />
          )}
        </FrameCell>
        <FrameCell tone="dots" className="flex items-center justify-center">
          <Window path="ABOUT.APP" className="w-full max-w-[320px]">
            <div className="grid place-items-center bg-[radial-gradient(var(--dots)_1px,transparent_1.5px)] [background-size:12px_12px] p-6">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatar, any origin
                <img
                  src={profile.avatarUrl}
                  alt={name || brand}
                  className="size-40 rounded-[10px] object-cover"
                />
              ) : (
                <span className="grid size-40 place-items-center border-2 border-[#1c1c1e] bg-[#f3f3f3]">
                  <PixelAvatar pose="idle" cell={8} />
                </span>
              )}
            </div>
          </Window>
        </FrameCell>
        <FrameCell tone="card" as="aside">
          <div className="space-y-5 lg:sticky lg:below-chrome">
            <div className="min-w-0">
              <p className="text-xl font-black">{name || brand}</p>
              {profile.headline[locale] && (
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {profile.headline[locale]}
                </p>
              )}
            </div>
            {profile.location[locale] && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPinIcon className="size-4" aria-hidden /> {s.basedIn} {profile.location[locale]}
              </p>
            )}
            <div className="border-t border-dashed border-frame-line pt-5">
              <p className="mb-3 text-xs font-bold text-muted-foreground">{s.findUs}</p>
              <SocialLinks socials={profile.socials} email={profile.email} />
            </div>
          </div>
        </FrameCell>
      </FrameGrid>
    </>
  );
}

/** Same grid and cells while the profile streams. */
function AboutIntroSkeleton() {
  return (
    <FrameGrid cols="2-1" className={INTRO_GRID}>
      <FrameCell header span="row2" pad="lg" className="flex flex-col gap-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-14 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </FrameCell>
      <FrameCell tone="dots" className="flex items-center justify-center">
        <Window path="ABOUT.APP" className="w-full max-w-[320px]">
          <div className="grid place-items-center p-6">
            <Skeleton className="size-40 rounded-[10px]" />
          </div>
        </Window>
      </FrameCell>
      <FrameCell tone="card">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-3 h-4 w-56" />
        <Skeleton className="mt-6 h-9 w-48" />
      </FrameCell>
    </FrameGrid>
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
      <FrameSection
        id="top"
        first
        labelledBy="top-title"
        guide={{ key: "about", say: t.guide.about }}
        strip={{ index: 1, path: teamPath("ABOUT") }}
      >
        <Suspense fallback={<AboutIntroSkeleton />}>
          <AboutIntro locale={locale} t={t} />
        </Suspense>
      </FrameSection>

      <FrameSection
        id="values"
        labelledBy="values-title"
        guide={{ key: "about_values", say: t.guide.about_values }}
        strip={{ index: 2, path: teamPath("ABOUT", "VALUES") }}
      >
        <TitleRow title={s.valuesTitle} titleId="values-title" />
        <FrameGrid cols={4} className="grid-cols-1 md:grid-cols-2">
          {values.map((v, i) => (
            <FrameCell key={v.title} tone={i % 2 ? "card" : "default"}>
              <span className="flex size-11 items-center justify-center rounded-[8px] border border-frame-line bg-card shadow-[-3px_-3px_0_0_var(--brand-frame)] rtl:shadow-[3px_-3px_0_0_var(--brand-frame)]">
                <v.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-extrabold">{v.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{v.body}</p>
            </FrameCell>
          ))}
        </FrameGrid>
      </FrameSection>

      <FrameSection
        id="stats"
        ariaLabel={s.statsEyebrow}
        guide={{ key: "about_stats", say: t.guide.about_stats }}
        strip={{ index: 3, path: teamPath("ABOUT", "STATS") }}
      >
        <Suspense fallback={<StatsCellsSkeleton />}>
          <StatsCells locale={locale} t={t} />
        </Suspense>
      </FrameSection>
      <CtaBand locale={locale} t={t} />
    </>
  );
}
