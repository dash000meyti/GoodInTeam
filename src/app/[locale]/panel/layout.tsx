import { Suspense } from "react";
import type { Metadata } from "next";
import { PanelHeader } from "@/components/panel/header";
import { PanelUIProvider } from "@/components/panel/panel-ui";
import {
  HeaderSlotSkeleton,
  SessionHeaderSlot,
  SessionSidebar,
} from "@/components/panel/session-chrome";
import { SidebarSkeleton } from "@/components/panel/sidebar";
import { I18nProvider } from "@/i18n/client";
import { getLocale, getMessages } from "@/i18n/server";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Panel shell. The frame (header, layout) is static and prerendered; anything
 * that needs the session streams in behind <Suspense>. Pages render inside
 * panel/loading.tsx's boundary, so they may read the session at the top.
 */
export default async function PanelLayout({ children }: LayoutProps<"/[locale]/panel">) {
  const locale = await getLocale();
  return (
    <I18nProvider locale={locale} messages={getMessages(locale)}>
      <PanelUIProvider>
        <div className="flex min-h-dvh bg-background">
          <Suspense fallback={<SidebarSkeleton />}>
            <SessionSidebar />
          </Suspense>
          <div className="flex min-w-0 flex-1 flex-col">
            <PanelHeader
              slot={
                <Suspense fallback={<HeaderSlotSkeleton />}>
                  <SessionHeaderSlot />
                </Suspense>
              }
            />
            <main
              id="main"
              className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-4 pb-20 sm:px-6 lg:px-10"
            >
              {children}
            </main>
          </div>
        </div>
      </PanelUIProvider>
    </I18nProvider>
  );
}
