"use client";

import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { isCommandPaletteShortcut, readSidebarCookie, sidebarCookie } from "./panel-prefs";

interface PanelUI {
  /** Collapsed desktop sidebar (false until read on the client — see `collapsedPref`). */
  collapsed: boolean;
  /**
   * The stored preference, `null` during SSR/hydration. The sidebar renders from the
   * cookie value read on the server until this is known, so the first paint is right.
   */
  collapsedPref: boolean | null;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

const Ctx = createContext<PanelUI | null>(null);
/** Pre-cookie storage key; migrated to the cookie on first load. */
const LEGACY_KEY = "gt-sidebar-collapsed";

function persist(collapsed: boolean) {
  try {
    document.cookie = sidebarCookie(collapsed);
    document.documentElement.toggleAttribute("data-sidebar-collapsed", collapsed);
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}

/** Client-side UI state for the panel chrome (sidebar mode, mobile drawer, ⌘K). */
export function PanelUIProvider({ children }: { children: ReactNode }) {
  const [collapsedPref, setPref] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    let stored = readSidebarCookie(document.cookie);
    if (stored === null) {
      try {
        if (localStorage.getItem(LEGACY_KEY) === "1") {
          stored = true;
          persist(true);
        }
      } catch {}
    }
    // Soft navigations into the panel skip the inline init script: keep the skeleton in sync.
    document.documentElement.toggleAttribute("data-sidebar-collapsed", stored === true);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate persisted preference
    setPref((p) => p ?? stored ?? false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isCommandPaletteShortcut(e)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setCollapsed = useCallback((next: boolean) => {
    persist(next);
    setPref(next);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setPref((c) => {
      const next = !c;
      persist(next);
      return next;
    });
  }, []);

  return (
    <Ctx
      value={{
        collapsed: collapsedPref ?? false,
        collapsedPref,
        setCollapsed,
        toggleCollapsed,
        mobileOpen,
        setMobileOpen,
        paletteOpen,
        setPaletteOpen,
      }}
    >
      {children}
    </Ctx>
  );
}

export function usePanelUI() {
  const v = use(Ctx);
  if (!v) throw new Error("usePanelUI must be used inside <PanelUIProvider>");
  return v;
}
