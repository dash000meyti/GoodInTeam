import { pixelTextWidth, toPixelText } from "./pixel-font";
import type { PixelIconName } from "./pixel-icons";

/**
 * The Good In brand family (spec §2). "Good In" never changes; the second
 * word does. Registry order is the only display order (team, studio, code):
 * every list of brands renders `brands` as is. `label` keys live in the `nav`
 * namespace, `tagline` keys in `site`. A new sub-brand is a row here (its
 * suffix must pass `isValidSuffix`) plus its i18n keys and the
 * `guide.services_brand_<id>` line. `href` is where the brand lives on the
 * site: the master brand's is /about; every sub-brand has its own landing
 * page (`/studio`, `/code`: a route folder rendering `BrandPage`).
 */
export interface BrandDef {
  id: string;
  suffix: string;
  label: "brandTeam" | "brandStudio" | "brandCode";
  tagline: "brandTeamTagline" | "brandStudioTagline" | "brandCodeTagline";
  href: string;
  icon: PixelIconName;
  master?: true;
}

export const brands = [
  {
    id: "team",
    suffix: "TEAM",
    label: "brandTeam",
    tagline: "brandTeamTagline",
    href: "/about",
    icon: "about",
    master: true,
  },
  {
    id: "studio",
    suffix: "STUDIO",
    label: "brandStudio",
    tagline: "brandStudioTagline",
    href: "/studio",
    icon: "studio",
  },
  {
    id: "code",
    suffix: "CODE",
    label: "brandCode",
    tagline: "brandCodeTagline",
    href: "/code",
    icon: "code",
  },
] as const satisfies readonly BrandDef[];

export type BrandId = (typeof brands)[number]["id"];

export const brandIds = brands.map((b) => b.id) as [BrandId, ...BrandId[]];

/** The brand of a post's `meta` (services); anything missing or invalid is the master brand. */
export const brandOf = (meta?: { brand?: unknown } | null): BrandId =>
  brandIds.includes(meta?.brand as BrandId) ? (meta!.brand as BrandId) : "team";

export const brandById = (id: BrandId) => brands.find((b) => b.id === id)!;

/** A brand with its own landing page: every brand but the master (studio, code). */
export type SubBrandId = Exclude<(typeof brands)[number], { master: true }>["id"];

/** Sub-brands in registry order; each has a landing page at its `href`. */
export const subBrandIds = brands.flatMap((b) => ("master" in b ? [] : [b.id])) as SubBrandId[];

export const isSubBrand = (id: string): id is SubBrandId =>
  (subBrandIds as readonly string[]).includes(id);

/** `site` key of each sub-brand page's intro line (typed: a new sub-brand needs one). */
export const brandIntro = {
  studio: "brandStudioIntro",
  code: "brandCodeIntro",
} as const satisfies Record<SubBrandId, string>;

/**
 * A sub-brand suffix is valid when it is already in the pixel alphabet and
 * fits the logo's second line (≤31 cells keeps the logo at 34×18; D5).
 */
export const isValidSuffix = (s: string) =>
  toPixelText(s) === s && s.length > 0 && pixelTextWidth(s) <= 31;
