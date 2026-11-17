import "server-only";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpLeftIcon, CheckIcon } from "lucide-react";
import { PixelAvatar, PixelIcon } from "@/components/brand/pixel-art";
import type { PixelIconName } from "@/components/brand/pixel-icons";
import { DockTile } from "@/components/shell/dock";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { FrameCell, FrameGrid, FrameSection } from "./frame";

const PANEL_STYLE = {
  background:
    "radial-gradient(rgb(28 28 30 / 0.14) 1px, transparent 1.5px) 0 0 / 12px 12px, #ffc50d",
} as CSSProperties;

const TILES: { icon: PixelIconName; tilt: string }[] = [
  { icon: "contact", tilt: "-rotate-[8deg]" },
  { icon: "studio", tilt: "rotate-[8deg]" },
  { icon: "code", tilt: "-rotate-[8deg]" },
];

const RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#1c1c1e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#ffc50d]";

/**
 * The closing call to action (spec §8 row 10), built once and placed by every
 * page: it renders its OWN FrameSection (`id="contact-cta"`, no strip,
 * narration `guide` — `home_cta` on home, `cta` elsewhere). Never wrap it or
 * pass spacing classes. A yellow stepped-corner panel (always #FFC50D with ink
 * text, both modes); the waving avatar stands on a #F3F3F3 paper tile with a
 * 2px ink border (the always-yellow hoodie would vanish on the panel).
 */
export function CtaBand({
  locale,
  t,
  guide = "cta",
  className,
}: {
  locale: Locale;
  t: Messages;
  guide?: "home_cta" | "cta";
  className?: string;
}) {
  const s = t.site;
  return (
    <FrameSection
      id="contact-cta"
      labelledBy="contact-cta-title"
      strip={false}
      guide={{ key: guide, say: t.guide[guide] }}
      className={className}
    >
      <FrameGrid cols={1}>
        <FrameCell pad="none">
          <div
            className="px-corners m-2 grid gap-10 px-6 py-12 text-[#1c1c1e] sm:px-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16 lg:px-16"
            style={PANEL_STYLE}
          >
            <div className="flex flex-col items-start gap-5">
              <h2
                id="contact-cta-title"
                className="max-w-2xl text-[32px] leading-[1.1] font-bold text-balance md:text-[48px] md:leading-[1.05] [:lang(en)_&]:tracking-[-0.03em] [:lang(fa)_&]:leading-[1.35] [:lang(fa)_&]:font-extrabold"
              >
                {s.ctaTitle}
              </h2>
              <p className="max-w-xl text-lg leading-[1.6] text-pretty [:lang(fa)_&]:leading-[1.9]">
                {s.ctaSubtitle}
              </p>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                {[s.heroProof1, s.heroProof2, s.heroProof3].map((p) => (
                  <li key={p} className="inline-flex items-center gap-1.5">
                    <CheckIcon className="size-4" aria-hidden /> {p}
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Link
                  href={localePath(locale, "/contact")}
                  className={`inline-flex h-12 items-center gap-2 rounded-full bg-[#1c1c1e] px-7 font-bold text-[#ffc50d] transition-colors hover:bg-[#2c2c2e] ${RING}`}
                >
                  {s.ctaButton}
                  <ArrowUpLeftIcon className="size-4 ltr:rotate-90" aria-hidden />
                </Link>
                <Link
                  href={localePath(locale, "/services")}
                  className={`inline-flex h-12 items-center rounded-full border border-[#1c1c1e]/40 px-7 font-bold transition-colors hover:bg-[#1c1c1e]/10 ${RING}`}
                >
                  {s.ctaSecondary}
                </Link>
              </div>
            </div>
            <div aria-hidden className="flex flex-col items-center gap-5 justify-self-center">
              <span className="grid size-[124px] place-items-center border-2 border-[#1c1c1e] bg-[#f3f3f3]">
                <PixelAvatar pose="wave" cell={6} />
              </span>
              <span className="flex items-center gap-3">
                {TILES.map(({ icon, tilt }) => (
                  <span key={icon} className={`block size-12 ${tilt}`}>
                    <DockTile variant="paper">
                      <PixelIcon name={icon} cell={2} />
                    </DockTile>
                  </span>
                ))}
              </span>
            </div>
          </div>
        </FrameCell>
      </FrameGrid>
    </FrameSection>
  );
}
