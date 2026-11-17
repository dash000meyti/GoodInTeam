import { PixelIcon } from "@/components/brand/pixel-art";
import { PixelMark } from "@/components/brand/pixel-logo";
import { Dock, DockTile, type DockEntry } from "@/components/shell/dock";
import { DockLinks } from "@/components/shell/dock-links";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";

/**
 * The public dock (spec §7.4): a magnifying macOS dock at ≥768px and a
 * five-item tab bar below (Home, Work, Services, Contact, More). Labels are
 * visible text and the accessible names (no aria-label). Icons: the Home mark
 * is 22px in the 28px tab-bar tile and 33px in the 48px dock tile; every
 * PixelIcon is cell 2 (24px). Reading pages (`[data-reading]`) get the 40px
 * dock through CSS.
 */
export function SiteDock({ locale, t }: { locale: Locale; t: Messages }) {
  const href = (p: string) => localePath(locale, p);
  const icon = (name: Parameters<typeof PixelIcon>[0]["name"]) => (
    <PixelIcon name={name} cell={2} />
  );
  const entries: DockEntry[] = [
    {
      kind: "link",
      key: "home",
      href: href("/"),
      section: "/",
      label: t.nav.home,
      variant: "mark",
      icon: <PixelMark cell={2} className="md:[--cell:3px]" />,
    },
    {
      kind: "link",
      key: "work",
      href: href("/work"),
      section: "/work",
      label: t.nav.work,
      icon: icon("work"),
    },
    {
      kind: "link",
      key: "services",
      href: href("/services"),
      section: "/services",
      label: t.nav.services,
      icon: icon("services"),
    },
    {
      kind: "link",
      key: "blog",
      href: href("/blog"),
      section: "/blog",
      label: t.nav.blog,
      icon: icon("blog"),
      show: "desktop",
    },
    {
      kind: "link",
      key: "learn",
      href: href("/learn"),
      section: "/learn",
      label: t.nav.learn,
      icon: icon("learn"),
      show: "desktop",
    },
    {
      kind: "link",
      key: "about",
      href: href("/about"),
      section: "/about",
      label: t.nav.about,
      icon: icon("about"),
      show: "desktop",
    },
    { kind: "sep", key: "sep-brands", show: "desktop" },
    {
      kind: "link",
      key: "studio",
      href: href("/services#studio"),
      label: t.nav.brandStudio,
      variant: "brand",
      icon: icon("studio"),
      show: "desktop",
    },
    {
      kind: "link",
      key: "code",
      href: href("/services#code"),
      label: t.nav.brandCode,
      variant: "brand",
      icon: icon("code"),
      show: "desktop",
    },
    { kind: "sep", key: "sep-contact", show: "desktop" },
    {
      kind: "link",
      key: "contact",
      href: href("/contact"),
      section: "/contact",
      label: t.nav.contact,
      variant: "accent",
      icon: icon("contact"),
    },
    {
      kind: "link",
      key: "sign-in",
      href: href("/login"),
      label: t.common.signIn,
      icon: icon("sign-in"),
      prefetch: false,
      show: "desktop",
    },
    {
      kind: "slot",
      key: "more",
      show: "mobile",
      node: (
        <button type="button" popoverTarget="os-launchpad" className="os-dock-item">
          <DockTile>{icon("more")}</DockTile>
          <span className="os-dock-label">{t.common.more}</span>
        </button>
      ),
    },
  ];
  return (
    <Dock label={t.common.dock} tabbar="md" magnify>
      <DockLinks entries={entries} />
    </Dock>
  );
}
