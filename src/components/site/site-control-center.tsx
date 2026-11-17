import type { CSSProperties } from "react";
import { AppearanceModeToggle } from "@/components/shell/appearance";
import { POPMENU_CLASS } from "@/components/shell/menubar-shell";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { LanguageItems } from "./header-client";
import { CC_ANCHOR, staticSitePaths } from "./site-menubar";
import { GuideAction, GuideSwitch, MotionSwitch } from "./site-menubar-client";

/**
 * Control Center `#os-cc` (spec §7.3): a native auto popover under the menu
 * bar's end, as tiles. Server markup; only the switches, the guide buttons and
 * the language chips are client islands. Below lg this tile and the Launchpad
 * are where a visitor asks the guide for an explanation (A31). No colour
 * presets on the site.
 */
export function SiteControlCenter({ locale, t }: { locale: Locale; t: Messages }) {
  return (
    <div
      id="os-cc"
      popover="auto"
      className={cn(POPMENU_CLASS, "os-cc")}
      data-align="end"
      data-anchor=""
      style={{ "--anchor": CC_ANCHOR } as CSSProperties}
    >
      <div className="os-cc-tile col-span-2">
        <p className="os-cc-title">{t.common.appearance}</p>
        <AppearanceModeToggle />
      </div>
      <div className="os-cc-tile col-span-2">
        <GuideSwitch label={<span className="os-cc-title">{t.guide.toggle}</span>} />
        <div className="grid grid-cols-2 gap-1.5">
          <GuideAction popover="os-cc" type="explain" className="os-cc-btn">
            {t.guide.explain}
          </GuideAction>
          <GuideAction popover="os-cc" type="tour" className="os-cc-btn">
            {t.guide.tour}
          </GuideAction>
        </div>
      </div>
      <div className="os-cc-tile">
        <MotionSwitch label={<span className="os-cc-title">{t.common.reduceMotion}</span>} />
      </div>
      <div className="os-cc-tile">
        <p className="os-cc-title">{t.common.language}</p>
        <div className="flex flex-wrap gap-1.5">
          <LanguageItems current={locale} staticPaths={staticSitePaths} variant="chip" />
        </div>
      </div>
    </div>
  );
}
