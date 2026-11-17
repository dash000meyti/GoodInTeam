import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import { SearchIcon, SlidersHorizontalIcon } from "lucide-react";
import { PixelAvatar, PixelIcon } from "@/components/brand/pixel-art";
import { PixelLogo, PixelMark } from "@/components/brand/pixel-logo";
import { ThemeToggle } from "@/components/shell/appearance";
import { ClockSkeleton } from "@/components/shell/os-clock";
import {
  MB_ICON_CLASS,
  MB_ITEM_CLASS,
  MENU_ITEM_CLASS,
  MENU_SEP_CLASS,
  MenuBarShell,
  POPMENU_CLASS,
} from "@/components/shell/menubar-shell";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { LanguageItems } from "./header-client";
import { AvailabilitySkeleton, MenuBarAvailability, MenuBarClock } from "./menubar-studio";
import { GuideAction, GuideSwitch, SiteMenuLinks, type MenuLink } from "./site-menubar-client";

/**
 * Sections of the public site (frozen export, spec §16 rule 4): the menu
 * bar links, the dock and the language toggle all derive from this list.
 */
export const siteSections = [
  { path: "/work", key: "work" },
  { path: "/services", key: "services" },
  { path: "/blog", key: "blog" },
  { path: "/learn", key: "learn" },
  { path: "/about", key: "about" },
] as const;

/** Paths that exist in every locale (the language toggle keeps them as-is). */
export const staticSitePaths = ["/", ...siteSections.map((s) => s.path), "/contact"];

/**
 * Short glyph of each locale for the language triggers (menu bar, login
 * screen): data, not copy. Lives in a server module; client islands get it
 * as a prop (a constant imported from a "use client" file would be a client
 * reference on the server).
 */
export const LOCALE_GLYPH: Record<Locale, string> = { fa: "فا", en: "EN" };

/** Anchor name shared by the Control Center trigger and the `#os-cc` popover. */
export const CC_ANCHOR = "--mb-cc";

/** Anchor-positioning pair for a trigger and the popover right after it (§5.4). */
const anchor = (name: string) => ({
  trigger: { anchorName: name } as CSSProperties,
  popover: { "--anchor": name } as CSSProperties,
});

/**
 * Item 1: the brand menu. Its accessible name is `appName` at every width:
 * the label is always in the DOM (sr-only below lg, where the trigger shows
 * only the mark), so no aria-label. The popover follows its trigger (open
 * style via `:has(+ :popover-open)`). Static links only.
 */
function BrandMenu({ locale, t }: { locale: Locale; t: Messages }) {
  const a = anchor("--mb-brand");
  const href = (p: string) => localePath(locale, p);
  return (
    <>
      <button
        type="button"
        popoverTarget="mb-brand"
        className={cn(MB_ITEM_CLASS, "os-mb-brand")}
        style={a.trigger}
      >
        <PixelMark cell={2} />
        <span className="sr-only lg:not-sr-only">{t.common.appName}</span>
      </button>
      <div
        id="mb-brand"
        popover="auto"
        className={POPMENU_CLASS}
        data-align="start"
        data-anchor=""
        style={a.popover}
      >
        <div className="os-menu-card">
          <PixelLogo suffix="TEAM" cell={2} />
          <p>{t.common.appTagline}</p>
        </div>
        <div className={MENU_SEP_CLASS} />
        <Link href={href("/about")} className={MENU_ITEM_CLASS}>
          {t.nav.about}
        </Link>
        <div className={MENU_SEP_CLASS} />
        <Link href={href("/services#studio")} className={MENU_ITEM_CLASS}>
          <PixelIcon name="studio" cell={2} />
          {t.nav.brandStudio}
        </Link>
        <Link href={href("/services#code")} className={MENU_ITEM_CLASS}>
          <PixelIcon name="code" cell={2} />
          {t.nav.brandCode}
        </Link>
        <div className={MENU_SEP_CLASS} />
        <Link href={href("/contact")} className={MENU_ITEM_CLASS}>
          {t.nav.contact}
        </Link>
        <Link href={href("/login")} prefetch={false} className={MENU_ITEM_CLASS}>
          {t.common.signIn}
        </Link>
      </div>
    </>
  );
}

