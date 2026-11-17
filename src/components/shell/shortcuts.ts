/**
 * Keyboard helpers shared by the site and the panel chrome (pure, unit-tested).
 * The panel re-exports `isCommandPaletteShortcut` from here (§11.5).
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
