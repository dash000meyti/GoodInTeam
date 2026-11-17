/**
 * Read the registered chrome variables (os-shell.css `@property`): resolved
 * px lengths, so `parseFloat` gives numbers. Browser-only; a non-finite value
 * (an engine without @property, or no stylesheet yet) yields `fallback`.
 */
export function readChromeVar(name: "--chrome-top" | "--dock-space", fallback = 0): number {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}

/**
 * IntersectionObserver rootMargin for tables of contents (spec §15.3): the
 * active band starts 16px below the menu bar. Compute it once on mount.
 */
export function chromeRootMargin(bottom = "-70%"): string {
  return `-${Math.round(readChromeVar("--chrome-top", 64) + 16)}px 0px ${bottom} 0px`;
}