/** Item 4 (lg+): the "virtual me" extra. Rows hide #mb-guide, then dispatch `gt:guide`. */
function GuideExtra({ t }: { t: Messages }) {
  const a = anchor("--mb-guide");
  return (
    <>
      <button
        type="button"
        popoverTarget="mb-guide"
        aria-label={t.guide.toggle}
        className={cn(MB_ICON_CLASS, "hidden lg:inline-flex")}
        style={a.trigger}
      >
        <PixelAvatar part="head" cell={2} />
      </button>
      <div
        id="mb-guide"
        popover="auto"
        className={POPMENU_CLASS}
        data-align="end"
        data-anchor=""
        style={a.popover}
      >
        <p className="os-menu-label">{t.guide.name}</p>
        <GuideAction popover="mb-guide" type="explain" className={MENU_ITEM_CLASS}>
          {t.guide.explain}
        </GuideAction>
        <GuideAction popover="mb-guide" type="tour" className={MENU_ITEM_CLASS}>
          {t.guide.tour}
        </GuideAction>
        <div className={MENU_SEP_CLASS} />
        <GuideSwitch label={t.guide.show} className={MENU_ITEM_CLASS} />
      </div>
    </>
  );
}

/** Item 6: the locale glyph; rows are plain `<a hrefLang>` links (full page load). */
function LanguageMenu({ locale, t }: { locale: Locale; t: Messages }) {
  const a = anchor("--mb-lang");
  const glyph = LOCALE_GLYPH[locale];
  return (
    <>
      <button
        type="button"
        popoverTarget="mb-lang"
        aria-label={`${t.common.language} (${glyph})`}
        className={cn(MB_ITEM_CLASS, "os-mb-lang")}
        style={a.trigger}
      >
        {glyph}
      </button>
      <div
        id="mb-lang"
        popover="auto"
        className={cn(POPMENU_CLASS, "os-menu-narrow")}
        data-align="end"
        data-anchor=""
        style={a.popover}
      >
        <LanguageItems current={locale} staticPaths={staticSitePaths} />
      </div>
    </>
  );
}

/**
 * The public menu bar (spec §7.2), DOM start → end, mirrored in fa:
 * brand · section links (md+) · spacer · availability (lg+, hole A) ·
 * guide extra (lg+) · Spotlight · language · theme (md+) · Control Center ·
 * clock (lg+, hole B, outermost). Phones show brand, Spotlight, language and
 * Control Center only.
 */
export function SiteMenuBar({ locale, t }: { locale: Locale; t: Messages }) {
  const links: MenuLink[] = siteSections.map((s) => ({
    href: localePath(locale, s.path),
    section: s.path,
    label: t.nav[s.key],
  }));
  return (
    <MenuBarShell
      label={t.common.menuBar}
      start={
        <>
          <BrandMenu locale={locale} t={t} />
          <span className="hidden items-center gap-0.5 md:flex">
            <SiteMenuLinks items={links} />
          </span>
        </>
      }
      end={
        <>
          <Suspense fallback={<AvailabilitySkeleton t={t} />}>
            <MenuBarAvailability locale={locale} t={t} />
          </Suspense>
          <GuideExtra t={t} />
          <button
            type="button"
            popoverTarget="os-spotlight"
            aria-label={t.common.spotlight}
            aria-keyshortcuts="Meta+K Control+K"
            className={cn(MB_ICON_CLASS, "os-mb-spotlight")}
          >
            <SearchIcon aria-hidden className="size-[15px]" />
            <kbd aria-hidden dir="ltr" className="os-mb-kbd">
              ⌘K
            </kbd>
          </button>
          <LanguageMenu locale={locale} t={t} />
          <ThemeToggle className={cn(MB_ICON_CLASS, "hidden size-7 rounded-md md:inline-flex")} />
          <button
            type="button"
            popoverTarget="os-cc"
            aria-label={t.common.controlCenter}
            className={MB_ICON_CLASS}
            style={{ anchorName: CC_ANCHOR } as CSSProperties}
          >
            <SlidersHorizontalIcon aria-hidden className="size-[15px]" />
          </button>
          <span className="hidden lg:contents">
            <Suspense fallback={<ClockSkeleton />}>
              <MenuBarClock locale={locale} t={t} />
            </Suspense>
          </span>
        </>
      }
    />
  );
}
