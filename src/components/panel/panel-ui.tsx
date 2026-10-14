"use client";

import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";

interface PanelUI {
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

const Ctx = createContext<PanelUI | null>(null);
const KEY = "gt-sidebar-collapsed";

/** Client-side UI state for the panel chrome (sidebar mode, mobile drawer, ⌘K). */
export function PanelUIProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate persisted preference
      setCollapsed(localStorage.getItem(KEY) === "1");
    } catch {}
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  }, []);

  return (
    <Ctx
      value={{ collapsed, toggleCollapsed, mobileOpen, setMobileOpen, paletteOpen, setPaletteOpen }}
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
