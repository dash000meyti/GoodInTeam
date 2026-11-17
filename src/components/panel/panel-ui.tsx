"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  defaultShell,
  expireLegacySidebarCookie,
  isCommandPaletteShortcut,
  LEGACY_SIDEBAR_COOKIE,
  readShellCookie,
  shellCookie,
  SHELL_COOKIE,
  type ShellPrefs,
} from "./panel-prefs";

interface PanelUI {
  /**
   * The desktop & dock preferences from the `gt-shell` cookie; `null` during SSR and
   * hydration (server components read the cookie themselves and pass it down, so
   * consumers use `shell ?? serverPrefs ?? defaultShell`).
   */
  shell: ShellPrefs | null;
  /** Merge, persist (cookie) and apply (`<html data-dock-*>`) new preferences. */
  setShell: (partial: Partial<ShellPrefs>) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  launchpadOpen: boolean;
  setLaunchpadOpen: (open: boolean) => void;
}

const Ctx = createContext<PanelUI | null>(null);

/** Same-tab change notification for the cookie-backed store. */
const SHELL_EVENT = "gt:shell";

let cached: { key: string; prefs: ShellPrefs | null } = { key: "", prefs: null };
function readShell(): ShellPrefs | null {
  const m = new RegExp(`(?:^|;\\s*)${SHELL_COOKIE}=[^;]*`).exec(document.cookie);
  const key = m?.[0] ?? "";
  if (key !== cached.key) cached = { key, prefs: readShellCookie(key) };
  return cached.prefs;
}
function subscribeShell(onChange: () => void) {
  window.addEventListener(SHELL_EVENT, onChange);
  return () => window.removeEventListener(SHELL_EVENT, onChange);
}

/** Mirrors the pre-paint `shellInitScript`: html attributes for size, auto-hide, wide. */
function applyShellAttrs(p: ShellPrefs | null) {
  const h = document.documentElement;
  if (!p) {
    h.removeAttribute("data-dock-size");
    h.removeAttribute("data-dock-autohide");
    h.removeAttribute("data-window-wide");
    return;
  }
  h.setAttribute("data-dock-size", String(p.dock));
  h.toggleAttribute("data-dock-autohide", p.autohide);
  h.toggleAttribute("data-window-wide", p.wide);
}

/** Client-side UI state for the panel OS shell (desktop prefs, ⌘K palette, Launchpad). */
export function PanelUIProvider({ children }: { children: ReactNode }) {
  const shell = useSyncExternalStore(subscribeShell, readShell, () => null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [launchpadOpen, setLaunchpadOpen] = useState(false);

  // The init script is inert on soft navigation (login → panel): re-apply before paint.
  useLayoutEffect(() => {
    applyShellAttrs(readShell());
  }, []);

  // The sidebar is gone: expire its cookie and the older localStorage key once.
  useEffect(() => {
    try {
      if (document.cookie.includes(`${LEGACY_SIDEBAR_COOKIE}=`))
        document.cookie = expireLegacySidebarCookie;
      localStorage.removeItem(LEGACY_SIDEBAR_COOKIE);
    } catch {}
  }, []);

  // ⌘K / Ctrl+K from anywhere (mounted in the static shell, before the session streams in).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !isCommandPaletteShortcut(e)) return;
      e.preventDefault();
      setLaunchpadOpen(false);
      setPaletteOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setShell = useCallback((partial: Partial<ShellPrefs>) => {
    const next = { ...(readShell() ?? defaultShell), ...partial };
    try {
      document.cookie = shellCookie(next);
    } catch {}
    applyShellAttrs(next);
    window.dispatchEvent(new Event(SHELL_EVENT));
  }, []);

  return (
    <Ctx value={{ shell, setShell, paletteOpen, setPaletteOpen, launchpadOpen, setLaunchpadOpen }}>
      {children}
    </Ctx>
  );
}

export function usePanelUI() {
  const v = use(Ctx);
  if (!v) throw new Error("usePanelUI must be used inside <PanelUIProvider>");
  return v;
}
