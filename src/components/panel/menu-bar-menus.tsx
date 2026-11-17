"use client";

import { Fragment, Suspense, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowUpRightIcon,
  CommandIcon,
  GlobeIcon,
  InfoIcon,
  LanguagesIcon,
  LogOutIcon,
  Maximize2Icon,
  MonitorIcon,
  MoonIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
  SunMoonIcon,
  XIcon,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { dispatchGuide } from "@/components/shell/guide-events";
import { localeGlyph } from "@/components/shared/locale-switcher";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { localeMeta, localePath, locales, stripLocale, type Locale } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import { useI18n, useLocale, useT } from "@/i18n/client";
import { isActivePath } from "@/components/shell/match";
import type { UserRole } from "@/server/db/schema/auth";
import { logout } from "@/server/modules/auth/actions";
import { matchNav, navForRole, type NavGroup } from "./nav-config";
import { usePanelUI } from "./panel-ui";
import { defaultShell } from "./panel-prefs";

const noop = () => () => {};
/** false on the server and during hydration, true after mount. */
const useMounted = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

/**
 * The menus of the panel menu bar (spec §11.2): ONE Radix Menubar root holding
 * the role-neutral Brand menu, the App menu (current module) and — through the
 * `children` slot streamed by `SessionMenus` — the role-filtered navigation
 * menus, so roving focus (arrows, mirrored in RTL) spans every menu.
 */
export function PanelMenus({ children }: { children?: ReactNode }) {
  const { dir } = useI18n();
  return (
    <Menubar dir={dir} loop className="pm-menus">
      <BrandMenu />
      <AppMenu />
      {children}
    </Menubar>
  );
}

/** The current path without the locale prefix (inside <Suspense>: URL data). */
function usePanelPath() {
  return stripLocale(usePathname()).path;
}

function LangItems({ path, current }: { path: string; current: Locale }) {
  return locales.map((l) => (
    <MenubarItem key={l} asChild>
      {/* Plain <a>: a locale switch is a full page load (<html lang/dir>, fonts). */}
      <a
        href={localePath(l, path)}
        hrefLang={l}
        lang={l}
        aria-current={l === current ? "true" : undefined}
      >
        <span className="w-5 text-center text-xs font-bold opacity-70" aria-hidden>
          {localeGlyph[l]}
        </span>
        {localeMeta[l].label}
      </a>
    </MenubarItem>
  ));
}

function PathLangItems({ current }: { current: Locale }) {
  return <LangItems path={usePanelPath()} current={current} />;
}

/** Brand menu: static shell, outside the session holes, so every row is role-neutral. */
function BrandMenu() {
  const t = useT();
  const locale = useLocale();
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();
  return (
    <MenubarMenu value="brand">
      <MenubarTrigger className="pm-brand" aria-label={t.nav.brandMenu}>
        <LogoMark cell={2} />
      </MenubarTrigger>
      <MenubarContent>
        <MenubarItem asChild>
          <Link href={localePath(locale, "/panel")}>
            <MonitorIcon aria-hidden />
            {t.panel.desktop}
          </Link>
        </MenubarItem>
        <MenubarItem asChild>
          <a href={localePath(locale, "/")} target="_blank" rel="noopener">
            <GlobeIcon aria-hidden />
            {t.panel.viewSite}
            <span className="sr-only"> {t.common.opensNewTab}</span>
            <ArrowUpRightIcon className="ms-auto opacity-70 rtl:-scale-x-100" aria-hidden />
          </a>
        </MenubarItem>
        <MenubarItem asChild>
          <Link href={localePath(locale, "/panel/settings")}>
            <SettingsIcon aria-hidden />
            {t.common.settings}
          </Link>
        </MenubarItem>
        <MenubarSub>
          <MenubarSubTrigger>
            <SunMoonIcon aria-hidden />
            {t.common.appearance}
          </MenubarSubTrigger>
          <MenubarSubContent>
            <MenubarRadioGroup value={mounted ? theme : undefined} onValueChange={setTheme}>
              <MenubarRadioItem value="light">
                <SunIcon aria-hidden />
                {t.common.light}
              </MenubarRadioItem>
              <MenubarRadioItem value="dark">
                <MoonIcon aria-hidden />
                {t.common.dark}
              </MenubarRadioItem>
              <MenubarRadioItem value="system">
                <MonitorIcon aria-hidden />
                {t.common.system}
              </MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarSubContent>
        </MenubarSub>
        <MenubarSub>
          <MenubarSubTrigger>
            <LanguagesIcon aria-hidden />
            {t.common.language}
          </MenubarSubTrigger>
          <MenubarSubContent>
            <Suspense fallback={<LangItems path="/panel" current={locale} />}>
              <PathLangItems current={locale} />
            </Suspense>
          </MenubarSubContent>
        </MenubarSub>
        <MenubarSeparator />
        <MenubarItem variant="destructive" onSelect={() => void logout()}>
          <LogOutIcon aria-hidden />
          {t.common.signOut}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  );
}

/**
 * Bold app name: the module of the current path (longest prefix); `/panel` →
 * "Desktop" (like the window title), so the bar never repeats the brand name
 * next to the character.
 */
function CurrentAppName() {
  const t = useT();
  const item = matchNav(usePanelPath());
  return <>{item ? t.nav[item.label] : t.panel.desktop}</>;
}

function AppMenu() {
  const t = useT();
  return (
    <MenubarMenu value="app">
      <MenubarTrigger className="pm-app" data-pm-app="">
        <span className="truncate">
          <Suspense fallback={t.panel.desktop}>
            <CurrentAppName />
          </Suspense>
        </span>
      </MenubarTrigger>
      <MenubarContent>
        <Suspense fallback={null}>
          <AppMenuItems />
        </Suspense>
      </MenubarContent>
    </MenubarMenu>
  );
}

function AppMenuItems() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const path = usePanelPath();
  const { shell, setShell, setPaletteOpen } = usePanelUI();
  const item = matchNav(path);
  const name = item ? t.nav[item.label] : t.panel.desktop;
  const wide = (shell ?? defaultShell).wide;
  const atDesktop = path === "/panel" || path === "/panel/";
  return (
    <>
      <MenubarItem onSelect={() => dispatchGuide("explain")}>
        <InfoIcon aria-hidden />
        {format(t.panel.aboutModule, { module: name })}
      </MenubarItem>
      <MenubarCheckboxItem checked={wide} onCheckedChange={(v) => setShell({ wide: v === true })}>
        {t.panel.zoomWindow}
        <Maximize2Icon className="ms-auto opacity-70" aria-hidden />
      </MenubarCheckboxItem>
      <MenubarItem disabled={atDesktop} onSelect={() => router.push(localePath(locale, "/panel"))}>
        <XIcon aria-hidden />
        {t.panel.closeWindow}
      </MenubarItem>
      <MenubarSeparator />
      <MenubarItem onSelect={() => setPaletteOpen(true)}>
        <CommandIcon aria-hidden />
        {t.common.commandPalette}
        <MenubarShortcut>⌘K</MenubarShortcut>
      </MenubarItem>
    </>
  );
}

