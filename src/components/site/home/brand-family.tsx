import "server-only";
import { brands } from "@/components/brand/brands";
import { PixelLogo, PixelLogoSwap } from "@/components/brand/pixel-logo";
import { format } from "@/i18n/format-message";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { FrameCell, FrameFiller, FrameGrid, FrameHeaderCell, FrameSection } from "../frame";
import { packRows } from "../frame-plan";
import { ArrowLink } from "../ui";

/** Row 2 span list: one brand cell per registry entry (team, studio, code). */
const BRAND_SPANS = brands.map(() => undefined);
const BRAND_FILL = {
  md: packRows(BRAND_SPANS, 3, "md").trailing,
  lg: packRows(BRAND_SPANS, 3, "lg").trailing,
};

/**
 * 02 · the Good In brand family (spec §8 row 02). Static, no DB. Row 1: the
 * header and the big `PixelLogoSwap` (cell 4 / 6 / 8) on dots; row 2: one
 * brand cell per registry entry, in registry order. Hovering or focusing a
 * brand cell swaps the big logo's suffix with zero JS (`home.css`,
 * `.brand-family:has([data-brand=…]:is(:hover,:focus-within))`).
 */
export function BrandFamily({ locale, t }: { locale: Locale; t: Messages }) {
  const s = t.site;
  return (
    <FrameSection
      id="brands"
      labelledBy="brands-title"
      guide={{ key: "home_brands", say: t.guide.home_brands }}
      strip={{ index: 2, path: "GOOD-IN/" }}
      className="brand-family"
    >
      <FrameGrid cols={2}>
        <FrameHeaderCell
          eyebrow={s.brandsEyebrow}
          title={s.brandsTitle}
          titleId="brands-title"
          subtitle={s.brandsSubtitle}
          className="justify-center"
        />
        <FrameCell tone="dots" className="grid min-h-[200px] place-items-center md:min-h-[260px]">
          <PixelLogoSwap
            title={t.common.appName}
            cell={4}
            className="md:[--cell:6px] lg:[--cell:8px]"
          />
        </FrameCell>
      </FrameGrid>
      <FrameGrid cols={3}>
        {brands.map((b) => {
          const name = t.nav[b.label];
          return (
            <FrameCell
              key={b.id}
              hover
              spot={{ key: `brand-${b.id}`, say: s[b.tagline] }}
              data-brand={b.id}
              className="flex flex-col items-start gap-4"
            >
              <PixelLogo suffix={b.suffix} cell={3} />
              <h3 className="mt-2 text-xl leading-snug font-extrabold">{name}</h3>
              <p className="text-sm leading-6 text-muted-foreground [:lang(fa)_&]:leading-7">
                {s[b.tagline]}
              </p>
              <ArrowLink
                href={localePath(locale, b.href)}
                className="mt-auto pt-2 after:absolute after:inset-0"
              >
                {format(s.brandExplore, { brand: name })}
              </ArrowLink>
            </FrameCell>
          );
        })}
        <FrameFiller units={BRAND_FILL} />
      </FrameGrid>
    </FrameSection>
  );
}
