/**
 * Pure helpers for the panel OS shell (no React, no DOM globals) — unit-tested
 * in `panel-prefs.test.ts` (spec §11.5).
 *
 * The desktop/dock preferences live in ONE cookie, `gt-shell=<dock>.<magnify>.<autohide>.<wide>`
 * (e.g. `48.1.0.0`), so the server (SessionDock) and the pre-paint script read the same value
 * and the first paint already has the right dock size, auto-hide and window width.
 */

export { isCommandPaletteShortcut } from "@/components/shell/shortcuts";

export const SHELL_COOKIE = "gt-shell";

export type DockSize = 40 | 48 | 56;
export const dockSizes = [40, 48, 56] as const satisfies readonly DockSize[];

export interface ShellPrefs {
  dock: DockSize;
  magnify: boolean;
  autohide: boolean;
  wide: boolean;
}

export const defaultShell: ShellPrefs = { dock: 48, magnify: true, autohide: false, wide: false };

/** Strict pattern of the cookie pair inside a `Cookie` header / `document.cookie`. */
const SHELL_RE = /(?:^|;\s*)gt-shell=(40|48|56)\.([01])\.([01])\.([01])(?:;|$)/;

const bit = (b: boolean) => (b ? "1" : "0");

/** The cookie value, e.g. `48.1.0.0`. */
export function shellValue(p: ShellPrefs): string {
  return `${p.dock}.${bit(p.magnify)}.${bit(p.autohide)}.${bit(p.wide)}`;
}

/** `document.cookie` assignment for the shell preferences (one year, whole site). */
export function shellCookie(p: ShellPrefs): string {
  return `${SHELL_COOKIE}=${shellValue(p)}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Reads the preferences from a `Cookie` header / `document.cookie` string.
 * `null` when the cookie is missing or malformed (strict: anything but the exact
 * `NN.b.b.b` shape is ignored).
 */
export function readShellCookie(header?: string | null): ShellPrefs | null {
  if (!header) return null;
  const m = SHELL_RE.exec(header);
  if (!m) return null;
  return {
    dock: Number(m[1]) as DockSize,
    magnify: m[2] === "1",
    autohide: m[3] === "1",
    wide: m[4] === "1",
  };
}

/**
 * Runs before first paint (inline script in the panel layout): `<html data-dock-size>`,
 * `data-dock-autohide` and `data-window-wide` from the cookie, so the reserved dock space,
 * the auto-hidden dock and the window margins are right on the first frame. Inert on soft
 * navigation; PanelUIProvider re-applies the same attributes on mount.
 */
export const shellInitScript = `try{var m=/(?:^|;\\s*)gt-shell=(40|48|56)\\.([01])\\.([01])\\.([01])(?:;|$)/.exec(document.cookie),h=document.documentElement;if(m){h.setAttribute("data-dock-size",m[1]);m[3]==="1"?h.setAttribute("data-dock-autohide",""):h.removeAttribute("data-dock-autohide");m[4]==="1"?h.setAttribute("data-window-wide",""):h.removeAttribute("data-window-wide")}}catch(e){}`;

/** The legacy sidebar cookie; PanelUIProvider expires it on first load. */
export const LEGACY_SIDEBAR_COOKIE = "gt-sidebar-collapsed";
export const expireLegacySidebarCookie = `${LEGACY_SIDEBAR_COOKIE}=; path=/; max-age=0; samesite=lax`;
