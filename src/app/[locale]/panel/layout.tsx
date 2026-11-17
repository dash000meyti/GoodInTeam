import { Suspense } from "react";
import type { Metadata } from "next";
import { ClockSkeleton } from "@/components/shell/os-clock";
import { PanelMenuBar } from "@/components/panel/menu-bar";
import { shellInitScript } from "@/components/panel/panel-prefs";
import { PanelUIProvider } from "@/components/panel/panel-ui";
import {
  AvatarSkeleton,
  SessionAvatar,
  SessionClock,
  SessionDock,
  SessionMenus,
  SessionStatus,
  StatusSkeleton,
} from "@/components/panel/session-chrome";
import { WindowTitleBar, WindowTitleFallback } from "@/components/panel/window-title";
import { InlineScript } from "@/components/shared/inline-script";
import { InteractiveProviders } from "@/components/shared/interactive-providers";
import { I18nProvider } from "@/i18n/client";
import { getLocale, getMessages } from "@/i18n/server";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Panel OS shell (spec §11.1): dotted desktop, menu bar, one window around the
 * page and the role dock. The frame is static and prerendered; everything that
 * needs the session streams into its own <Suspense> hole with a fixed-size
 * fallback. Pages render inside panel/loading.tsx's boundary (in the window
 * body), so they may read the session at the top.
 */
export default async function PanelLayout({ children }: LayoutProps<"/[locale]/panel">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <I18nProvider locale={locale} messages={t}>
      {/* Before paint: gt-shell cookie → <html data-dock-size|data-dock-autohide|data-window-wide>. */}
      <InlineScript html={shellInitScript} />
      <InteractiveProviders>
        <PanelUIProvider>
          <div className="panel-shell">
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:shadow-dropdown"
            >
              {t.common.skipToContent}
            </a>
            <PanelMenuBar
              menus={
                <Suspense fallback={null}>
                  <SessionMenus />
                </Suspense>
              }
              status={
                <Suspense fallback={<StatusSkeleton />}>
                  <SessionStatus />
                </Suspense>
              }
              avatar={
                <Suspense fallback={<AvatarSkeleton />}>
                  <SessionAvatar />
                </Suspense>
              }
              clock={
                <Suspense fallback={<ClockSkeleton />}>
                  <SessionClock />
                </Suspense>
              }
            />
            <div className="os-window">
              <Suspense fallback={<WindowTitleFallback />}>
                <WindowTitleBar />
              </Suspense>
              <main id="main" className="os-window-body">
                {children}
              </main>
            </div>
            <Suspense fallback={null}>
              <SessionDock />
            </Suspense>
          </div>
        </PanelUIProvider>
      </InteractiveProviders>
    </I18nProvider>
  );
}
