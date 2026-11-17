"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { matchesQuery } from "@/components/shell/normalize";
import { isCommandPaletteShortcut } from "@/components/shell/shortcuts";

/**
 * Puts a `#fragment` target back where the fragment scroll should have left
 * it, and keeps it there while the streamed holes above it resolve to their
 * real height. Chromium and Firefox do this with scroll anchoring; Safari
 * computes the fragment scroll once, before the holes arrive, so
 * `/services#code` landed up to ~220px low there (the dock's Studio and Code
 * tiles link there). `scrollIntoView` honours `html { scroll-padding-top }`
 * (D18). Runs after a fresh navigation only (never a reload or Back, where
 * the browser restores the position), until the visitor scrolls, types or
 * taps, or for 4s. Returns the cleanup.
 */
function holdFragment() {
  let target: HTMLElement | null = null;
  try {
    target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  } catch {}
  const main = document.getElementById("main");
  if (!target || !main) return;
  const align = () => target.scrollIntoView({ block: "start", behavior: "instant" });
  const ac = new AbortController();
  const stop = () => ac.abort();
  const ro = new ResizeObserver(align); // its first callback aligns at once
  ro.observe(main);
  const timer = setTimeout(stop, 4000);
  ac.signal.addEventListener("abort", () => {
    ro.disconnect();
    clearTimeout(timer);
  });
  for (const type of ["wheel", "touchstart", "keydown", "pointerdown"])
    addEventListener(type, stop, { signal: ac.signal, passive: true });
  return stop;
}

/**
 * Behaviour of the site's native popovers (spec §7.1), in one tiny island:
 * 1. closes every open popover after a client navigation (not on mount) and
 *    when a link inside one is followed; keeps a `#fragment` target in place
 *    while the page streams (Safari, see `holdFragment`);
 * 2. ⌘K / Ctrl+K toggles Spotlight (layout-independent, respects
 *    defaultPrevented) and focuses its field;
 * 3. filters Spotlight's quick links with the Persian-aware normaliser
 *    (ی/ي, ک/ك, ZWNJ, digits, case) and shows "No matches" when none fits.
 * Renders nothing; mount it inside <Suspense> (it reads the pathname).
 */
export function SiteChrome() {
  const pathname = usePathname();
  const first = useRef(true);
  const popped = useRef(false);

  useEffect(() => {
    let fresh = !popped.current;
    popped.current = false;
    if (first.current) {
      first.current = false;
      const nav = performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined;
      fresh = !nav || nav.type === "navigate";
    } else {
      for (const el of document.querySelectorAll<HTMLElement>(":popover-open")) el.hidePopover();
    }
    if (fresh) return holdFragment();
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
    // Back/Forward restore their own scroll position: holdFragment skips those.
    const onPop = () => (popped.current = true);

    addEventListener("popstate", onPop);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    input.addEventListener("input", onInput);
    sl.addEventListener("toggle", onToggle);
    return () => {
      removeEventListener("popstate", onPop);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
      input.removeEventListener("input", onInput);
      sl.removeEventListener("toggle", onToggle);
    };
  }, []);

  return null;
}
