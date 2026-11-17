import "server-only";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpLeftIcon, CheckIcon } from "lucide-react";
import { spotAttrs } from "@/components/shell/guide-events";
import { Window } from "@/components/shell/window";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { FrameCell, FrameGrid, FrameSection } from "../frame";
import { HeroDiagram } from "./hero-diagram";
import { AvailabilityEyebrow, AvailabilityEyebrowSkeleton } from "./sections";

/** Display h1 (spec §3.5): en 56/1.02 700 −0.035em, fa 48/1.3 800; mobile 36 / 32. */
const H1 =
  "text-[36px] leading-[1.08] font-bold text-balance md:text-[56px] md:leading-[1.02] [:lang(en)_&]:tracking-[-0.035em] [:lang(fa)_&]:text-[32px] [:lang(fa)_&]:leading-[1.35] [:lang(fa)_&]:font-extrabold md:[:lang(fa)_&]:text-[48px] md:[:lang(fa)_&]:leading-[1.3]";

function HeroTitle({ title, accent }: { title: string; accent: string }) {
  const i = title.indexOf(accent);
  if (i < 0) return <>{title}</>;
  return (
    <>
      {title.slice(0, i)}
      <span className="gt-accent">{accent}</span>
      {title.slice(i + accent.length)}
    </>
  );
}

/**
 * 01 · hero (spec §8 row 01). `first` reserves the guide's 56px roof at
 * ≥1024px. The `<h1>` is static text: neither it nor any ancestor is ever
 * opacity-, clip- or transform-animated (it is the LCP element); only the
 * lead, the CTAs and the proof list rise in, 60ms apart. The end cell is
 * `tone="dots"` (`data-decor`): the guide's greeting and the `home_hero` line
 * land there (first-box rule, §9/§10.5), over the diagram window.
 */
export function HomeHero({ locale, t }: { locale: Locale; t: Messages }) {
  const s = t.site;
  return (
    <FrameSection
      id="top"
      labelledBy="hero-title"
      first
      guide={{ key: "home_hero", say: t.guide.home_hero }}
      strip={{ index: 1, path: "GOOD-IN-TEAM/~" }}
    >
      <FrameGrid cols="hero">
        <FrameCell header pad="lg" className="flex flex-col items-start justify-center gap-6">
          <Suspense fallback={<AvailabilityEyebrowSkeleton />}>
            <AvailabilityEyebrow t={t} />
          </Suspense>
          <h1 id="hero-title" className={H1}>
            <HeroTitle title={s.heroTitle} accent={s.heroTitleAccent} />
          </h1>
          <p className="gt-rise max-w-xl text-lg leading-[1.6] text-pretty text-muted-foreground [animation-delay:60ms] [:lang(fa)_&]:leading-[1.9]">
            {s.heroSubtitle}
          </p>
          <div className="gt-rise flex flex-wrap items-center gap-3 [animation-delay:120ms]">
            <Link
              href={localePath(locale, "/contact")}
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-[15px] font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {s.heroPrimaryCta}
              <ArrowUpLeftIcon
                aria-hidden
                className="size-4 transition-transform group-hover:-translate-y-0.5 ltr:rotate-90"
              />
            </Link>
            <Link
              href={localePath(locale, "/work")}
              className="inline-flex h-12 items-center rounded-full border border-frame-line bg-card px-7 text-[15px] font-bold transition-colors hover:border-foreground/30"
            >
              {s.heroSecondaryCta}
            </Link>
          </div>
          <ul className="gt-rise flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground [animation-delay:180ms]">
            {[s.heroProof1, s.heroProof2, s.heroProof3].map((p) => (
              <li key={p} className="inline-flex items-center gap-1.5">
                <CheckIcon aria-hidden className="size-4 text-primary-ink" /> {p}
              </li>
            ))}
          </ul>
        </FrameCell>
        <FrameCell tone="dots" className="flex items-center justify-center">
          <div {...spotAttrs("diagram", t.guide.spot_diagram)} className="w-full max-w-[600px]">
            <Window path="SYSTEM.APP" elevated>
              <div className="p-3 sm:p-5">
                <HeroDiagram t={t} locale={locale} />
              </div>
            </Window>
          </div>
        </FrameCell>
      </FrameGrid>
    </FrameSection>
  );
}
