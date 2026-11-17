import type { CSSProperties } from "react";
import Link from "next/link";
import { XIcon } from "lucide-react";
import { PixelIcon } from "@/components/brand/pixel-art";
import type { PixelIconName } from "@/components/brand/pixel-icons";
import { PixelMark } from "@/components/brand/pixel-logo";
import { AppearanceModeToggle } from "@/components/shell/appearance";
import { DockTile, type DockVariant } from "@/components/shell/dock";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { LanguageItems } from "./header-client";
import { staticSitePaths } from "./site-menubar";
import { GuideAction, GuideSwitch, MotionSwitch } from "./site-menubar-client";

/**
 * Launchpad `#os-launchpad` (spec §7.3): the phone dock's "More", a
 * full-screen native popover. Server markup: a 3-column grid of 64px tiles
 * (Studio and Code use the brand tile, so the family shows without extra
 * logos: no logo row, pixel budget §4.2), then the settings the menu bar
 * hides on phones. Guide buttons hide the Launchpad first, then dispatch.
 */
export function Launchpad({ locale, t }: { locale: Locale; t: Messages }) {
  const apps: {
    href: string;
    label: string;
    icon: PixelIconName;
    variant?: DockVariant;
    prefetch?: false;
  }[] = [
    { href: "/blog", label: t.nav.blog, icon: "blog" },
    { href: "/learn", label: t.nav.learn, icon: "learn" },
    { href: "/about", label: t.nav.about, icon: "about" },
    { href: "/services#studio", label: t.nav.brandStudio, icon: "studio", variant: "brand" },
    { href: "/services#code", label: t.nav.brandCode, icon: "code", variant: "brand" },
    { href: "/login", label: t.common.signIn, icon: "sign-in", prefetch: false },
  ];
  const stagger = (i: number) => ({ "--i": i }) as CSSProperties;
  return (
    <div id="os-launchpad" popover="auto" className="os-launchpad">
      <div className="os-lp-inner">
        <div className="os-lp-head">
          <PixelMark cell={2} />
          <p className="os-lp-title">{t.common.appName}</p>
          <button
            type="button"
            popoverTarget="os-launchpad"
            popoverTargetAction="hide"
            aria-label={t.common.close}
            className="os-mb-item os-mb-icon ms-auto"
          >
            <XIcon aria-hidden className="size-5" />
          </button>
        </div>
        <nav aria-label={t.common.launchpad}>
          <ul className="os-lp-grid">
            {apps.map((a, i) => (
              <li key={a.href} className="gt-menu-item" style={stagger(i)}>
                <Link href={localePath(locale, a.href)} prefetch={a.prefetch} className="os-lp-app">
                  <DockTile variant={a.variant}>
                    <PixelIcon name={a.icon} cell={3} />
                  </DockTile>
                  <span>{a.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="os-lp-settings gt-menu-item" style={stagger(apps.length)}>
          <div className="os-cc-tile">
            <p className="os-cc-title">{t.common.language}</p>
            <div className="flex flex-wrap gap-1.5">
              <LanguageItems current={locale} staticPaths={staticSitePaths} variant="chip" />
            </div>
          </div>
          <div className="os-cc-tile">
            <p className="os-cc-title">{t.common.appearance}</p>
            <AppearanceModeToggle />
          </div>
          <div className="os-cc-tile">
            <GuideSwitch label={<span className="os-cc-title">{t.guide.toggle}</span>} />
            <div className="grid grid-cols-2 gap-1.5">
              <GuideAction popover="os-launchpad" type="explain" className="os-cc-btn">
                {t.guide.explain}
              </GuideAction>
              <GuideAction popover="os-launchpad" type="tour" className="os-cc-btn">
                {t.guide.tour}
              </GuideAction>
            </div>
          </div>
          <div className="os-cc-tile">
            <MotionSwitch label={<span className="os-cc-title">{t.common.reduceMotion}</span>} />
          </div>
        </div>
      </div>
    </div>
  );
}
