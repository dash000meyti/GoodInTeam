"use client";

import type { ReactNode } from "react";
import { MenuIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { AppearanceMenu } from "@/components/shared/theme-controls";
import { useT } from "@/i18n/client";
import { usePanelUI } from "./panel-ui";

/** Top bar. `slot` receives session-dependent widgets (timers, user menu…). */
export function PanelHeader({ slot }: { slot?: ReactNode }) {
  const { setMobileOpen, setPaletteOpen } = usePanelUI();
  const t = useT();
  return (
    <header className="glass sticky top-0 z-40 flex h-16 items-center gap-2 px-4 sm:px-6 lg:h-[72px] lg:px-10">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label={t.common.toggleMenu}
      >
        <MenuIcon className="size-5" />
      </Button>
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-muted/70 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted sm:min-w-56"
      >
        <SearchIcon className="size-4" />
        <span className="hidden sm:inline">{t.common.searchPlaceholder}</span>
        <Kbd className="ms-auto hidden sm:inline-flex" dir="ltr">
          ⌘K
        </Kbd>
      </button>
      <div className="ms-auto flex items-center gap-1">
        <LocaleSwitcher />
        <AppearanceMenu />
        {slot}
      </div>
    </header>
  );
}
