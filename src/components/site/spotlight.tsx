import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { PixelIcon } from "@/components/brand/pixel-art";
import type { PixelIconName } from "@/components/brand/pixel-icons";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";

/**
 * Spotlight `#os-spotlight` (spec §7.3): a native auto popover (Esc, light
 * dismiss, top layer). The popover itself has no role or name; the search
 * form is the named landmark. Enter submits to `/blog?q=` (a GET form, no JS).
 * SiteChrome toggles it with ⌘K/Ctrl+K and filters the quick links with the
 * Persian-aware `matchesQuery` (rows carry `data-sl-row`).
 */
export function Spotlight({ locale, t }: { locale: Locale; t: Messages }) {
  const rows: { href: string; label: string; icon: PixelIconName }[] = [
    { href: "/work", label: t.nav.work, icon: "work" },
    { href: "/services", label: t.nav.services, icon: "services" },
    { href: "/blog", label: t.nav.blog, icon: "blog" },
    { href: "/learn", label: t.nav.learn, icon: "learn" },
    { href: "/about", label: t.nav.about, icon: "about" },
    { href: "/studio", label: t.nav.brandStudio, icon: "studio" },
    { href: "/code", label: t.nav.brandCode, icon: "code" },
    { href: "/contact", label: t.nav.contact, icon: "contact" },
  ];
  return (
    <div id="os-spotlight" popover="auto" className="os-spotlight">
      <form
        role="search"
        aria-label={t.common.spotlight}
        action={localePath(locale, "/blog")}
        method="get"
        className="os-sl-form"
      >
        <SearchIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
        <input
          type="search"
          name="q"
          autoFocus
          enterKeyHint="search"
          autoComplete="off"
          aria-label={t.common.spotlight}
          aria-describedby="os-sl-hint"
          placeholder={t.common.spotlightPlaceholder}
          className="os-sl-input"
        />
      </form>
      <p id="os-sl-hint" className="os-sl-hint">
        {t.common.spotlightHint}
      </p>
      <nav aria-label={t.common.quickLinks} className="os-sl-links">
        <p className="os-menu-label">{t.common.quickLinks}</p>
        <ul>
          {rows.map((r) => (
            <li key={r.href} data-sl-row="">
              <Link href={localePath(locale, r.href)} className="os-menu-item">
                <PixelIcon name={r.icon} cell={2} />
                <span>{r.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="os-sl-empty" data-sl-empty="" hidden>
          {t.common.noMatches}
        </p>
      </nav>
    </div>
  );
}
