"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { matchesQuery } from "@/components/shell/normalize";
import { isCommandPaletteShortcut } from "@/components/shell/shortcuts";

/**
 * Behaviour of the site's native popovers (spec §7.1), in one tiny island:
 * 1. closes every open popover after a client navigation (not on mount) and
 *    when a link inside one is followed;
 * 2. ⌘K / Ctrl+K toggles Spotlight (layout-independent, respects
 *    defaultPrevented) and focuses its field;
 * 3. filters Spotlight's quick links with the Persian-aware normaliser
 *    (ی/ي, ک/ك, ZWNJ, digits, case) and shows "No matches" when none fits.
 * Renders nothing; mount it inside <Suspense> (it reads the pathname).
 */
export function SiteChrome() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    for (const el of document.querySelectorAll<HTMLElement>(":popover-open")) el.hidePopover();
  }, [pathname]);

  useEffect(() => {
    const sl = document.getElementById("os-spotlight");
    const input = sl?.querySelector<HTMLInputElement>("input[name=q]");
    if (!sl || !input) return;
    const rows = sl.querySelectorAll<HTMLElement>("[data-sl-row]");
    const empty = sl.querySelector<HTMLElement>("[data-sl-empty]");

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !isCommandPaletteShortcut(e)) return;
      e.preventDefault();
      sl.togglePopover();
    };
    const onInput = () => {
      let shown = 0;
      for (const r of rows) {
        const hit = matchesQuery(r.textContent ?? "", input.value);
        r.hidden = !hit;
        if (hit) shown++;
      }
      if (empty) empty.hidden = shown > 0;
    };
    const onToggle = (e: Event) => {
      if ((e as ToggleEvent).newState === "open") input.focus();
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.("a[href]");
      const pop = a?.closest<HTMLElement>("[popover]");
      if (pop?.matches(":popover-open")) pop.hidePopover();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    input.addEventListener("input", onInput);
    sl.addEventListener("toggle", onToggle);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
      input.removeEventListener("input", onInput);
      sl.removeEventListener("toggle", onToggle);
    };
  }, []);

  return null;
}
