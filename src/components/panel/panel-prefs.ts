/**
 * Pure helpers for the panel chrome (no React, no DOM globals) — unit-tested in
 * `panel-prefs.test.ts`.
 */

type ShortcutEvent = Pick<KeyboardEvent, "key" | "code" | "metaKey" | "ctrlKey" | "altKey">;

/**
 * ⌘K / Ctrl+K, independent of the keyboard layout.
 *
 * With a Persian (or any non-Latin) layout `e.key` is the local letter (e.g. "ن"), so we fall
 * back to the physical key (`e.code === "KeyK"`). When `e.key` is a Latin letter we trust it,
 * so Dvorak/Colemak users keep ⌘K on their "k" (and their ⌘T etc. are not hijacked).
 */
export function isCommandPaletteShortcut(e: ShortcutEvent): boolean {
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return false;
  const key = e.key.toLowerCase();
  if (/^[a-z]$/.test(key)) return key === "k";
  return e.code === "KeyK";
}

/** Cookie that remembers the collapsed desktop sidebar (read on the server → no flash). */
export const SIDEBAR_COOKIE = "gt-sidebar-collapsed";

/** `document.cookie` assignment for the sidebar preference (one year, whole site). */
export function sidebarCookie(collapsed: boolean): string {
  return `${SIDEBAR_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Reads the preference from a `Cookie` header / `document.cookie` string.
 * `null` when it was never set.
 */
export function readSidebarCookie(cookieHeader: string | null | undefined): boolean | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SIDEBAR_COOKIE) return rest.join("=") === "1";
  }
  return null;
}

/**
 * Runs before first paint (inline script in the panel layout): marks <html> so the
 * streaming sidebar skeleton already has the collapsed width.
 */
export const sidebarInitScript = `try{if(/(?:^|;\\s*)${SIDEBAR_COOKIE}=1(?:;|$)/.test(document.cookie))document.documentElement.setAttribute("data-sidebar-collapsed","")}catch(e){}`;
