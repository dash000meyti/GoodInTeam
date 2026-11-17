/**
 * Tiny external store shared by the menu bar and the dock (spec §11.3):
 * the number of running timers, published by `HeaderLive` (menu-bar status
 * hole) and read by `PanelDock` with `useSyncExternalStore` (server snapshot 0)
 * for the Time tile's running dot and accessible name. No polling of its own.
 */
let running = 0;
const listeners = new Set<() => void>();

export function getRunning(): number {
  return running;
}

export function setRunning(n: number): void {
  const next = Math.max(0, Math.floor(n) || 0);
  if (next === running) return;
  running = next;
  for (const l of listeners) l();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