type NavLayout = "none" | "goto" | "groups";
const WIDE = "(width >= 80rem)";
const DESKTOP = "(width >= 64rem)";
function subscribeLayout(onChange: () => void) {
  const a = matchMedia(WIDE);
  const b = matchMedia(DESKTOP);
  a.addEventListener("change", onChange);
  b.addEventListener("change", onChange);
  return () => {
    a.removeEventListener("change", onChange);
    b.removeEventListener("change", onChange);
  };
}
const readLayout = (): NavLayout =>
  matchMedia(WIDE).matches ? "groups" : matchMedia(DESKTOP).matches ? "goto" : "none";

/**
 * Navigation menus (rendered by `SessionMenus` inside the same Menubar root):
 * one `nav.goTo` menu at 1024–1279px, one menu per `navForRole` group (except
 * groupOverview, which is the Brand menu's Desktop row) at ≥1280px. The server
 * HTML holds both and CSS shows the right one; after hydration only the
 * matching variant stays mounted, so keyboard navigation never lands on a
 * hidden menu.
 */
export function NavMenus({ role }: { role: UserRole }) {
  const t = useT();
  const layout = useSyncExternalStore<NavLayout | null>(subscribeLayout, readLayout, () => null);
  const groups = navForRole(role).filter((g) => g.label !== "groupOverview");
  return (
    <>
      {(layout === null || layout === "goto") && (
        <MenubarMenu value="goto">
          <MenubarTrigger className="pm-nav-goto">{t.nav.goTo}</MenubarTrigger>
          <MenubarContent className="min-w-56">
            <Suspense fallback={null}>
              {groups.map((g, i) => (
                <Fragment key={g.label}>
                  {i > 0 && <MenubarSeparator />}
                  <MenubarGroup aria-label={t.nav[g.label]}>
                    <MenubarLabel aria-hidden>{t.nav[g.label]}</MenubarLabel>
                    <NavItems group={g} />
                  </MenubarGroup>
                </Fragment>
              ))}
            </Suspense>
          </MenubarContent>
        </MenubarMenu>
      )}
      {(layout === null || layout === "groups") &&
        groups.map((g) => (
          <MenubarMenu key={g.label} value={g.label}>
            <MenubarTrigger className="pm-nav-group">{t.nav[g.label]}</MenubarTrigger>
            <MenubarContent>
              <Suspense fallback={null}>
                <NavItems group={g} />
              </Suspense>
            </MenubarContent>
          </MenubarMenu>
        ))}
    </>
  );
}

function NavItems({ group }: { group: NavGroup }) {
  const t = useT();
  const locale = useLocale();
  const path = usePanelPath();
  return group.items.map((item) => {
    const Icon = item.icon;
    const active = isActivePath(path, item.href, item.exact);
    return (
      <MenubarItem key={item.href + item.label} asChild>
        <Link href={localePath(locale, item.href)} aria-current={active ? "page" : undefined}>
          <Icon aria-hidden />
          {t.nav[item.label]}
          {active && <span className="pm-current-dot" aria-hidden />}
        </Link>
      </MenubarItem>
    );
  });
}

/**
 * Spotlight: the ⌘K palette button. 28px icon below 1280px, a 200px pill with
 * the placeholder and ⌘K above (panel-shell.css). The name stays "Search"
 * (contained in the visible "Search…", WCAG 2.5.3).
 */
export function Spotlight() {
  const t = useT();
  const { setPaletteOpen } = usePanelUI();
  return (
    <button
      type="button"
      onClick={() => setPaletteOpen(true)}
      aria-label={t.common.search}
      aria-haspopup="dialog"
      aria-keyshortcuts="Meta+K Control+K"
      className="os-mb-item pm-spotlight"
    >
      <SearchIcon className="size-4 shrink-0" aria-hidden />
      <span className="pm-spotlight-text" aria-hidden>
        {t.common.searchPlaceholder}
      </span>
      <kbd className="pm-spotlight-kbd" dir="ltr" aria-hidden>
        ⌘K
      </kbd>
    </button>
  );
}
